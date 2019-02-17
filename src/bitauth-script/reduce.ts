import { Range, ResolvedScript } from './resolve';
import {
  StackState,
  AuthenticationVirtualMachine,
  AuthenticationInstruction,
  prefixDataPush,
  parseScript,
  flattenBinArray,
  createBitcoinCashProgramState,
  ParsedAuthenticationInstruction,
  authenticationInstructionsAreMalformed,
  MinimumProgramState,
  ExecutionStackState,
  range,
  createEmptyCommonExternalProgramState,
  BitcoinCashOpcodes,
  disassembleParsedAuthenticationInstructions,
  disassembleScriptBCH,
  authenticationInstructionsAreNotMalformed,
  disassembleScript
} from 'bitcoin-ts';
import { node } from 'prop-types';
import {
  EvaluationViewerSpacer,
  EvaluationViewerLine,
  Evaluation,
  IDESupportedProgramState
} from '../editor/editor-types';
import { ErrorInformation } from './errors';
import { CommonOpcodes } from 'bitcoin-ts/build/main/lib/auth/instruction-sets/common/opcodes';

const pluckStartPosition = (range: Range) => ({
  startColumn: range.startColumn,
  startLineNumber: range.startLineNumber
});

const pluckEndPosition = (range: Range) => ({
  endColumn: range.endColumn,
  endLineNumber: range.endLineNumber
});

const mergeRanges = (ranges: Range[]) => {
  const unsortedMerged = ranges.reduce<Range>((merged, range) => {
    return {
      ...(range.startLineNumber < merged.startLineNumber
        ? pluckStartPosition(range)
        : range.startLineNumber === merged.startLineNumber &&
          range.startColumn < merged.startColumn
        ? pluckStartPosition(range)
        : pluckStartPosition(merged)),
      ...(range.endLineNumber > merged.endLineNumber
        ? pluckEndPosition(range)
        : range.endLineNumber === merged.endLineNumber &&
          range.endColumn > merged.endColumn
        ? pluckEndPosition(range)
        : pluckEndPosition(merged))
    };
  }, ranges[0]);
  return {
    ...pluckStartPosition(unsortedMerged),
    ...pluckEndPosition(unsortedMerged)
  };
};

export interface ScriptReductionTraceNode {
  bytecode: Uint8Array;
  range: Range;
  errors?: ErrorInformation[] | undefined;
}
interface ScriptReductionTraceErrorNode extends ScriptReductionTraceNode {
  errors?: ErrorInformation[];
}

export interface ScriptReductionTraceContainerNode<ProgramState>
  extends ScriptReductionTraceNode {
  source: ScriptReductionTraceChildNode<ProgramState>[];
}

export type ScriptReductionTraceChildNode<ProgramState> =
  | ScriptReductionTraceNode
  | ScriptReductionTraceContainerNode<ProgramState>
  | ScriptReductionTraceErrorNode
  | ScriptReductionTraceEvaluationNode<ProgramState>;

export interface TraceSample<ProgramState> {
  state: ProgramState;
  range: Range;
}

export interface ScriptReductionTraceEvaluationNode<ProgramState>
  extends ScriptReductionTraceContainerNode<ProgramState> {
  samples: Array<TraceSample<ProgramState>>;
}

const emptyReductionTraceNode = (range: Range) => ({
  bytecode: Uint8Array.of(),
  range
});

/**
 * This method will throw an error if provided a `compiledScript` with
 * compilation errors. To check for compilation errors, use `getCompileErrors`.
 * @param compiledScript the `CompiledScript` to reduce
 * @param vm the `AuthenticationVirtualMachine` to use for evaluations
 * @param state the base `ProgramState` to use when initializing evaluations
 */
export const reduceScript = <
  ProgramState extends StackState & MinimumProgramState<Opcodes>,
  Opcodes
