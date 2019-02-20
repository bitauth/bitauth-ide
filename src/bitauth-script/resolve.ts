import { MarkedNode, BitAuthScriptSegment } from './parse';
import {
  bigIntToScriptNumber,
  hexToBin,
  utf8ToBin,
  AuthenticationVirtualMachine,
  Secp256k1,
  Sha256,
  generateBitcoinCashSigningSerialization,
  SigningSerializationFlag,
  AuthenticationInstruction,
  StackState,
  MinimumProgramState
} from 'bitcoin-ts';
import { AuthenticationTemplateVariable } from 'bitcoin-ts/build/main/lib/auth/templates/types';

export interface Range {
  startColumn: number;
  endColumn: number;
  startLineNumber: number;
  endLineNumber: number;
}

const pluckRange = (node: MarkedNode): Range => ({
  startColumn: node.start.column,
  endColumn: node.end.column,
  startLineNumber: node.start.line,
  endLineNumber: node.end.line
});

interface ResolvedSegmentBase {
  type: string;
  range: Range;
}

interface ResolvedSegmentPush<T> extends ResolvedSegmentBase {
  type: 'push';
  value: T;
}

interface ResolvedSegmentEvaluation<T> extends ResolvedSegmentBase {
  type: 'evaluation';
  value: T;
}

interface ResolvedSegmentBytecode extends ResolvedSegmentBase {
  type: 'bytecode';
  value: Uint8Array;
  variable?: string;
}

interface ResolvedSegmentComment extends ResolvedSegmentBase {
  type: 'comment';
  value: string;
}

interface ResolvedSegmentError extends ResolvedSegmentBase {
  type: 'error';
  value: string;
}

type ResolvedSegment =
  | ResolvedSegmentPush<ResolvedScript>
  | ResolvedSegmentEvaluation<ResolvedScript>
  | ResolvedSegmentBytecode
  | ResolvedSegmentComment
  | ResolvedSegmentError;

export interface ResolvedScript extends Array<ResolvedSegment> {}

export enum IdentifierResolutionType {
  opcode = 'opcode',
  variable = 'variable',
  script = 'script',
  unknown = 'unknown'
}

export type IdentifierResolutionFunction = (
  identifier: string
) =>
  | { status: true; bytecode: Uint8Array; type: IdentifierResolutionType }
  | { status: false; error: string };

export const resolveScriptSegment = (
  segment: BitAuthScriptSegment,
  resolveIdentifiers: IdentifierResolutionFunction
): ResolvedScript =>
  segment.value.map(child => {
    const range = pluckRange(child);
    switch (child.name) {
      case 'Identifier':
        const identifier = child.value;
        const result = resolveIdentifiers(identifier);
        return result.status
          ? {
              type: 'bytecode' as 'bytecode',
              value: result.bytecode,
              range,
              ...(result.type === IdentifierResolutionType.variable && {
                variable: identifier
              })
            }
          : {
              type: 'error' as 'error',
              value: result.error,
              range
            };
      case 'Push':
        return {
          type: 'push' as 'push',
          value: resolveScriptSegment(child.value, resolveIdentifiers),
          range
        };
      case 'Evaluation':
        return {
          type: 'evaluation' as 'evaluation',
          value: resolveScriptSegment(child.value, resolveIdentifiers),
          range
        };
      case 'BigIntLiteral':
        return {
          type: 'bytecode' as 'bytecode',
          value: bigIntToScriptNumber(child.value),
          range
        };
      case 'HexLiteral':
        return child.value.length % 2 === 0
          ? {
              type: 'bytecode' as 'bytecode',
              value: hexToBin(child.value),
              range
            }
          : {
              type: 'error' as 'error',
              value: `Improperly formed HexLiteral. HexLiteral must have a length divisible by 2, but this HexLiteral has a length of ${
                child.value.length
              }.`,
              range
            };
      case 'UTF8Literal':
        return {
          type: 'bytecode' as 'bytecode',
          value: utf8ToBin(child.value),
          range
        };
      case 'Comment':
        return {
          type: 'comment' as 'comment',
          value: child.value,
          range
        };
      default:
        return {
          type: 'error' as 'error',
          value: `Unrecognized segment: ${child}`,
          range
        };
    }
  });

