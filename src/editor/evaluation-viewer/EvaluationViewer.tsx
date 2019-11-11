import React, { useState } from 'react';
import './EvaluationViewer.scss';
import {
  binToHex,
  parseBytesAsScriptNumber,
  CompilationResult
} from 'bitcoin-ts';
import * as bitcoinTs from 'bitcoin-ts';
import {
  Evaluation,
  EvaluationViewerHighlight,
  EvaluationViewerSpacer,
  StackItemIdentifyFunction,
  EvaluationViewerLine,
  IDESupportedProgramState,
  EvaluationViewerSettings
} from '../editor-types';
import { Tooltip, Popover, Button } from '@blueprintjs/core';
import { unknownValue } from '../../utils';
import { IconNames } from '@blueprintjs/icons';
import { ActionCreators } from '../../state/reducer';

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
  <Popover
    key={`${itemIndex}:${hex}`}
    content={hex}
    portalClassName="stack-popover"
  >
    <Tooltip content={hex} portalClassName="stack-tooltip">
      {content}
    </Tooltip>
  </Popover>
);

const abbreviationPrefixAndSuffixLength = 12;
const abbreviateStackItem = (hex: string) =>
  hex.length <= abbreviationPrefixAndSuffixLength * 2
    ? hex
    : `${hex.substring(
        0,
        abbreviationPrefixAndSuffixLength
      )}\u2026${hex.substring(
        hex.length - abbreviationPrefixAndSuffixLength,
        hex.length
      )}`;

const EvaluationLine = ({
  line,
  lineIndex,
  error,
  settings,
  lookup
}: {
  lineIndex: number;
  line: EvaluationViewerLine<IDESupportedProgramState>;
  error: Errors;
  settings: EvaluationViewerSettings;
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
        (settings.showAlternateStack
          ? line.state.alternateStack
          : line.state.stack
        ).map((item, itemIndex) => {
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
          if (typeof number === 'bigint' && settings.parseScriptNumbers) {
            return stackItem(
              itemIndex,
              hex,
              <span className="stack-item number">{`${number}`}</span>
            );
          }
          return stackItem(
            itemIndex,
            hex,
            <span className="stack-item hex">
              {settings.abbreviateLongStackItems
                ? abbreviateStackItem(hex)
                : hex}
            </span>
          );
        })
      )
    ) : (
      unknownValue(error)
    )}
  </div>
);

const emptyEvaluation = [] as Evaluation;
const emptyLookup = {
  lookup: () => false as false
};

