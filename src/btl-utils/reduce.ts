import {
  StackState,
  ExecutionStackState,
  range,
  ScriptReductionTraceChildNode,
  ScriptReductionTraceEvaluationNode,
  ScriptReductionTraceContainerNode,
  FlattenedTraceSample,
  Range
} from 'bitcoin-ts';
import {
  EvaluationViewerSpacer,
  EvaluationViewerLine,
  Evaluation,
  IDESupportedProgramState
} from '../editor/editor-types';

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