/**
 * The full context around a certain BitAuth Script – everything required for
 * the compiler to generate the final script code (targeting a specific `AuthenticationVirtualMachine`).
 *
 * A `CompilationEnvironment` must include a subset of the script's
 * `AuthenticationTemplate` – all the variables and scripts referenced
 * (including children of children) by the script in question.
 *
 * The context must also include an object mapping of opcode identifiers to the
 * bytecode they generate.
 *
 * If keys are used, an implementation of `sha256` and `secp256k1` is
 * required. If the script requires evaluations during compilation, the
 * evaluating `AuthenticationVirtualMachine` must also be included.
 */
export interface CompilationEnvironment {
  /**
   * An object mapping opcode identifiers to the bytecode they generate.
   */
  opcodes?: {
    [opcodeIdentifier: string]: Uint8Array;
  };
  /**
   * An object mapping BitAuth variable identifiers to the
   * `AuthenticationTemplateVariable` describing them.
   *
   * To avoid compilation errors, this object must contain all variables
   * referenced by the script being compiled (including in child scripts).
   */
  variables?: {
    [variableId: string]: AuthenticationTemplateVariable;
  };
  /**
   * An object mapping BitAuth script identifiers to either a pre-compiled
   * version of the script as a Uint8Array (useful for providing scripts
   * compiled by other `AuthenticationTemplateEntities`) or the text of script.
   *
   * To avoid compilation errors, this object must contain all scripts
   * referenced by the script being compiled (including children of children).
   */
  scripts?: {
    /**
     * Scripts can be provided in BitAuth Script (string) or as pre-generated code (Uint8Array).
     */
    [scriptId: string]: string | Uint8Array;
  };
  /**
   * BitAuth Script identifier resolution must be acyclic.
   *
   * To prevent an infinite loop, `IdentifierResolutionFunction`s must abort
   * resolution if they encounter their own `id` while resolving another
   * identifier. Likewise, child scripts being resolved by a parent script
   * may not reference any script which is already in the process of being
   * resolved.
   */
  sourceScriptIds?: string[];
  /**
   * An implementation of secp256k1 is required for any scripts which include
   * signatures.
   */
  secp256k1?: Secp256k1;
  /**
   * An implementation of sha256 is required for any scripts which include
   * signatures.
   */
  sha256?: Sha256;
  /**
   * The AuthenticationVirtualMachine on which BitAuth script `evaluation`
   * results will be computed.
   */
  vm?: AuthenticationVirtualMachine<any>;
  /**
   * A method which accepts an array of `AuthenticationInstruction`s, and
   * returns a ProgramState. This method will be used to generate the initial
   * ProgramState for `evaluation`s.
   */
  createState?: (
    instructions: ReadonlyArray<AuthenticationInstruction<any>>
  ) => any;
}

