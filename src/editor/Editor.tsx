import './Editor.scss';
import { Mosaic } from 'react-mosaic-component';
import { ProjectExplorer } from './project-explorer/ProjectExplorer';
import { ScriptEditor } from './script-editor/ScriptEditor';
import { EvaluationViewer } from './evaluation-viewer/EvaluationViewer';
import React, { useState } from 'react';
import { connect } from 'react-redux';
import { unknownValue } from '../utils';
import {
  AppState,
  ActiveDialog,
  CurrentScripts,
  CurrentEntities
} from '../state/types';
import {
  ProjectEditorMode,
  IDESupportedProgramState,
  ComputedEditorState,
  EditorStateScriptMode,
  ScriptEditorPane,
  ScriptEvaluationViewerPane
} from './editor-types';
import { ActionCreators } from '../state/reducer';
import { NewScriptDialog } from './dialogs/new-script-dialog/NewScriptDialog';
import { EntitySettingsEditor } from './entity-editor/EntitySettingsEditor';
import { EntityVariableEditor } from './entity-editor/EntityVariableEditor';
import { getCurrentScripts, getCurrentEntities } from './common';
import { NewEntityDialog } from './dialogs/new-entity-dialog/NewEntityDialog';
import { TemplateSettings } from './template-settings/TemplateSettings';
import { ImportExportDialog } from './dialogs/import-export-dialog/ImportExportDialog';
import { ImportScriptDialog } from './dialogs/import-script-dialog/ImportScriptDialog';
import { WelcomePane } from './welcome-pane/WelcomePane';
import { computeEditorState } from './editor-state';

enum Pane {
  projectExplorer = 'projectExplorerPane',
  templateSettingsEditor = 'templateSettingsEditorPane',
  entitySettingsEditor = 'entitySettingsEditorPane',
  entityVariableEditor = 'entityVariableEditorPane',
  loading = 'loading',
  importing = 'importing',
  welcome = 'welcome'
}

interface EditorDispatch {
  updateScript: typeof ActionCreators.updateScript;
  closeDialog: typeof ActionCreators.closeDialog;
  createScript: typeof ActionCreators.createScript;
  editScript: typeof ActionCreators.editScript;
  deleteScript: typeof ActionCreators.deleteScript;
  createEntity: typeof ActionCreators.createEntity;
}

interface EditorProps<ProgramState extends IDESupportedProgramState>
  extends EditorDispatch {
  computed: ComputedEditorState<ProgramState>;
  currentlyEditingInternalId: string | undefined;
  currentScripts: CurrentScripts;
  currentEntities: CurrentEntities;
  activeDialog: ActiveDialog;
}

