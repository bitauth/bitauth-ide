import React from 'react';
import './ProjectExplorer.scss';
import { connect } from 'react-redux';
import {
  AppState,
  IDETemplateUnlockingScript,
  IDETemplateScript,
  IDETemplateTestSetupScript,
  IDEActivatableScript,
  ScriptType
} from '../../state/types';
import { ActionCreators } from '../../state/reducer';
import { defaultState } from '../../state/defaults';
import { demoTemplate } from '../../state/demo';
import { Icon, Tooltip, Position } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { unknownValue } from '../../utils';
import { type } from 'os';
import { wrapInterfaceTooltip } from '../common';

interface ProjectExplorerTreeNode {
  active: boolean;
  name: string;
  id: string;
  internalId: string;
  activatable: boolean;
  type: ScriptType;
}

interface ProjectExplorerTreeParent extends ProjectExplorerTreeNode {
  children?: ProjectExplorerTreeNode[];
}

const isActivatable = (
  script: IDETemplateScript
): script is IDEActivatableScript =>
  script.type === 'unlocking' ||
  script.type === 'isolated' ||
  script.type === 'test-setup';

const hasParentId = (
  script: IDETemplateScript
): script is IDETemplateUnlockingScript | IDETemplateTestSetupScript =>
  (script as IDETemplateUnlockingScript | IDETemplateTestSetupScript)
    .parentInternalId !== undefined;

const getActiveParent = (script: IDETemplateScript) =>
  hasParentId(script) ? script.parentInternalId : undefined;

