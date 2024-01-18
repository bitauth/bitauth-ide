import '../editor-dialog.css';
import './EditVariableDialog.css';
import { ActionCreators } from '../../../state/reducer';
import { IDETemplateEntity, IDEVariable } from '../../../state/types';
import { unknownValue } from '../../../utils';
import {
  toConventionalId,
  variableIcon,
  wrapInterfaceTooltip,
} from '../../common';

import {
  Alert,
  Button,
  Classes,
  Dialog,
  EditableText,
  FormGroup,
  HTMLSelect,
  InputGroup,
  Intent,
} from '@blueprintjs/core';
import { Trash, WarningSign } from '@blueprintjs/icons';
import React, { useState } from 'react';

const variableTypes: {
  label: string;
  value: IDEVariable['type'];
  disabled?: boolean;
}[] = [
  { label: 'HD Key', value: 'HdKey' },
  { label: 'Key', value: 'Key' },
  { label: 'Address Data', value: 'AddressData' },
  { label: 'Wallet Data', value: 'WalletData' },
];

const variableTypeDescriptions: {
  [key in IDEVariable['type']]: React.ReactNode;
} = {
  AddressData: (
    <span>
      <p>
        Address Data is the most low-level variable type. It must be collected
        and stored each time a script is generated (usually, a locking script).
      </p>
      <p>
        Address Data can include any type of data, and can be used in any way.
        For more persistent data, use <code>WalletData</code>.
      </p>
    </span>
  ),
  HdKey:
    'The HD Key (Hierarchical-Deterministic Key) type automatically manages key generation and mapping in a standard way. For greater control, use a Key.',
  Key: (
    <span>
      <p>
        The Key type provides fine-grained control over key generation and
        mapping. Most templates should instead use <code>HDKey</code>.
      </p>
      <p>
        When using the Key type, any necessary HD (Hierarchical-Deterministic)
        derivation must be completed prior to compilation.
      </p>
    </span>
  ),
  WalletData: (
    <span>
      <p>
        The Wallet Data type provides a static piece of data – collected once
        and stored at the time of wallet creation.
      </p>
      <p>
        Wallet Data is persisted for the life of the wallet, rather than
        changing from locking script to locking script. For address-specific
        data, use <code>AddressData</code>.
      </p>
    </span>
  ),
};

