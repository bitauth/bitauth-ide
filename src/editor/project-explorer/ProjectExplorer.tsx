import React from 'react';
import './ProjectExplorer.scss';
import { connect } from 'react-redux';
import {
  AppState,
  IDETemplateUnlockingScript,
  IDETemplateScript,
  IDETemplateTestSetupScript,
  IDEActivatableScript
} from '../../state/types';
import { ActionCreators } from '../../state/reducer';
import { defaultState } from '../../state/defaults';
import { demoTemplate } from '../../state/demo';

interface ProjectExplorerTreeNode {
  active: boolean;
  name: string;
  id: string;
  activatable: boolean;
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
                ...(script.childIds && {
                  children: script.childIds
                    .map(id => ({
                      active: activeId !== undefined && activeId === id,
                      id,
                      name: state.currentTemplate.scriptsById[id].name,
                      activatable: true
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
                activatable: isActivatable(script)
              }
            ]
          : parents,
      []
    )
    .sort((a, b) => a.name.localeCompare(b.name));
};

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
    changeTemplate: ActionCreators.changeTemplate
  }
)(
  ({
    templateName,
    entities,
    scripts,
    activateScript,
    changeTemplate
  }: {
    templateName: string;
    entities: { id: string; name: string }[];
    scripts: ProjectExplorerTreeParent[];
    // activateScript: (activatable: boolean, id: string) => any;
    activateScript: typeof ActionCreators.activateScript;
    changeTemplate: typeof ActionCreators.changeTemplate;
  }) => {
    return (
      <div className="ProjectExplorer">
        <h1 className="title">{templateName}</h1>
        {entities.length > 0 ? (
          <div>
            <h3>Entities</h3>
            <ul className="entities">
              {entities.map(entity => (
                <li key={entity.id}>{entity.name}</li>
              ))}
            </ul>
          </div>
        ) : (
          ''
        )}
        <h3>Scripts</h3>
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
            >
              {node.name}
              {node.children !== undefined && (
                <ul>
                  {node.children.map(node => (
                    <li
                      key={node.id}
                      className={`${node.active ? 'active' : ''} ${
                        node.activatable ? 'activatable' : ''
                      }`}
                      onClick={() =>
                        node.activatable ? activateScript(node.id) : undefined
                      }
                    >
                      {node.name}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
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