export const EvaluationViewer = (props: {
  compilation: CompilationResult;
  evaluation?: Evaluation;
  evaluationTrace: string[];
  evaluationSource: string[];
  id: string;
  lookup?: StackItemIdentifyFunction;
  scrollOffset: number;
  showControls: boolean;
  evaluationViewerSettings: EvaluationViewerSettings;
  changeEvaluationViewerSettings: typeof ActionCreators.changeEvaluationViewerSettings;
}) => {
  const [cachedEvaluation, setCachedEvaluation] = useState(emptyEvaluation);
  const [cachedEvaluationSource, setCachedEvaluationSource] = useState('');
  const [cachedEvaluationTrace, setCachedEvaluationTrace] = useState(['']);
  const [cachedLookup, setCachedLookup] = useState<{
    lookup: StackItemIdentifyFunction | undefined;
  }>(emptyLookup);

  if (props.evaluationTrace.join() !== cachedEvaluationTrace.join()) {
    setCachedEvaluation(emptyEvaluation);
    setCachedLookup(emptyLookup);
    setCachedEvaluationTrace(props.evaluationTrace);
    return null;
  }
  const hasError =
    typeof props.evaluation === 'undefined' || props.evaluation.length === 0;
  const cacheIsUpdated =
    cachedEvaluationSource === props.evaluationSource.join();
  if (!hasError && !cacheIsUpdated) {
    setCachedEvaluationSource(props.evaluationSource.join());
    setCachedEvaluation(props.evaluation as Evaluation);
    setCachedLookup({ lookup: props.lookup });
    return null;
  }

  const cacheIsAvailable = cachedEvaluation.length !== 0;
  const showCached = hasError && cacheIsAvailable;
  const evaluation = showCached ? cachedEvaluation : props.evaluation;
  const lookup = showCached ? cachedLookup.lookup : props.lookup;

  return (
    <div className="EvaluationViewer">
      <div className={`content${showCached ? ' cached' : ''}`}>
        {evaluation && evaluation.length > 0 ? (
          <div>
            <div
              className={`header-bar ${
                props.scrollOffset !== 0 ? 'scroll-decoration' : ''
              }`}
            >
              <div className="header-bar-content">
                {props.showControls ? (
                  <div className="controls">
                    <div className="viewing-stack">
                      {props.evaluationViewerSettings.showAlternateStack ? (
                        <Tooltip
                          content="Currently showing the alternate stack. Click to switch to the stack."
                          portalClassName="control-tooltip"
                          position="right"
                        >
                          <Button
                            onClick={() => {
                              props.changeEvaluationViewerSettings({
                                ...props.evaluationViewerSettings,
                                showAlternateStack: false
                              });
                            }}
                          >
                            Alternate Stack
                          </Button>
                        </Tooltip>
                      ) : (
                        <Tooltip
                          content="Currently showing the stack. Click to switch the alternate stack."
                          portalClassName="control-tooltip"
                          position="right"
                        >
                          <Button
                            onClick={() => {
                              props.changeEvaluationViewerSettings({
                                ...props.evaluationViewerSettings,
                                showAlternateStack: true
                              });
                            }}
                          >
                            Stack
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                    <div className="toggles">
                      {props.evaluationViewerSettings.parseScriptNumbers ? (
                        <Tooltip
                          content="Show Script Numbers in hex format"
                          portalClassName="control-tooltip"
                          position="left"
                        >
                          <Button
                            icon={IconNames.CODE}
                            onClick={() => {
                              props.changeEvaluationViewerSettings({
                                ...props.evaluationViewerSettings,
                                parseScriptNumbers: false
                              });
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <Tooltip
                          content="Show Script Numbers in numerical format"
                          portalClassName="control-tooltip"
                          position="left"
                        >
                          <Button
                            icon={IconNames.NUMERICAL}
                            onClick={() => {
                              props.changeEvaluationViewerSettings({
                                ...props.evaluationViewerSettings,
                                parseScriptNumbers: true
                              });
                            }}
                          />
                        </Tooltip>
                      )}

                      {props.evaluationViewerSettings
                        .abbreviateLongStackItems ? (
                        <Tooltip
                          content="Show full contents of long stack items"
                          portalClassName="control-tooltip"
                          position="left"
                        >
                          <Button
                            className="shrink"
                            icon={IconNames.MAXIMIZE}
                            onClick={() => {
                              props.changeEvaluationViewerSettings({
                                ...props.evaluationViewerSettings,
                                abbreviateLongStackItems: false
                              });
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <Tooltip
                          content="Abbreviate long stack items (e.g. '0x1233...7890')"
                          portalClassName="control-tooltip"
                          position="left"
                        >
                          <Button
                            className="shrink"
                            icon={IconNames.MINIMIZE}
                            onClick={() => {
                              props.changeEvaluationViewerSettings({
                                ...props.evaluationViewerSettings,
                                abbreviateLongStackItems: true
                              });
                            }}
                          />
                        </Tooltip>
                      )}
                    </div>
                    {/* TODO: https://github.com/bitauth/bitauth-ide/issues/8
                    button to compact stack items: IconNames.GROUP_OBJECTS, IconNames.UNGROUP_OBJECTS */}
                  </div>
                ) : (
                  <EvaluationLine
                    line={evaluation[0]}
                    lineIndex={0}
                    error={Errors.none}
                    lookup={lookup}
                    settings={props.evaluationViewerSettings}
                  />
                )}
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
                  settings={props.evaluationViewerSettings}
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
