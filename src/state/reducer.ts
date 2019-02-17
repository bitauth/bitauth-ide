import {
  ImmerReducer,
  createReducerFunction,
  createActionCreators,
  setPrefix
} from 'immer-reducer';
import {
  AppState,
  IDEMode,
  IDELoadedVMsAndCrypto,
  ActiveDialog,
  ScriptType,
  BaseScriptType,
  IDETemplateLockingScript,
  IDETemplateIsolatedScript,
  IDETemplateTestedScript
} from './types';
import { editor } from 'monaco-editor';
import { defaultState } from './defaults';
import { unknownValue } from '../utils';

class App extends ImmerReducer<AppState> {
  setIDEMode(mode: IDEMode) {
    this.draftState.ideMode = mode;
  }
  loadVMsAndCrypto({ vms, crypto }: IDELoadedVMsAndCrypto) {
    this.draftState.authenticationVirtualMachines = vms;
    this.draftState.crypto = crypto;
  }
  updateScript({
    event,
    id,
    script
  }: {
    event: editor.IModelContentChangedEvent;
    id: string;
    script: string;
  }) {
    this.draftState.currentTemplate.scriptsById[id].script = script;
  }
  activateScript(id: string) {
    this.draftState.currentEditingMode = 'script';
    this.draftState.currentlyEditingId = id;
  }
  newScript() {
    this.draftState.activeDialog = ActiveDialog.newScript;
  }
  createScript(script: {
    id: string;
    name: string;
    type: BaseScriptType;
    parentId?: string;
  }) {
    switch (script.type) {
      case 'isolated':
        this.draftState.currentTemplate.scriptsById[script.id] = {
          type: script.type,
          script: '',
          name: script.name
        };
        return;
      case 'locking':
        this.draftState.currentTemplate.scriptsById[script.id] = {
          type: script.type,
          script: '',
          name: script.name,
          childIds: [],
          isP2SH: true
        };
        return;
      case 'unlocking':
        const lockingId = script.parentId as string;
        this.draftState.currentTemplate.scriptsById[script.id] = {
          type: script.type,
          script: '',
          name: script.name,
          parentId: lockingId
        };
        const lock = this.draftState.currentTemplate.scriptsById[
          lockingId
        ] as IDETemplateLockingScript;
        lock.childIds.push(script.id);
        return;
      case 'test-setup':
        const parentId = script.parentId as string;
        const checkId = `${script.id}_check`;
        this.draftState.currentTemplate.scriptsById[checkId] = {
          type: 'test-check',
          script: '',
          name: '',
          testSetupId: script.id
        };
        this.draftState.currentTemplate.scriptsById[script.id] = {
          type: script.type,
          script: '',
          name: script.name,
          parentId,
          testCheckId: checkId
        };
        const parent = this.draftState.currentTemplate.scriptsById[parentId] as
          | IDETemplateIsolatedScript
          | IDETemplateTestedScript;
        if (parent.type === 'tested') {
          parent.childIds.push(script.id);
        } else {
          const cast = (parent as unknown) as IDETemplateTestedScript;
          cast.type = 'tested';
          cast.childIds = [script.id];
        }
        return;
      default:
        unknownValue(script.type);
    }
  }
  closeDialog() {
    this.draftState.activeDialog = ActiveDialog.none;
  }
  changeTemplate(template: AppState['currentTemplate']) {
    this.draftState.currentTemplate = template;
    this.draftState.currentlyEditingId = undefined;
    this.draftState.currentEditingMode = undefined;
  }
}

setPrefix('BITAUTH_IDE');
export const rootReducer = createReducerFunction(App, defaultState);
export const ActionCreators = createActionCreators(App);
