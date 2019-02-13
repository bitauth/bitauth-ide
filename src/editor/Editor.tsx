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
  IDETemplateTestedScript
} from '../state/types';
import {
  BitcoinCashOpcodes,
  AuthenticationVirtualMachine,
  AuthenticationInstruction
} from 'bitcoin-ts';
import {
  CompilationEnvironment,
  CompilationData
} from '../bitauth-script/resolve';
import {
  getResolvedVariables,
  ResolvedVariable
} from '../bitauth-script/editor-tooling';
import {
  createProgramStateGenerator,
  sampledEvaluateReductionTraceNodes,
  extractSamplesFromReductionTrace,
  addSpacersToTraceSamples,
  reduceSpacedTraceSamples,
  emptySignatureGenerationData
} from '../bitauth-script/reduce';
import {
  StackItemIdentifyFunction,
  ProjectEditorMode,
  Evaluation,
  IDESupportedProgramState
} from './editor-types';
import { ActionCreators } from '../state/reducer';
import { compileScript, CompilationResult } from '../bitauth-script/compile';

const getEditorMode = (
  currentEditingMode: 'entity' | 'script',
  currentlyEditingId: string,
  template: AppState['currentTemplate']
) => {
  if (currentEditingMode === 'entity') {
    return ProjectEditorMode.entityEditor;
  }
  const scriptType = template.scriptsById[currentlyEditingId].type;
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

const bitcoinCashOpcodeIdentifiers = Object.entries(BitcoinCashOpcodes)
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
  script: string;
  compilation: CompilationResult<ProgramState>;
  /**
   * `evaluation` is undefined if there are compilation errors.
   */
  evaluation?: Evaluation<ProgramState>;
}

type ComputedEditorState<ProgramState extends IDESupportedProgramState> =
  | EditorStateEntityMode
  | EditorStateScriptMode<ProgramState>
  | EditorStateLoadingMode;

interface EditorStateEntityMode {
  editorMode: ProjectEditorMode.entityEditor;
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
  identifyStackItems: StackItemIdentifyFunction;
}

const formatScript = (
  id: string,
  script: IDETemplateScript,
  name?: string
) => ({
  id,
  name: name || script.name,
  script: script.script
});

const getSourceScripts = (
  id: string,
  template: AppState['currentTemplate']
) => {
  const currentScript = template.scriptsById[id] as IDEActivatableScript;
  if (currentScript.type === 'isolated') {
    return { isP2sh: false, sourceScripts: [formatScript(id, currentScript)] };
  } else if (currentScript.type === 'unlocking') {
    const lockingId = currentScript.parentId;
    const lockingScript = template.scriptsById[
      currentScript.parentId
    ] as IDETemplateLockingScript;
    return {
      isP2sh: lockingScript.isP2SH,
      sourceScripts: [
        formatScript(id, currentScript),
        formatScript(lockingId, lockingScript)
      ]
    };
  } else if (currentScript.type === 'test-setup') {
    const testedId = currentScript.parentId;
    const testedScript = template.scriptsById[
      currentScript.parentId
    ] as IDETemplateTestedScript;
    return {
      isP2sh: false,
      sourceScripts: [
        formatScript(id, currentScript, `${currentScript.name} (Setup)`),
        formatScript(testedId, testedScript),
        formatScript(
          currentScript.testCheckId,
          template.scriptsById[currentScript.testCheckId],
          `${currentScript.name} (Check)`
        )
      ]
    };
  } else {
    return unknownValue(currentScript);
  }
};

/**
 * TODO: ProjectEditorMode.entityMode
 */