// TODO:
export interface CompilationData {
  /**
   * TODO: implement `HDKeys` support (similar to `keys`, `HDKeys` simply takes `index` and `derivationHardened` into account. Note: no current plans to support more complex paths, users needing that kind of control should just use `keys`.)
   */
  HDKeys?: {
    index?: number;
    derivationHardened?: boolean;
    privateHDKeys?: {
      [id: string]: Uint8Array;
    };
    publicHDKeys?: {
      [id: string]: Uint8Array;
    };
    signatures?: {
      [id: string]: Uint8Array;
    };
  };
  keys?: {
    privateKeys?: {
      [id: string]: Uint8Array;
    };
    publicKeys?: {
      [id: string]: Uint8Array;
    };
    /**
     * Signatures provided to us by other entities. Since we don't have their
     * private key, we'll need them to send us a valid signature to include in
     * the proper spots.
     */
    signatures?: {
      [id: string]: Uint8Array;
    };
  };
  /**
   * TODO: consider changing all `hash`es to `() => hash` to allow for lazy
   * evaluation
   *
   * **Note**
   * This implementation is Bitcoin Cash specific – after signature checking is
   * implemented for other VMs, signature creation should be abstracted from
   * script compilation and only provided by default via convenience methods.
   * (E.g. `compileScript` wrapped by `compileScriptBCH`.)
   *
   * It would be best if this implementation followed the
   * `AuthenticationVirtualMachine`'s instruction set pattern – rather than
   * being defined here, `BitAuthKeySubIdentifier` should operate like
   * `BitcoinCashOpcodes`, and be used by a set of methods mapping
   * sub-identifiers to signature generation implementations (like VM
   * operations). This is also the natural place for different `ForkId` values
   * to be accommodated.
   *
   * FIXME: create `SignatureGenerationOperations` type:
   * ```ts
   * enum BCHKeySubIdentifier {
   *   public_key = 'public_key',
   *   signature_all = 'signature_all',
   *   signature_single = 'signature_single',
   *   signature_none = 'signature_none'
   * }
   *
   * interface SignatureGenerationOperations<SubIdentifier, SignatureGenerationData> {
   *   [subIdentifier: SubIdentifier]:
   *    <BCHSignatureGenerationData>(data: SignatureGenerationData) => Uint8Array
   * }
   * ```
   *
   */
  signatureGenerationData?: {
    version: number;
    transactionOutpointsHash: Uint8Array;
    transactionSequenceNumbersHash: Uint8Array;
    outpointTransactionHash: Uint8Array;
    outpointIndex: number;
    /**
     * **Design note**
     * By extending the language to provide this as a parameter to a signature
     * variable (e.g. from `a.signature_all` to `a.signature_all(lock)`), we
     * could make deployment just a bit simpler. However, this comes at the cost
     * of remix-ability (using scripts containing signatures like macros) and
     * some beginner-friendliness, so it's not currently supported.
     */
    coveredScript: Uint8Array;
    outputValue: bigint;
    sequenceNumber: number;
    correspondingOutputHash: Uint8Array;
    transactionOutputsHash: Uint8Array;
    locktime: number;
  };
  walletData?: {
    [id: string]: string | Uint8Array;
  };
  transactionData?: {
    [id: string]: string | Uint8Array;
  };
  /**
   * Not yet implemented. See bitcoin-ts `ExternalOperation` for details.
   */
  externalOperation?: never;
  // externalOperation: {
  //   [id: string]: () => Uint8Array;
  // };
  currentBlockTime?: Date;
  currentBlockHeight?: number;
}

// TODO: use
enum ScriptGenerationError {
  missingVm = 'An evaluation is required, but no VM was provided.',
  missingSha256 = 'Sha256 is required, but no implementation was provided.',
  missingSecp256k1 = 'Secp256k1 is required, but no implementation was provided.'
}

/**
 * Return an `IdentifierResolutionFunction` for use in `resolveScriptSegment`.
 *
 * If resolution would rely on a cyclical dependency, this method returns
 * `false`. See `CompilationEnvironment` for more details.
 *
 * **Implementation note**
 *
 * If `scriptId` is `undefined`, this method will always return an
 * `IdentifierResolutionFunction`. Better types waiting on:
 * https://github.com/Microsoft/TypeScript/issues/24929
 *
 * @param scriptId the `id` of the script for which the resulting
 * `IdentifierResolutionFunction` will be used.
 * @param context a snapshot of the context around `scriptId`. See
 * `CompilationEnvironment` for details.
 * @param data the actual variable values (private keys, shared wallet data,
 * shared transaction data, etc.) to use in resolving variables.
 */
export const createIdentifierResolver = (
  scriptId: string | undefined,
  data: CompilationData,
  context: CompilationEnvironment
): string | IdentifierResolutionFunction =>
  scriptId &&
  context.sourceScriptIds &&
  context.sourceScriptIds.indexOf(scriptId) !== -1
    ? `A circular dependency was encountered. Script "${scriptId}" relies on itself to be generated. (Parent scripts: ${context.sourceScriptIds.join(
        ', '
      )})`
    : (identifier: string) => {
        const opcodeResult: Uint8Array | undefined =
          context.opcodes && context.opcodes[identifier];
        if (opcodeResult !== undefined) {
          return {
            status: true,
            bytecode: opcodeResult,
            type: IdentifierResolutionType.opcode
          };
        }
        const variableResult = resolveAuthenticationTemplateVariable(
          identifier,
          context,
          data
        );
        if (variableResult !== false) {
          return typeof variableResult === 'string'
            ? { status: false, error: variableResult }
            : {
                status: true,
                bytecode: variableResult,
                type: IdentifierResolutionType.variable
              };
        }
        const scriptResult = resolveScriptIdentifier(identifier, context, data);
        if (scriptResult !== false) {
          return typeof scriptResult === 'string'
            ? { status: false, error: scriptResult }
            : {
                status: true,
                bytecode: scriptResult,
                type: IdentifierResolutionType.script
              };
        }
        return { status: false, error: `Unknown identifier '${identifier}'.` };
      };

