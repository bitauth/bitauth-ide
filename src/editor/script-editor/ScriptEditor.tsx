import React, { Component } from 'react';
import MonacoEditor from 'react-monaco-editor';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import {
  bitauthScript,
  bitauthDark,
  monacoOptions,
  prepMonaco
} from './monaco-config';
import './ScriptEditor.scss';
import { ActionCreators } from '../../state/reducer';
import { CompilationResult } from '../../bitauth-script/compile';
import { MonacoMarkerDataRequired } from '../../bitauth-script/editor-tooling';
import { Range } from '../../bitauth-script/resolve';
import { ScriptType, CurrentScripts } from '../../state/types';
import { getScriptTooltipIcon } from '../project-explorer/ProjectExplorer';
import { Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { EditScriptDialog } from '../dialogs/edit-script-dialog/EditScriptDialog';
import { wrapInterfaceTooltip } from '../common';

interface ScriptEditorProps {
  isP2SH: boolean;
  script: string;
  scriptType: ScriptType;
  internalId: string;
  id: string;
  name: string;
  compilation: CompilationResult;
  setScrollOffset: React.Dispatch<React.SetStateAction<number>>;
  currentScripts: CurrentScripts;
  editScript: typeof ActionCreators.editScript;
  deleteScript: typeof ActionCreators.deleteScript;
  update: typeof ActionCreators.updateScript;
}

interface ScriptEditorState {
  editor?: monacoEditor.editor.IStandaloneCodeEditor;
  monaco?: typeof monacoEditor;
  editScriptDialogIsOpen?: boolean;
}

const cursorIsInsideOfRange = (
  cursor: { column: number; lineNumber: number },
  range: Range
) =>
  cursor.lineNumber >= range.startLineNumber &&
  cursor.lineNumber <= range.endLineNumber &&
  cursor.column >= range.startColumn &&
  cursor.column <= range.endColumn;

export class ScriptEditor extends Component<
  ScriptEditorProps,
  ScriptEditorState
> {
  constructor(props: ScriptEditorProps) {
    super(props);
  }

  handleResize() {
    this.state && this.state.editor && this.state.editor.layout();
  }

  setMarkers() {
    if (
      this.state &&
      this.state.monaco !== undefined &&
      this.state.editor !== undefined
    ) {
      const monaco = this.state.monaco;
      const editor = this.state.editor;
      const model = editor.getModel();
      const compilation = this.props.compilation;
      if (model !== null) {
        let markers: MonacoMarkerDataRequired[] = [];
        if (compilation.success !== true && editor.hasTextFocus()) {
          // TODO: use `compilation` to render errors
          const cursor = editor.getPosition();
          const raw = compilation.errors.map<MonacoMarkerDataRequired>(
            error => ({
              ...error.range,
              severity: monacoEditor.MarkerSeverity.Error,
              message: error.error
            })
          );
          markers =
            cursor === null
              ? raw
              : raw.filter(marker => !cursorIsInsideOfRange(cursor, marker));
        }
        this.state.monaco.editor.setModelMarkers(model, '', markers);
      }
    }
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  /**
   * TODO: Autocomplete for all opcodes and variables
   *
   * TODO: hover information for all opcodes and variables
   *
   * TODO: construct a tree of "reduction values" – anything you hover should
   * also show you the bytecode to which it reduced
   */
  render() {
    this.setMarkers();
    return (
      <div className="ScriptEditor">
        <h2 className="title">
          {getScriptTooltipIcon(this.props.scriptType)}
          {this.props.name}
          {this.props.isP2SH && (
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
              this.setState({ editScriptDialogIsOpen: true });
              // this.props.editScript(this.props.internalId)}
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
                this.props.setScrollOffset(e.scrollTop);
              });
              editor.onDidChangeCursorPosition(e => this.setMarkers());
              this.setState({ editor, monaco });
            }}
            options={monacoOptions}
            language={bitauthScript}
            theme={bitauthDark}
            value={this.props.script}
            // ref={monaco => {
            //   console.log('testing ref usage');
            //   console.log(monaco);
            // }}
            onChange={(value, event) =>
              this.props.update({
                script: value,
                internalId: this.props.internalId,
                event
              })
            }
          />
        </div>
        <EditScriptDialog
          isOpen={(this.state && this.state.editScriptDialogIsOpen) || false}
          internalId={this.props.internalId}
          id={this.props.id}
          name={this.props.name}
          scriptType={this.props.scriptType}
          isP2SH={this.props.isP2SH}
          closeDialog={() => this.setState({ editScriptDialogIsOpen: false })}
          currentScripts={this.props.currentScripts}
          editScript={this.props.editScript}
          deleteScript={this.props.deleteScript}
        />
      </div>
    );
  }
}
