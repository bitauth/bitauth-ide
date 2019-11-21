import { unknownValue } from '../utils';
import {
  AppState,
  IDETemplateLockingScript,
  IDEActivatableScript,
  IDETemplateScript,
  IDETemplateTestedScript,
  VariableDetails
} from '../state/types';
import {
  OpcodesBCH,
  AuthenticationInstruction,
  CompilationResult,
  CompilationData,
  sampledEvaluateReductionTraceNodes,
  CompilerOperationDataBCH,
  createCompiler,
  createAuthenticationProgramStateCommon,
  AuthenticationProgramStateBCH,
  SampledEvaluationResult,
  getCompilerOperationsBCH,
  createAuthenticationProgramExternalStateCommon,
  AuthenticationProgramCommon,
  hexToBin
} from 'bitcoin-ts';
import {
  getResolvedIdentifier,
  ResolvedIdentifier
} from '../btl-utils/editor-tooling';
import {
  extractSamplesFromReductionTrace,
  addSpacersToTraceSamples,
  reduceSpacedTraceSamples
} from '../btl-utils/reduce';
import {
  StackItemIdentifyFunction,
  ProjectEditorMode,
  Evaluation,
  IDESupportedProgramState,
  EvaluationViewerHighlight,
  ComputedEditorState,
  ScriptEditorFrame
} from './editor-types';

import { compileScriptMock } from './common';

const getEditorMode = (
  currentEditingMode:
    | 'welcome'
    | 'importing'
    | 'entity'
    | 'script'
    | 'template-settings',
  template: AppState['currentTemplate'],
  currentlyEditingInternalId?: string
) => {
  if (currentEditingMode === 'welcome') {
    return ProjectEditorMode.welcome;
  }
  if (currentEditingMode === 'importing') {
    return ProjectEditorMode.importing;
  }
  if (currentEditingMode === 'template-settings') {
    return ProjectEditorMode.templateSettingsEditor;
  }
  if (currentEditingMode === 'entity') {
    return ProjectEditorMode.entityEditor;
  }
  if (currentlyEditingInternalId === undefined) {
    return ProjectEditorMode.templateSettingsEditor;
  }
  const scriptType =
    template.scriptsByInternalId[currentlyEditingInternalId].type;
  switch (scriptType) {
    case 'isolated':
      return ProjectEditorMode.isolatedScriptEditor;
    case 'test-setup':
      return ProjectEditorMode.testedScriptEditor;
    case 'unlocking':
      return ProjectEditorMode.scriptPairEditor;
    default:
      throw new Error(
        `The script referenced by "state.currentlyEditingId" must be of type, 'isolated', 'unlocking', or 'test-setup'. The script provided is of type '${scriptType}'.`
      );
  }
};

const bitcoinCashOpcodeIdentifiers = Object.entries(OpcodesBCH)
  .filter(([_, value]) => typeof value === 'number')
  .reduce(
    (identifiers, pair) => ({
      ...identifiers,
      [pair[0]]: Uint8Array.of(pair[1] as number)
    }),
    {}
  ) as {
  [opcode: string]: Uint8Array;
};

const createStackItemIdentificationFunction = (
  resolvedIdentifiers: ResolvedIdentifier[]
): StackItemIdentifyFunction => {
  const dictionary = resolvedIdentifiers.reduce<{
    [stringifiedArray: string]: string;
  }>(
    (dict, item) => ({ ...dict, [item.bytecode.toString()]: item.identifier }),
    {}
  );
  return item => dictionary[item.toString()] || false;
};

const formatScript = (
  internalId: string,
  script: IDETemplateScript,
  name?: string
) => ({
  internalId,
  name: name || script.name,
  id: script.id,
  script: script.script,
  scriptType: script.type
});

