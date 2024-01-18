import '../editor-dialog.css';
import { ActionCreators } from '../../../state/reducer';
import { ActiveDialog } from '../../../state/types';
import { createInsecureUuidV4 } from '../../../utils';
import { toConventionalId } from '../../common';

import {
  Button,
  Classes,
  Dialog,
  FormGroup,
  InputGroup,
} from '@blueprintjs/core';
import { WarningSign } from '@blueprintjs/icons';
import React, { useState } from 'react';

export const NewEntityDialog = ({
  activeDialog,
  closeDialog,
  usedIds,
  createEntity,
}: {
  usedIds: string[];
  activeDialog: ActiveDialog;
  closeDialog: typeof ActionCreators.closeDialog;
  createEntity: typeof ActionCreators.createEntity;
}) => {
  const [entityName, setEntityName] = useState('');
  const [entityId, setEntityId] = useState('');
  const [nonUniqueId, setNonUniqueId] = useState('');

  return (
    <Dialog
      className="editor-dialog"
      onClose={() => closeDialog()}
      title="Add Entity to Wallet Template"
      isOpen={activeDialog === ActiveDialog.newEntity}
      canOutsideClickClose={false}
    >
      <div className={Classes.DIALOG_BODY}>
        <FormGroup
          helperText="A single-line, human-readable name for this entity."
          label="Entity Name"
          labelFor="entity-name"
          inline={true}
        >
          <InputGroup
            id="entity-name"
            value={entityName}
            autoComplete="off"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              setEntityName(value);
              setEntityId(toConventionalId(value));
            }}
          />
        </FormGroup>
        <FormGroup
          helperText={
            <span>
              <p>
                A unique entity identifier (must begin with a-z, A-Z, or
                <code>_</code>, remaining characters may include numbers,
                <code>.</code>, and
                <code>-</code>).
              </p>
              <p>
                This is not used in the IDE, but it is required to reference
                this entity during compilation of the exported Authentication
                Template.
              </p>
            </span>
          }
          label="Entity ID"
          labelFor="entity-id"
          inline={true}
        >
          <InputGroup
            id="entity-id"
            value={entityId}
            autoComplete="off"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              setEntityId(toConventionalId(value));
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
                <WarningSign size={12} />
                The ID <code>{nonUniqueId}</code> is already in use.
              </span>
            )}
          </div>
          <Button
            disabled={entityName === '' || entityId === ''}
            onClick={() => {
              if (usedIds.includes(entityId)) {
                setNonUniqueId(entityId);
              } else {
                setEntityName('');
                setEntityId('');
                setNonUniqueId('');
                createEntity({
                  name: entityName,
                  id: entityId,
                  internalId: createInsecureUuidV4(),
                });
                closeDialog();
              }
            }}
          >
            Add Entity
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
