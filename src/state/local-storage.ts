import { localStorageBackupPrefix } from '../editor/constants';

import { emptyTemplate } from './defaults';
import { exportWalletTemplate } from './import-export';
import { AppState } from './types';

import { Middleware } from 'redux';

let hasLogged = false;
const emptyTemplateString = JSON.stringify(emptyTemplate);

export enum LocalStorageEvents {
  GuidePopoverDismissed = 'BITAUTH_IDE_GUIDE_POPOVER_DISMISSED',
}

export const automaticallySaveTemplateToLocalStorage: Middleware<
  object,
  AppState
> = (store) => (next) => (action) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const result = next(action);
  const state = store.getState();
  if (state.templateLoadTime === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result;
  }
  const saveKey = `${localStorageBackupPrefix}${state.templateLoadTime.toISOString()}`;
  if (!hasLogged) {
    hasLogged = true;
    console.log(
      `Automatically saving work to local storage key: ${saveKey} – if something goes wrong, you can reload the app and import the saved JSON template from there.`,
    );
  }
  const template = JSON.stringify(exportWalletTemplate(state.currentTemplate));
  /**
   * Avoid polluting local storage if the user doesn't touch anything.
   */
  if (template !== emptyTemplateString) {
    localStorage.setItem(saveKey, template);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return result;
};

/**
 * Make an event happen only on first visit.
 *
 * Looks in local storage for the provided `flagName`. If set, returns `false`.
 * If not set, it will be set to `Date.now().toString()` and this method will
 * return `true`.
 * @param eventName the name of the local storage key to use
 */
export const localStorageEventHasNeverHappened = (eventName: string) => {
  const timestamp = Number(localStorage.getItem(eventName));
  const hasNotHappened = timestamp === 0 || isNaN(timestamp);
  if (hasNotHappened) {
    localStorage.setItem(eventName, Date.now().toString());
  }
  return hasNotHappened;
};
