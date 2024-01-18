import { ActionCreators } from '../../state/reducer';
import { AppState, IDETemplateEntity, IDEVariable } from '../../state/types';
import { getUsedIds, variableIcon, wrapInterfaceTooltip } from '../common';
import { EditVariableDialog } from '../dialogs/edit-variable-dialog/EditVariableDialog';

import { Card, Elevation } from '@blueprintjs/core';
import { useState } from 'react';
import './EntityVariableEditor.css';
import { connect } from 'react-redux';

type EntityVariablesProps = {
  entityInternalId: string;
  entity: IDETemplateEntity;
  variablesByInternalId: AppState['currentTemplate']['variablesByInternalId'];
  usedIds: string[];
};

type EntityVariablesDispatch = {
  deleteVariable: typeof ActionCreators.deleteVariable;
  openGuide: typeof ActionCreators.openGuide;
  upsertVariable: typeof ActionCreators.upsertVariable;
};

export const EntityVariableEditor = connect(
  (state: AppState, { entityInternalId }: { entityInternalId: string }) => ({
    entityInternalId: entityInternalId,
    entity: state.currentTemplate.entitiesByInternalId[entityInternalId],
    variablesByInternalId: state.currentTemplate.variablesByInternalId,
    usedIds: getUsedIds(state),
  }),
  {
    deleteVariable: ActionCreators.deleteVariable,
    upsertVariable: ActionCreators.upsertVariable,
    openGuide: ActionCreators.openGuide,
  },
)((props: EntityVariablesProps & EntityVariablesDispatch) => {
  const [editingVariable, setEditingVariable] = useState(false);
  const [currentVariableInternalId, setCurrentVariableInternalId] = useState<
    string | undefined
  >(undefined);
  const [currentVariable, setCurrentVariable] = useState<
    IDEVariable | undefined
  >(undefined);
  return (
    <div className="EntityVariableEditor EditorPane">
      <h2>Entity Variables</h2>
      <div className="entity-variables">
        {props.entity.variableInternalIds
          .map((internalId) => {
            const variable = props.variablesByInternalId[internalId]!;
            const name = variable.name;
            return { internalId, variable, name };
          })
          .sort((a, b) => a.variable.id.localeCompare(b.variable.id))
          .map(({ internalId, variable, name }) => (
            <Card
              key={internalId}
              className="variable"
              interactive={true}
              elevation={Elevation.TWO}
              onClick={() => {
                setCurrentVariableInternalId(internalId);
                setCurrentVariable(variable);
                setEditingVariable(true);
              }}
            >
              <h4 className="variable-header">
                <span>
                  {wrapInterfaceTooltip(
                    variableIcon(variable.type),
                    variable.type,
                  )}
                  {name}
                </span>
                <span className="identifier">{variable.id}</span>
              </h4>
              {variable.description && (
                <div className="description">{variable.description}</div>
              )}
            </Card>
          ))}
        <div
          className="add-variable"
          onClick={() => {
            setCurrentVariableInternalId(undefined);
            setCurrentVariable(undefined);
            setEditingVariable(true);
          }}
        >
          Add Variable...
        </div>
      </div>
      <EditVariableDialog
        closeDialog={() => {
          setEditingVariable(false);
          setCurrentVariableInternalId(undefined);
          setCurrentVariable(undefined);
        }}
        usedIds={props.usedIds}
        deleteVariable={props.deleteVariable}
        entity={props.entity}
        isOpen={editingVariable}
        openGuide={props.openGuide}
        upsertVariable={props.upsertVariable}
        variable={currentVariable}
        variableInternalId={currentVariableInternalId}
      />
    </div>
  );
});
