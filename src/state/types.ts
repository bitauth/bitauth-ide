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
  name: string;
  description: string;
  scriptIds: string[];
  variableIds: string[];
}

export type ScriptType =
  | 'locking'
  | 'unlocking'
  | 'isolated'
  | 'tested'
  | 'test-setup'
  | 'test-check';

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
}

export interface IDETemplateUnlockingScript extends IDETemplateScriptBase {
  type: 'unlocking';
  parentId: string;
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
  childIds: string[];
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
  childIds: string[];
}

export interface IDETemplateTestSetupScript extends IDETemplateScriptBase {
  type: 'test-setup';
  testCheckId: string;
  parentId: string;
}

export interface IDETemplateTestCheckScript extends IDETemplateScriptBase {
  /**
   * `test-check` scripts share the name of their `test-setup` sibling, since
   * they are both part of the same "test".
   */
  name: never;
  type: 'test-check';
  testSetupId: string;
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
  | IDEActivatableScript;

export type DisableId = true;

type IDESupportedVms = { [key in AuthenticationVirtualMachineIdentifier]: any };

export interface IDELoadedVMs extends IDESupportedVms {
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

export interface AppState {
  ideMode: IDEMode;
  /**
   * Must be an `IDEEditableScript` script. (Scripts of type, `isolated`,
   * `unlocking`, or `test`). Scripts of type `locking` and `tested` can only be
   * edited with one of their "children" scripts.
   */
  currentlyEditingId: string | undefined;
  currentEditingMode: 'script' | 'entity' | undefined;
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
    entitiesById: { [id: string]: IDETemplateEntity };
    /**
     * In AppState, scripts are stored in a tree structure, rather than the flat
     * list used by `AuthenticationTemplate`.
     */
    scriptsById: {
      [id: string]: IDETemplateScript;
    };
    /**
     * Note, to match the `AuthenticationTemplateVariable` type, we leave the
     * `id` property on every variable in `variablesById`.
     */
    variablesById: { [id: string]: AuthenticationTemplateVariable };
  };
  currentVmId: keyof IDELoadedVMs;
  authenticationVirtualMachines: IDELoadedVMs | null;
  crypto: IDELoadedCrypto | null;
  compilationData: CompilationData;
}