const computeEditorState = <ProgramState extends IDESupportedProgramState>(
  state: AppState
): ComputedEditorState<ProgramState> => {
  const {
    crypto,
    authenticationVirtualMachines,
    currentEditingMode,
    currentlyEditingId
  } = state;
  if (
    crypto === null ||
    authenticationVirtualMachines === null ||
    currentEditingMode === undefined ||
    currentlyEditingId === undefined
  ) {
    return { editorMode: ProjectEditorMode.loading };
  }
  /**
   * TODO: remove cast once we have other VMs included in `IDELoadedVMs`
   */
  const vm = (authenticationVirtualMachines[
    state.currentVmId
  ] as unknown) as AuthenticationVirtualMachine<ProgramState>;
  const editorMode = getEditorMode(
    currentEditingMode,
    currentlyEditingId,
    state.currentTemplate
  );
  if (editorMode === ProjectEditorMode.entityEditor) {
    return { editorMode };
  }
  const { sourceScripts: evaluationOrderedScripts, isP2sh } = getSourceScripts(
    currentlyEditingId,
    state.currentTemplate
  );
  const data: CompilationData = state.compilationData;
  // TODO: remove cast once we have other VMs implemented
  const stateGeneratorGenerator = (stack: Uint8Array[]) =>
    (createProgramStateGenerator(stack) as unknown) as (
      instructions: ReadonlyArray<AuthenticationInstruction<{}>>
    ) => ProgramState;
  const createState = stateGeneratorGenerator([]);
  const environment: CompilationEnvironment = {
    opcodes: bitcoinCashOpcodeIdentifiers,
    variables: state.currentTemplate.variablesById,
    scripts: Object.entries(state.currentTemplate.scriptsById).reduce(
      (scripts, entry) => ({ ...scripts, [entry[0]]: entry[1] }),
      {}
    ),
    secp256k1: crypto.secp256k1,
    sha256: crypto.sha256,
    vm,
    createState
  };
  // The compiler is still in alpha – it shouldn't throw, but if it does,
  // we should prevent the IDE from crashing.
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
      const coveredScript =
        previousResult &&
        previousResult.success === true &&
        previousResult.bytecode;
      const compilationResult = compileScript(
        source.script,
        {
          ...data,
          ...(coveredScript && {
            signatureGenerationData: {
              ...emptySignatureGenerationData,
              coveredScript
            }
          })
        },
        environment
      );
      return [...results, compilationResult];
    }, []);
    const createEmptyProgramState = () => createState([]);
    const evaluationOrderedCompilationResults = compilationResults
      .slice()
      .reverse();
    let nextStack: Uint8Array[] = [];
    let evaluations: Evaluation<ProgramState>[] = [];
    let nextLine = undefined;
    for (const result of evaluationOrderedCompilationResults) {
      if (result.success !== true) {
        console.error('reached a failed compilation:');
        console.dir(result);
        break;
      }
      const next = sampledEvaluateReductionTraceNodes(
        result.reduce.source,
        vm,
        stateGeneratorGenerator(nextStack)
      );
      if (next.success === false) {
        // TODO: is this what we want to do here?
        console.error('failed during evaluation:');
        console.dir(next);
        break;
      }
      nextStack = next.samples[next.samples.length - 1].state.stack;
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
      nextLine = reduced[reduced.length - 1];
      evaluations.push(reduced);
    }

    const scriptEditorFrames = evaluationOrderedScripts.map<
      ScriptEditorFrame<ProgramState>
    >((source, i) => ({
      id: source.id,
      name: source.name,
      script: source.script,
      compilation: evaluationOrderedCompilationResults[i],
      evaluation: evaluations[i]
    }));

    console.log('Frames:');
    console.dir(scriptEditorFrames);

    const identifyStackItems = createStackItemIdentificationFunction(
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
  entityEditor = 'entityEditorPane',
  entityEditorMeta = 'entityEditorMetaPane',
  loading = 'loading'
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
  zero = 'ScriptEvaluationViewerPane2',
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
  updateScript: typeof ActionCreators.updateScript;
}

interface EditorProps<ProgramState extends IDESupportedProgramState>
  extends EditorDispatch {
  computed: ComputedEditorState<ProgramState>;
}

export const Editor = connect(
  (state: AppState) => ({
    computed: computeEditorState(state)
  }),
  {
    updateScript: ActionCreators.updateScript
  }
)((props: EditorProps<IDESupportedProgramState>) => {
  const [projectExplorerWidth, setProjectExplorerWidth] = useState(21);
  const [scriptEditorWidths, setScriptEditorWidths] = useState(50);
  const [frames2SplitHeight, setFrames2SplitHeight] = useState(30);
  const [frames3TopSplitHeight, setFrames3TopSplitHeight] = useState(20);
  const [frames3BottomSplitHeight, setFrames3BottomSplitHeight] = useState(80);

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
                  id={computed.scriptEditorFrames[i].id}
                  name={computed.scriptEditorFrames[i].name}
                  script={computed.scriptEditorFrames[i].script}
                  isP2SH={computed.isP2sh}
                  update={props.updateScript}
                />
              ) : (
                <EvaluationViewer
                  evaluation={computed.scriptEditorFrames[i].evaluation}
                  id={computed.scriptEditorFrames[i].id}
                  script={computed.scriptEditorFrames[i].script}
                  lookup={computed.identifyStackItems}
                />
              );

            case Pane.entityEditor:
              return <h1>TODO</h1>;
            case Pane.entityEditorMeta:
              return <h1>TODO</h1>;
            case Pane.loading:
              return <div className="loading" />;
            default:
              unknownValue(id);
              return (
                <h3>Editor error – tried to render Mosaic tile: "{id}"</h3>
              );
          }
        }}
        value={{
          direction: 'row',
          first: Pane.projectExplorer,
          second:
            props.computed.editorMode === ProjectEditorMode.loading
              ? Pane.loading
              : props.computed.editorMode === ProjectEditorMode.entityEditor
              ? {
                  direction: 'row',
                  first: Pane.entityEditor,
                  second: Pane.entityEditorMeta
                }
              : props.computed.editorMode ===
                ProjectEditorMode.isolatedScriptEditor
              ? {
                  direction: 'row',
                  first: ScriptEditorPane.zero,
                  second: ScriptEvaluationViewerPane.zero
                }
              : props.computed.editorMode === ProjectEditorMode.scriptPairEditor
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
        }}
        onChange={node => {
          if (node && typeof node === 'object') {
            if (projectExplorerWidth !== node.splitPercentage) {
              setProjectExplorerWidth(node.splitPercentage as number);
            }
            if (typeof node.second === 'object') {
              if (scriptEditorWidths !== node.second.splitPercentage) {
                setScriptEditorWidths(node.second.splitPercentage as number);
              }
              if (
                typeof node.second.first === 'object' &&
                typeof node.second.second === 'object'
              ) {
                const pane1 = node.second.first.splitPercentage as number;
                const pane2 = node.second.second.splitPercentage as number;
                setFrames2SplitHeight(
                  frames2SplitHeight === pane1 ? pane2 : pane1
                );
              }
            }
          }
        }}
        resize={{ minimumPaneSizePercentage: 10 }}
      />
    </div>
  );
});
