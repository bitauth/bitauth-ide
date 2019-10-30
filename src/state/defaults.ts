import { AppState, ActiveDialog } from './types';
import { IDEMode } from './types';
import { AuthenticationVirtualMachineIdentifier } from 'bitcoin-ts';
import { importAuthenticationTemplate } from './import-export';

export const supportedVirtualMachines: AuthenticationVirtualMachineIdentifier[] = [
  'BCH_2019_05',
  'BCH_2019_11',
  'BSV_2018_11',
  'BTC_2017_08'
];

export const emptyTemplate = {
  $schema: 'https://bitauth.com/schemas/authentication-template-v0.schema.json',
  description: '',
  name: '',
  entities: {},
  scripts: {},
  supported: [],
  version: 0 as 0
};

const defaultTemplate = importAuthenticationTemplate(emptyTemplate);
if (typeof defaultTemplate === 'string') {
  throw new Error(`Invalid empty template: ${defaultTemplate}`);
}

export const defaultState: AppState = {
  ideMode: IDEMode.editor,
  currentlyEditingInternalId: '',
  currentEditingMode: 'welcome',
  // TODO: from local storage
  savedTemplates: [],
  currentTemplate: defaultTemplate,
  currentVmId: 'BCH_2019_05',
  authenticationVirtualMachines: null,
  crypto: null,
  activeDialog: ActiveDialog.none,
  appLoadTime: new Date()
};