const getSourceScripts = (
  internalId: string,
  template: AppState['currentTemplate']
) => {
  const currentScript = template.scriptsByInternalId[
    internalId
  ] as IDEActivatableScript;
  if (currentScript.type === 'isolated') {
    return {
      isP2sh: false,
      sourceScripts: [formatScript(internalId, currentScript)]
    };
  } else if (currentScript.type === 'unlocking') {
    const lockingInternalId = currentScript.parentInternalId;
    const lockingScript = template.scriptsByInternalId[
      lockingInternalId
    ] as IDETemplateLockingScript;
    return {
      isP2sh: lockingScript.isP2SH,
      sourceScripts: [
        formatScript(internalId, currentScript),
        formatScript(lockingInternalId, lockingScript)
      ]
    };
  } else if (currentScript.type === 'test-setup') {
    const testedInternalId = currentScript.parentInternalId;
    const testedScript = template.scriptsByInternalId[
      testedInternalId
    ] as IDETemplateTestedScript;
    return {
      isP2sh: false,
      sourceScripts: [
        formatScript(internalId, currentScript, currentScript.name),
        formatScript(testedInternalId, testedScript),
        formatScript(
          currentScript.testCheckInternalId,
          template.scriptsByInternalId[currentScript.testCheckInternalId],
          currentScript.name
        )
      ]
    };
  } else {
    return unknownValue(currentScript);
  }
};

// TODO: user-set "scenarios", snapshots which can be toggled between for debugging
const currentBlock = 561171;
const currentTimeUTC = 1549166880000; // "current" – just a reasonable, static time for determinism

const getIDECompilationData = (
  state: AppState
): CompilationData<CompilerOperationDataBCH> => {
  return Object.values(state.currentTemplate.variablesByInternalId).reduce<
    CompilationData<CompilerOperationDataBCH>
  >(
    (data, variable) => {
      switch (variable.type) {
        case 'HDKey':
          throw new Error('Not yet implemented.');
        case 'Key':
        case 'AddressData':
        case 'WalletData':
          const mock = compileScriptMock(variable.mock);
          if (mock.success !== true) {
            console.error(
              'Unexpected variable mock compilation error. Variable:',
              variable,
              'Result:',
              mock
            );
            return data;
          }
          switch (variable.type) {
            case 'Key':
              const privateKeys = (data.keys && data.keys.privateKeys) || {};
              return {
                ...data,
                keys: {
                  privateKeys: {
                    ...privateKeys,
                    [variable.id]: mock.bytecode
                  }
                }
              };
            case 'AddressData':
              const addressData = data.addressData || {};
              return {
                ...data,
                addressData: {
                  ...addressData,
                  [variable.id]: mock.bytecode
                }
              };
            case 'WalletData':
              const walletData = data.walletData || {};
              return {
                ...data,
                walletData: {
                  ...walletData,
                  [variable.id]: mock.bytecode
                }
              };
          }
        // eslint-disable-next-line no-fallthrough
        default:
          unknownValue(variable);
          return data;
      }
    },
    {
      currentBlockHeight: currentBlock,
      currentBlockTime: new Date(currentTimeUTC)
    }
  );
};

/**
 * TODO: this method needs to be refactored to use the new VM APIs – currently,
 * part of the `vm.evaluate` logic is re-implemented below, but for
 * unlocking/locking script pairs, the standard `vm.debug` should be use to
 * generate fully-correct results (e.g. bytecode length errors, push-only check,
 * SegWit recovery check, etc.).
 */
export const computeEditorState = <
  // AuthenticationProgram extends IDESupportedAuthenticationProgram,
  ProgramState extends IDESupportedProgramState
