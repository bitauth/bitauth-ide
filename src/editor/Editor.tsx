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
  IDETemplateLockingScript,
  IDEActivatableScript,
  IDETemplateScript,
  IDETemplateTestedScript,
  ScriptType,
  ActiveDialog,
  CurrentScripts,
  CurrentEntities
} from '../state/types';
import {
  OpcodesBCH,
  AuthenticationInstruction,
  hexToBin,
  CompilationResult,
  CompilationData,
  sampledEvaluateReductionTraceNodes,
  CompilerOperationDataBCH,
  createAuthenticationProgramExternalStateCommonEmpty,
  createCompiler,
  createAuthenticationProgramStateCommon,
  AuthenticationProgramStateBCH,
  SampledEvaluationResult,
  getCompilerOperationsBCH,
  compileScriptText
} from 'bitcoin-ts';
import {
  getResolvedVariables,
  ResolvedVariable
} from '../btl-utils/editor-tooling';
import {
  extractSamplesFromReductionTrace,
  addSpacersToTraceSamples,
  reduceSpacedTraceSamples
} from '../btl-utils/reduce';
import {
  StackItemIdentifyFunction,
  ProjectEditorMode,
  Evaluation,
  IDESupportedProgramState,
  EvaluationViewerHighlight
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

const getEditorMode = (
  currentEditingMode: 'welcome' | 'entity' | 'script' | 'template-settings',
  currentlyEditingInternalId: string,
  template: AppState['currentTemplate']
) => {
  if (currentEditingMode === 'welcome') {
    return ProjectEditorMode.welcome;
  }
  if (currentEditingMode === 'template-settings') {
    return ProjectEditorMode.templateSettingsEditor;
  }
  if (currentEditingMode === 'entity') {
    return ProjectEditorMode.entityEditor;
  }
  const scriptType =
    template.scriptsByInternalId[currentlyEditingInternalId].type;
  switch (scriptType) {
    case 'isolated':
      return ProjectEditorMode.isolatedScriptEditor;
    case 'test-setup':
      return ProjectEditorMode.testedScriptEditor;
    case 'unlocking':
      return ProjectEditorMode.scriptPairEditor;
    default:
      throw new Error(
        `The script referenced by "state.currentlyEditingId" must be of type, 'isolated', 'unlocking', or 'test-setup'. The script provided is of type '${scriptType}'.`
      );
  }
};

const bitcoinCashOpcodeIdentifiers = Object.entries(OpcodesBCH)
  .filter(([_, value]) => typeof value === 'number')
  .reduce(
    (identifiers, pair) => ({
      ...identifiers,
      [pair[0]]: Uint8Array.of(pair[1])
    }),
    {}
  ) as {
  [opcode: string]: Uint8Array;
};

const createStackItemIdentificationFunction = (
  resolvedVariables: {
    variable: string;
    bytecode: Uint8Array;
  }[]
): StackItemIdentifyFunction => {
  const dictionary = resolvedVariables.reduce<{
    [stringifiedArray: string]: string;
  }>(
    (dict, item) => ({ ...dict, [item.bytecode.toString()]: item.variable }),
    {}
  );
  return item => dictionary[item.toString()] || false;
};

interface ScriptEditorFrame<ProgramState extends IDESupportedProgramState> {
  name: string;
  id: string;
  internalId: string;
  script: string;
  scriptType: ScriptType;
  compilation: CompilationResult<ProgramState>;
  /**
   * `evaluation` is undefined if there are compilation errors.
   */
  evaluation?: Evaluation<ProgramState>;
}

type ComputedEditorState<ProgramState extends IDESupportedProgramState> =
  | EditorStateWelcomeMode
  | EditorStateTemplateSettingsMode
  | EditorStateEntityMode
  | EditorStateScriptMode<ProgramState>
  | EditorStateLoadingMode;

interface EditorStateEntityMode {
  editorMode: ProjectEditorMode.entityEditor;
}

interface EditorStateWelcomeMode {
  editorMode: ProjectEditorMode.welcome;
}

interface EditorStateTemplateSettingsMode {
  editorMode: ProjectEditorMode.templateSettingsEditor;
}

interface EditorStateLoadingMode {
  editorMode: ProjectEditorMode.loading;
}

interface EditorStateScriptMode<ProgramState extends IDESupportedProgramState> {
  editorMode:
    | ProjectEditorMode.isolatedScriptEditor
    | ProjectEditorMode.testedScriptEditor
    | ProjectEditorMode.scriptPairEditor;
  scriptEditorFrames: ScriptEditorFrame<ProgramState>[];
  isP2sh: boolean;
  /**
   * Set to `undefined` if no compilations were successful (so the previous
   * StackItemIdentifyFunction can continue to be used.)
   */
  identifyStackItems: StackItemIdentifyFunction | undefined;
}

const formatScript = (
  internalId: string,
  script: IDETemplateScript,
  name?: string
) => ({
  internalId,
  name: name || script.name,
  id: script.id,
  script: script.script,
  scriptType: script.type
});

const getSourceScripts = (
  internalId: string,
  template: AppState['currentTemplate']
) => {
  const currentScript = template.scriptsByInternalId[
    internalId
  ] as IDEActivatableScript;
  if (currentScript.type === 'isolated') {
    return {
      isP2sh: false,
      sourceScripts: [formatScript(internalId, currentScript)]
    };
  } else if (currentScript.type === 'unlocking') {
    const lockingInternalId = currentScript.parentInternalId;
    const lockingScript = template.scriptsByInternalId[
      lockingInternalId
    ] as IDETemplateLockingScript;
    return {
      isP2sh: lockingScript.isP2SH,
      sourceScripts: [
        formatScript(internalId, currentScript),
        formatScript(lockingInternalId, lockingScript)
      ]
    };
  } else if (currentScript.type === 'test-setup') {
    const testedInternalId = currentScript.parentInternalId;
    const testedScript = template.scriptsByInternalId[
      testedInternalId
    ] as IDETemplateTestedScript;
    return {
      isP2sh: false,
      sourceScripts: [
        formatScript(
          internalId,
          currentScript,
          `${currentScript.name} (Setup)`
        ),
        formatScript(testedInternalId, testedScript),
        formatScript(
          currentScript.testCheckInternalId,
          template.scriptsByInternalId[currentScript.testCheckInternalId],
          `${currentScript.name} (Check)`
        )
      ]
    };
  } else {
    return unknownValue(currentScript);
  }
};

// TODO: user-set "scenarios", snapshots which can be toggled between for debugging
const currentBlock = 561171;
const currentTimeUTC = 1549166880000; // "current" – just a reasonable, static time for determinism

export const compileScriptMock = (script: string) => {
  const result = compileScriptText(script, {}, { scripts: {} });
  return result.success ? result.bytecode : undefined;
};

const getIDECompilationData = (
  state: AppState
): CompilationData<CompilerOperationDataBCH> => {
  return Object.values(state.currentTemplate.variablesByInternalId).reduce<
    CompilationData<CompilerOperationDataBCH>
  >((data, variable) => {
    switch (variable.type) {
      case 'CurrentBlockHeight':
        return { ...data, currentBlockHeight: currentBlock };
      case 'CurrentBlockTime':
        return { ...data, currentBlockTime: new Date(currentTimeUTC) };
      case 'HDKey':
        throw new Error('Not yet implemented.');
      case 'Key':
      case 'AddressData':
      case 'WalletData':
        const mock = compileScriptMock(variable.mock);
        if (mock === undefined) {
          return data;
        }
        switch (variable.type) {
          case 'Key':
            const privateKeys = (data.keys && data.keys.privateKeys) || {};
            return {
              ...data,
              keys: {
                privateKeys: {
                  ...privateKeys,
                  [variable.id]: mock
                }
              }
            };
          case 'AddressData':
            const addressData = data.addressData || {};
            return {
              ...data,
              addressData: {
                ...addressData,
                [variable.id]: mock
              }
            };
          case 'WalletData':
            const walletData = data.walletData || {};
            return {
              ...data,
              walletData: {
                ...walletData,
                [variable.id]: mock
              }
            };
        }
      default:
        unknownValue(variable);
        return data;
    }
  }, {});
};

/**
 * TODO: this method needs to be refactored to use the new VM APIs – currently,
 * part of the `vm.evaluate` logic is re-implemented below, but for
 * unlocking/locking script pairs, the standard `vm.debug` should be use to
 * generate fully-correct results (e.g. bytecode length errors, push-only check,
 * SegWit recovery check, etc.).
 */
const computeEditorState = <
  // AuthenticationProgram extends IDESupportedAuthenticationProgram,
  ProgramState extends IDESupportedProgramState
>(
  state: AppState
): ComputedEditorState<ProgramState> => {
  const {
    crypto,
    authenticationVirtualMachines,
    currentEditingMode,
    currentlyEditingInternalId
  } = state;
  if (
    crypto === null ||
    authenticationVirtualMachines === null ||
    currentEditingMode === undefined ||
    currentlyEditingInternalId === undefined
  ) {
    return { editorMode: ProjectEditorMode.loading };
  }
  const vm = authenticationVirtualMachines[state.currentVmId];
  const editorMode = getEditorMode(
    currentEditingMode,
    currentlyEditingInternalId,
    state.currentTemplate
  );
  if (
    editorMode === ProjectEditorMode.welcome ||
    editorMode === ProjectEditorMode.templateSettingsEditor ||
    editorMode === ProjectEditorMode.entityEditor
  ) {
    return { editorMode };
  }

  const { sourceScripts: evaluationOrderedScripts, isP2sh } = getSourceScripts(
    currentlyEditingInternalId,
    state.currentTemplate
  );

  const externalState = {
    ...createAuthenticationProgramExternalStateCommonEmpty(),
    locktime: currentTimeUTC,
    sequenceNumber: 0,
    version: 0
  };
  const data = getIDECompilationData(state);
  const createCreateStateWithStack = <Opcodes, Errors>(stack: Uint8Array[]) => (
    instructions: ReadonlyArray<AuthenticationInstruction<Opcodes>>
  ) =>
    createAuthenticationProgramStateCommon<Opcodes, Errors>(
      instructions,
      stack,
      externalState
    );
  const createState = createCreateStateWithStack([]);
  const compiler = createCompiler<CompilerOperationDataBCH, ProgramState>({
    opcodes: bitcoinCashOpcodeIdentifiers,
    operations: getCompilerOperationsBCH(),
    variables: Object.values(
      state.currentTemplate.variablesByInternalId
    ).reduce(
      (variables, variable) => ({
        ...variables,
        [variable.id]: variable
      }),
      {}
    ),
    scripts: Object.values(state.currentTemplate.scriptsByInternalId).reduce(
      (scripts, ideScript) => ({
        ...scripts,
        [ideScript.id]: ideScript.script
      }),
      {}
    ),
    secp256k1: crypto.secp256k1,
    sha256: crypto.sha256,
    vm,
    createState
  });

  /**
   * The compiler is still very alpha – it shouldn't throw, but if it does, we
   * should prevent the IDE from completely crashing. (Hopefully users can at
   * least export their work.)
   */
  try {
    /**
     * We compile the `sourceScripts` in reverse order, passing the last script in
     * as part of the signatureGenerationData.
     *
     * This is most relevant for `unlocking`/`locking` script pairs, but could
     * also be useful for some eccentric `tested` scripts.
     */
    const signingOrderedScripts = evaluationOrderedScripts.slice().reverse();
    const compilationResults = signingOrderedScripts.reduce<
      CompilationResult[]
    >((results, source, i) => {
      const previousResult = results[i - 1];
      const coveredBytecode =
        previousResult &&
        previousResult.success === true &&
        previousResult.bytecode;
      const compilationResult = compiler.debug(source.id, {
        ...data,
        ...(coveredBytecode && {
          operationData: {
            ...externalState,
            coveredBytecode
          }
        })
      });
      return [...results, compilationResult];
    }, []);
    /**
     * TODO: generalize, remove cast when multiple VMs are supported
     */
    const createEmptyProgramState = ((() =>
      createState([])) as unknown) as () => ProgramState;
    const evaluationOrderedCompilationResults = compilationResults
      .slice()
      .reverse();
    let nextStack: Uint8Array[] = [];
    let evaluations: Evaluation<ProgramState>[] = [];
    let nextLine = undefined;
    for (const result of evaluationOrderedCompilationResults) {
      if (result.success !== true) {
        /**
         * A compilation failed, no need to try evaluating it.
         */
        break;
      }
      /**
       * TODO: generalize, remove cast when multiple VMs are supported
       */
      const next = (sampledEvaluateReductionTraceNodes<
        OpcodesBCH,
        AuthenticationProgramStateBCH
      >(
        result.reduce.source,
        vm,
        createCreateStateWithStack(nextStack)
      ) as unknown) as SampledEvaluationResult<ProgramState>;
      const extractedSamples = extractSamplesFromReductionTrace<ProgramState>(
        result.reduce
      );
      const spaced = addSpacersToTraceSamples<ProgramState>([
        ...next.samples,
        ...extractedSamples
      ]);
      const reduced: Evaluation<ProgramState> = reduceSpacedTraceSamples<
        ProgramState
      >(spaced, createEmptyProgramState, nextLine);
      nextLine = { ...reduced[reduced.length - 1] };
      evaluations.push(reduced);

      if (next.success === false) {
        /**
         * Bail out on failed evaluations (no need to start evaluating the next,
         * the last state of this frame is already invalid).
         */
        break;
      }
      nextStack = next.samples[next.samples.length - 1].state.stack;
    }

    const scriptEditorFrames = evaluationOrderedScripts.map<
      ScriptEditorFrame<ProgramState>
    >((source, i) => ({
      id: source.id,
      internalId: source.internalId,
      name: source.name,
      script: source.script,
      scriptType: source.scriptType,
      compilation: evaluationOrderedCompilationResults[i],
      evaluation: evaluations[i]
    }));

    /**
     * Add our highlights if more than 1 frame is present:
     */
    if (scriptEditorFrames.length > 1) {
      const evaluation =
        scriptEditorFrames[scriptEditorFrames.length - 1].evaluation;
      if (evaluation !== undefined) {
        const lastLine = evaluation[evaluation.length - 1];
        if (
          lastLine.state.stack.length > 0 &&
          lastLine.state.stack[lastLine.state.stack.length - 1][0] === 1
        ) {
          if (lastLine.state.stack.length > 1) {
            lastLine.highlight = EvaluationViewerHighlight.dirtyStack;
          } else {
            lastLine.highlight = EvaluationViewerHighlight.success;
          }
        } else {
          lastLine.highlight = EvaluationViewerHighlight.fail;
        }
      }
    }

    console.dir(scriptEditorFrames);
    const identifyStackItems =
      evaluationOrderedCompilationResults.length === 0
        ? undefined
        : createStackItemIdentificationFunction(
            evaluationOrderedCompilationResults.reduce<ResolvedVariable[]>(
              (vars, result) =>
                result.success === true
                  ? [...vars, ...getResolvedVariables(result.resolve)]
                  : vars,
              []
            )
          );

    return {
      editorMode,
      isP2sh,
      identifyStackItems,
      scriptEditorFrames
    };
  } catch (e) {
    console.error('Encountered an unexpected compiler error:', e);
    return { editorMode: ProjectEditorMode.loading };
  }
};

enum Pane {
  projectExplorer = 'projectExplorerPane',
  templateSettingsEditor = 'templateSettingsEditorPane',
  entitySettingsEditor = 'entitySettingsEditorPane',
  entityVariableEditor = 'entityVariableEditorPane',
  loading = 'loading',
  welcome = 'welcome'
}

export enum ScriptEditorPane {
  /**
   * Present for all ScriptEditor types (`isolated`, `unlocking`, and `test`).
   */
  zero = 'ScriptEditorPane0',
  /**
   * Present for `unlocking` and `test` ScriptEditor types.
   */
  one = 'ScriptEditorPane1',
  /**
   * Only present for the `test` ScriptEditor type.
   */
  two = 'ScriptEditorPane2'
}

export enum ScriptEvaluationViewerPane {
  /**
   * Present for all ScriptEvaluationViewer types (`isolated`, `unlocking`, and
   * `test`).
   */
  zero = 'ScriptEvaluationViewerPane0',
  /**
   * Present for `unlocking` and `test` ScriptEvaluationViewer types.
   */
  one = 'ScriptEvaluationViewerPane1',
  /**
   * Only present for the `test` ScriptEvaluationViewer type.
   */
  two = 'ScriptEvaluationViewerPane2'
}

interface EditorDispatch {
  importTemplate: typeof ActionCreators.importTemplate;
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
    importTemplate: ActionCreators.importTemplate,
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
            case ScriptEvaluationViewerPane.zero:
            case ScriptEvaluationViewerPane.one:
            case ScriptEvaluationViewerPane.two:
              const computed = props.computed as EditorStateScriptMode<
                IDESupportedProgramState
              >;
              computed;
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
                  isP2SH={computed.isP2sh}
                  update={props.updateScript}
                  currentScripts={props.currentScripts}
                  setScrollOffset={setScrollOffset[i]}
                  editScript={props.editScript}
                  deleteScript={props.deleteScript}
                />
              ) : (
                <EvaluationViewer
                  evaluation={computed.scriptEditorFrames[i].evaluation}
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
            : {
                direction: 'row',
                first: Pane.projectExplorer,
                second:
                  props.computed.editorMode === ProjectEditorMode.loading
                    ? Pane.loading
                    : props.computed.editorMode ===
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
