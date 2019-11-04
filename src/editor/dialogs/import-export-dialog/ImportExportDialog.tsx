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
  Intent,
  HTMLSelect,
  Popover
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
import {
  stringify,
  utf8ToBin,
  binToBase64,
  AuthenticationTemplate
} from 'bitcoin-ts';
import {
  extractTemplate,
  importAuthenticationTemplate
} from '../../../state/import-export';
import { emptyTemplate } from '../../../state/defaults';
import {
  localStorageBackupPrefix,
  backupWarningLimit,
  ideURI
} from '../../constants';
import { deflate } from 'pako';

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
  isEmptyTemplate: boolean;
  backups: IDEBackup[];
  restoreOptions: BackupOption[];
  activeDialog: ActiveDialog;
  closeDialog: () => any;
}

interface ImportExportDialogDispatch {
  importTemplate: typeof ActionCreators.importTemplate;
}

type IDEBackup = {
  date: Date;
  template: AuthenticationTemplate;
};

type BackupOption = { label: string; value: number };

export const ImportExportDialog = connect(
  (state: AppState) => {
    const template = extractTemplate(state.currentTemplate);
    const templateAsString = stringify(template);
    const emptyTemplateAsString = stringify(emptyTemplate);
    const backups = Object.entries(localStorage)
      .filter(([key, _]) => key.indexOf(localStorageBackupPrefix) === 0)
      .map(([key, value]) => {
        try {
          const date = new Date(key.replace(localStorageBackupPrefix, ''));
          const template = JSON.parse(value);
          const attemptedParse = importAuthenticationTemplate(template);
          if (typeof attemptedParse === 'string') {
            throw attemptedParse;
          }
          return { date, template };
        } catch (e) {
          console.error(
            `There seems to be a corrupted '${localStorageBackupPrefix}' value in local storage. If you need this backup, try manually editing it to ensure it is a valid Bitauth Authentication Template. Parse error:`,
            e
          );
          return undefined;
        }
      })
      .filter((template): template is IDEBackup => template !== undefined)
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // new to old
    if (backups.length > backupWarningLimit) {
      console.warn(
        `Looks like you've been using Bitauth IDE a lot! Just a heads up – you have over ${backupWarningLimit} auto-saved backups stored in local storage. That can slow down template imports and exports. Once you've exported everything you need, we recommend you clean things up by clearing your local storage:\nlocalStorage.clear();`
      );
    }
    const restoreOptions: BackupOption[] = backups.map((backup, i) => ({
      label: `${backup.date.toLocaleString()} – ${backup.template.name}`,
      value: i
    }));
    return {
      name: template.name || 'unnamed',
      authenticationTemplate: templateAsString,
      isEmptyTemplate: templateAsString === emptyTemplateAsString,
      backups,
      restoreOptions
    };
  },
  {
    importTemplate: ActionCreators.importTemplate
  }
)((props: ImportExportDialogProps & ImportExportDialogDispatch) => {
  const [errorMessage, setErrorMessage] = useState('');
  const [fileName, updateFileName] = useState('');
  const [template, updateTemplate] = useState(props.authenticationTemplate);
  const [isViewingSharingLink, setIsViewingSharingLink] = useState(false);
  const [sharingLink, setSharingLink] = useState('');
  const [restoringFromBackup, setRestoringFromBackup] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(0);
  const [hasErrors, setHasErrors] = useState(false);
  const [promptForImportOfTemplate, setPromptForImportOfTemplate] = useState<
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
          {/* TODO: only show download button if not the empty template – if is the empty template, show message telling the user to paste in the template below or load from a file.*/
          props.isEmptyTemplate ? (
            <p>Paste a template below to import.</p>
          ) : (
            <div>
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
              <Button
                className="action"
                disabled={template !== props.authenticationTemplate}
                onClick={() => {
                  const base64toBase64Url = (base64: string) =>
                    base64.replace(/\+/g, '-').replace(/\//g, '_');
                  const payload = base64toBase64Url(
                    binToBase64(
                      deflate(
                        utf8ToBin(
                          JSON.stringify(
                            JSON.parse(props.authenticationTemplate)
                          )
                        )
                      )
                    )
                  );
                  setSharingLink(`${ideURI}/import-template/${payload}`);
                  setIsViewingSharingLink(true);
                }}
              >
                Share Link...
              </Button>
            </div>
          )}
          <div className="actions-right">
            <Button
              className="action"
              onClick={() => {
                setRestoringFromBackup(true);
              }}
            >
              Restore from Autosave...
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
            disabled={template === props.authenticationTemplate}
            className={
              hasErrors ||
              errorMessage !== '' ||
              template === props.authenticationTemplate
                ? 'bp3-disabled'
                : ''
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
                if (props.isEmptyTemplate) {
                  // no need to prompt the user about overwriting an empty template
                  props.importTemplate(result);
                  props.closeDialog();
                } else {
                  setPromptForImportOfTemplate(result);
                }
              }
              //
            }}
          >
            Import Template
          </Button>
        </div>
      </div>
      <Alert
        className="restore-dialog"
        cancelButtonText="Cancel"
        confirmButtonText="Restore"
        intent={Intent.NONE}
        isOpen={restoringFromBackup}
        canEscapeKeyCancel={true}
        canOutsideClickCancel={true}
        onCancel={() => setRestoringFromBackup(false)}
        onConfirm={() => {
          const template = props.backups[selectedBackup].template;
          updateTemplate(stringify(template));
          setRestoringFromBackup(false);
        }}
      >
        <p>
          All Bitauth IDE sessions are automatically saved to your browser.
          Choose a session to restore below.
        </p>
        <HTMLSelect
          id="backups"
          className="bp3-fill"
          options={props.restoreOptions}
          value={selectedBackup}
          onChange={e => {
            setSelectedBackup(Number(e.currentTarget.value));
          }}
        />
      </Alert>
      <Alert
        className="share-dialog"
        confirmButtonText="Done"
        intent={Intent.NONE}
        isOpen={isViewingSharingLink}
        canEscapeKeyCancel={true}
        canOutsideClickCancel={true}
        onCancel={() => setIsViewingSharingLink(false)}
        onConfirm={() => setIsViewingSharingLink(false)}
      >
        <p>
          Use the link below to import this template in a different browser:
        </p>
        <p>
          <Popover
            portalClassName="sharing-link-popover"
            content={<div>URL Copied</div>}
            target={
              <input
                type="text"
                className="sharing-link"
                value={sharingLink}
                readOnly
                onFocus={e => {
                  e.target.select();
                  document.execCommand('copy');
                }}
              />
            }
          />
        </p>
        <small>
          Please note, the template is compressed and encoded in the link (no
          data is stored on the server), so the link can be very long. For
          simpler URLs, consider using a link shortening service.
        </small>
      </Alert>
      <Alert
        cancelButtonText="Cancel"
        confirmButtonText="Overwrite Project"
        intent={Intent.DANGER}
        isOpen={promptForImportOfTemplate !== undefined}
        canEscapeKeyCancel={true}
        canOutsideClickCancel={true}
        onCancel={() => setPromptForImportOfTemplate(undefined)}
        onConfirm={() => {
          props.importTemplate(promptForImportOfTemplate!);
          setPromptForImportOfTemplate(undefined);
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
