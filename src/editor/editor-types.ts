import { AuthenticationTemplateScript } from 'bitcoin-ts/build/main/lib/auth/templates/types';
import {
  CommonState,
  StackState,
  ExecutionStackState,
  ErrorState,
  MinimumProgramState
} from 'bitcoin-ts';

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
   * loaded.
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

export enum EvaluationViewerHighlight {
  /**
   * Highlight applied to the final line of a successful evaluation.
   */
  success
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
  id: AuthenticationTemplateScript['id'];
  children?: ProjectExplorerTreeNode[];
}

// TODO: update
// export interface EditorState<ProgramState extends IDESupportedProgramState> {
//   editorMode: ProjectEditorMode;
//   // TODO: does this need to be in state? or can it be local to a reducer?
//   // identifyStackItem: StackItemIdentifyFunction;
//   pairEditorState: {
//     isP2sh: boolean;
//     scriptsState: {
//       unlockingScript: string;
//       lockingScript: string;
//       unlockingScriptName: string;
//       lockingScriptName: string;
//     };
//     evaluationState: {
//       unlockingEvaluation: Evaluation<ProgramState>;
//       lockingEvaluation: Evaluation<ProgramState>;
//     };
//   };
//   isolatedEditorState: {
//     hasTest: boolean;
//     scriptsState: {
//       setupScript: string;
//       checkScript: string;
//       script: string;
//     };
//     evaluationState: {
//       setupEvaluation: Evaluation<ProgramState>;
//       scriptEvaluation: Evaluation<ProgramState>;
//       checkEvaluation: Evaluation<ProgramState>;
//     };
//   };
//   projectExplorerState: {
//     tree: ProjectExplorerTreeNode;
//   };
// }
