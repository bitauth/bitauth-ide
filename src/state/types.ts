import {
  AuthenticationTemplate,
  AuthenticationVirtualMachineIdentifier,
  AuthenticationTemplateVariable
} from 'bitcoin-ts/build/main/lib/auth/templates/types';
import {
  AuthenticationVirtualMachine,
  BitcoinCashAuthenticationProgramState,
  Sha256,
  Secp256k1
} from 'bitcoin-ts';
import { CompilationData } from '../bitauth-script/resolve';

export enum IDEMode {
  /**
   * The primary editing mode – an interactive editor and omniscient debugger
   * for BitAuth templates.
   */
  editor = 'editor',
  /**
   * A live-testing mode - manually create transactions to test the current
   * template on the network.
   */
  wallet = 'wallet'
}

export interface IDETemplateEntity {
  id: string;
  internalId: string;
  name: string;
  description: string;
  /**
   * `scriptInternalIds` is only used if `usesAllScripts` is `false`. It's
   * maintained separately to avoid losing data if `usesAllScripts` is toggled.
   */
  scriptInternalIds: string[];
  usesAllScripts: boolean;
  variableInternalIds: string[];
}

export type ScriptType = BaseScriptType | 'tested' | 'test-check';

export type BaseScriptType =
  | 'locking'
  | 'unlocking'
  | 'isolated'
  | 'test-setup';

export interface IDETemplateScriptBase {
  type: ScriptType;
  /**
   * The human-readable name of this script.
   */
  name: string;
  /**
   * The script, in the BitAuth templating language.
   */
  script: string;
  /**
   * The id used to refer to the script during compilation and within other
   * scripts.
   */
  id: string;
  internalId: string;
}

export interface IDETemplateUnlockingScript extends IDETemplateScriptBase {
  type: 'unlocking';
  parentInternalId: string;
}
export interface IDETemplateLockingScript extends IDETemplateScriptBase {
  type: 'locking';
  /**
   * Indicates if this locking script and all of its children are `P2SH`. In the
   * IDE, we skip wrapping P2SH scripts in the P2SH prefix (`OP_HASH160 <$(<`)
   * and postfix (`> OP_HASH160)> OP_EQUAL`) since they should always behave in
   * the same way.
   *
   * During editing, we only visualize and evaluate the unwrapped version of the
   * P2SH unlocking and locking scripts (A.K.A. "spend script" and "redeem
   * script"). When testing or exporting the template, we then re-wrap the
   * trimmed scripts to use the complete versions.
   */
  isP2SH: boolean;
  childInternalIds: string[];
}

export interface IDETemplateIsolatedScript extends IDETemplateScriptBase {
  type: 'isolated';
}

/**
 * Tested scripts may have multiple `IDETemplateTestSetupScript` children.
 *
 * Each test includes a `setup` script, which runs before the tested
 * script, and a `check` script, which is evaluated after it. If after all three
 * scripts are evaluated, a single `0x01` is left on the stack, the test passes.
 *
 * By testing with separate `setup` and `check` scripts, we can confirm that
 * the tested script works as expected, potentially performing many actions
 * and/or leaving multiple elements on the stack.
 */
export interface IDETemplateTestedScript extends IDETemplateScriptBase {
  type: 'tested';
  childInternalIds: string[];
}

export interface IDETemplateTestSetupScript extends IDETemplateScriptBase {
  type: 'test-setup';
  testCheckInternalId: string;
  parentInternalId: string;
}

export interface IDETemplateTestCheckScript extends IDETemplateScriptBase {
  /**
   * `test-check` scripts share the name of their `test-setup` sibling, since
   * they are both part of the same "test". ()
   */
  name: '';
  type: 'test-check';
  testSetupInternalId: string;
}

/**
 * All the script types which are permitted to be "activated" in the editor.
 *
 * In BitAuth IDE, `test-check` scripts are currently tightly-coupled with their
 * sibling `test-setup` scripts. (So the same `test-setup` and `test-check`
 * should always be edited together.) For simplicity, we refer to the pair by
 * it's `test-setup` script.
 */