export const Editor = connect(
  (state: AppState) => ({
    computed: computeEditorState(state),
    currentlyEditingInternalId: state.currentlyEditingInternalId,
    currentScripts: getCurrentScripts(state),
    currentEntities: getCurrentEntities(state),
    activeDialog: state.activeDialog
  }),
  {
    closeDialog: ActionCreators.closeDialog,
    updateScript: ActionCreators.updateScript,
    createScript: ActionCreators.createScript,
    editScript: ActionCreators.editScript,
    deleteScript: ActionCreators.deleteScript,
    createEntity: ActionCreators.createEntity
  }
)((props: EditorProps<IDESupportedProgramState>) => {
  const [projectExplorerWidth, setProjectExplorerWidth] = useState(21);
  const [scriptEditorWidths, setScriptEditorWidths] = useState(40);
  const [settingsWidth, setSettingsWidth] = useState(50);
  const [frames2SplitHeight, setFrames2SplitHeight] = useState(30);
  const [frames3TopSplitHeight, setFrames3TopSplitHeight] = useState(20);
  const [frames3BottomSplitHeight, setFrames3BottomSplitHeight] = useState(70);
  const [scrollOffsetFrame1, setScrollOffsetFrame1] = useState(0);
  const [scrollOffsetFrame2, setScrollOffsetFrame2] = useState(0);
  const [scrollOffsetFrame3, setScrollOffsetFrame3] = useState(0);
  const scrollOffset = [
    scrollOffsetFrame1,
    scrollOffsetFrame2,
    scrollOffsetFrame3
  ];
  const setScrollOffset = [
    setScrollOffsetFrame1,
    setScrollOffsetFrame2,
    setScrollOffsetFrame3
  ];
  return (
    <div className="Editor">
      <Mosaic<Pane | ScriptEditorPane | ScriptEvaluationViewerPane>
        className="mosaic-blueprint-theme bp3-dark"
        renderTile={id => {
          let type: 'evaluation' | 'editor' = 'evaluation';
          switch (id) {
            case Pane.projectExplorer:
              return <ProjectExplorer />;
            case ScriptEditorPane.zero:
            case ScriptEditorPane.one:
            case ScriptEditorPane.two:
              type = 'editor';
            case ScriptEvaluationViewerPane.zero: // eslint-disable-line no-fallthrough
            case ScriptEvaluationViewerPane.one:
            case ScriptEvaluationViewerPane.two:
              const computed = props.computed as EditorStateScriptMode<
                IDESupportedProgramState
              >;
              let i = 0;
              switch (id) {
                case ScriptEditorPane.zero:
                case ScriptEvaluationViewerPane.zero:
                  break;
                case ScriptEditorPane.one:
                case ScriptEvaluationViewerPane.one:
                  i = 1;
                  break;
                case ScriptEditorPane.two:
                case ScriptEvaluationViewerPane.two:
                  i = 2;
                  break;
                default:
                  unknownValue(id);
              }
              return type === 'editor' ? (
                <ScriptEditor
                  internalId={computed.scriptEditorFrames[i].internalId}
                  id={computed.scriptEditorFrames[i].id}
                  name={computed.scriptEditorFrames[i].name}
                  script={computed.scriptEditorFrames[i].script}
                  scriptType={computed.scriptEditorFrames[i].scriptType}
                  compilation={computed.scriptEditorFrames[i].compilation}
                  variableDetails={computed.variableDetails}
                  scriptDetails={computed.scriptDetails}
                  isP2SH={computed.isP2sh}
                  updateScript={props.updateScript}
                  currentScripts={props.currentScripts}
                  setScrollOffset={setScrollOffset[i]}
                  editScript={props.editScript}
                  deleteScript={props.deleteScript}
                />
              ) : (
                <EvaluationViewer
                  compilation={computed.scriptEditorFrames[i].compilation}
                  evaluation={computed.scriptEditorFrames[i].evaluation}
                  evaluationTrace={computed.scriptEditorEvaluationTrace}
                  id={computed.scriptEditorFrames[i].id}
                  script={computed.scriptEditorFrames[i].script}
                  lookup={computed.identifyStackItems}
                  scrollOffset={scrollOffset[i]}
                />
              );

            case Pane.entityVariableEditor:
              return props.currentlyEditingInternalId ? (
                <EntityVariableEditor
                  entityInternalId={props.currentlyEditingInternalId}
                />
              ) : (
                <div className="loading" />
              );
            case Pane.entitySettingsEditor:
              return props.currentlyEditingInternalId ? (
                <EntitySettingsEditor
                  entityInternalId={props.currentlyEditingInternalId}
                />
              ) : (
                <div className="loading" />
              );
            case Pane.templateSettingsEditor:
              return <TemplateSettings />;
            case Pane.welcome:
              return <WelcomePane />;
            case Pane.loading:
              return <div className="loading" />;
            case Pane.importing:
              return <div className="loading" />;
            default:
              unknownValue(id);
              return (
                <h3>Editor error – tried to render Mosaic tile: "{id}"</h3>
              );
          }
        }}
        value={
          props.computed.editorMode === ProjectEditorMode.welcome
            ? Pane.welcome
            : props.computed.editorMode === ProjectEditorMode.loading
            ? Pane.loading
            : props.computed.editorMode === ProjectEditorMode.importing
            ? Pane.importing
            : {
                direction: 'row',
                first: Pane.projectExplorer,
                second:
                  props.computed.editorMode ===
                  ProjectEditorMode.templateSettingsEditor
                    ? Pane.templateSettingsEditor
                    : props.computed.editorMode ===
                      ProjectEditorMode.entityEditor
                    ? {
                        direction: 'row',
                        first: Pane.entitySettingsEditor,
                        second: Pane.entityVariableEditor,
                        splitPercentage: settingsWidth
                      }
                    : props.computed.editorMode ===
                      ProjectEditorMode.isolatedScriptEditor
                    ? {
                        direction: 'row',
                        first: ScriptEditorPane.zero,
                        second: ScriptEvaluationViewerPane.zero,
                        splitPercentage: scriptEditorWidths
                      }
                    : props.computed.editorMode ===
                      ProjectEditorMode.scriptPairEditor
                    ? {
                        direction: 'row',
                        first: {
                          direction: 'column',
                          first: ScriptEditorPane.zero,
                          second: ScriptEditorPane.one,
                          splitPercentage: frames2SplitHeight
                        },
                        second: {
                          direction: 'column',
                          first: ScriptEvaluationViewerPane.zero,
                          second: ScriptEvaluationViewerPane.one,
                          splitPercentage: frames2SplitHeight
                        },
                        splitPercentage: scriptEditorWidths
                      }
                    : props.computed.editorMode ===
                      ProjectEditorMode.testedScriptEditor
                    ? {
                        direction: 'row',
                        first: {
                          direction: 'column',
                          first: ScriptEditorPane.zero,
                          second: {
                            direction: 'column',
                            first: ScriptEditorPane.one,
                            second: ScriptEditorPane.two,
                            splitPercentage: frames3BottomSplitHeight
                          },
                          splitPercentage: frames3TopSplitHeight
                        },
                        second: {
                          direction: 'column',
                          first: ScriptEvaluationViewerPane.zero,
                          second: {
                            direction: 'column',
                            first: ScriptEvaluationViewerPane.one,
                            second: ScriptEvaluationViewerPane.two,
                            splitPercentage: frames3BottomSplitHeight
                          },
                          splitPercentage: frames3TopSplitHeight
                        },
                        splitPercentage: scriptEditorWidths
                      }
                    : unknownValue(props.computed.editorMode),
                splitPercentage: projectExplorerWidth
              }
        }
        onChange={node => {
          if (node && typeof node === 'object') {
            if (projectExplorerWidth !== node.splitPercentage) {
              setProjectExplorerWidth(node.splitPercentage as number);
            }
            if (typeof node.second === 'object') {
              if (
                props.computed.editorMode ===
                  ProjectEditorMode.templateSettingsEditor ||
                props.computed.editorMode === ProjectEditorMode.entityEditor
              ) {
                if (settingsWidth !== node.second.splitPercentage) {
                  setSettingsWidth(node.second.splitPercentage as number);
                }
              } else {
                if (scriptEditorWidths !== node.second.splitPercentage) {
                  setScriptEditorWidths(node.second.splitPercentage as number);
                }
                if (
                  typeof node.second.first === 'object' &&
                  typeof node.second.second === 'object'
                ) {
                  if (
                    typeof node.second.first.second === 'object' &&
                    typeof node.second.second.second === 'object'
                  ) {
                    const editorLine1 = node.second.first
                      .splitPercentage as number;
                    const viewerLine1 = node.second.second
                      .splitPercentage as number;
                    setFrames3TopSplitHeight(
                      frames3TopSplitHeight !== editorLine1
                        ? editorLine1
                        : viewerLine1
                    );
                    const editorLine2 = node.second.first.second
                      .splitPercentage as number;
                    const viewerLine2 = node.second.second.second
                      .splitPercentage as number;
                    setFrames3BottomSplitHeight(
                      frames3BottomSplitHeight !== editorLine2
                        ? editorLine2
                        : viewerLine2
                    );
                  } else {
                    const editorLine = node.second.first
                      .splitPercentage as number;
                    const viewerLine = node.second.second
                      .splitPercentage as number;
                    setFrames2SplitHeight(
                      frames2SplitHeight !== editorLine
                        ? editorLine
                        : viewerLine
                    );
                  }
                }
              }
            }
          }
          window.dispatchEvent(new Event('resize'));
        }}
        resize={{ minimumPaneSizePercentage: 10 }}
      />
      <NewEntityDialog
        activeDialog={props.activeDialog}
        closeDialog={props.closeDialog}
        currentEntities={props.currentEntities}
        createEntity={props.createEntity}
      />
      <NewScriptDialog
        activeDialog={props.activeDialog}
        closeDialog={props.closeDialog}
        currentScripts={props.currentScripts}
        createScript={props.createScript}
      />
      <ImportScriptDialog
        activeDialog={props.activeDialog}
        closeDialog={props.closeDialog}
        currentScripts={props.currentScripts}
        createScript={props.createScript}
      />
      <ImportExportDialog
        activeDialog={props.activeDialog}
        closeDialog={props.closeDialog}
      />
    </div>
  );
});