export const EditVariableDialog = ({
  entity,
  variableInternalId,
  variable,
  isOpen,
  closeDialog,
  openGuide,
  upsertVariable,
  usedIds,
  deleteVariable,
}: {
  entity: IDETemplateEntity;
  variableInternalId?: string;
  variable?: IDEVariable;
  isOpen: boolean;
  closeDialog: () => void;
  openGuide: typeof ActionCreators.openGuide;
  upsertVariable: typeof ActionCreators.upsertVariable;
  usedIds: string[];
  deleteVariable: typeof ActionCreators.deleteVariable;
}) => {
  const [variableName, setVariableName] = useState(variable?.name ?? '');
  const [nameWasModified, setNameWasModified] = useState(false);
  const [variableDescription, setVariableDescription] = useState(
    variable?.description ?? '',
  );
  const [variableId, setVariableId] = useState(variable?.id ?? '');
  const [variableType, setVariableType] = useState(variable?.type ?? 'Key');
  const [nonUniqueId, setNonUniqueId] = useState('');
  const [promptDelete, setPromptDelete] = useState(false);
  const otherIds = usedIds.filter((usedId) => usedId !== variable?.id);
  return (
    <Dialog
      className="bp5-dark editor-dialog EditVariableDialog"
      onOpening={() => {
        setVariableName(variable?.name ?? '');
        setNameWasModified(false);
        setVariableDescription(variable?.description ?? '');
        setVariableId(variable?.id ?? '');
        setVariableType(variable?.type ?? 'AddressData');
        setNonUniqueId('');
      }}
      onClose={() => {
        closeDialog();
      }}
      title={!variableInternalId ? 'Create Variable' : 'Edit Variable'}
      isOpen={isOpen}
      canOutsideClickClose={false}
    >
      <div className={Classes.DIALOG_BODY}>
        <FormGroup
          helperText={variableTypeDescriptions[variableType]}
          label="Variable Type"
          labelFor="variable-type"
          inline={true}
        >
          <HTMLSelect
            id="variable-type"
            options={variableTypes}
            value={variableType}
            onChange={(e) => {
              const type = e.currentTarget.value as IDEVariable['type'];
              setVariableType(type);
              switch (type) {
                case 'HdKey':
                  if (!nameWasModified)
                    setVariableName(`${entity.name}'s HD Key`);
                  setVariableId(`${entity.id}_hdkey`);
                  break;
                case 'Key':
                  if (!nameWasModified) setVariableName(`${entity.name}'s Key`);
                  setVariableId(`${entity.id}_key`);
                  break;
                case 'AddressData':
                case 'WalletData':
                  if (!nameWasModified) setVariableName('');
                  setVariableId('');
                  break;
                /* istanbul ignore next */
                default:
                  unknownValue(type);
              }
            }}
          />
        </FormGroup>
        <div className="divider" />
        <h3 className="name">
          {wrapInterfaceTooltip(variableIcon(variableType), variableType)}
          <EditableText
            maxLength={100}
            placeholder="Variable Name"
            selectAllOnFocus={true}
            value={variableName}
            onChange={(name) => {
              setNameWasModified(true);
              setVariableName(name);
              if (variableInternalId === undefined) {
                setVariableId(toConventionalId(name));
              }
            }}
          />
        </h3>
        <div className="description">
          <EditableText
            maxLength={1000}
            minLines={3}
            multiline={true}
            placeholder="A brief description of this variable..."
            selectAllOnFocus={true}
            value={variableDescription}
            onChange={(description) => {
              setVariableDescription(description);
            }}
          />
        </div>
        <div className="divider" />
        <FormGroup
          helperText={
            <span>
              A unique variable identifier (must begin with a-z, A-Z, or
              <code>_</code>, remaining characters may include numbers,
              <code>.</code>, and
              <code>-</code>). This is used to reference the variable from
              within scripts.
            </span>
          }
          label="Variable ID"
          labelFor="variable-id"
          inline={true}
        >
          <InputGroup
            id="variable-id"
            value={variableId}
            autoComplete="off"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              setVariableId(value);
            }}
            onBlur={(e) => {
              const value = e.target.value;
              setVariableId(toConventionalId(value));
            }}
          />
        </FormGroup>
        <FormGroup
          helperText={
            <span>
              This dialog can be used to modify the variable&apos;s type, name,
              description, and ID. To set a specific value for testing, add the
              value to a scenario. See &ldquo;Developing Scenarios&rdquo; in the{' '}
              <button className="guide-link" onClick={() => openGuide()}>
                guide
              </button>{' '}
              for details.
            </span>
          }
          label="Value"
          labelFor="variable-value"
          inline={true}
        ></FormGroup>
        {variableInternalId && variable !== undefined && (
          <div>
            <Button
              className="ide-secondary-button delete-item-button"
              onClick={() => {
                setPromptDelete(true);
              }}
            >
              <Trash size={10} />
              Delete Variable
            </Button>
            <Alert
              cancelButtonText="Cancel"
              confirmButtonText="Delete Variable"
              intent={Intent.DANGER}
              isOpen={promptDelete}
              canEscapeKeyCancel={true}
              canOutsideClickCancel={true}
              onCancel={() => {
                setPromptDelete(false);
              }}
              onConfirm={() => {
                deleteVariable(variableInternalId);
                setPromptDelete(false);
                closeDialog();
              }}
            >
              <p>
                Are you sure you want to delete the variable “{variable.name}”?
              </p>
              <p>This cannot be undone.</p>
            </Alert>
          </div>
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <div className="error">
            {nonUniqueId === '' ? (
              <span />
            ) : (
              <span>
                <WarningSign size={12} />
                The ID <code>{nonUniqueId}</code> is already in use.
              </span>
            )}
          </div>
          <Button
            disabled={variableId === ''}
            onClick={() => {
              if (otherIds.includes(variableId)) {
                setNonUniqueId(variableId);
              } else {
                upsertVariable({
                  owningEntityInternalId: entity.internalId,
                  internalId: variableInternalId,
                  name: variableName,
                  description: variableDescription,
                  id: variableId,
                  type: variableType,
                });
                closeDialog();
              }
            }}
          >
            {variableInternalId ? 'Save Changes' : 'Create Variable'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