const unknownVariableType = (identifier: string, type: never) =>
  `Identifier "${identifier}" expects an unknown variable type: "${type}"`;

const unknownKeySubIdentifier = (identifier: string, subIdentifier: never) =>
  `Identifier "${identifier}" refers to an unknown sub-identifier for Keys: "${subIdentifier}".`;

enum BitAuthKeySubIdentifier {
  public_key = 'public_key',
  signature_all = 'signature_all',
  signature_single = 'signature_single',
  signature_none = 'signature_none'
}

const signingSerializationTypeAll = Uint8Array.of(
  SigningSerializationFlag.ALL | SigningSerializationFlag.FORKID
);
const signingSerializationTypeSingle = Uint8Array.of(
  SigningSerializationFlag.SINGLE | SigningSerializationFlag.FORKID
);
const signingSerializationTypeNone = Uint8Array.of(
  SigningSerializationFlag.NONE | SigningSerializationFlag.FORKID
);

/**
 * Convert a Javascript `Date` object to its equivalent LockTime
 * representation in an `AuthenticationVirtualMachine`.
 *
 * TODO: this method should error past the overflow Date and for dates which
 * would become BlockHeights when encoded. Validate correctness after
 * `OP_CHECKLOCKTIMEVERIFY` is implemented.
 *
 * @param date the Date to convert to a BlockTime Uint8Array
 */
export const dateToLockTime = (date: Date) =>
  bigIntToScriptNumber(BigInt(Math.round(date.getTime() / 1000)));

/**
 * If the identifer can be successfully resolved as a variable, the result is
 * returned as a Uint8Array. If the identifier references a known variable, but
 * an error occurs in resolving it, the error is returned as a string.
 * Otherwise, the identifier is not recognized as a variable, and this method
 * simply returns `false`.
 */
