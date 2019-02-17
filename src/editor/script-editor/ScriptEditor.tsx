import React, { Component } from 'react';
import MonacoEditor from 'react-monaco-editor';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import {
  bitauthScript,
  bitauthDark,
  monacoOptions,
  registerBitauthScript
} from './monaco-config';
import './ScriptEditor.scss';
import { ActionCreators } from '../../state/reducer';
import { CompilationResult } from '../../bitauth-script/compile';
import { MonacoMarkerDataRequired } from '../../bitauth-script/editor-tooling';
import { Range } from '../../bitauth-script/resolve';
import { ScriptType } from '../../state/types';
import {
  getScriptTooltipIcon,
  wrapInterfaceTooltip
} from '../project-explorer/ProjectExplorer';
import { Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';

const prepMonaco = (monaco: typeof monacoEditor) => {
  if (monaco.languages.getLanguages().length < 2) {
    registerBitauthScript(monaco);
  }
};

interface ScriptEditorProps {
  isP2SH: boolean;
  script: string;
  scriptType: ScriptType;
  id: string;
  name: string;
  compilation: CompilationResult;
  setScrollOffset: React.Dispatch<React.SetStateAction<number>>;
  update: typeof ActionCreators.updateScript;
}

interface ScriptEditorState {
  editor?: monacoEditor.editor.IStandaloneCodeEditor;
  monaco?: typeof monacoEditor;
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
          <div className="script-buttons">
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
              this.props.update({ script: value, id: this.props.id, event })
            }
          />
        </div>
      </div>
    );
  }
}
