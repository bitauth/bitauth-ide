import '../editor-dialog.scss';
import './EditVariableDialog.scss';
import React, { useState } from 'react';
import { ActionCreators } from '../../../state/reducer';
import {
  IDETemplateEntity,
  CurrentVariables,
  IDEVariable
} from '../../../state/types';
import {
  Classes,
  Dialog,
  FormGroup,
  InputGroup,
  Button,
  Icon,
  Intent,
  Alert,
  EditableText,
  HTMLSelect
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { sanitizeId, variableIcon, wrapInterfaceTooltip } from '../../common';
import { unknownValue } from '../../../utils';

const variableTypes: {
  label: string;
  value: IDEVariable['type'];
  disabled?: boolean;
}[] = [
  { label: 'Current Block Height', value: 'CurrentBlockHeight' },
  { label: 'Current Block Time', value: 'CurrentBlockTime' },
  { label: 'HD Key (Not Yet Available)', value: 'HDKey', disabled: true },
  { label: 'Key', value: 'Key' },
  { label: 'Transaction Data', value: 'TransactionData' },
  { label: 'Wallet Data', value: 'WalletData' }
];

const variableTypeDescriptions: {
  [key in IDEVariable['type']]: React.ReactNode
} = {
  CurrentBlockHeight: (
    <span>
      <p>
        The Current Block Height type provides the current block height as a
        Script Number.
      </p>
      <p>
        This is useful when computing a height for OP_CHECKLOCKTIMEVERIFY which
        is relative to the height at the moment a script is created (usually, a
        locking script).
      </p>
    </span>
  ),
  CurrentBlockTime: (
    <span>
      <p>
        The Current Block Time type provides the current block time as a Script
        Number.
      </p>
      <p>
        This is useful when computing a time for OP_CHECKLOCKTIMEVERIFY which is
        relative to the current time at the moment a script is created (usually,
        a locking script).
      </p>
    </span>
  ),
  HDKey:
    'The HD Key (Hierarchical-Deterministic Key) type automatically manages key generation and mapping in a standard way. For greater control, use a Key. NOTE: HDKey is not yet supported by this IDE.',
  Key: (
    <span>
      <p>
        The Key type provides fine-grained control over key generation and
        mapping. Most templates should instead use an HD Key.
      </p>
      <p>
        When using the Key type, any necessary HD (Hierarchical-Deterministic)
        derivation must be completed prior to compilation.
      </p>
    </span>
  ),
  TransactionData: (
    <span>
      <p>
        Transaction Data is the most low-level variable type. It must be
        collected and stored each time a script is generated (usually, a locking
        script).
      </p>
      <p>
        Transaction Data can include any type of data, and can be used in any
        way. For more persistent data, use Wallet Data.
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
        changing from locking script to locking script. For transaction-specific
        data, use Transaction Data.
      </p>
    </span>
  )
};

const isValidHex = (value: string) => value.length % 2 === 0;

/**
 * The key must be 32 bytes (64 hex characters), and it must be less than or equal to:
 * `0xFFFF FFFF FFFF FFFF FFFF FFFF FFFF FFFE BAAE DCE6 AF48 A03B BFD2 5E8C D036 4140`
 *
 * Because this is only for testing, we just disallow keys with more than 31 `f`
 * characters. 😄
 */
const isValidEnoughPrivateKey = (key: string) =>
  key.length === 64 && key.toLowerCase().split('f').length < 32;

const ones = '1111111111111111111111111111111111111111111111111111111111111111';

export const EditVariableDialog = ({
  entity,
  currentVariables,
  variableInternalId,
  variable,
  isOpen,
  closeDialog,
  upsertVariable,
  deleteVariable
}: {
  entity: IDETemplateEntity;
  currentVariables: CurrentVariables;
  variableInternalId?: string;
  variable?: IDEVariable;
  isOpen: boolean;
  closeDialog: () => any;
  upsertVariable: typeof ActionCreators.upsertVariable;
  deleteVariable: typeof ActionCreators.deleteVariable;
}) => {
  const [variableName, setVariableName] = useState(
    (variable && variable.name) || ''
  );
  const [variableDescription, setVariableDescription] = useState(
    (variable && variable.description) || ''
  );
  const [variableId, setVariableId] = useState((variable && variable.id) || '');
  const [variableType, setVariableType] = useState(
    (variable && variable.type) || 'Key'
  );
  const [variableMock, setVariableMock] = useState(
    (variable && variable.mock) || ones
  );
  const [nonUniqueId, setNonUniqueId] = useState('');
  const [promptDelete, setPromptDelete] = useState(false);
  return (
    <Dialog
      className="bp3-dark editor-dialog EditVariableDialog"
      onOpening={() => {
        setVariableName((variable && variable.name) || '');
        setVariableDescription((variable && variable.description) || '');
        setVariableId((variable && variable.id) || '');
        setVariableType((variable && variable.type) || 'Key');
        setVariableMock((variable && variable.mock) || ones);
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
            onChange={e => {
              const type = e.currentTarget.value as IDEVariable['type'];
              setVariableType(type);
              switch (type) {
                case 'CurrentBlockHeight':
                  setVariableName('Current Block Height');
                  setVariableId('block_height');
                  break;
                case 'CurrentBlockTime':
                  setVariableName('Current Block Time');
                  setVariableId('block_time');
                  break;
                case 'HDKey':
                  setVariableName(`${entity.name}'s HD Key`);
                  setVariableId(`${entity.id}_hdkey`);
                  break;
                case 'Key':
                  setVariableName(`${entity.name}'s Key`);
                  setVariableId(`${entity.id}_key`);
                  break;
                case 'TransactionData':
                case 'WalletData':
                  setVariableName('');
                  setVariableId('');
                  break;
                default:
                  unknownValue(type);
              }
            }}
          />
        </FormGroup>
        <div className="divider" />
        <h3 className="name">
          {wrapInterfaceTooltip(
            <Icon icon={variableIcon(variableType)} iconSize={12} />,
            variableType
          )}
          <EditableText
            maxLength={100}
            placeholder="Variable Name"
            selectAllOnFocus={true}
            value={variableName}
            onChange={name => {
              setVariableName(name);
              if (variableInternalId === undefined) {
                setVariableId(sanitizeId(name));
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
            onChange={description => setVariableDescription(description)}
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
              setVariableId(sanitizeId(value));
            }}
          />
        </FormGroup>
        {variableType !== 'CurrentBlockHeight' &&
          variableType !== 'CurrentBlockTime' && (
            <FormGroup
              helperText={
                <span>
                  {variableType === 'Key' ? (
                    <p>
                      A valid, testing private key encoded as a hexadecimal
                      value. (This will be 64 characters, and it must fall
                      within the range for Secp256k1.)
                    </p>
                  ) : variableType === 'WalletData' ? (
                    <p>
                      A testing value for the Wallet Data, encoded as a
                      hexadecimal value.
                    </p>
                  ) : variableType === 'TransactionData' ? (
                    <p>
                      A testing value for the Transaction Data, encoded as a
                      hexadecimal value.
                    </p>
                  ) : (
                    ''
                  )}
                  <p>
                    This is used during development in BitAuth IDE, and is
                    exported as part of the authentication template.
                  </p>
                </span>
              }
              label="IDE Value"
              labelFor="variable-value"
              inline={true}
            >
              <InputGroup
                id="variable-value"
                value={variableMock}
                autoComplete="off"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  setVariableMock(
                    value.toLowerCase().replace(/[^0-9a-f]*/g, '')
                  );
                }}
              />
            </FormGroup>
          )}

        {variableInternalId && variable !== undefined && (
          <div>
            <Button
              className="delete-item-button"
              onClick={() => {
                setPromptDelete(true);
              }}
            >
              <Icon icon={IconNames.TRASH} iconSize={10} />
              Delete Script
            </Button>
            <Alert
              cancelButtonText="Cancel"
              confirmButtonText="Delete Script"
              intent={Intent.DANGER}
              isOpen={promptDelete}
              canEscapeKeyCancel={true}
              canOutsideClickCancel={true}
              onCancel={() => setPromptDelete(false)}
              onConfirm={() => {
                deleteVariable(variableInternalId);
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
                <Icon icon={IconNames.WARNING_SIGN} iconSize={12} />
                The Variable ID <code>{nonUniqueId}</code> is already in use.
              </span>
            )}
          </div>
          <Button
            disabled={
              variableId === '' ||
              variableMock === '' ||
              !isValidHex(variableMock) ||
              (variableType === 'Key' &&
                !isValidEnoughPrivateKey(variableMock)) ||
              variableType === 'HDKey'
            }
            onClick={() => {
              /**
               * TODO: we should really be tracking all "usedIds" together rather than
               * tracking variable, entity, and script IDs separately. Entity ID's can
               * overlap with the others, but variable and script IDs conflict. (Currently,
               * the compiler assumes you meant the variable if a conflict arises.)
               */
              const usedIds = currentVariables
                .map(v => v.id)
                .filter(id => variable === undefined || variable.id !== id);
              if (usedIds.indexOf(variableId) !== -1) {
                setNonUniqueId(variableId);
              } else {
                upsertVariable({
                  owningEntityInternalId: entity.internalId,
                  internalId: variableInternalId,
                  name: variableName,
                  description: variableDescription,
                  id: variableId,
                  type: variableType,
                  mock: variableMock
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