export const resolveAuthenticationTemplateVariable = (
  identifier: string,
  context: CompilationEnvironment,
  data: CompilationData
): Uint8Array | string | false => {
  const splitId = identifier.split('.');
  const variableId = splitId[0];
  if (context.variables === undefined) {
    return false;
  }
  const selected = context.variables[variableId];
  if (selected === undefined) {
    return false;
  }
  const variableType = selected.type;
  switch (variableType) {
    case 'HDKey':
      return 'TODO: IMPLEMENT HDKey';
    case 'Key':
      const subIdentifier = splitId[1] as BitAuthKeySubIdentifier;
      const keys = data.keys;
      if (keys === undefined) {
        return `Identifier "${identifier}" refers to a Key: "${variableId}", but no keys were provided in the compilation data.`;
      }
      // FIXME: see `SignatureGenerationOperations`
      switch (subIdentifier) {
        case BitAuthKeySubIdentifier.public_key: {
          const publicKeys = keys.publicKeys;
          const privateKeys = keys.privateKeys;
          if (publicKeys !== undefined && publicKeys[variableId]) {
            return publicKeys[variableId];
          }
          if (privateKeys !== undefined && privateKeys[variableId]) {
            const secp256k1 = context.secp256k1;
            return secp256k1 === undefined
              ? ScriptGenerationError.missingSecp256k1
              : secp256k1.derivePublicKeyCompressed(privateKeys[variableId]);
          }
          return `Identifier "${identifier}" refers to a public key, but no public or private keys for "${variableId}" were provided in the compilation data.`;
        }
        case BitAuthKeySubIdentifier.signature_none:
        case BitAuthKeySubIdentifier.signature_single:
        case BitAuthKeySubIdentifier.signature_all: {
          const signatures = keys.signatures;
          const privateKeys = keys.privateKeys;
          if (signatures !== undefined && signatures[variableId]) {
            return signatures[variableId];
          }
          if (privateKeys !== undefined && privateKeys[variableId]) {
            const privateKey = privateKeys[variableId];
            const signingSerializationData = data.signatureGenerationData;
            if (signingSerializationData === undefined) {
              return `Could not construct the signature "${identifier}", signing serialization data was not provided in the compilation data. Is the locking script valid?`;
            }
            const secp256k1 = context.secp256k1;
            if (secp256k1 === undefined) {
              return ScriptGenerationError.missingSecp256k1;
            }
            const sha256 = context.sha256;
            if (sha256 === undefined) {
              return ScriptGenerationError.missingSha256;
            }
            const signingSerializationType =
              subIdentifier === BitAuthKeySubIdentifier.signature_all
                ? signingSerializationTypeAll
                : subIdentifier === BitAuthKeySubIdentifier.signature_single
                ? signingSerializationTypeSingle
                : signingSerializationTypeNone;
            const serialization = generateBitcoinCashSigningSerialization(
              signingSerializationData.version,
              signingSerializationData.transactionOutpointsHash,
              signingSerializationData.transactionSequenceNumbersHash,
              signingSerializationData.outpointTransactionHash,
              signingSerializationData.outpointIndex,
              signingSerializationData.coveredScript,
              signingSerializationData.outputValue,
              signingSerializationData.sequenceNumber,
              signingSerializationData.correspondingOutputHash,
              signingSerializationData.transactionOutputsHash,
              signingSerializationData.locktime,
              signingSerializationType
            );
            const digest = sha256.hash(sha256.hash(serialization));
            const bitcoinEncodedSignature = Uint8Array.from([
              ...secp256k1.signMessageHashDER(privateKey, digest),
              ...signingSerializationType
            ]);
            return bitcoinEncodedSignature;
          }
          return `Identifier "${identifier}" refers to a signature, but no signatures or private keys for "${variableId}" were provided in the compilation data.`;
        }
        default:
          return unknownKeySubIdentifier(identifier, subIdentifier);
      }
    case 'CurrentBlockHeight':
      const latestKnownBlockHeight = data.currentBlockHeight;
      return latestKnownBlockHeight === undefined
        ? `Identifier "${identifier}" is a CurrentBlockHeight, but the compilation data does not include a "currentBlockHeight" property.`
        : bigIntToScriptNumber(BigInt(latestKnownBlockHeight));
    case 'CurrentBlockTime':
      const latestKnownBlockTime = data.currentBlockTime;
      return latestKnownBlockTime === undefined
        ? `Identifier "${identifier}" is a CurrentBlockTime, but the compilation data does not include a "currentBlockTime" property.`
        : dateToLockTime(latestKnownBlockTime);
    case 'WalletData':
      const walletData = data.walletData;
      if (walletData === undefined) {
        return `Identifier "${identifier}" is a WalletData, but the compilation data doesn't include a "walletData" property.`;
      }
      const walletDataItem = walletData[variableId];
      return walletDataItem === undefined
        ? `Identifier "${identifier}" refers to a WalletData, but no WalletData for "${variableId}" were provided in the compilation data.`
        : typeof walletDataItem === 'string'
        ? `TODO: IMPLEMENT script compilation for WalletData`
        : walletDataItem;
    case 'TransactionData':
      const transactionData = data.transactionData;
      if (transactionData === undefined) {
        return `Identifier "${identifier}" is a TransactionData, but the compilation data doesn't include a "transactionData" property.`;
      }
      const transactionDataItem = transactionData[variableId];
      return transactionDataItem === undefined
        ? `Identifier "${identifier}" refers to a TransactionData, but no TransactionData for "${variableId}" were provided in the compilation data.`
        : typeof transactionDataItem === 'string'
        ? `TODO: IMPLEMENT script compilation for TransactionData`
        : transactionDataItem;
    case 'ExternalOperation':
      return 'TODO: IMPLEMENT ExternalOperation';
    default:
      return unknownVariableType(identifier, variableType);
  }
};

export const resolveScriptIdentifier = (
  identifier: string,
  context: CompilationEnvironment,
  data: CompilationData
): Uint8Array | string | false => {
  // TODO: inline-script resolution (recursively parse, compile, and reduce until we get to a Uint8Array of bytecode)
  return false;
};
