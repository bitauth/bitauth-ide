import React from 'react';
import './EvaluationViewer.scss';
import { binToHex, parseBytesAsScriptNumber } from 'bitcoin-ts';
import {
  Evaluation,
  EvaluationViewerHighlight,
  EvaluationViewerSpacer,
  StackItemIdentifyFunction
} from '../editor-types';
import { Tooltip } from '@blueprintjs/core';

// ({
//   evaluation,
//   lookup
// }: {
//   evaluation?: Evaluation;
//   lookup: StackItemIdentifyFunction;
//   // TODO: ability to toggle scriptNumber conversion?
// }) => {};

interface EvaluationViewerProps {
  evaluation?: Evaluation;
  id: string;
  lookup: StackItemIdentifyFunction;
  script: string;
}

interface EvaluationViewerState extends EvaluationViewerProps {
  evaluation: Evaluation;
}
/**
 * We retain most of the state from the last evaluation, but update
 * script so we can know whether we're looking at live or saved data.
 */

/**
 * EvaluationViewers are slightly stateful in that they remember the last
 * evaluation and continue displaying it (slightly dimmed) when parse and
 * resolve errors errors are occurring.
 */
export class EvaluationViewer extends React.Component<
  EvaluationViewerProps,
  EvaluationViewerState
> {
  state: EvaluationViewerState = {
    evaluation: [],
    id: '',
    script: '',
    lookup: () => false
  };
  static getDerivedStateFromProps(
    props: EvaluationViewerProps,
    state: EvaluationViewerState
  ): EvaluationViewerState {
    if (props.evaluation === undefined && state !== undefined) {
      return {
        evaluation: (state.id === props.id && state.evaluation) || [],
        id: state.id,
        lookup: state.lookup,
        script: state.script
      };
    } else {
      return {
        evaluation: props.evaluation || [],
        id: props.id,
        lookup: props.lookup,
        script: props.script
      };
    }
  }

  render() {
    return (
      <div className="EvaluationViewer">
        <div
          className={this.props.script === this.state.script ? '' : 'cached'}
        >
          {this.state.evaluation.map((line, lineIndex, lines) => (
            <div
              key={lineIndex}
              className={`${
                line.highlight === EvaluationViewerHighlight.success
                  ? 'success'
                  : ''
              } ${lineIndex === 0 ? 'initial-state' : 'state'}`}
            >
              {line.spacers &&
                line.spacers.map((type, index) => (
                  <span
                    key={index}
                    className={`spacer ${
                      type === EvaluationViewerSpacer.evaluation
                        ? 'evaluation'
                        : type === EvaluationViewerSpacer.executedConditional
                        ? 'conditional-executed'
                        : 'conditional-skipped'
                    }`}
                  >
                    &nbsp;
                  </span>
                ))}
              {line.state && line.state.error ? (
                lines[lineIndex - 1] &&
                lines[lineIndex - 1].state &&
                typeof lines[lineIndex - 1].state.error === 'string' ? (
                  <span key={lineIndex} className="stack-item past-error" />
                ) : (
                  <span
                    key={lineIndex}
                    title={line.state.error}
                    className="stack-item error"
                  >
                    {line.state.error}
                  </span>
                )
              ) : line.spacers &&
                line.spacers.indexOf(
                  EvaluationViewerSpacer.skippedConditional
                ) !== -1 ? (
                <span className="unchanged" />
              ) : (
                line.state.stack.map((item, itemIndex) => {
                  const name = this.state.lookup(item);
                  const hex = `0x${binToHex(item)}`;
                  if (name !== false) {
                    return (
                      <Tooltip
                        key={itemIndex}
                        content={hex}
                        portalClassName="stack-tooltip"
                        targetClassName="stack-tooltip-target"
                      >
                        <span className="stack-item named">{name}</span>
                      </Tooltip>
                    );
                  }
                  const number = parseBytesAsScriptNumber(item);
                  if (typeof number === 'bigint') {
                    return (
                      <Tooltip
                        key={itemIndex}
                        content={hex}
                        portalClassName="stack-tooltip"
                        targetClassName="stack-tooltip-target"
                      >
                        <span className="stack-item number">{`${number}`}</span>
                      </Tooltip>
                    );
                  }
                  return (
                    <Tooltip
                      key={itemIndex}
                      content={hex}
                      portalClassName="stack-tooltip"
                      targetClassName="stack-tooltip-target"
                    >
                      <span className="stack-item hex">{hex}</span>
                    </Tooltip>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
}
