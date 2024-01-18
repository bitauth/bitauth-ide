import './fonts.css';
import './index.css';
import { App } from './App';
import { configureStore, Provider } from './state/store';

import { createRoot } from 'react-dom/client';

const store = configureStore();

if (import.meta.env.DEV) {
  console.log('Bitauth IDE is running in development mode.');
}

/**
 * TODO: replace
 * If running inside Cypress, make the Redux store available on the window
 * object.
 */
// if ((window as any).Cypress) {
//   (window as any).store = store;
// }

createRoot(document.getElementById('root')!).render(
  /**
   * TODO: Enable StrictMode once this issue is fixed: https://github.com/palantir/blueprint/issues/6203
   * (Likely waiting for Blueprint v6 release to fully remove deprecated APIs: https://github.com/palantir/blueprint/issues/3979)
   */
  // <React.StrictMode>
  <Provider store={store}>
    <App />
  </Provider>,
  // </React.StrictMode>
);