export type IDEActivatableScript =
  | IDETemplateIsolatedScript
  | IDETemplateUnlockingScript
  | IDETemplateTestSetupScript;

export type IDETemplateScript =
  | IDETemplateLockingScript
  | IDETemplateTestedScript
  | IDETemplateTestCheckScript
  | IDEActivatableScript;

export type DisableId = true;

export type IDESupportedVM = AuthenticationVirtualMachineIdentifier;

export type IDESupportedVmStore = { [key in IDESupportedVM]: any };

export interface IDELoadedVMs extends IDESupportedVmStore {
  BCH_2018_11: AuthenticationVirtualMachine<
    BitcoinCashAuthenticationProgramState
  >;
  // TODO: fix these if necessary
  BCH_2019_05: AuthenticationVirtualMachine<
    BitcoinCashAuthenticationProgramState
  >;
  BSV_2018_11: AuthenticationVirtualMachine<
    BitcoinCashAuthenticationProgramState
  >;
  BTC_2017_08: AuthenticationVirtualMachine<
    BitcoinCashAuthenticationProgramState
  >;
}

export interface IDELoadedCrypto {
  sha256: Sha256;
  secp256k1: Secp256k1;
}

export interface IDELoadedVMsAndCrypto {
  crypto: IDELoadedCrypto;
  vms: IDELoadedVMs;
}

/**
 * The application dialogs which are managed by Redux.
 */
export enum ActiveDialog {
  none,
  /**
   * The dialog to create a new script in the current template.
   */
  newScript,
  /**
   * The dialog to edit a script's settings.
   */
  editScript,
  /**
   * The dialog to create a new entity in the current template.
   */
  newEntity,
  /**
   * The authentication template import/export dialog.
   */
  importExport
}

export interface AppState {
  ideMode: IDEMode;
  /**
   * The internal ID of the script or entity which is currently being edited.
   *
   * Must be an `IDEEditableScript` script (scripts of type, `isolated`,
   * `unlocking`, or `test`) or an entity. Scripts of type `locking` and
   * `tested` can only be edited with one of their "children" scripts.
   */
  currentlyEditingInternalId: string | undefined;
  currentEditingMode: 'script' | 'entity' | 'template-settings' | undefined;
  savedTemplates: { template: AuthenticationTemplate; savedDate: Date }[];
  /**
   * The state of the BitAuth template currently open in the IDE. This is stored
   * in a significantly different structure than `AuthenticationTemplate`, so it
   * must be serialized and deserialized when copying in and out of the IDE.
   */
  currentTemplate: {
    name: string;
    description: string;
    supportedVirtualMachines: AuthenticationVirtualMachineIdentifier[];
    entitiesByInternalId: { [internalId: string]: IDETemplateEntity };
    /**
     * In AppState, scripts are stored in a tree structure, rather than the flat
     * list used by `AuthenticationTemplate`.
     */
    scriptsByInternalId: {
      [internalId: string]: IDETemplateScript;
    };
    /**
     * Note, we leave the type here as `AuthenticationTemplateVariable`, rather
     * than a custom internal type.
     */
    variablesByInternalId: {
      [internalId: string]: Required<AuthenticationTemplateVariable>;
    };
  };
  currentVmId: keyof IDELoadedVMs;
  authenticationVirtualMachines: IDELoadedVMs | null;
  crypto: IDELoadedCrypto | null;
  // compilationData: CompilationData; // TODO: delete
  activeDialog: ActiveDialog;
}

export type CurrentScripts = {
  name: string;
  id: string;
  internalId: string;
  type: ScriptType;
}[];

export type CurrentEntities = {
  name: string;
  id: string;
  internalId: string;
}[];

export type CurrentVariables = {
  name?: string;
  id: string;
  internalId: string;
}[];
