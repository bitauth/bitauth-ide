// eslint-disable-next-line import/no-unresolved
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Alert } from '@blueprintjs/core';
import { useEffect } from 'react';

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

  useEffect(() => {
    const setKey = (value: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (window as any)._IDE_E2E_TESTING_NOTIFIER = value;
    };
    setKey({ setNeedRefresh });
    return () => {
      setKey(undefined);
    };
  }, [setNeedRefresh]);

  const close = () => {
    setNeedRefresh(false);
  };

  const reload = () => {
    console.log('Notifier triggered reload.');
    updateServiceWorker().catch((error) => {
      console.error('Failed to update service worker:', error);
    });
  };

  return (
    <Alert
      confirmButtonText="Reload"
      isOpen={
        needRefresh &&
        localStorage.getItem('BITAUTH_IDE_E2E_TESTING_DISABLE_NOTIFIER') !==
          'true'
      }
      onClose={close}
      canEscapeKeyCancel={true}
      canOutsideClickCancel={true}
      cancelButtonText="Later"
      onConfirm={reload}
    >
      <p>
        This version of Bitauth IDE was previously installed for offline usage,
        but a newer version is now available. Would you like to update and
        restart Bitauth IDE?
      </p>
    </Alert>
  );
};
