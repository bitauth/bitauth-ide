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

interface ProjectExplorerTreeNode {
  active: boolean;
  name: string;
  id: string;
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
    .parentId !== undefined;

const getActiveParent = (script: IDETemplateScript) =>
  hasParentId(script) ? script.parentId : undefined;

const buildProjectExplorerTree = (
  state: AppState
): ProjectExplorerTreeParent[] => {
  const activeId =
    state.currentEditingMode === 'script'
      ? state.currentlyEditingId
      : undefined;
  const activeParentId = activeId
    ? getActiveParent(state.currentTemplate.scriptsById[activeId])
    : undefined;
  return Object.entries(state.currentTemplate.scriptsById)
    .reduce<ProjectExplorerTreeNode[]>(
      (parents, [id, script]) =>
        script.type === 'locking' || script.type === 'tested'
          ? [
              ...parents,
              {
                active:
                  activeId !== undefined &&
                  (activeId === id || activeParentId === id),
                id,
                name: script.name,
                activatable: false,
                type: script.type,
                ...(script.childIds && {
                  children: script.childIds
                    .map(id => ({
                      active: activeId !== undefined && activeId === id,
                      id,
                      name: state.currentTemplate.scriptsById[id].name,
                      activatable: true,
                      type: state.currentTemplate.scriptsById[id].type
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name))
                })
              }
            ]
          : script.type === 'isolated'
          ? [
              ...parents,
              {
                active: activeId === id,
                id,
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

export const wrapInterfaceTooltip = (
  content?: JSX.Element,
  tooltipValue?: string
) => (
  <Tooltip
    content={tooltipValue}
    portalClassName="interface-tooltip"
    targetClassName="interface-tooltip-target"
    position={Position.RIGHT}
    boundary="window"
  >
    {content}
  </Tooltip>
);

export const ProjectExplorer = connect(
  (state: AppState) => ({
    templateName: state.currentTemplate.name,
    entities: Object.keys(state.currentTemplate.entitiesById).map(id => ({
      id,
      name: state.currentTemplate.entitiesById[id].name
    })),
    scripts: buildProjectExplorerTree(state)
  }),
  {
    activateScript: ActionCreators.activateScript,
    changeTemplate: ActionCreators.changeTemplate,
    newScript: ActionCreators.newScript
  }
)(
  ({
    templateName,
    entities,
    scripts,
    activateScript,
    changeTemplate,
    newScript
  }: {
    templateName: string;
    entities: { id: string; name: string }[];
    scripts: ProjectExplorerTreeParent[];
    activateScript: typeof ActionCreators.activateScript;
    changeTemplate: typeof ActionCreators.changeTemplate;
    newScript: typeof ActionCreators.newScript;
  }) => {
    return (
      <div className="ProjectExplorer">
        <h1 className="title-area">
          <span className="title">{templateName}</span>
          <div className="settings-button">
            {wrapInterfaceTooltip(
              <Icon icon={IconNames.COG} iconSize={10} />,
              'Authentication Template Settings'
            )}
          </div>
        </h1>
        {entities.length > 0 ? (
          <div className="entities-section">
            <h3>
              Entities
              <div className="add-button">
                {wrapInterfaceTooltip(
                  <Icon icon={IconNames.PLUS} iconSize={12} />,
                  'New Entity...'
                )}
              </div>
            </h3>
            <ul className="entities">
              {entities.map(entity => (
                <li key={entity.id}>{entity.name}</li>
              ))}
            </ul>
          </div>
        ) : (
          ''
        )}
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
                key={node.id}
                className={`${node.active ? 'active' : ''} ${
                  node.activatable ? 'activatable' : ''
                }`}
                onClick={() =>
                  node.activatable ? activateScript(node.id) : undefined
                }
                title={node.id}
              >
                {getScriptTooltipIcon(node.type)}
                {node.name}
                {node.children !== undefined && (
                  <ul>
                    {node.children.map(child => (
                      <li
                        key={child.id}
                        className={`${child.active ? 'active' : ''} ${
                          child.activatable ? 'activatable' : ''
                        }`}
                        onClick={() =>
                          child.activatable
                            ? activateScript(child.id)
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
