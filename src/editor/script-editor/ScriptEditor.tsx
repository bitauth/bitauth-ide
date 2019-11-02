import {
  Range,
  CompilationResultResolve,
  ResolvedScript,
  CompilerKeyOperationsBCH
} from 'bitcoin-ts';
import React, { Component, useEffect, useState } from 'react';
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
import { ScriptType, CurrentScripts, VariableDetails } from '../../state/types';
import { getScriptTooltipIcon } from '../project-explorer/ProjectExplorer';
import { Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { EditScriptDialog } from '../dialogs/edit-script-dialog/EditScriptDialog';
import { wrapInterfaceTooltip } from '../common';
import { CompilationResult } from 'bitcoin-ts';

const cursorIsAtEndOfRange = (
  cursor: { column: number; lineNumber: number },
  range: Range
) =>
  cursor.lineNumber === range.endLineNumber &&
  cursor.column === range.endColumn;

const selectResolvedSegmentAtPosition = (
  resolvedScript: ResolvedScript,
  position: { lineNumber: number; column: number }
): ResolvedScript[number] | undefined => {
  const firstMatchIndex = resolvedScript.findIndex(
    segment =>
      (segment.range.startLineNumber < position.lineNumber &&
        segment.range.endLineNumber > position.lineNumber) ||
      (segment.range.startLineNumber <= position.lineNumber &&
        segment.range.endLineNumber >= position.lineNumber &&
        segment.range.startColumn <= position.column &&
        segment.range.endColumn >= position.column)
  );
  const selected = resolvedScript[firstMatchIndex];
  if (selected !== undefined && Array.isArray(selected.value)) {
    return selectResolvedSegmentAtPosition(selected.value, position);
  }
  return selected;
};

const operationPartsToDetails = (operation: string, parameter: string) => {
  const map: { [op in CompilerKeyOperationsBCH]: [string, string] } = {
    data_signature: [
      'Data Signature (ECDSA)',
      `An ECDSA signature covering the sha256 hash of the compiled bytecode from script ID "${parameter}".`
    ],
    public_key: [
      'Public Key',
      'The public (non-secret) key derived from this private key.'
    ],
    schnorr_data_signature: [
      'Data Signature (Schnorr)',
      `A Schnorr signature covering the sha256 hash of the compiled bytecode from script ID "${parameter}".`
    ],
    schnorr_signature: [
      'Signature (Schnorr)',
      `A Schnorr signature covering the double sha256 hash of the serialized transaction (using the "${parameter}" signing serialization algorithm).`
    ],
    signature: [
      'Signature (ECDSA)',
      `An ECDSA signature covering the double sha256 hash of the serialized transaction (using the "${parameter}" signing serialization algorithm).`
    ]
  };
  return (
    map[operation as CompilerKeyOperationsBCH] || [
      'Unknown Operation',
      `The compiler knows about the "${operation}${
        parameter ? `.${parameter}` : ''
      }" operation, but Bitauth IDE does not. Please open an issue on GitHub.`
    ]
  );
};

const getOperationDetails = (variableParts: string[]) => {
  const hasOperation = variableParts.length > 1;
  const [operationName, operationDescription] = hasOperation
    ? operationPartsToDetails(variableParts[1], variableParts[2])
    : [undefined, undefined];
  return {
    hasOperation,
    operationName,
    operationDescription
  };
};

export const ScriptEditor = (props: {
  isP2SH: boolean;
  script: string;
  scriptType: ScriptType;
  internalId: string;
  id: string;
  name: string;
  compilation: CompilationResult;
  variableDetails: VariableDetails;
  setScrollOffset: React.Dispatch<React.SetStateAction<number>>;
  currentScripts: CurrentScripts;
  editScript: typeof ActionCreators.editScript;
  deleteScript: typeof ActionCreators.deleteScript;
  updateScript: typeof ActionCreators.updateScript;
}) => {
  const [editor, setEditor] = useState(undefined as
    | undefined
    | monacoEditor.editor.IStandaloneCodeEditor);
  const [monaco, setMonaco] = useState(undefined as
    | undefined
    | typeof monacoEditor);
  const [editScriptDialogIsOpen, setEditScriptDialogIsOpen] = useState(false);

  const handleResize = () => editor && editor.layout();
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  /**
   * https://github.com/bitauth/bitauth-ide/issues/1
   * TODO: show the variable type in hover info
   * TODO: construct a tree of "reduction values" – anything you hover should
   * also show you the bytecode to which it reduced
   * TODO: hover info for resolvable scripts: `Script: **Script Name**`
   * TODO: provide autocomplete options for variable operations
   */
  useEffect(() => {
    if (monaco !== undefined) {
      const hoverProvider = monaco.languages.registerHoverProvider(
        bitauthTemplatingLanguage,
        {
          provideHover: (model, position) => {
            /**
             * Monaco hover providers are global, so we have to ensure we're
             * looking at the correct script.
             */
            const isCurrentScript = model.getValue() === props.script;
            if (isCurrentScript) {
              const resolve = (props.compilation as CompilationResultResolve)
                .resolve as ResolvedScript | undefined;
              if (resolve) {
                const segment = selectResolvedSegmentAtPosition(
                  resolve,
                  position
                );
                if (
                  segment !== undefined &&
                  segment.type === 'bytecode' &&
                  segment.variable !== undefined
                ) {
                  const range = segment.range;
                  const parts = segment.variable.split('.');
                  const variableId = parts[0];
                  const details = props.variableDetails[variableId];
                  if (details !== undefined) {
                    const {
                      hasOperation,
                      operationName,
                      operationDescription
                    } = getOperationDetails(parts);
                    return Promise.resolve({
                      contents: [
                        {
                          value: `${
                            hasOperation ? `${operationName} – ` : ''
                          }**${details.variable.name}** (${
                            details.entity.name
                          })`
                        },
                        ...(hasOperation
                          ? [{ value: operationDescription as string }]
                          : []),
                        ...(details.variable.description
                          ? [{ value: details.variable.description }]
                          : [])
                      ],
                      range
                    });
                  }
                }
              } else {
                // resolve is not available (parse error)
                const query = model.getWordAtPosition(position);
                if (query !== null) {
                  const details = props.variableDetails[query.word];
                  if (details !== undefined)
                    return Promise.resolve({
                      contents: [
                        {
                          value: `**${details.variable.name}** (${details.entity.name})`
                        },
                        ...(details.variable.description
                          ? [{ value: details.variable.description }]
                          : [])
                      ]
                    });
                }
              }
            }
            return null;
          }
        }
      );
      return () => {
        hoverProvider.dispose();
      };
    }
  });

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
            editor.onDidChangeCursorPosition(e => {
              if (monaco !== undefined && editor !== undefined) {
                const model = editor.getModel();
                const compilation = props.compilation;
                if (model !== null) {
                  let markers: MonacoMarkerDataRequired[] = [];
                  if (compilation.success !== true && editor.hasTextFocus()) {
                    const cursor = editor.getPosition();
                    const raw = compilation.errors.map<
                      MonacoMarkerDataRequired
                    >(error => ({
                      ...error.range,
                      severity: monacoEditor.MarkerSeverity.Error,
                      message: error.error
                    }));
                    markers =
                      cursor === null
                        ? raw
                        : /**
                           * Hide the error if the cursor is currently at the end of its
                           * range (to be less annoying while typing).
                           */
                          raw.filter(
                            marker => !cursorIsAtEndOfRange(cursor, marker)
                          );
                  }
                  monaco.editor.setModelMarkers(model, '', markers);
                }
              }
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
              internalId: props.internalId,
              event
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