const buildProjectExplorerTree = (
  state: AppState
): ProjectExplorerTreeParent[] => {
  const activeInternalId =
    state.currentEditingMode === 'script'
      ? state.currentlyEditingInternalId
      : undefined;
  const activeParentInternalId = activeInternalId
    ? getActiveParent(
        state.currentTemplate.scriptsByInternalId[activeInternalId]
      )
    : undefined;
  return Object.entries(state.currentTemplate.scriptsByInternalId)
    .reduce<ProjectExplorerTreeNode[]>(
      (parents, [internalId, script]) =>
        script.type === 'locking' || script.type === 'tested'
          ? [
              ...parents,
              {
                active:
                  activeInternalId !== undefined &&
                  (activeInternalId === internalId ||
                    activeParentInternalId === internalId),
                id: script.id,
                internalId,
                name: script.name,
                activatable: false,
                type: script.type,
                ...(script.childInternalIds && {
                  children: script.childInternalIds
                    .map(childInternalId => ({
                      activatable: true,
                      active:
                        activeInternalId !== undefined &&
                        activeInternalId === childInternalId,
                      id:
                        state.currentTemplate.scriptsByInternalId[
                          childInternalId
                        ].id,
                      internalId: childInternalId,
                      name:
                        state.currentTemplate.scriptsByInternalId[
                          childInternalId
                        ].name,
                      type:
                        state.currentTemplate.scriptsByInternalId[
                          childInternalId
                        ].type
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name))
                })
              }
            ]
          : script.type === 'isolated'
          ? [
              ...parents,
              {
                active: activeInternalId === internalId,
                id: script.id,
                internalId,
                name: script.name,
                activatable: isActivatable(script),
                type: script.type
              }
            ]
          : parents,
      []
    )
    .sort((a, b) => a.name.localeCompare(b.name));
};

const size = 10;
const getIcon = (type?: ScriptType) => {
  switch (type) {
    case undefined:
      return undefined;
    case 'isolated':
      return (
        <Icon className="icon" icon={IconNames.DOCUMENT} iconSize={size} />
      );
    case 'tested':
      return <Icon className="icon" icon={IconNames.SAVED} iconSize={size} />;
    case 'locking':
      return <Icon className="icon" icon={IconNames.LOCK} iconSize={size} />;
    case 'unlocking':
      return <Icon className="icon" icon={IconNames.KEY} iconSize={size} />;
    case 'test-setup':
    case 'test-check':
      return <Icon className="icon" icon={IconNames.CONFIRM} iconSize={size} />;
    default:
      return unknownValue(type);
  }
};

const getScriptTypeName = (type?: ScriptType) => {
  switch (type) {
    case undefined:
      return undefined;
    case 'isolated':
      return 'Isolated Script';
    case 'tested':
      return 'Tested Script';
    case 'locking':
      return 'Locking Script';
    case 'unlocking':
      return 'Unlocking Script';
    case 'test-setup':
      return 'Test Setup Script';
    case 'test-check':
      return 'Test Checking Script';
    default:
      return unknownValue(type);
  }
};

export const getScriptTooltipIcon = (type?: ScriptType) =>
  wrapInterfaceTooltip(getIcon(type), getScriptTypeName(type));

// TODO: use ContextMenuTarget from "@blueprintjs/core"
export const ProjectExplorer = connect(
  (state: AppState) => ({
    templateName: state.currentTemplate.name,
    currentEditingMode: state.currentEditingMode,
    currentlyEditingId: state.currentlyEditingInternalId,
    entities: Object.keys(state.currentTemplate.entitiesByInternalId).map(
      internalId => ({
        internalId,
        name: state.currentTemplate.entitiesByInternalId[internalId].name
      })
    ),
    scripts: buildProjectExplorerTree(state)
  }),
  {
    openTemplateSettings: ActionCreators.openTemplateSettings,
    activateEntity: ActionCreators.activateEntity,
    activateScript: ActionCreators.activateScript,
    changeTemplate: ActionCreators.importTemplate,
    newEntity: ActionCreators.newEntity,
    newScript: ActionCreators.newScript
  }
)(
  ({
    currentEditingMode,
    currentlyEditingId,
    templateName,
    entities,
    scripts,
    openTemplateSettings,
    activateEntity,
    activateScript,
    changeTemplate,
    newEntity,
    newScript
  }: {
    currentEditingMode: AppState['currentEditingMode'];
    currentlyEditingId: AppState['currentlyEditingInternalId'];
    templateName: string;
    entities: { internalId: string; name: string }[];
    scripts: ProjectExplorerTreeParent[];
    openTemplateSettings: typeof ActionCreators.openTemplateSettings;
    activateEntity: typeof ActionCreators.activateEntity;
    activateScript: typeof ActionCreators.activateScript;
    changeTemplate: typeof ActionCreators.importTemplate;
    newEntity: typeof ActionCreators.newEntity;
    newScript: typeof ActionCreators.newScript;
  }) => {
    return (
      <div className="ProjectExplorer">
        <h1
          className={
            currentEditingMode === 'template-settings'
              ? 'title-area active'
              : 'title-area'
          }
          onClick={() => openTemplateSettings()}
        >
          <span className="title">{templateName}</span>
          <div className="settings-button">
            {wrapInterfaceTooltip(
              <Icon icon={IconNames.COG} iconSize={10} />,
              'Authentication Template Settings'
            )}
          </div>
        </h1>
        <div className="entities-section">
          <h3>
            Entities
            <div className="add-button" onClick={() => newEntity()}>
              {wrapInterfaceTooltip(
                <Icon icon={IconNames.PLUS} iconSize={12} />,
                'New Entity...'
              )}
            </div>
          </h3>
          <ul className="entities">
            {entities.map(entity => (
              <li
                key={entity.internalId}
                className={
                  currentEditingMode === 'entity' &&
                  currentlyEditingId === entity.internalId
                    ? 'activatable active'
                    : 'activatable'
                }
                onClick={() => activateEntity(entity.internalId)}
              >
                {entity.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="script-section">
          <h3>
            Scripts
            <div className="add-button" onClick={() => newScript()}>
              {wrapInterfaceTooltip(
                <Icon icon={IconNames.PLUS} iconSize={12} />,
                'New Script...'
              )}
            </div>
          </h3>
          <ul className="scripts">
            {scripts.map(node => (
              <li
                key={node.internalId}
                className={`${node.active ? 'active' : ''} ${
                  node.activatable ? 'activatable' : ''
                }`}
                onClick={() =>
                  node.activatable ? activateScript(node.internalId) : undefined
                }
                title={`Script ID: ${node.id}${
                  node.activatable
                    ? ''
                    : ' – this script must be edited with a child script. Choose or add a new child script to edit this script.'
                }`}
              >
                {getScriptTooltipIcon(node.type)}
                {node.name}
                {node.children !== undefined && (
                  <ul>
                    {node.children.map(child => (
                      <li
                        key={child.internalId}
                        className={`${child.active ? 'active' : ''} ${
                          child.activatable ? 'activatable' : ''
                        }`}
                        onClick={() =>
                          child.activatable
                            ? activateScript(child.internalId)
                            : undefined
                        }
                        title={child.id}
                      >
                        {getScriptTooltipIcon(child.type)}
                        {child.name}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="demo-control">
          <button
            onClick={() => {
              const otherTemplate =
                templateName === demoTemplate.name
                  ? defaultState.currentTemplate
                  : demoTemplate;
              changeTemplate(otherTemplate);
            }}
          >
            toggle demo
          </button>
        </div>
      </div>
    );
  }
);
