import React from 'react';
import './EvaluationViewer.scss';
import { binToHex, parseBytesAsScriptNumber, stringify } from 'bitcoin-ts';
import * as bitcoinTs from 'bitcoin-ts';
import {
  Evaluation,
  EvaluationViewerHighlight,
  EvaluationViewerSpacer,
  StackItemIdentifyFunction,
  EvaluationViewerLine,
  IDESupportedProgramState
} from '../editor-types';
import { Tooltip, Popover } from '@blueprintjs/core';
import { unknownValue } from '../../utils';

(window as any).b = bitcoinTs;

// cspell:ignore cbitcoin cwindow
console.log(
  `%cWelcome to BitAuth IDE!
  
%cThe %cbitcoin-ts%c library is available at %cb%c (%cwindow.b%c).
You can click a line in the evaluation viewer to inspect the program state at that point in the evaluation.

%cTip: to quickly stringify an object which %cJSON.stringify%c doesn't support, try %cb.stringify%c.`,
  'font-weight: bold;',
  '',
  'color: #2a5b8b; font-weight: bold;',
  '',
  'color: #cb1b15; font-weight: bold;',
  '',
  'color: #cb1b15; font-weight: bold;',
  '',
  'color: #888; font-style: italic;',
  'color: #cb1b15; font-weight: bold; font-style: italic;',
  'color: #888; font-style: italic;',
  'color: #cb1b15; font-weight: bold; font-style: italic;',
  'color: #888; font-style: italic;'
);

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

const stackItem = (itemIndex: number, hex: string, content: JSX.Element) => (
  <Popover key={itemIndex} content={hex} portalClassName="stack-popover">
    <Tooltip content={hex} portalClassName="stack-tooltip">
      {content}
    </Tooltip>
  </Popover>
);

const EvaluationLine = ({
  line,
  lineIndex,
  error,
  lookup
}: {
  lineIndex: number;
  line: EvaluationViewerLine<IDESupportedProgramState>;
  error: Errors;
  lookup: StackItemIdentifyFunction;
}) => (
  <div
    className={
      line.highlight === EvaluationViewerHighlight.success
        ? 'state highlight success'
        : line.highlight === EvaluationViewerHighlight.dirtyStack
        ? 'state highlight dirty-stack'
        : line.highlight === EvaluationViewerHighlight.fail
        ? 'state highlight fail'
        : 'state'
    }
    onClick={() => {
      console.log(`ProgramState after line #${lineIndex}:`);
      console.dir(line.state);
    }}
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
            return stackItem(
              itemIndex,
              hex,
              <span className="stack-item named">{name}</span>
            );
          }
          const number = parseBytesAsScriptNumber(item);
          if (typeof number === 'bigint') {
            return stackItem(
              itemIndex,
              hex,
              <span className="stack-item number">{`${number}`}</span>
            );
          }
          return stackItem(
            itemIndex,
            hex,
            <span className="stack-item hex">{hex}</span>
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
                  lineIndex={0}
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
                      lineIndex={lineIndex + 1}
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
