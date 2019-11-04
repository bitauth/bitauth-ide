import { AppState, ActiveDialog } from './types';
import { IDEMode } from './types';
import {
  AuthenticationVirtualMachineIdentifier,
  base64ToBin,
  binToUtf8
} from 'bitcoin-ts';
import { importAuthenticationTemplate } from './import-export';
import { inflate } from 'pako';

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

let currentTemplate = defaultTemplate;

const importRoute = '/import-template/';
let isImport =
  window.location.pathname.slice(0, importRoute.length) === importRoute;
if (isImport) {
  const base64UrlToBase64 = (base64: string) =>
    base64.replace(/-/g, '+').replace(/_/g, '/');

  const payload = window.location.pathname.slice(importRoute.length);
  try {
    const uncompressed = binToUtf8(
      inflate(base64ToBin(base64UrlToBase64(payload)))
    );
    console.log('uncompressed', uncompressed);
    const importedTemplate = importAuthenticationTemplate(
      JSON.parse(uncompressed)
    );
    if (typeof importedTemplate === 'string') {
      throw new Error(`Failed to import template: ${importedTemplate}`);
    }
    currentTemplate = importedTemplate;
    history.pushState(null, 'Bitauth IDE', '/');
  } catch (e) {
    window.alert(
      'This sharing URL seems to be corrupted. Please check the link and try again.'
    );
    isImport = false;
    console.error(e);
  }
}

export const defaultState: AppState = {
  ideMode: IDEMode.editor,
  currentlyEditingInternalId: '',
  currentEditingMode: isImport ? 'template-settings' : 'welcome',
  // TODO: from local storage
  savedTemplates: [],
  currentTemplate,
  currentVmId: 'BCH_2019_05',
  authenticationVirtualMachines: null,
  crypto: null,
  activeDialog: ActiveDialog.none,
  appLoadTime: new Date()
};
