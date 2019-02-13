import {
  ImmerReducer,
  createReducerFunction,
  createActionCreators,
  setPrefix
} from 'immer-reducer';
import { AppState, IDEMode, IDELoadedVMsAndCrypto } from './types';
import { editor } from 'monaco-editor';
import { defaultState } from './defaults';

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
  changeTemplate(template: AppState['currentTemplate']) {
    this.draftState.currentTemplate = template;
    this.draftState.currentlyEditingId = undefined;
    this.draftState.currentEditingMode = undefined;
  }
}

setPrefix('BITAUTH_IDE');
export const rootReducer = createReducerFunction(App, defaultState);
export const ActionCreators = createActionCreators(App);
