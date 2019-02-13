import {
  CompilationEnvironment,
  CompilationData,
  resolveScriptSegment,
  createIdentifierResolver,
  IdentifierResolutionFunction,
  ResolvedScript
} from './resolve';
import { parseBitAuthScript, BitAuthScriptSegment } from './parse';
import { Range } from './resolve';
import { getResolutionErrors } from './errors';
import { reduceScript, ScriptReductionTraceContainerNode } from './reduce';
import { StackState, MinimumProgramState } from 'bitcoin-ts';

export interface CompilationResultResolve {
  parse: BitAuthScriptSegment;
  resolve: ResolvedScript;
}

export interface CompilationResultReduce<ProgramState>
  extends CompilationResultResolve {
  reduce: ScriptReductionTraceContainerNode<ProgramState>;
}

export interface CompilationResultErrorBase {
  success: false;
  errorType: string;
  errors: CompilationError[];
}

export interface CompilationError {
  error: string;
  range: Range;
}

export interface CompilationResultParseError
  extends CompilationResultErrorBase {
  errorType: 'parse';
  /**
   * The `parse` stage produces only a single parse error at a time.
   */
  errors: [CompilationError];
}
export interface CompilationResultResolveError
  extends CompilationResultResolve,
    CompilationResultErrorBase {
  errorType: 'resolve';
}

export interface CompilationResultReduceError<ProgramState>
  extends CompilationResultReduce<ProgramState>,
    CompilationResultErrorBase {
  errorType: 'reduce';
}

export type CompilationResultError<ProgramState> =
  | CompilationResultParseError
  | CompilationResultResolveError
  | CompilationResultReduceError<ProgramState>;

export interface CompilationResultSuccess<ProgramState>
  extends CompilationResultReduce<ProgramState> {
  success: true;
  bytecode: Uint8Array;
}

export type CompilationResult<
  ProgramState = StackState & MinimumProgramState
> =
  | CompilationResultSuccess<ProgramState>
  | CompilationResultError<ProgramState>;

/**
 * Parse, resolve, and reduce the provided BitAuth script using the provided
 * `context` and `data`.
 */
export const compileScript = (
  script: string,
  data: CompilationData,
  environment: CompilationEnvironment
): CompilationResult => {
  if (script.length === 0) {
    return {
      success: false,
      errorType: 'parse',
      errors: [
        {
          error: 'Tried to compile an empty string as a script.',
          range: {
            startLineNumber: 0,
            startColumn: 0,
            endLineNumber: 0,
            endColumn: 0
          }
        }
      ]
    };
  }
  const parseResult = parseBitAuthScript(script);
  if (parseResult.status === false) {
    return {
      success: false,
      errorType: 'parse',
      errors: [
        {
          error: `Encountered unexpected input while parsing script. Expected ${parseResult.expected.join(
            ', '
          )}`,
          range: {
            startLineNumber: parseResult.index.line,
            startColumn: parseResult.index.line,
            endLineNumber: parseResult.index.line,
            endColumn: parseResult.index.line
          }
        }
      ]
    };
  }
  console.log('parseResult');
  console.dir(parseResult);
  const resolver = createIdentifierResolver(
    undefined,
    data,
    environment
  ) as IdentifierResolutionFunction;
  const resolvedScript = resolveScriptSegment(parseResult.value, resolver);
  const resolutionErrors = getResolutionErrors(resolvedScript);
  if (resolutionErrors.length !== 0) {
    return {
      success: false,
      errorType: 'resolve',
      errors: resolutionErrors,
      parse: parseResult.value,
      resolve: resolvedScript
    };
  }
  const reduction = reduceScript(
    resolvedScript,
    environment.vm,
    environment.createState
  );
  console.log('reduction');
  console.dir(reduction);
  // TODO:
  // const reductionErrors = getReductionErrors();
  //  { success: true } or { success: false }
  return {
    success: true,
    bytecode: reduction.bytecode,
    parse: parseResult.value,
    resolve: resolvedScript,
    reduce: reduction
  };
};