>(
  compiledScript: ResolvedScript,
  vm?: AuthenticationVirtualMachine<ProgramState>,
  createState?: (
    instructions: ReadonlyArray<AuthenticationInstruction<Opcodes>>
  ) => ProgramState
): ScriptReductionTraceContainerNode<ProgramState> => {
  const source = compiledScript.map<
    ScriptReductionTraceChildNode<ProgramState>
  >(segment => {
    switch (segment.type) {
      case 'bytecode':
        return { bytecode: segment.value, range: segment.range };
      case 'push':
        if (segment.value.length === 0) {
          return emptyReductionTraceNode(segment.range);
        }
        const push = reduceScript(segment.value, vm, createState);
        const bytecode = prefixDataPush(push.bytecode);
        return {
          bytecode,
          ...(push.errors && { errors: push.errors }),
          range: segment.range,
          source: [push]
        };
      case 'evaluation':
        if (segment.value.length === 0) {
          return emptyReductionTraceNode(segment.range);
        }
        if (typeof vm === 'undefined' || typeof createState === 'undefined') {
          return {
            errors: [
              {
                error:
                  'Both a VM and a createState method are required to reduce evaluations.',
                range: segment.range
              }
            ],
            ...emptyReductionTraceNode(segment.range)
          };
        }
        const reduction = reduceScript(segment.value, vm, createState);
        const evaluated = sampledEvaluateReductionTraceNodes(
          reduction.source,
          vm,
          createState
        );
        const errors = [
          ...(reduction.errors !== undefined ? reduction.errors : []),
          ...(evaluated.success === false ? evaluated.errors : [])
        ];
        return {
          ...(errors.length > 0
            ? {
                errors,
                ...emptyReductionTraceNode(segment.range)
              }
            : {
                bytecode: evaluated.bytecode,
                range: segment.range
              }),
          samples: evaluated.samples,
          source: [reduction]
        };
      case 'comment':
        return emptyReductionTraceNode(segment.range);
      case 'error':
        return {
          errors: [
            {
              error: `Tried to reduce a BitAuth script with resolution errors: ${
                segment.value
              }`,
              range: segment.range
            }
          ],
          ...emptyReductionTraceNode(segment.range)
        };
    }
  });
  const reduction = source.reduce<{
    errors?: ErrorInformation[] | undefined;
    bytecode: Uint8Array[];
    ranges: Range[];
  }>(
    (all, segment) => ({
      bytecode: [...all.bytecode, segment.bytecode],
      ranges: [...all.ranges, segment.range],
      ...((all.errors !== undefined || segment.errors !== undefined) && {
        errors: [
          ...(all.errors === undefined ? [] : all.errors),
          ...(segment.errors === undefined ? [] : segment.errors)
        ]
      })
    }),
    { bytecode: [], ranges: [] }
  );
  return {
    ...(reduction.errors && { errors: reduction.errors }),
    bytecode: flattenBinArray(reduction.bytecode),
    range: mergeRanges(reduction.ranges),
    source
  };
};

export interface InstructionAggregation<Opcodes> {
  instructions: AuthenticationInstruction<Opcodes>[];
  range: Range;
  lastIp: number;
}

export interface InstructionAggregationSuccess<Opcodes> {
  success: true;
  aggregations: InstructionAggregation<Opcodes>[];
}

export interface InstructionAggregationError<Opcodes> {
  success: false;
  remainingBytecode: Uint8Array;
  remainingRange: Range;
  aggregations: InstructionAggregation<Opcodes>[];
}

export type InstructionAggregationResult<Opcodes> =
  | InstructionAggregationSuccess<Opcodes>
  | InstructionAggregationError<Opcodes>;

export interface EvaluationSample<ProgramState> {
  state: ProgramState | undefined;
  range: Range;
}

export interface EvaluationSampleValid<ProgramState> {
  state: ProgramState;
  range: Range;
}

export interface InstructionAggregationEvaluationError<ProgramState> {
  success: false;
  errors: ErrorInformation[];
  samples: EvaluationSample<ProgramState>[];
}

export interface InstructionAggregationEvaluationSuccess<ProgramState> {
  success: true;
  samples: EvaluationSampleValid<ProgramState>[];
}

type InstructionAggregationEvaluationResult<ProgramState> =
  | InstructionAggregationEvaluationError<ProgramState>
  | InstructionAggregationEvaluationSuccess<ProgramState>;

/**
 * Evaluate an array of `InstructionAggregation`s with the provided
 * `AuthenticationVirtualMachine`, matching the results back to their source
 * ranges.
 */
export const evaluateInstructionAggregations = <
  Opcodes,
  ProgramState extends MinimumProgramState<Opcodes> & { error?: string }
