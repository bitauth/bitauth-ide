import React, { useState } from 'react';
import './EvaluationViewer.scss';
import {
  binToHex,
  parseBytesAsScriptNumber,
  stringify,
  CompilationResult
} from 'bitcoin-ts';
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
  `%cWelcome to Bitauth IDE!
  
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
  lookup?: StackItemIdentifyFunction;
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
          const name = lookup ? lookup(item) : false;
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

export const EvaluationViewer = (props: {
  compilation: CompilationResult;
  evaluation?: Evaluation;
  evaluationTrace: string[];
  id: string;
  lookup?: StackItemIdentifyFunction;
  script: string;
  scrollOffset: number;
}) => {
  const [cachedEvaluation, setCachedEvaluation] = useState([] as Evaluation);
  const [cachedEvaluationTrace, setCachedEvaluationTrace] = useState(['']);
  const [cachedLookup, setCachedLookup] = useState<
    StackItemIdentifyFunction | undefined
  >(() => false as false);

  if (props.evaluationTrace.join() !== cachedEvaluationTrace.join()) {
    if (props.evaluation && props.evaluation.length !== 0) {
      setCachedEvaluation(props.evaluation);
      setCachedLookup(props.lookup);
    } else {
      setCachedEvaluation([]);
      setCachedLookup(() => false as false);
    }
    setCachedEvaluationTrace(props.evaluationTrace);
  }

  const useCached =
    typeof props.evaluation === 'undefined' && cachedEvaluation.length !== 0;
  const evaluation = useCached ? cachedEvaluation : props.evaluation;
  const lookup = useCached ? cachedLookup : props.lookup;

  return (
    <div className="EvaluationViewer">
      <div className={`content${useCached ? ' cached' : ''}`}>
        {evaluation && evaluation.length > 0 ? (
          <div>
            <div
              className={`header-bar ${
                props.scrollOffset !== 0 ? 'scroll-decoration' : ''
              }`}
            >
              <div className="header-bar-content">
                <EvaluationLine
                  line={evaluation[0]}
                  lineIndex={0}
                  error={Errors.none}
                  lookup={lookup}
                />
              </div>
            </div>

            <div
              className="evaluation"
              style={{ marginTop: -props.scrollOffset }}
            >
              {evaluation.slice(1).map((line, lineIndex, lines) => (
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
                  lookup={lookup}
                />
              ))}
            </div>
          </div>
        ) : props.compilation.success === false ? (
          <div className="compilation-error-without-cache">
            <div className="header-bar">
              <div className="header-bar-content">
                There{' '}
                {props.compilation.errors.length === 1
                  ? 'is an error'
                  : `are ${props.compilation.errors.length} errors`}{' '}
                preventing compilation:
              </div>
            </div>
            <ul className="list">
              {props.compilation.errors.map(({ error, range }) => (
                <li
                  key={`${error}${range.startLineNumber}${range.endLineNumber}${range.startColumn}${range.endColumn}`}
                >
                  <span className="error-message">{error}</span>
                  <span className="line-and-column">{`[${range.startLineNumber},${range.startColumn}]`}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="header-bar"></div>
        )}
      </div>
    </div>
  );
};
