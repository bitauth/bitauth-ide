// eslint-disable-next-line import/no-unresolved
import { useRegisterSW } from 'virtual:pwa-register/react';

import './Notifier.css';
import {
  analyticsEnabled,
  localStorageTrackingConsent,
  notifierEnabled,
} from '../editor/constants';
import {
  localStorageEventHasNeverHappened,
  LocalStorageEvents,
} from '../state/local-storage';

import { Button, Popover } from '@blueprintjs/core';
import { usePostHog } from 'posthog-js/react';
import { useEffect, useState } from 'react';

const shouldRequestTrackingConsent = () => {
  if (!analyticsEnabled()) return false;
  const consent = localStorage.getItem(localStorageTrackingConsent);
  if (consent === null) return true;
  const [enabledString, lastAsked] = consent.split('-');
  const enabled = enabledString === '1';
  console.log(
    `You ${enabled ? 'enabled' : 'disabled'} telemetry at ${new Date(Number(lastAsked)).toISOString()}. To ${enabled ? 'disable' : 'enable'}, run window.${enabled ? 'disableTelemetry' : 'enableTelemetry'}().`,
  );
  const oneWeek = 604800000;
  if (!enabled && Date.now() - Number(lastAsked) > oneWeek) return true;
  return false;
};

export const Notifier = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('Bitauth IDE is installed locally and ready to use offline.');
      if (import.meta.env.DEV) {
        console.log(r);
      }
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    },
  });
  const [requestConsent, setRequestConsent] = useState(
    shouldRequestTrackingConsent,
  );
  const posthog = usePostHog();
  const enableTelemetry = () => {
    posthog.opt_in_capturing();
    localStorage.setItem(localStorageTrackingConsent, `1-${Date.now()}`);
    console.log('Telemetry enabled.');
  };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  (window as any).enableTelemetry = enableTelemetry;
  const disableTelemetry = () => {
    posthog.opt_out_capturing();
    localStorage.setItem(localStorageTrackingConsent, `0-${Date.now()}`);
    console.log('Telemetry disabled.');
  };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  (window as any).disableTelemetry = disableTelemetry;

  const [prioritizeReload, setPrioritizeReload] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setPrioritizeReload(false);
    }, 1000);
  }, []);

  useEffect(() => {
    const setKey = (value: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (window as any)._IDE_E2E_TESTING_NOTIFIER = value;
    };
    setKey({ setNeedRefresh, setRequestConsent, setPrioritizeReload });
  }, [setNeedRefresh, setRequestConsent, setPrioritizeReload]);

  const requestReloadContent = (
    <div className="notifier-request">
      <p>
        This version of Bitauth IDE was previously installed for offline usage,
        but a newer version is now available. Would you like to update and
        restart Bitauth IDE?
      </p>
      <div className="button-group">
        <Button
          className="subtle"
          onClick={() => {
            setNeedRefresh(false);
            setPrioritizeReload(true);
            /** Avoid showing another dialog immediately to prevent misclicks */
            setTimeout(() => {
              setPrioritizeReload(false);
            }, 2000);
          }}
        >
          Not now
        </Button>
        <Button
          intent="primary"
          onClick={() => {
            console.log('Notifier triggered reload.');
            if (
              localStorage
                .getItem(localStorageTrackingConsent)
                ?.split('-')[0] !== '1'
            ) {
              localStorage.removeItem(localStorageTrackingConsent);
            }
            updateServiceWorker().catch((error) => {
              console.error('Failed to update service worker:', error);
            });
          }}
        >
          Reload
        </Button>
      </div>
    </div>
  );

  const telemetryContent = (
    <div className="notifier-request">
      <p>
        Would you like to help improve Bitauth IDE by sharing usage information
        with the developers?
      </p>
      <div className="button-group">
        <Button
          className="subtle"
          onClick={() => {
            disableTelemetry();
            setRequestConsent(false);
          }}
        >
          Not now
        </Button>
        <Button
          intent="primary"
          onClick={() => {
            enableTelemetry();
            setRequestConsent(false);
          }}
        >
          Enable Sharing
        </Button>
      </div>
    </div>
  );

  useEffect(() => {
    if (
      (!needRefresh && !prioritizeReload && !requestConsent) ||
      !notifierEnabled()
    ) {
      setTimeout(() => {
        if (
          localStorageEventHasNeverHappened(
            LocalStorageEvents.GuidePopoverDismissed,
          )
        ) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
          (window as any).setIntroPopoverVisible(true);
        }
      }, 3000);
    }
  }, [needRefresh, prioritizeReload, requestConsent]);

  return (
    <div className="notifier-request-source">
      <Popover
        usePortal={false}
        isOpen={
          (needRefresh && notifierEnabled()) ||
          (requestConsent && !prioritizeReload && notifierEnabled())
        }
        minimal={true}
        placement="right-start"
        content={needRefresh ? requestReloadContent : telemetryContent}
        enforceFocus={false}
      >
        <span></span>
      </Popover>
    </div>
  );
};