>(
  aggregations: ReadonlyArray<InstructionAggregation<Opcodes>>,
  vm: AuthenticationVirtualMachine<ProgramState>,
  getState: (
    instructions: ReadonlyArray<AuthenticationInstruction<Opcodes>>
  ) => ProgramState
): InstructionAggregationEvaluationResult<ProgramState> => {
  const nonEmptyAggregations = aggregations.filter(
    aggregation => aggregation.instructions.length > 0
  );
  const evaluationPlan = nonEmptyAggregations.reduce<{
    instructions: AuthenticationInstruction<Opcodes>[];
    breakpoints: { ip: number; range: Range }[];
  }>(
    (plan, aggregation) => {
      const instructions = [...plan.instructions, ...aggregation.instructions];
      return {
        instructions,
        breakpoints: [
          ...plan.breakpoints,
          { ip: aggregation.lastIp, range: aggregation.range }
        ]
      };
    },
    { instructions: [], breakpoints: [] }
  );
  const trace = vm.debug(getState(evaluationPlan.instructions));
  const samples = evaluationPlan.breakpoints.map<
    EvaluationSample<ProgramState>
  >(breakpoint => ({
    state: trace[breakpoint.ip - 1],
    range: breakpoint.range
  }));
  const firstInvalidSample = samples.findIndex(
    sample => sample.state === undefined
  );
  const errorSample = samples[firstInvalidSample - 1];
  return errorSample === undefined
    ? {
        success: true,
        samples: samples as EvaluationSampleValid<ProgramState>[]
      }
    : {
        success: false,
        samples,
        errors: [
          {
            error:
              errorSample.state === undefined
                ? `Failed to reduce evaluation: vm.debug produced no valid program states.`
                : `Failed to reduce evaluation: ${errorSample.state.error}`,
            range: errorSample.range
          }
        ]
      };
};

export const emptySignatureGenerationData = createEmptyCommonExternalProgramState();

export const createProgramStateGenerator = <Opcodes>(
  stack: Uint8Array[] = []
) => (instructions: ReadonlyArray<AuthenticationInstruction<Opcodes>>) =>
  createBitcoinCashProgramState(
    instructions,
    stack,
    emptySignatureGenerationData
  );

/**
 * Aggregate instructions to build groups of non-malformed instructions.
 *
 * --- TODO: delete old stuff below? ––-
 *
 * So users can write constructions like `OP_PUSHBYTES_2 0x0102` which will
 * evaluate successfully, but instructions which must read over a new-line to
 * make sense (e.g. `OP_PUSHBYTES_2\n0x0102`) should error. This allows for a
 * nice omniscient-debugging experience.
 *
 * **This makes new lines important in evaluations.** However, things
 * can only "break" when new lines are inserted, not when they are removed (e.g.
 * if a script is "minified" to a single line for deployment.)
 *
 * **Implementation note**
 * This method aggregates arrays of instructions by line... a little like
 * Automatic Semicolon Insertion in ECMAScript. 👀 In fact, that's a good
 * sign that we're missing a useful language construct here. Maybe instead
 * of this algorithm, we need a new type of wrapper in the language to indicate
 * that bytecode segments are intended to go together.
 *
 * Interestingly, we already use "Containers" in both pushes and evaluations, so
 * this might be quite easy. E.g. wrapping with `()` or `{}`. However, we also
 * want disassembled instructions to be valid input in BitAuth Script, so some
 * form of this line-based logic will still be required unless we also change
 * script disassembly form. E.g. instead of `OP_PUSHBYTES_2 0x0102`, something
 * like `(OP_PUSHBYTES_2 0x0102)` or `<0x0102>`. This is something to consider
 * in future versions.
 */
const aggregatedParseReductionTraceNodes = <Opcodes>(
  nodes: ReadonlyArray<ScriptReductionTraceNode>
): InstructionAggregationResult<Opcodes> => {
  const aggregations: InstructionAggregation<Opcodes>[] = [];
  let ip = 0;
  let incomplete: { range: Range; bytecode: Uint8Array } | undefined;
  for (const node of nodes) {
    const bytecode =
      incomplete !== undefined
        ? flattenBinArray([incomplete.bytecode, node.bytecode])
        : node.bytecode;
    const range =
      incomplete !== undefined
        ? mergeRanges([incomplete.range, node.range])
        : node.range;
    incomplete = undefined;
    const parsed = parseScript<Opcodes>(bytecode);
    if (parsed.length === 0) {
      aggregations.push({
        instructions: [],
        range,
        lastIp: ip
      });
    } else if (authenticationInstructionsAreNotMalformed(parsed)) {
      ip = ip + parsed.length;
      aggregations.push({
        instructions: parsed,
        range,
        lastIp: ip
      });
    } else {
      incomplete = { bytecode, range };
    }
  }
  return {
    aggregations,
    success: true,
    ...(incomplete !== undefined && {
      success: false,
      remainingBytecode: incomplete.bytecode,
      remainingRange: incomplete.range
    })
  };
};

export interface SampledEvaluationSuccess<ProgramState> {
  success: true;
  bytecode: Uint8Array;
  samples: EvaluationSampleValid<ProgramState>[];
}
export interface SampledEvaluationError<ProgramState> {
  success: false;
  errors: ErrorInformation[];
  bytecode: Uint8Array;
  samples: EvaluationSample<ProgramState>[];
}

