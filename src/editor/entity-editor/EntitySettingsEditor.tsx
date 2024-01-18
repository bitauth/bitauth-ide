import './EntitySettingsEditor.css';
import { ActionCreators } from '../../state/reducer';
import { AppState, CurrentScripts, IDETemplateEntity } from '../../state/types';
import { getCurrentScripts, toConventionalId } from '../common';

import {
  Alert,
  Button,
  Checkbox,
  EditableText,
  FormGroup,
  InputGroup,
  Intent,
  Radio,
  RadioGroup,
} from '@blueprintjs/core';
import { Trash } from '@blueprintjs/icons';
import React, { useState } from 'react';
import { connect } from 'react-redux';

type EntitySettingsProps = {
  entityInternalId: string;
  entity: IDETemplateEntity;
  currentScripts: CurrentScripts;
};

type EntitySettingsDispatch = {
  updateEntityDescription: typeof ActionCreators.updateEntityDescription;
  updateEntityId: typeof ActionCreators.updateEntityId;
  updateEntityName: typeof ActionCreators.updateEntityName;
  updateEntityScriptUsage: typeof ActionCreators.updateEntityScriptUsage;
  updateEntityScripts: typeof ActionCreators.updateEntityScripts;
  deleteEntity: typeof ActionCreators.deleteEntity;
};

export const EntitySettingsEditor = connect(
  (state: AppState, { entityInternalId }: { entityInternalId: string }) => ({
    entityInternalId: entityInternalId,
    entity: state.currentTemplate.entitiesByInternalId[entityInternalId],
    currentScripts: getCurrentScripts(state),
  }),
  {
    updateEntityDescription: ActionCreators.updateEntityDescription,
    updateEntityId: ActionCreators.updateEntityId,
    updateEntityName: ActionCreators.updateEntityName,
    updateEntityScriptUsage: ActionCreators.updateEntityScriptUsage,
    updateEntityScripts: ActionCreators.updateEntityScripts,
    deleteEntity: ActionCreators.deleteEntity,
  },
)((props: EntitySettingsProps & EntitySettingsDispatch) => {
  const [promptDelete, setPromptDelete] = useState(false);
  return (
    <div className="EntitySettingsEditor EditorPane">
      <h2>Entity Settings</h2>
      <div className="EditorPaneContents">
        <h3 className="name">
          <EditableText
            maxLength={100}
            minWidth={300}
            placeholder="Entity Name"
            selectAllOnFocus={true}
            value={props.entity.name}
            onChange={(name) => {
              props.updateEntityName(props.entityInternalId, name);
              // setFastEntityName(name);
            }}
            onConfirm={(name) => {
              const id = toConventionalId(name);
              // setFastEntityId(id);
              props.updateEntityId(props.entityInternalId, id);
            }}
          />
        </h3>
        <div className="description">
          <EditableText
            maxLength={1000}
            minLines={3}
            multiline={true}
            placeholder="A brief description of this entity..."
            selectAllOnFocus={true}
            value={props.entity.description}
            onChange={(description) => {
              props.updateEntityDescription(
                props.entityInternalId,
                description,
              );
            }}
          />
        </div>
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
            value={props.entity.id}
            autoComplete="off"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = toConventionalId(e.target.value);
              props.updateEntityId(props.entityInternalId, value);
            }}
          />
        </FormGroup>
        <FormGroup
          helperText={
            <span>
              <p>
                Each entity must be told which scripts which they are expected
                to use. This allows wallet implementations to request or
                generate necessary information during wallet creation.
              </p>
              <p>
                This is not used in the IDE, but is required by wallets
                importing the wallet template.
              </p>
            </span>
          }
          label="Script Usage"
          inline={true}
        >
          <RadioGroup
            onChange={(e) => {
              props.updateEntityScriptUsage(
                props.entityInternalId,
                e.currentTarget.value === 'on',
              );
            }}
            selectedValue={props.entity.usesAllScripts ? 'on' : 'off'}
          >
            <Radio
              label={`${props.entity.name} uses all template scripts.`}
              value="on"
            />
            <Radio
              label={`Individually select scripts for ${props.entity.name}.`}
              value="off"
            />
          </RadioGroup>
        </FormGroup>
        <FormGroup
          label="Scripts"
          inline={true}
          style={{ ...(props.entity.usesAllScripts && { display: 'none' }) }}
        >
          <div>
            {props.currentScripts.map((script) => (
              <Checkbox
                checked={props.entity.scriptInternalIds.includes(
                  script.internalId,
                )}
                key={script.internalId}
                label={script.name}
                value={script.internalId}
                onChange={(_) => {
                  props.updateEntityScripts(props.entityInternalId, {
                    [script.internalId]:
                      !props.entity.scriptInternalIds.includes(
                        script.internalId,
                      ),
                  });
                }}
              />
            ))}
          </div>
        </FormGroup>
        <Button
          className="ide-secondary-button delete-item-button"
          onClick={() => {
            setPromptDelete(true);
          }}
        >
          <Trash size={10} />
          Delete Entity
        </Button>
        <Alert
          cancelButtonText="Cancel"
          confirmButtonText="Delete Entity"
          intent={Intent.DANGER}
          isOpen={promptDelete}
          canEscapeKeyCancel={true}
          canOutsideClickCancel={true}
          onCancel={() => {
            setPromptDelete(false);
          }}
          onConfirm={() => props.deleteEntity(props.entityInternalId)}
        >
          <p>
            Are you sure you want to delete the entity “{props.entity.name}”?
          </p>
          <p>This cannot be undone.</p>
        </Alert>
      </div>
    </div>
  );
});
