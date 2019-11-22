import {
  StackState,
  ExecutionStackState,
  ErrorState,
  MinimumProgramState,
  AuthenticationProgramCommon,
  CompilationResult,
  AlternateStackState
} from 'bitcoin-ts';
import {
  IDETemplateScript,
  ScriptType,
  VariableDetails,
  ScriptDetails
} from '../state/types';

export enum ProjectEditorMode {
  /**
   * The first visible view when the IDE loads.
   */
  welcome = 'welcome',
  /**
   * Isolated script editing mode – view and edit an isolated script and its
   * associated tests.
   */
  isolatedScriptEditor = 'isolatedScriptEditor',
  /**
   * Script pair editing mode – view and modify an unlocking and locking script
   * pair.
   */
  scriptPairEditor = 'scriptPairEditor',
  /**
   * Script pair editing mode – view and modify an unlocking and locking script
   * pair.
   */
  testedScriptEditor = 'testedScriptEditor',
  /**
   * Entity editing mode – view and modify the setup of an entity.
   */
  entityEditor = 'entityEditor',
  /**
   * Template settings view – view and modify the settings for the current
   * authentication template.
   */
  templateSettingsEditor = 'templateSettingsEditor',
  /**
   * The state of the editor before async dependencies (VMs and crypto) have
   * loaded, or if nothing is currently selected for editing.
   */
  loading = 'loading',
  /**
   * The view visible while the IDE is importing a template from a remote URL.
   */
  importing = 'importing'
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

/**
 * A function which takes the value of a stack item, and returns either the name
 * of the identifier with that value, or `false`.
 */
export type StackItemIdentifyFunction = (value: Uint8Array) => string | false;

export type Evaluation<
  ProgramState extends IDESupportedProgramState = IDESupportedProgramState
> = EvaluationViewerLine<ProgramState>[];

export interface IDESupportedProgramState
  extends MinimumProgramState,
    StackState,
    AlternateStackState,
    ExecutionStackState,
    ErrorState<string> {}

export interface IDESupportedAuthenticationProgram
  extends AuthenticationProgramCommon {}

/**
 * Visual indicators which indicate nesting – the end of the line being
 * visualized is currently inside the following evaluations/conditional.
 */
export enum EvaluationViewerSpacer {
  /**
   * Spacer applied to lines ending inside an evaluation.
   */
  evaluation = 'evaluation',
  /**
   * Spacer applied to lines ending inside an OP_IF/OP_NOTIF... OP_ENDIF block
   * where the last instruction was executed, i.e. the top element of
   * `executionStack` is `true`.
   */
  executedConditional = 'executedConditional',
  /**
   * Spacer applied to lines ending inside an OP_IF/OP_NOTIF... OP_ENDIF block
   * where the last instruction was skipped, i.e. the top element of
   * `executionStack` is `false`.
   */
  skippedConditional = 'skippedConditional'
}

/**
 * TODO: highlights (and descriptions) for the other failure scenarios
 */
export enum EvaluationViewerHighlight {
  /**
   * Highlight applied to the final line of a successful evaluation.
   */
  success = 'success',
  /**
   * Highlight applied to the final line of a failed evaluation.
   */
  fail = 'fail',
  /**
   * Highlight applied to the final line of an evaluation which may be valid,
   * but violates the "clean stack" requirement.
   */
  dirtyStack = 'dirtyStack'
}

export interface EvaluationViewerLine<
  ProgramState extends IDESupportedProgramState
> {
  state: ProgramState;
  spacers?: EvaluationViewerSpacer[];
  highlight?: EvaluationViewerHighlight;
}

export interface ProjectExplorerTreeNode {
  active: boolean;
  id: IDETemplateScript['id'];
  children?: ProjectExplorerTreeNode[];
}

export interface ScriptEditorFrame<
  ProgramState extends IDESupportedProgramState
> {
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

export type ComputedEditorState<
  ProgramState extends IDESupportedProgramState
> =
  | EditorStateWelcomeMode
  | EditorStateTemplateSettingsMode
  | EditorStateEntityMode
  | EditorStateScriptMode<ProgramState>
  | EditorStateLoadingMode
  | EditorStateImportingMode;

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
interface EditorStateImportingMode {
  editorMode: ProjectEditorMode.importing;
}

export interface EditorStateScriptMode<
  ProgramState extends IDESupportedProgramState
> {
  editorMode:
    | ProjectEditorMode.isolatedScriptEditor
    | ProjectEditorMode.testedScriptEditor
    | ProjectEditorMode.scriptPairEditor;
  scriptEditorFrames: ScriptEditorFrame<ProgramState>[];
  /**
   * An array of the internalIds of scripts which are part of this evaluation.
   * Used by the EvaluationViewer to recognize switches to a new set of scripts
   * (for cache clearing).
   */
  scriptEditorEvaluationTrace: string[];
  /**
   * An array of the source scripts which are part of this evaluation. Used by
   * the EvaluationViewer to recognize viable updates to its cache.
   */
  scriptEditorEvaluationSource: string[];
  isP2sh: boolean;
  /**
   * Set to `undefined` if no compilations were successful (so the previous
   * StackItemIdentifyFunction can continue to be used.)
   */
  identifyStackItems: StackItemIdentifyFunction | undefined;
  variableDetails: VariableDetails;
  scriptDetails: ScriptDetails;
}

/**
 * Object representing the current global settings for all evaluation viewers.
 */
export interface EvaluationViewerSettings {
  /**
   * If `true`, the EvaluationViewer should aggressively attempt to replace
   * valid Script Numbers on the stack with their numerical representation.
   */
  parseScriptNumbers: boolean;
  /**
   * If `true`, the EvaluationViewer should show the AlternativeStack rather
   * than the normal stack.
   */
  showAlternateStack: boolean;
  /**
   * If `true`, the EvaluationViewer should shorten long stack items by only
   * showing a few of their initial and final bytes. (E.g. `0x1234...7890`.)
   */
  abbreviateLongStackItems: boolean;

  /**
   * If `true` stack items deeper than 6 will be grouped into a single `...`
   * item to prevent cluttering the view. (6 is a good choice because most
   * operations can only operate on the first 6 items.)
   */
  groupDeepStackItems: boolean;

  /**
   * If true, reverse the direction of stack items so that new items are pushed
   * from the left. This ensures that the most active part of the stack is
   * displayed first.
   */
  reverseStack: boolean;
}