export type SampledEvaluationResult<ProgramState> =
  | SampledEvaluationSuccess<ProgramState>
  | SampledEvaluationError<ProgramState>;

/**
 * Incrementally evaluate an array of `ScriptReductionTraceNode`s, returning a
 * trace of the evaluation and the resulting top stack item (`evaluationResult`)
 * if successful.
 *
 * @param nodes an array of reduced nodes (from a returned `source` of
 * `reduceBitAuthScript`)
 * @param vm the `AuthenticationVirtualMachine` to use in the evaluation
 * @param getState a method which should generate a new ProgramState given an
 * array of `instructions`
 */
export const sampledEvaluateReductionTraceNodes = <
  Opcodes,
  ProgramState extends MinimumProgramState<Opcodes> &
    StackState & { error?: string }
>(
  nodes: ReadonlyArray<ScriptReductionTraceNode>,
  vm: AuthenticationVirtualMachine<ProgramState>,
  getState: (
    instructions: ReadonlyArray<AuthenticationInstruction<Opcodes>>
  ) => ProgramState
): SampledEvaluationResult<ProgramState> => {
  const parsed = aggregatedParseReductionTraceNodes<Opcodes>(nodes);
  const evaluated = evaluateInstructionAggregations(
    parsed.aggregations,
    vm,
    getState
  );
  if (
    parsed.success === true &&
    evaluated.success === true &&
    evaluated.samples.length > 0
  ) {
    const lastSample = evaluated.samples[evaluated.samples.length - 1];
    const lastStackItem =
      lastSample.state.stack[lastSample.state.stack.length - 1];
    const evaluationResult =
      lastStackItem !== undefined ? lastStackItem.slice() : Uint8Array.of();
    return {
      success: true,
      bytecode: evaluationResult,
      samples: evaluated.samples
    };
  }
  return {
    success: false,
    bytecode: Uint8Array.of(),
    errors: [
      ...(parsed.success
        ? []
        : [
            {
              error: `A sample is malformed and cannot be evaluated: ${disassembleScript(
                CommonOpcodes,
                parsed.remainingBytecode
              )}`,
              range: parsed.remainingRange
            }
          ]),
      ...(evaluated.success ? [] : evaluated.errors)
    ],
    samples: evaluated.samples
  };
};

export interface FlattenedTraceSample<ProgramState>
  extends TraceSample<ProgramState> {
  /**
   * The nesting-depth of this sample. (E.g. the first level of evaluation has a
   * depth of `1`, an evaluation inside of it will produce samples with a depth
   * of `2`, etc.)
   */
  depth: number;
}

const isEvaluationNode = <ProgramState>(
  node: ScriptReductionTraceChildNode<ProgramState>
): node is ScriptReductionTraceEvaluationNode<ProgramState> =>
  (node as ScriptReductionTraceEvaluationNode<ProgramState>).samples !==
  undefined;

const isContainerNode = <ProgramState>(
  node: ScriptReductionTraceChildNode<ProgramState>
): node is ScriptReductionTraceContainerNode<ProgramState> =>
  (node as ScriptReductionTraceContainerNode<ProgramState>).source !==
  undefined;

/**
 * This method crawls through `node` to pull out samples from any evaluations
 * which occurred when reducing the script (and marking them with the depth at
 * which they were found).
 *
 * TODO: insert a "dummy" sample at the beginning of each evaluation to ensure
 * the line displays the evaluation spacer (if there are no further samples on a
 * line after the beginning of an evaluation).
 *
 * @param node
 * @param depth
 */
export const extractSamplesFromReductionTrace = <ProgramState>(
  node: ScriptReductionTraceChildNode<ProgramState>,
  depth = 1
): FlattenedTraceSample<ProgramState>[] =>
  isEvaluationNode(node)
    ? [
        ...node.samples.map(sample => ({
          depth,
          range: sample.range,
          state: sample.state
        })),
        ...node.source
          .map(child =>
            extractSamplesFromReductionTrace<ProgramState>(child, depth + 1)
          )
          .flat()
      ]
    : isContainerNode(node)
    ? [
        ...node.source
          .map(child =>
            extractSamplesFromReductionTrace<ProgramState>(child, depth)
          )
          .flat()
      ]
    : [];

interface SpacedTraceSample<ProgramState> {
  range: Range;
  state: ProgramState;
  spacers: EvaluationViewerSpacer[];
}

