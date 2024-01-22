import { automaticallySaveTemplateToLocalStorage } from './local-storage';
import { rootReducer } from './reducer';

import { Provider } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';

export { Provider };

export const configureStore = () => {
  const store = createStore(
    rootReducer,
    composeWithDevTools(
      applyMiddleware(automaticallySaveTemplateToLocalStorage),
    ),
  );

  return store;
};
