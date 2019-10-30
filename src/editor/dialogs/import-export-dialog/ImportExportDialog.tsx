import '../editor-dialog.scss';
import './ImportExportDialog.scss';
import React, { useState } from 'react';
import { ActionCreators } from '../../../state/reducer';
import {
  Classes,
  Dialog,
  Button,
  Icon,
  FileInput,
  Alert,
  Intent
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ActiveDialog, AppState } from '../../../state/types';
import MonacoEditor from 'react-monaco-editor';
import {
  monacoOptions,
  bitauthDark,
  prepMonaco
} from '../../script-editor/monaco-config';
import { connect } from 'react-redux';
import { stringify, utf8ToBin, binToBase64 } from 'bitcoin-ts';
import {
  extractTemplate,
  importAuthenticationTemplate
} from '../../../state/import-export';

const beginDownload = (filename: string, content: string) => {
  const e = document.createElement('a');
  e.setAttribute(
    'href',
    `data:application/octet-stream;charset=utf-8;base64,${binToBase64(
      utf8ToBin(content)
    )}`
  );
  e.setAttribute('download', filename);
  e.style.display = 'none';
  document.body.appendChild(e);
  e.click();
  document.body.removeChild(e);
};

interface ImportExportDialogProps {
  name: string;
  authenticationTemplate: string;
  activeDialog: ActiveDialog;
  closeDialog: () => any;
}

interface ImportExportDialogDispatch {
  importTemplate: typeof ActionCreators.importTemplate;
}

export const ImportExportDialog = connect(
  (state: AppState) => {
    const template = extractTemplate(state.currentTemplate);
    return {
      name: template.name || 'unnamed',
      authenticationTemplate: stringify(template)
    };
  },
  {
    importTemplate: ActionCreators.importTemplate
  }
)((props: ImportExportDialogProps & ImportExportDialogDispatch) => {
  const [errorMessage, setErrorMessage] = useState('');
  const [fileName, updateFileName] = useState('');
  const [template, updateTemplate] = useState(props.authenticationTemplate);
  const [hasErrors, setHasErrors] = useState(false);
  const [importedTemplate, setImportedTemplate] = useState<
    AppState['currentTemplate'] | undefined
  >(undefined);
  return (
    <Dialog
      className="bp3-dark editor-dialog ImportExportDialog"
      onOpening={() => {
        setErrorMessage('');
        updateFileName('');
        updateTemplate(props.authenticationTemplate);
      }}
      onClose={() => {
        props.closeDialog();
      }}
      title={'Import/Export Authentication Template'}
      isOpen={props.activeDialog === ActiveDialog.importExport}
      canOutsideClickClose={false}
    >
      <div className={Classes.DIALOG_BODY}>
        <div className="actions">
          <Button
            className="action"
            disabled={template !== props.authenticationTemplate}
            onClick={() => {
              beginDownload(
                `${props.name
                  .toLowerCase()
                  .trim()
                  .replace(/\s/g, '_')
                  .replace(/[^\.a-zA-Z0-9_-]/g, '')}.bitauth-template.json`,
                props.authenticationTemplate
              );
            }}
          >
            Download Template
          </Button>
          <FileInput
            className="action import-input"
            text={fileName !== '' ? fileName : 'Load from file...'}
            inputProps={{ accept: 'application/json' }}
            onInputChange={e => {
              const input = e.target as HTMLInputElement;
              if (!input.files) {
                return;
              }
              const file = input.files[0];
              updateFileName(file.name);
              const reader = new FileReader();
              reader.onload = () => {
                if (!reader.result) {
                  window.alert('The imported file appears to be empty.');
                  return;
                }
                try {
                  updateTemplate(reader.result.toString());
                } catch (e) {
                  setErrorMessage(e);
                }
              };
              reader.readAsText(file);
            }}
          />
        </div>
        <div className="import-export-editor">
          <MonacoEditor
            editorWillMount={prepMonaco}
            editorDidMount={(editor, monaco) => {
              const model = editor.getModel();
              if (!model) {
                return;
              }
              model.onDidChangeContent(e => {
                const checkMarkers = () => {
                  const markers = monaco.editor.getModelMarkers({});
                  setHasErrors(markers.length !== 0);
                };
                setTimeout(checkMarkers, 1000);
                // just in case the update is really slow:
                setTimeout(checkMarkers, 10000);
              });
            }}
            options={{ ...monacoOptions, folding: true }}
            language="json"
            theme={bitauthDark}
            value={template}
            onChange={value => {
              updateTemplate(value);
              setErrorMessage('');
            }}
          />
        </div>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <div className="error">
            {errorMessage === '' ? (
              <span />
            ) : (
              <span>
                <Icon icon={IconNames.WARNING_SIGN} iconSize={12} />
                <code>{errorMessage}</code>
              </span>
            )}
          </div>
          <Button
            disabled={
              hasErrors ||
              errorMessage !== '' ||
              template === props.authenticationTemplate
            }
            onClick={() => {
              let parsed;
              try {
                parsed = JSON.parse(template);
              } catch (e) {
                setErrorMessage(e);
              }
              const result = importAuthenticationTemplate(parsed);
              if (typeof result === 'string') {
                setErrorMessage(result);
              } else {
                setImportedTemplate(result);
              }
              //
            }}
          >
            Import Template
          </Button>
        </div>
      </div>
      <Alert
        cancelButtonText="Cancel"
        confirmButtonText="Overwrite Project"
        intent={Intent.DANGER}
        isOpen={importedTemplate !== undefined}
        canEscapeKeyCancel={true}
        canOutsideClickCancel={true}
        onCancel={() => setImportedTemplate(undefined)}
        onConfirm={() => {
          props.importTemplate(importedTemplate!);
          setImportedTemplate(undefined);
          props.closeDialog();
        }}
      >
        <p>
          Are you sure you want to overwrite the current project by importing
          this authentication template?
        </p>
        <p>This cannot be undone.</p>
      </Alert>
    </Dialog>
  );
});