/**
 * This method sorts an array of trace samples and adds an array of the
 * proper `EvaluationViewerSpacer`s for each sample. The result of this method
 * can be further reduced into an array of `EvaluationViewerLine`s.
 *
 * Note, this method's implementation relies upon receiving all of the
 * evaluation samples from a given script – both those extracted from the
 * `ScriptReductionTrace` and the samples returned from passing the resulting
 * script to `incrementallyEvaluateReductionTraceNodes`. Samples with undefined
 * `state`s are simply dropped from the result (since their absence implies an
 * earlier error).
 *
 * **Implementation Notes**
 *
 * This method can be hard to reason about because we're simultaneously
 * reducing samples from a potentially large number of nested evaluations where
 * results of inner-evaluations are being used by their parents.
 *
 * Since we're receiving all the trace samples from a given script, we can
 * rely on ordering information to make this much simpler.
 *
 * With each next sample, the nesting-depth of evaluations can only change by 1
 * (+1 or -1). So each time we add to the depth, we begin with the spacers from
 * the previous level, add an evaluation spacer, and continue building spacers
 * on that level. When we fall back a level, we revert back to the most recent
 * spacer array from that level.
 *
 * Beyond evaluation spacers, the structure of `ExecutionStackState` makes
 * calculating the conditional spacers extremely easy – the array of `true` and
 * `false` values maps exactly to an array of "executed" and "skipped" spacers.
 * If we're currently in a nested evaluation, these conditional spacers simply
 * get stacked on top of the evaluation spacer for this level and any prefix
 * spacers carried over from the previous level.
 *
 * @param samples
 */
export const addSpacersToTraceSamples = <
  ProgramState extends StackState & ExecutionStackState
>(
  samples: {
    depth?: number;
    state?: ProgramState;
    range: Range;
  }[]
) => {
  const sorted = samples.sort((a, b) => {
    const line = a.range.startLineNumber - b.range.startLineNumber;
    return line === 0 ? a.range.startColumn - b.range.endColumn : line;
  });
  let results: SpacedTraceSample<ProgramState>[] = [];
  let previousSpacers: EvaluationViewerSpacer[] = [];
  let cachedSpacersByDepth: EvaluationViewerSpacer[][] = [[]];
  for (const sample of sorted) {
    let depth = sample.depth || 0;
    const cachedDepth = cachedSpacersByDepth.length - 1;
    if (sample.state) {
      if (depth > cachedDepth) {
        cachedSpacersByDepth.push([
          ...previousSpacers,
          EvaluationViewerSpacer.evaluation
        ]);
      } else if (depth < cachedDepth) {
        cachedSpacersByDepth.pop();
      }
      const spacers = [
        ...cachedSpacersByDepth[depth],
        ...sample.state.executionStack.map(executed =>
          executed
            ? EvaluationViewerSpacer.executedConditional
            : EvaluationViewerSpacer.skippedConditional
        )
      ];
      const firstSkippedConditional = spacers.indexOf(
        EvaluationViewerSpacer.skippedConditional
      );
      const activeSpacers =
        firstSkippedConditional !== -1
          ? spacers.slice(0, firstSkippedConditional + 1)
          : spacers;
      results.push({
        range: sample.range,
        state: sample.state,
        spacers: activeSpacers
      });
      previousSpacers = spacers;
    }
  }
  return results;
};

/**
 * The final transformation to prepare `SpacedTraceSamples` for viewing in the
 * `EvaluationViewer`. This method selects the last sample for each line,
 * duplicating the previous line's spacers for lines with no samples.
 */
export const reduceSpacedTraceSamples = <
  ProgramState extends IDESupportedProgramState
>(
  spacedSamples: SpacedTraceSample<ProgramState>[],
  getEmptyState: () => ProgramState,
  initialSample: EvaluationViewerLine<ProgramState> = { state: getEmptyState() }
): Evaluation<ProgramState> => {
  const lineEndingSamples = spacedSamples.reduce<typeof spacedSamples>(
    (lines, sample) => {
      const i = sample.range.endLineNumber - 1;
      const current = lines[i];
      lines[i] =
        current === undefined ||
        current.range.endColumn < sample.range.endColumn
          ? sample
          : current;
      return lines;
    },
    []
  );
  const expectedLength = lineEndingSamples.length;
  return range(expectedLength).reduce<EvaluationViewerLine<ProgramState>[]>(
    (lines, i) => {
      const previousLine = lines[i];
      return [
        ...lines,
        lineEndingSamples[i] !== undefined
          ? {
              state: lineEndingSamples[i].state,
              spacers: lineEndingSamples[i].spacers
            }
          : {
              state: getEmptyState(),
              ...(previousLine.spacers && {
                spacers: [...previousLine.spacers]
              })
            }
      ];
    },
    [initialSample]
  );
};
