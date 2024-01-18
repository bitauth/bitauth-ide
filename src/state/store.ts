import { automaticallySaveTemplateToLocalStorage } from './local-storage';
import { rootReducer } from './reducer';

import LogRocket from 'logrocket';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
// TODO: async, use: https://github.com/redux-loop/redux-loop

export { Provider };

export const configureStore = () => {
  const store = createStore(
    rootReducer,
    composeWithDevTools(
      applyMiddleware(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        LogRocket.reduxMiddleware(),
        automaticallySaveTemplateToLocalStorage,
      ),
    ),
  );

  return store;
};
