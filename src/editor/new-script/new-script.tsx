import './new-script.scss';
import React, { useState } from 'react';
import { ActionCreators } from '../../state/reducer';
import { ActiveDialog, ScriptType, BaseScriptType } from '../../state/types';
import {
  Classes,
  Dialog,
  FormGroup,
  HTMLSelect,
  InputGroup,
  Button,
  Icon
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';

const scriptTypes: { label: string; value: ScriptType }[] = [
  { label: 'Locking Script', value: 'locking' },
  { label: 'Unlocking Script', value: 'unlocking' },
  { label: 'Isolated Script', value: 'isolated' },
  { label: 'Script Test', value: 'test-setup' }
];

const typeDescriptions: { [key in ScriptType]: string } = {
  locking:
    'Locking scripts hold funds. A locking script is the “challenge” which must be unlocked to spend a transaction output. An “Address” is simply an abstraction for a specific locking script.',
  unlocking:
    'An unlocking script spends from a locking script. To create a transaction, the spender must provide a valid unlocking script for each input being spent. (A locking script can be unlocked by multiple unlocking scripts.)',
  isolated:
    'An isolated script is useful for constructions like checksums or re-usable utility scripts (which can be used inside other scripts). Isolated scripts can have script tests, e.g. utility scripts can be tested to ensure they perform a series of operations properly.',
  'test-setup':
    'A script test is applied to an isolated script. Each script test has a “setup” phase which is evaluated before the tested script, and a “check” phase which is evaluated after. The test passes if the “check” script leaves a single Script Number 1 on the stack.',
  tested:
    'Something is broken: tested scripts should be created by assigning a test-setup script to an isolated script.',
  'test-check':
    'Something is broken: script tests should use the `test-setup` type in this dialog.'
};

/**
 * RegExp(`[a-zA-Z_][\.a-zA-Z0-9_-]*`)
 */
const sanitizeId = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/^[^a-zA-Z_]/g, '')
    .replace(/[^\.a-zA-Z0-9_-]/g, '')
    .replace(/\s/g, '_');

const hasParent = (scriptType: BaseScriptType) =>
  scriptType === 'unlocking' || scriptType === 'test-setup';

export const NewScriptDialog = ({
  activeDialog,
  closeDialog,
  currentScripts,
  createScript
}: {
  currentScripts: { name: string; id: string; type: ScriptType }[];
  activeDialog: ActiveDialog;
  closeDialog: typeof ActionCreators.closeDialog;
  createScript: typeof ActionCreators.createScript;
}) => {
  const [scriptType, setScriptType] = useState<BaseScriptType>('locking');
  const [scriptName, setScriptName] = useState('');
  const [scriptId, setScriptId] = useState('');
  const [scriptParentId, setScriptParentId] = useState('');
  const [nonUniqueId, setNonUniqueId] = useState('');
  const usedIds = currentScripts.map(script => script.id);
  const availableParents = currentScripts
    .filter(script =>
      scriptType === 'unlocking'
        ? script.type === 'locking'
        : script.type === 'isolated' || script.type === 'tested'
    )
    .map(script => ({
      label: script.name,
      value: script.id
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return (
    <Dialog
      className="new-script-dialog"
      onClose={() => closeDialog()}
      title="Add Script to Authentication Template"
      isOpen={activeDialog === ActiveDialog.newScript}
      canOutsideClickClose={false}
    >
      <div className={Classes.DIALOG_BODY}>
        <FormGroup
          helperText={typeDescriptions[scriptType]}
          label="Script Type"
          labelFor="script-type"
          inline={true}
        >
          <HTMLSelect
            id="script-type"
            options={scriptTypes}
            onChange={e => {
              setScriptType(e.currentTarget.value as BaseScriptType);
              setScriptParentId('');
            }}
          />
        </FormGroup>
        <FormGroup
          style={{
            ...(!hasParent(scriptType) && {
              display: 'none'
            })
          }}
          // helperText={typeDescriptions[scriptType]}
          label={scriptType === 'unlocking' ? 'Unlocks' : 'Tested Script'}
          labelFor="parent-script"
          inline={true}
        >
          <HTMLSelect
            id="parent-script"
            options={availableParents}
            value={scriptParentId}
            onChange={e => setScriptParentId(e.currentTarget.value)}
          />
        </FormGroup>
        <FormGroup
          helperText="A single-line, human-readable name for this script."
          label="Script Name"
          labelFor="script-name"
          inline={true}
        >
          <InputGroup
            id="script-name"
            value={scriptName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              setScriptName(value);
              setScriptId(sanitizeId(value));
            }}
          />
        </FormGroup>
        <FormGroup
          helperText={
            <span>
              A unique script identifier (must begin with a-z, A-Z, or
              <code>_</code>, remaining characters may include numbers,{' '}
              <code>.</code>, and
              <code>-</code>). This is used to reference the script during
              compilation and from within other scripts.
            </span>
          }
          label="Script ID"
          labelFor="script-id"
          inline={true}
        >
          <InputGroup
            id="script-id"
            value={scriptId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              setScriptId(sanitizeId(value));
            }}
          />
        </FormGroup>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <div className="error">
            {nonUniqueId === '' ? (
              <span />
            ) : (
              <span>
                <Icon icon={IconNames.WARNING_SIGN} iconSize={12} />
                The Script ID <code>{nonUniqueId}</code> is already in use.
              </span>
            )}
          </div>
          <Button
            disabled={
              scriptName === '' ||
              scriptId === '' ||
              availableParents.length === 0
            }
            onClick={() => {
              if (usedIds.indexOf(scriptId) !== -1) {
                setNonUniqueId(scriptId);
              } else {
                setNonUniqueId('');

                createScript({
                  name: scriptName,
                  id: scriptId,
                  type: scriptType,
                  ...(hasParent(scriptType) && {
                    parentId:
                      scriptParentId !== ''
                        ? scriptParentId
                        : availableParents[0].value
                  })
                });
                console.log('todo: create script');
                // closeDialog();
              }
            }}
          >
            Add Script
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
