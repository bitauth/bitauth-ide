import {
  Range,
  CompilationResultResolve,
  ResolvedScript,
  CompilerOperationsKeyBCH,
  CompilationResultReduce,
  ScriptReductionTraceChildNode,
  ScriptReductionTraceContainerNode,
  binToHex,
  SigningSerializationAlgorithmIdentifier,
  BuiltInVariables,
  CompilerOperationsSigningSerializationComponentBCH
} from 'bitcoin-ts';
import React, { useEffect, useState } from 'react';
import MonacoEditor from 'react-monaco-editor';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import {
  bitauthTemplatingLanguage,
  bitauthDark,
  monacoOptions,
  prepMonaco
} from './monaco-config';
import './ScriptEditor.scss';
import { ActionCreators } from '../../state/reducer';
import { MonacoMarkerDataRequired } from '../../btl-utils/editor-tooling';
import {
  ScriptType,
  CurrentScripts,
  VariableDetails,
  ScriptDetails
} from '../../state/types';
import { getScriptTooltipIcon } from '../project-explorer/ProjectExplorer';
import { Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { EditScriptDialog } from '../dialogs/edit-script-dialog/EditScriptDialog';
import { wrapInterfaceTooltip } from '../common';
import { CompilationResult } from 'bitcoin-ts';
import { IDESupportedProgramState } from '../editor-types';
import {
  opcodeHoverProviderBCH,
  opcodeCompletionItemProviderBCH,
  isCorrectScript
} from './bch-language';

const cursorIsAtEndOfRange = (
  cursor: { column: number; lineNumber: number },
  range: Range
) =>
  cursor.lineNumber === range.endLineNumber &&
  cursor.column === range.endColumn;

const isWithinRange = (
  position: { lineNumber: number; column: number },
  range: Range
) =>
  ((range.startLineNumber < position.lineNumber ||
    (range.startLineNumber === position.lineNumber &&
      range.startColumn < position.column)) &&
    range.endLineNumber > position.lineNumber) ||
  (range.endLineNumber === position.lineNumber &&
    range.endColumn > position.column);

const selectResolvedSegmentAtPosition = (
  resolvedScript: ResolvedScript,
  position: { lineNumber: number; column: number }
): ResolvedScript[number] | undefined => {
  const firstMatch = resolvedScript.find(segment =>
    isWithinRange(position, segment.range)
  );
  if (firstMatch !== undefined && Array.isArray(firstMatch.value)) {
    const internalSelected = selectResolvedSegmentAtPosition(
      firstMatch.value,
      position
    );
    return internalSelected === undefined ? firstMatch : internalSelected;
  }
  return firstMatch;
};

const selectReductionSourceSegmentAtPosition = (
  reduce: ScriptReductionTraceChildNode<IDESupportedProgramState>,
  position: { lineNumber: number; column: number }
): ScriptReductionTraceChildNode<IDESupportedProgramState> | undefined => {
  const matchesRange = isWithinRange(position, reduce.range);
  if (matchesRange) {
    const container = reduce as ScriptReductionTraceContainerNode<
      IDESupportedProgramState
    >;
    if (Array.isArray(container.source)) {
      const firstMatch = container.source
        .map(child => selectReductionSourceSegmentAtPosition(child, position))
        .filter(selected => selected !== undefined)[0];
      return firstMatch === undefined ? container : firstMatch;
    }
    return reduce;
  }
  return undefined;
};

const getKeyOperationDescriptions = (parameter?: string) => {
  const map: { [op in CompilerOperationsKeyBCH]: [string, string] } = {
    data_signature: [
      'Data Signature (ECDSA)',
      `An ECDSA signature covering the sha256 hash of the compiled bytecode ${
        parameter ? `from script ID "${parameter}"` : 'of another script'
      }.`
    ],
    public_key: [
      'Public Key',
      'The public (non-secret) key derived from this private key.'
    ],
    schnorr_data_signature: [
      'Data Signature (Schnorr)',
      `A Schnorr signature covering the sha256 hash of the compiled bytecode from ${
        parameter ? `from script ID "${parameter}"` : 'of another script'
      }.`
    ],
    schnorr_signature: [
      'Signature (Schnorr)',
      `A Schnorr signature covering the double sha256 hash of the serialized transaction${
        parameter
          ? ` (using the "${parameter}" signing serialization algorithm)`
          : ''
      }.`
    ],
    signature: [
      'Signature (ECDSA)',
      `An ECDSA signature covering the double sha256 hash of the serialized transaction${
        parameter
          ? ` (using the "${parameter}" signing serialization algorithm)`
          : ''
      }.`
    ]
  };
  return map;
};

const keyOperationsWhichRequireAParameter = [
  'data_signature',
  'schnorr_data_signature',
  'schnorr_signature',
  'signature'
];

const signatureOperationParameterDescriptions: {
  [parameter in SigningSerializationAlgorithmIdentifier]: [string, string];
} = {
  all_outputs: [
    'A.K.A. "SIGHASH_ALL" (Recommended)',
    'The recommended and most frequently used signing serialization algorithm. This signs each element of the transaction using the private key, preventing an attacker from being able to reuse the signature on a modified transaction.'
  ],
  all_outputs_single_input: [
    'A.K.A. "SIGHASH_ALL" with "ANYONE_CAN_PAY"',
    'A modification to the "all_outputs" signing serialization algorithm which does not cover inputs other than the one being spent.'
  ],
  corresponding_output: [
    'A.K.A. "SIGHASH_SINGLE"',
    'A signing serialization algorithm which only covers the output with the same index value as the input being spent. Warning: this can cause vulnerabilities by allowing the transaction to be modified after being signed.'
  ],
  corresponding_output_single_input: [
    'A.K.A. "SIGHASH_SINGLE" with "ANYONE_CAN_PAY"',
    'A modification to the "corresponding_output" signing serialization algorithm which does not cover inputs other than the one being spent.'
  ],
  no_outputs: [
    'A.K.A. "SIGHASH_NONE"',
    'A signing serialization algorithm which only covers other inputs. Warning: this allows anyone to modify the outputs after being signed.'
  ],
  no_outputs_single_input: [
    'A.K.A. "SIGHASH_NONE" with "ANYONE_CAN_PAY"',
    'A modification to the "no_outputs" signing serialization algorithm which does not cover inputs other than the one being spent.'
  ]
};

const keyOperationPartsToDetails = (operation: string, parameter: string) => {
  return (
    getKeyOperationDescriptions(parameter)[
      operation as CompilerOperationsKeyBCH
    ] || [
      'Unknown Operation',
      `The compiler knows about the "${operation}${
        parameter ? `.${parameter}` : ''
      }" operation, but Bitauth IDE does not. Please open an issue on GitHub.`
    ]
  );
};

const getKeyOperationDetails = (variableParts: string[]) => {
  const hasOperation = variableParts.length > 1;
  const [operationName, operationDescription] = hasOperation
    ? keyOperationPartsToDetails(variableParts[1], variableParts[2])
    : [undefined, undefined];
  return {
    hasOperation,
    operationName,
    operationDescription
  };
};

const getSigningSerializationOperationDetails = (operation: string) => {
  const details: {
    [component in CompilerOperationsSigningSerializationComponentBCH]: [
      string,
      string
    ];
  } = {
    corresponding_output: [
      'Corresponding Output',
      'The signing serialization of the transaction output with the same index as the current input. If no output with the same index exists, this inserts no bytes.'
    ],
    corresponding_output_hash: [
      'Corresponding Output Hash',
      'The hash of the transaction output with the same index as the current input. If no output with the same index exists, 32 bytes of `0x00`.'
    ],
    covered_bytecode: [
      'Covered Bytecode',
      'The `coveredBytecode` provided to the compiler for this compilation.'
    ],
    covered_bytecode_prefix: [
      'Covered Bytecode Prefix',
      'The prefix indicating the length of `coveredBytecode` provided to the compiler for this compilation. The length is encoded as a `BitcoinVarInt`.'
    ],
    locktime: ['Locktime', "The transaction's locktime."],
    outpoint_index: [
      'Outpoint Index',
      'The index of the outpoint being spent by the current input.'
    ],
    outpoint_transaction_hash: [
      'Outpoint Transaction Hash',
      'The transaction hash (A.K.A. ID) of the outpoint being spent by the current input.'
    ],
    output_value: [
      'Output Value',
      'The output value of the outpoint being spent by the current input.'
    ],
    sequence_number: [
      'Sequence Number',
      'The sequence number of the outpoint being spent by the current input.'
    ],
    transaction_outpoints: [
      'Transaction Outpoints',
      'The signing serialization of all transaction outpoints.'
    ],
    transaction_outpoints_hash: [
      'Transaction Outpoints Hash',
      'The hash of all transaction outpoints.'
    ],
    transaction_outputs: [
      'Transaction Outputs',
      'The signing serialization of all transaction outputs.'
    ],
    transaction_outputs_hash: [
      'Transaction Outputs Hash',
      'The hash of all transaction outputs.'
    ],
    transaction_sequence_numbers: [
      'Transaction Sequence Numbers',
      'The signing serialization of all transaction sequence numbers.'
    ],
    transaction_sequence_numbers_hash: [
      'Transaction Sequence Numbers Hash',
      'The hash of all transaction sequence numbers.'
    ],
    version: ['Version', "The transaction's version number."]
  };
  const operationInfo =
    operation in details
      ? details[operation as CompilerOperationsSigningSerializationComponentBCH]
      : [
          'Unknown',
          'This operation is not understood by Bitauth IDE. Please report this bug.'
        ];
  return { name: operationInfo[0], description: operationInfo[1] };
};

const updateMarkers = (
  monaco: typeof monacoEditor,
  editor: monacoEditor.editor.IStandaloneCodeEditor,
  compilation: CompilationResult,
  script: string
) => () => {
  const model = editor.getModel();
  /**
   * Avoid updating markers if the script has changed. (This prevents error
   * markers from flashing on/off while typing.)
   */
  if (model !== null && model.getValue() === script) {
    let markers: MonacoMarkerDataRequired[] = [];
    if (compilation.success !== true) {
      const raw = compilation.errors.map<MonacoMarkerDataRequired>(error => ({
        ...error.range,
        severity: monacoEditor.MarkerSeverity.Error,
        message: error.error
      }));
      const cursor = editor.getPosition();
      const hasFocus = editor.hasTextFocus();
      /**
       * Hide the error if this editor is in focus and the cursor is
       * currently at the end of the error's range (to be less annoying
       * while typing).*/
      markers =
        hasFocus && cursor !== null
          ? raw.filter(marker => !cursorIsAtEndOfRange(cursor, marker))
          : raw;
    }
    monaco.editor.setModelMarkers(model, '', markers);
  }
};

export const ScriptEditor = (props: {
  isP2SH: boolean;
  script: string;
  scriptType: ScriptType;
  internalId: string;
  id: string;
  name: string;
  compilation: CompilationResult;
  scriptDetails: ScriptDetails;
  variableDetails: VariableDetails;
  setScrollOffset: React.Dispatch<React.SetStateAction<number>>;
  currentScripts: CurrentScripts;
  editScript: typeof ActionCreators.editScript;
  deleteScript: typeof ActionCreators.deleteScript;
  updateScript: typeof ActionCreators.updateScript;
}) => {
  const [editor, setEditor] = useState(
    undefined as undefined | monacoEditor.editor.IStandaloneCodeEditor
  );
  const [monaco, setMonaco] = useState(
    undefined as undefined | typeof monacoEditor
  );
  const [editScriptDialogIsOpen, setEditScriptDialogIsOpen] = useState(false);
  const [latestInternalId, setLatestInternalId] = useState('');

  const handleResize = () => editor && editor.layout();
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  useEffect(() => {
    if (monaco !== undefined && editor !== undefined) {
      const bytecodeHoverProvider = monaco.languages.registerHoverProvider(
        bitauthTemplatingLanguage,
        {
          provideHover: (model, position) => {
            if (!isCorrectScript(model, props.script)) {
              return;
            }
            const resolve = (props.compilation as CompilationResultResolve)
              .resolve as ResolvedScript | undefined;
            const reduce = (props.compilation as CompilationResultReduce<
              IDESupportedProgramState
            >).reduce as
              | CompilationResultReduce<IDESupportedProgramState>['reduce']
              | undefined;
            if (resolve && reduce) {
              const resolvedSegment = selectResolvedSegmentAtPosition(
                resolve,
                position
              );
              if (resolvedSegment && resolvedSegment.type === 'comment') {
                return;
              }
              const segment = selectReductionSourceSegmentAtPosition(
                reduce,
                position
              );
              /**
               * Don't provide bytecode hover for the top-level segment to
               * avoid being annoying/distracting.
               */
              if (segment !== undefined && segment !== reduce) {
                return {
                  contents: [
                    {
                      value: `**Compiled**: \`0x${binToHex(segment.bytecode)}\``
                    }
                  ],
                  range: segment.range
                };
              }
            }
          }
        }
      );
      /**
       * We register here to ensure opcode hover information appears above the
       * bytecode hover information.
       */
      const opcodeHoverProvider = monaco.languages.registerHoverProvider(
        bitauthTemplatingLanguage,
        opcodeHoverProviderBCH(props.script)
      );
      const identifierHoverProvider = monaco.languages.registerHoverProvider(
        bitauthTemplatingLanguage,
        {
          provideHover: (model, position) => {
            if (!isCorrectScript(model, props.script)) {
              return;
            }
            const resolve = (props.compilation as CompilationResultResolve)
              .resolve as ResolvedScript | undefined;
            if (resolve) {
              const segment = selectResolvedSegmentAtPosition(
                resolve,
                position
              );
              if (segment !== undefined && segment.type === 'bytecode') {
                const range = segment.range;
                if ('variable' in segment) {
                  const parts = segment.variable.split('.');
                  const variableId = parts[0];
                  switch (variableId) {
                    case BuiltInVariables.currentBlockTime:
                      return {
                        contents: [
                          {
                            value: '**Current Block Time**'
                          },
                          {
                            value:
                              'Provides the current block time (at the time of compilation) as a Script Number. This is useful when computing a time for `OP_CHECKLOCKTIMEVERIFY` or `OP_CHECKSEQUENCEVERIFY` which is relative to the current time at the moment a script is created (usually, a locking script).'
                          }
                        ],
                        range
                      };
                    case BuiltInVariables.currentBlockHeight:
                      return {
                        contents: [
                          {
                            value: '**Current Block Height**'
                          },
                          {
                            value:
                              'Provides the current block height as a Script Number at the time of compilation. This is useful when computing a height for `OP_CHECKLOCKTIMEVERIFY` or `OP_CHECKSEQUENCEVERIFY` which is relative to the current height at the moment a script is created (usually, a locking script).'
                          }
                        ],
                        range
                      };
                    case BuiltInVariables.signingSerialization:
                      const {
                        description,
                        name
                      } = getSigningSerializationOperationDetails(parts[1]);
                      return {
                        contents: [
                          {
                            value: `**${name}**`
                          },
                          {
                            value: description
                          }
                        ],
                        range
                      };
                    default:
                      const details = props.variableDetails[variableId];
                      if (details !== undefined) {
                        const {
                          hasOperation,
                          operationName,
                          operationDescription
                        } = getKeyOperationDetails(parts);
                        return {
                          contents: [
                            {
                              value: `${
                                details.variable.name
                                  ? `**${details.variable.name}**`
                                  : ''
                              } – ${
                                hasOperation
                                  ? operationName
                                  : details.variable.type
                              } (${details.entity.name})`
                            },
                            ...(hasOperation
                              ? [{ value: operationDescription as string }]
                              : []),
                            ...(details.variable.description
                              ? [{ value: details.variable.description }]
                              : [])
                          ],
                          range
                        };
                      }
                  }
                } else if ('script' in segment) {
                  const details = props.scriptDetails[segment.script];
                  if (details !== undefined) {
                    return {
                      contents: [
                        {
                          value: `**${details.name}** – Script`
                        }
                      ],
                      range
                    };
                  }
                }
              }
            } else {
              /**
               * resolve is not available (i.e. a parse error occurred)
               */
              const query = model.getWordAtPosition(position);
              if (query !== null) {
                const details = props.variableDetails[query.word];
                if (details !== undefined) {
                  return {
                    contents: [
                      {
                        value: `**${details.variable.name}** – ${details.variable.type} (${details.entity.name})`
                      },
                      ...(details.variable.description
                        ? [{ value: details.variable.description }]
                        : [])
                    ]
                  };
                }
              }
            }
          }
        }
      );

      const opcodeCompletionProvider = monaco.languages.registerCompletionItemProvider(
        bitauthTemplatingLanguage,
        opcodeCompletionItemProviderBCH
      );

      const variableCompletionProvider = monaco.languages.registerCompletionItemProvider(
        bitauthTemplatingLanguage,
        {
          provideCompletionItems: (model, position) => {
            if (!isCorrectScript(model, props.script)) {
              return;
            }
            const contentBeforePosition = model.getValueInRange({
              startColumn: 1,
              startLineNumber: position.lineNumber,
              endColumn: position.column,
              endLineNumber: position.lineNumber
            });
            const lastValidIdentifier = /[a-zA-Z_][.a-zA-Z0-9_-]*$/;
            const match = contentBeforePosition.match(lastValidIdentifier);
            /**
             * If match is `null`, the user manually triggered autocomplete:
             * show all potential variable options.
             */
            const assumedMatch = match === null ? [''] : match;
            const parts = assumedMatch[0].split('.');
            const targetId = parts[0];
            const operation = parts[1] as string | undefined;
            const parameter = parts[2] as string | undefined;

            const word = model.getWordUntilPosition(position);
            const range: Range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn
            };

            if (operation === undefined) {
              return {
                suggestions: [
                  ...Object.entries(props.variableDetails)
                    .filter(([id]) => id.indexOf(targetId) !== -1)
                    .map<monacoEditor.languages.CompletionItem>(
                      ([id, { variable, entity }]) => {
                        const isKey =
                          variable.type === 'Key' || variable.type === 'HDKey';
                        return {
                          label: id,
                          detail: `${variable.name} – ${variable.type} (${entity.name})`,
                          documentation: variable.description,
                          kind: monaco.languages.CompletionItemKind.Variable,
                          insertText: isKey ? `${id}.` : id,
                          range,
                          ...(isKey
                            ? {
                                command: {
                                  id: 'editor.action.triggerSuggest',
                                  title: 'Suggest Operation'
                                }
                              }
                            : {})
                        };
                      }
                    ),
                  ...Object.entries(props.scriptDetails)
                    .filter(([id]) => id.indexOf(targetId) !== -1)
                    .map<monacoEditor.languages.CompletionItem>(
                      ([id, script]) => ({
                        label: id,
                        detail: `${script.name} – Script`,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: id,
                        range
                      })
                    )
                ]
              };
            }

            const details = props.variableDetails[targetId] as
              | VariableDetails[string]
              | undefined;

            if (
              details === undefined ||
              (details.variable.type !== 'HDKey' &&
                details.variable.type !== 'Key')
            ) {
              return;
            }

            if (parameter === undefined) {
              const descriptions = getKeyOperationDescriptions();
              return {
                suggestions: Object.entries(descriptions)
                  .filter(([op]) => op.indexOf(operation) !== -1)
                  .map<monacoEditor.languages.CompletionItem>(
                    ([op, descriptions]) => {
                      const requiresParameter =
                        keyOperationsWhichRequireAParameter.indexOf(op) !== -1;
                      return {
                        label: op,
                        detail: descriptions[0],
                        documentation: descriptions[1],
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: requiresParameter ? `${op}.` : op,
                        range,
                        ...(requiresParameter
                          ? {
                              command: {
                                id: 'editor.action.triggerSuggest',
                                title: 'Suggest Parameter'
                              }
                            }
                          : {})
                      };
                    }
                  )
              };
            }

            if (keyOperationsWhichRequireAParameter.indexOf(operation) === -1) {
              return;
            }

            if (
              operation === 'signature' ||
              operation === 'schnorr_signature'
            ) {
              return {
                suggestions: Object.entries(
                  signatureOperationParameterDescriptions
                )
                  .filter(([param]) => param.indexOf(parameter) !== -1)
                  .map<monacoEditor.languages.CompletionItem>(
                    ([param, descriptions]) => ({
                      label: param,
                      detail: descriptions[0],
                      documentation: descriptions[1],
                      kind: monaco.languages.CompletionItemKind.Function,
                      insertText: param,
                      range
                    })
                  )
              };
            } else if (
              operation === 'data_signature' ||
              operation === 'schnorr_data_signature'
            ) {
              return {
                suggestions: Object.entries(props.scriptDetails)
                  .filter(([id]) => id.indexOf(parameter) !== -1)
                  .map<monacoEditor.languages.CompletionItem>(
                    ([id, scriptInfo]) => ({
                      label: id,
                      detail: scriptInfo.name,
                      kind: monaco.languages.CompletionItemKind.Variable,
                      insertText: id,
                      range
                    })
                  )
              };
            } else {
              console.error(`Unexpected key operations ${operation}.`);
              return;
            }
          },
          triggerCharacters: ['.']
        }
      );

      const update = updateMarkers(
        monaco,
        editor,
        props.compilation,
        props.script
      );
      update();
      const watchCursor = editor.onDidChangeCursorPosition(update);
      const watchFocus = editor.onDidFocusEditorText(update);
      const watchBlur = editor.onDidBlurEditorText(update);
      return () => {
        bytecodeHoverProvider.dispose();
        opcodeHoverProvider.dispose();
        identifierHoverProvider.dispose();
        opcodeCompletionProvider.dispose();
        variableCompletionProvider.dispose();
        watchCursor.dispose();
        watchFocus.dispose();
        watchBlur.dispose();
      };
    }
  });

  if (latestInternalId !== props.internalId) {
    /**
     * Since we re-use the same editor instance for multiple scripts, switching
     * to a longer script causes the editor to highlight the range which was
     * suddenly "added". Here we just deselect it to be less annoying.
     */
    editor && editor.setPosition({ column: 1, lineNumber: 1 });
    setLatestInternalId(props.internalId);
    return null;
  }

  return (
    <div className="ScriptEditor">
      <h2 className="title">
        {getScriptTooltipIcon(props.scriptType)}
        {props.name}
        {props.scriptType === 'test-setup' && <span>&nbsp;(Setup)</span>}
        {props.scriptType === 'test-check' && <span>&nbsp;(Check)</span>}
        {props.isP2SH && (
          <span
            className="p2sh-tag"
            title="This is a P2SH script. The P2SH boilerplate has been omitted for debugging, but will be included in the template when exported."
          >
            P2SH
          </span>
        )}
        <div
          className="script-buttons"
          onClick={() => {
            setEditScriptDialogIsOpen(true);
          }}
        >
          {wrapInterfaceTooltip(
            <Icon icon={IconNames.SETTINGS} iconSize={10} />,
            'Edit Script Settings'
          )}
        </div>
      </h2>
      <div className="editor">
        <MonacoEditor
          editorWillMount={prepMonaco}
          editorDidMount={(editor, monaco) => {
            editor.onDidScrollChange(e => {
              props.setScrollOffset(e.scrollTop);
            });
            setEditor(editor);
            setMonaco(monaco);
          }}
          options={monacoOptions}
          language={bitauthTemplatingLanguage}
          theme={bitauthDark}
          value={props.script}
          onChange={(value, event) =>
            props.updateScript({
              script: value,
              internalId: props.internalId
            })
          }
        />
      </div>
      <EditScriptDialog
        isOpen={editScriptDialogIsOpen}
        internalId={props.internalId}
        id={props.id}
        name={props.name}
        scriptType={props.scriptType}
        isP2SH={props.isP2SH}
        closeDialog={() => {
          setEditScriptDialogIsOpen(false);
        }}
        currentScripts={props.currentScripts}
        editScript={props.editScript}
        deleteScript={props.deleteScript}
      />
    </div>
  );
};
