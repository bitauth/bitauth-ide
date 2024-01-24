import './fonts.css';
import './index.css';
// TODO: remove this disable
// eslint-disable-next-line import/no-unresolved
import { Analytics } from '@vercel/analytics/react';

import { App } from './App';
import {
  analyticsBuilt,
  localStorageTrackingConsent,
} from './editor/constants';
import { configureStore, Provider } from './state/store';

import { PostHogProvider } from 'posthog-js/react';
import { createRoot } from 'react-dom/client';

const store = configureStore();

if (import.meta.env.DEV) {
  console.log('Bitauth IDE is running in development mode.');
}

const gaveTrackingConsent = () =>
  String(localStorage.getItem(localStorageTrackingConsent)).startsWith('true');

createRoot(document.getElementById('root')!).render(
  /**
   * TODO: Enable StrictMode once this issue is fixed: https://github.com/palantir/blueprint/issues/6203
   * (Likely waiting for Blueprint v6 release to fully remove deprecated APIs: https://github.com/palantir/blueprint/issues/3979)
   */
  // <React.StrictMode>
  <Provider store={store}>
    {analyticsBuilt ? (
      <>
        <Analytics
          beforeSend={(event) => {
            if (gaveTrackingConsent()) return event;
            /**
             * Prevent leaking usage information into aggregate metrics
             */
            if (event.url.includes('/import-template/')) {
              event.url =
                event.url.split('/import-template/')[0] +
                '/import-template/REDACTED';
              return event;
            }
            if (event.url.includes('/import-gist/')) {
              event.url =
                event.url.split('/import-gist/')[0] + '/import-gist/REDACTED';
              return event;
            }
            return event;
          }}
        />
        <PostHogProvider
          apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
          options={{
            /* Only capture data after explicit consent */
            opt_out_capturing_by_default: true,
            api_host: import.meta.env.VITE_PUBLIC_POSTHOG_API_HOST,
            session_recording: { maskAllInputs: false },
            ui_host: import.meta.env.VITE_PUBLIC_POSTHOG_UI_HOST,
          }}
        >
          <App />
        </PostHogProvider>
      </>
    ) : (
      <App />
    )}
  </Provider>,
  // </React.StrictMode>
);
