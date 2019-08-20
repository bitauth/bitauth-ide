import { AuthenticationTemplateScript } from 'bitcoin-ts/build/main/lib/auth/templates/types';
import {
  StackState,
  ExecutionStackState,
  ErrorState,
  MinimumProgramState,
  AuthenticationProgramCommon
} from 'bitcoin-ts';
import { IDETemplateScript } from '../state/types';

export enum ProjectEditorMode {
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
  loading = 'loading'
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