>(
  state: AppState
): ComputedEditorState<ProgramState> => {
  const {
    crypto,
    authenticationVirtualMachines,
    currentEditingMode,
    currentlyEditingInternalId
  } = state;
  if (crypto === null || authenticationVirtualMachines === null) {
    return { editorMode: ProjectEditorMode.loading };
  }
  const vm = authenticationVirtualMachines[state.currentVmId];
  const editorMode = getEditorMode(
    currentEditingMode,
    state.currentTemplate,
    currentlyEditingInternalId
  );
  if (
    editorMode === ProjectEditorMode.welcome ||
    editorMode === ProjectEditorMode.importing ||
    editorMode === ProjectEditorMode.templateSettingsEditor ||
    editorMode === ProjectEditorMode.entityEditor
  ) {
    return { editorMode };
  }

  const { sourceScripts: evaluationOrderedScripts, isP2sh } = getSourceScripts(
    currentlyEditingInternalId as string,
    state.currentTemplate
  );

  enum Fill {
    length = 32,
    outpointTransactionHash1 = 1,
    outpointTransactionHash2 = 2
  }

  const nextCashChannelHash160 = '0f5e17008f9e050c80e63f80c178c91d0d6a0c70';
  const nextCashChannelP2sh = hexToBin(`a914${nextCashChannelHash160}87`);
  const otherOutputBytecode = hexToBin('00');

  // TODO: make the scenario configurable from the IDE (currently hard-coded for CashChannels)
  const contextProgram: AuthenticationProgramCommon = {
    inputIndex: 0,
    sourceOutput: {
      lockingBytecode: Uint8Array.of(),
      satoshis: BigInt(20000)
    },
    spendingTransaction: {
      inputs: [
        {
          outpointIndex: 0,
          outpointTransactionHash: new Uint8Array(Fill.length).fill(
            Fill.outpointTransactionHash1
          ),
          sequenceNumber: 0,
          unlockingBytecode: Uint8Array.of() // thrown away
        },
        {
          outpointIndex: 0,
          outpointTransactionHash: new Uint8Array(Fill.length).fill(
            Fill.outpointTransactionHash2
          ),
          sequenceNumber: 0,
          unlockingBytecode: Uint8Array.of() // thrown away
        }
      ],
      locktime: currentTimeUTC,
      outputs: [
        { lockingBytecode: nextCashChannelP2sh, satoshis: BigInt(10000) },
        { lockingBytecode: otherOutputBytecode, satoshis: BigInt(10000) }
      ],
      version: 0
    }
  };

  const externalState = createAuthenticationProgramExternalStateCommon(
    contextProgram,
    crypto.sha256
  );
  const data = getIDECompilationData(state);
  const createCreateStateWithStack = <Opcodes, Errors>(stack: Uint8Array[]) => (
    instructions: ReadonlyArray<AuthenticationInstruction<Opcodes>>
  ) =>
    createAuthenticationProgramStateCommon<Opcodes, Errors>(
      instructions,
      stack,
      externalState
    );
  const createState = createCreateStateWithStack([]);
  const scripts = Object.values(
    state.currentTemplate.scriptsByInternalId
  ).reduce(
    (scripts, ideScript) => ({ ...scripts, [ideScript.id]: ideScript.script }),
    {}
  );
  const variables = Object.values(
    state.currentTemplate.variablesByInternalId
  ).reduce(
    (variables, variable) => ({ ...variables, [variable.id]: variable }),
    {}
  );
  const compiler = createCompiler<CompilerOperationDataBCH, ProgramState>({
    opcodes: bitcoinCashOpcodeIdentifiers,
    operations: getCompilerOperationsBCH(),
    variables,
    scripts,
    secp256k1: crypto.secp256k1,
    sha256: crypto.sha256,
    vm,
    createState
  });

  /**
   * The compiler is still very alpha – it shouldn't throw, but if it does, we
   * should prevent the IDE from completely crashing. (Hopefully users can at
   * least export their work.)
   */
  try {
    /**
     * We compile the `sourceScripts` in reverse order, passing the last script in
     * as part of the signatureGenerationData.
     *
     * This is most relevant for `unlocking`/`locking` script pairs, but could
     * also be useful for some eccentric `tested` scripts.
     */
    const signingOrderedScripts = evaluationOrderedScripts.slice().reverse();
    const compilationResults = signingOrderedScripts.reduce<
      CompilationResult[]
    >((results, source, i) => {
      const previousResult = results[i - 1];
      const coveredBytecode =
        previousResult &&
        previousResult.success === true &&
        previousResult.bytecode;
      const compilationResult = compiler.debug(source.id, {
        ...data,
        ...(coveredBytecode && {
          operationData: {
            ...externalState,
            coveredBytecode
          }
        })
      });
      return [...results, compilationResult];
    }, []);
    /**
     * TODO: generalize, remove cast when multiple VMs are supported
     */
    const createEmptyProgramState = ((() =>
      createState([])) as unknown) as () => ProgramState;
    const evaluationOrderedCompilationResults = compilationResults
      .slice()
      .reverse();
    let nextStack: Uint8Array[] = [];
    let evaluations: Evaluation<ProgramState>[] = [];
    let nextLine = undefined;
    for (const result of evaluationOrderedCompilationResults) {
      if (result.success !== true) {
        /**
         * A compilation failed, no need to try evaluating it.
         */
        break;
      }
      /**
       * TODO: generalize, remove cast when multiple VMs are supported
       */
      const next = (sampledEvaluateReductionTraceNodes<
        OpcodesBCH,
        AuthenticationProgramStateBCH
      >(
        result.reduce.source,
        vm,
        createCreateStateWithStack(nextStack)
      ) as unknown) as SampledEvaluationResult<ProgramState>;
      const extractedSamples = extractSamplesFromReductionTrace<ProgramState>(
        result.reduce
      );
      const spaced = addSpacersToTraceSamples<ProgramState>([
        ...next.samples,
        ...extractedSamples
      ]);
      const reduced: Evaluation<ProgramState> = reduceSpacedTraceSamples<
        ProgramState
      >(spaced, createEmptyProgramState, nextLine);
      nextLine = { ...reduced[reduced.length - 1] };
      evaluations.push(reduced);

      if (next.success === false) {
        /**
         * Bail out on failed evaluations (no need to start evaluating the next,
         * the last state of this frame is already invalid).
         */
        break;
      }
      nextStack = next.samples[next.samples.length - 1].state.stack;
    }

    const scriptEditorEvaluationTrace = evaluationOrderedScripts.map(
      script => script.internalId
    );
    const scriptEditorEvaluationSource = evaluationOrderedScripts.map(
      script => script.script
    );

    const scriptEditorFrames = evaluationOrderedScripts.map<
      ScriptEditorFrame<ProgramState>
    >((source, i) => ({
      id: source.id,
      internalId: source.internalId,
      name: source.name,
      script: source.script,
      scriptType: source.scriptType,
      compilation: evaluationOrderedCompilationResults[i],
      evaluation: evaluations[i]
    }));

    /**
     * Add our highlights if more than 1 frame is present:
     */
    if (scriptEditorFrames.length > 1) {
      const evaluation =
        scriptEditorFrames[scriptEditorFrames.length - 1].evaluation;
      if (evaluation !== undefined) {
        const lastLine = evaluation[evaluation.length - 1];
        if (
          lastLine.state.stack.length > 0 &&
          lastLine.state.stack[lastLine.state.stack.length - 1][0] === 1
        ) {
          if (lastLine.state.stack.length > 1) {
            lastLine.highlight = EvaluationViewerHighlight.dirtyStack;
          } else {
            lastLine.highlight = EvaluationViewerHighlight.success;
          }
        } else {
          lastLine.highlight = EvaluationViewerHighlight.fail;
        }
      }
    }

    /**
     * Map variable InternalIds to entity InternalIds
     */
    const variableOwnership: {
      [variableInternalId: string]: string;
    } = Object.entries(state.currentTemplate.entitiesByInternalId).reduce(
      (previous, [entityInternalId, content]) =>
        content.variableInternalIds
          .map(variableInternalId => ({
            [variableInternalId]: entityInternalId
          }))
          .reduce((done, next) => ({ ...done, ...next }), { ...previous }),
      {}
    );
    const variableDetails: VariableDetails = Object.entries(
      state.currentTemplate.variablesByInternalId
    ).reduce((variables, [internalId, variable]) => {
      const entity =
        state.currentTemplate.entitiesByInternalId[
          variableOwnership[internalId]
        ];
      return {
        ...variables,
        [variable.id]: {
          variable,
          entity: { name: entity.name, id: entity.id }
        }
      };
    }, {});

    const resolvedIdentifiers = evaluationOrderedCompilationResults.reduce<
      ResolvedIdentifier[]
    >(
      (vars, result) =>
        result.success === true
          ? [...vars, ...getResolvedIdentifier(result.resolve)]
          : vars,
      []
    );

    const identifyStackItems = createStackItemIdentificationFunction(
      resolvedIdentifiers
    );

    const scriptDetails = Object.values(
      state.currentTemplate.scriptsByInternalId
    )
      .filter(
        ideScript =>
          ideScript.type !== 'test-setup' && ideScript.type !== 'test-check'
      )
      .reduce(
        (scripts, ideScript) => ({ ...scripts, [ideScript.id]: ideScript }),
        {}
      );

    return {
      editorMode,
      identifyStackItems,
      isP2sh,
      scriptDetails,
      scriptEditorEvaluationTrace,
      scriptEditorEvaluationSource,
      scriptEditorFrames,
      variableDetails
    };
  } catch (e) {
    console.error('Encountered an unexpected compiler error:', e);
    return { editorMode: ProjectEditorMode.loading };
  }
};
