import { AppState, ActiveDialog } from './types';
import { IDEMode } from './types';
import { AuthenticationVirtualMachineIdentifier } from 'bitcoin-ts';

export const supportedVirtualMachines: AuthenticationVirtualMachineIdentifier[] = [
  'BCH_2019_05',
  'BCH_2019_11',
  'BSV_2018_11',
  'BTC_2017_08'
];

export const defaultState: AppState = {
  ideMode: IDEMode.editor,
  currentlyEditingInternalId: '',
  currentEditingMode: 'welcome',
  // TODO: from local storage
  savedTemplates: [],
  currentTemplate: {
    name: '',
    description: '',
    entitiesByInternalId: {},
    scriptsByInternalId: {},
    supportedVirtualMachines: [],
    variablesByInternalId: {}
  },
  currentVmId: 'BCH_2019_05',
  authenticationVirtualMachines: null,
  crypto: null,
  activeDialog: ActiveDialog.none
};
