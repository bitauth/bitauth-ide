import React from 'react';
import './EvaluationViewer.scss';
import { binToHex, parseBytesAsScriptNumber } from 'bitcoin-ts';
import {
  Evaluation,
  EvaluationViewerHighlight,
  EvaluationViewerSpacer,
  StackItemIdentifyFunction,
  EvaluationViewerLine,
  IDESupportedProgramState
} from '../editor-types';
import { Tooltip } from '@blueprintjs/core';
import { unknownValue } from '../../utils';

enum Errors {
  none,
  /**
   * the current like has an error.
   */
  current,
  /**
   * A previous line already displayed an error.
   */
  past
}

const EvaluationLine = ({
  line,
  error,
  lookup
}: {
  line: EvaluationViewerLine<IDESupportedProgramState>;
  error: Errors;
  lookup: StackItemIdentifyFunction;
}) => (
  <div
    className={
      line.highlight === EvaluationViewerHighlight.success
        ? 'state success'
        : 'state'
    }
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
    {error === Errors.current ? (
      <span title={line.state.error} className="stack-item error">
        {line.state.error}
      </span>
    ) : error === Errors.past ? (
      <span className="stack-item past-error" />
    ) : error === Errors.none ? (
      line.spacers &&
      line.spacers.indexOf(EvaluationViewerSpacer.skippedConditional) !== -1 ? (
        <span className="unchanged" />
      ) : (
        line.state.stack.map((item, itemIndex) => {
          const name = lookup(item);
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
      )
    ) : (
      unknownValue(error)
    )}
  </div>
);

interface EvaluationViewerProps {
  evaluation?: Evaluation;
  id: string;
  lookup?: StackItemIdentifyFunction;
  script: string;
  scrollOffset: number;
}

interface EvaluationViewerState extends EvaluationViewerProps {
  evaluation: Evaluation;
  lookup: StackItemIdentifyFunction;
}
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
    lookup: () => false,
    scrollOffset: 0
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
        script: state.script,
        scrollOffset: props.scrollOffset
      };
    } else {
      return {
        evaluation: props.evaluation || [],
        id: props.id,
        lookup: props.lookup || (() => false),
        script: props.script,
        scrollOffset: props.scrollOffset
      };
    }
  }

  render() {
    return (
      <div className="EvaluationViewer">
        <div
          className={this.props.script === this.state.script ? '' : 'cached'}
        >
          {this.state.evaluation.length > 0 && (
            <div>
              <div
                className={`initial-state ${
                  this.state.scrollOffset !== 0 ? 'scroll-decoration' : ''
                }`}
              >
                <EvaluationLine
                  line={this.state.evaluation[0]}
                  error={Errors.none}
                  lookup={this.state.lookup}
                />
              </div>

              <div
                className="evaluation"
                style={{ marginTop: -this.state.scrollOffset }}
              >
                {this.state.evaluation
                  .slice(1)
                  .map((line, lineIndex, lines) => (
                    <EvaluationLine
                      key={lineIndex}
                      line={line}
                      error={
                        line.state && line.state.error
                          ? lines[lineIndex - 1] &&
                            lines[lineIndex - 1].state &&
                            typeof lines[lineIndex - 1].state.error === 'string'
                            ? Errors.past
                            : Errors.current
                          : Errors.none
                      }
                      lookup={this.state.lookup}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}
