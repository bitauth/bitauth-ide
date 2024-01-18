// eslint-disable-next-line import/no-unresolved
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Alert } from '@blueprintjs/core';

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

  const close = () => {
    setNeedRefresh(false);
  };

  const reload = () => {
    updateServiceWorker().catch((error) => {
      console.error('Failed to update service worker:', error);
    });
  };

  return (
    <Alert
      confirmButtonText="Reload"
      isOpen={needRefresh}
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
