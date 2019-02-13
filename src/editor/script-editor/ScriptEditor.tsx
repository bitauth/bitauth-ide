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

const prepMonaco = (monaco: typeof monacoEditor) => {
  if (monaco.languages.getLanguages().length < 2) {
    registerBitauthScript(monaco);
  }
};

export const ScriptEditor = ({
  isP2SH,
  script,
  id,
  name,
  update
}: {
  isP2SH: boolean;
  script: string;
  id: string;
  name: string;
  update: typeof ActionCreators.updateScript;
}) => (
  <div className="ScriptEditor">
    <h2 className="title">
      {name}
      {isP2SH && (
        <span
          className="p2sh-tag"
          title="This is a P2SH script. The P2SH boilerplate has been omitted for debugging, but will be included in the template when exported."
        >
          P2SH
        </span>
      )}
    </h2>
    <MonacoEditor
      editorWillMount={prepMonaco}
      options={monacoOptions}
      language={bitauthScript}
      theme={bitauthDark}
      value={script}
      onChange={(value, event) => update({ script: value, id, event })}
    />
  </div>
);
