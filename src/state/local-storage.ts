import { Middleware } from 'redux';
import { extractTemplate } from './import-export';
import { AppState } from './types';
import { emptyTemplate } from './defaults';

let hasLogged = false;
const emptyTemplateString = JSON.stringify(emptyTemplate);

export const automaticallySaveTemplateToLocalStorage: Middleware<
  {},
  AppState
> = store => next => action => {
  const state = store.getState();
  const saveKey = `BITAUTH_IDE_BACKUP_${state.appLoadTime.toISOString()}`;
  if (!hasLogged) {
    hasLogged = true;
    console.log(
      `Automatically saving work to local storage key: ${saveKey} – if something goes wrong, you can reload the app and import the saved JSON template from there.`
    );
  }
  const result = next(action);
  const template = JSON.stringify(extractTemplate(state.currentTemplate));
  /**
   * Avoid polluting local storage if the user doesn't touch anything.
   */
  if (template !== emptyTemplateString) {
    localStorage.setItem(saveKey, template);
  }
  return result;
};
