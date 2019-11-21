import { connect } from 'react-redux';
import { ActionCreators } from '../state/reducer';
import { AppState } from '../state/types';
import {
  instantiateSecp256k1,
  instantiateSha256,
  instantiateVirtualMachineBCH
} from 'bitcoin-ts';
import { base64ToBin, binToUtf8 } from 'bitcoin-ts';
import { inflate } from 'pako';
import { importAuthenticationTemplate } from '../state/import-export';
import { getRoute, Routes } from './routing';

const clearRoute = () => window.history.pushState(null, 'Bitauth IDE', '/');

export const AsyncLoader = connect(
  ({ crypto, authenticationVirtualMachines }: AppState) => ({
    crypto,
    authenticationVirtualMachines
  }),
  {
    loadVMsAndCrypto: ActionCreators.loadVMsAndCrypto,
    importTemplate: ActionCreators.importTemplate,
    openTemplateSettings: ActionCreators.openTemplateSettings,
    openWelcomePane: ActionCreators.openWelcomePane
  }
)(
  ({
    crypto,
    authenticationVirtualMachines,
    loadVMsAndCrypto,
    importTemplate,
    openTemplateSettings,
    openWelcomePane
  }: {
    crypto: AppState['crypto'];
    authenticationVirtualMachines: AppState['authenticationVirtualMachines'];
    loadVMsAndCrypto: typeof ActionCreators.loadVMsAndCrypto;
    importTemplate: typeof ActionCreators.importTemplate;
    openTemplateSettings: typeof ActionCreators.openTemplateSettings;
    openWelcomePane: typeof ActionCreators.openWelcomePane;
  }) => {
    const supportsBigInt = typeof BigInt !== 'undefined';
    if (!supportsBigInt) {
      return null;
    }

    if (crypto === null || authenticationVirtualMachines === null) {
      setTimeout(() => {
        Promise.all([
          instantiateVirtualMachineBCH(),
          instantiateSecp256k1(),
          instantiateSha256()
        ]).then(([BCH_2019_05, secp256k1, sha256]) => {
          loadVMsAndCrypto({
            vms: {
              BCH_2020_05: BCH_2019_05,
              // TODO: add other VMs
              BCH_2019_11: BCH_2019_05,
              BTC_2017_08: BCH_2019_05,
              BSV_2018_11: BCH_2019_05
            },
            crypto: {
              sha256,
              secp256k1
            }
          });
        });
      }, 0);
    }

    const route = getRoute();
    if (route) {
      const payload = window.location.pathname.slice(route.length);
      if (route === Routes.directImport) {
        const base64UrlToBase64 = (base64: string) =>
          base64.replace(/-/g, '+').replace(/_/g, '/');
        try {
          console.log('Importing from payload:', payload);
          const uncompressed = binToUtf8(
            inflate(base64ToBin(base64UrlToBase64(payload)))
          );
          const importedTemplate = importAuthenticationTemplate(
            JSON.parse(uncompressed)
          );
          if (typeof importedTemplate === 'string') {
            throw new Error(`Failed to import template: ${importedTemplate}`);
          }
          setTimeout(() => {
            importTemplate(importedTemplate);
            openTemplateSettings();
          }, 0);
        } catch (e) {
          window.alert(
            'This sharing URL seems to be corrupted. Please check the link and try again.'
          );
          console.error(e);
          setTimeout(() => {
            openWelcomePane();
          }, 0);
        }
        clearRoute();
      } else if (route === Routes.gistImport) {
        const gistUrl = `https://gist.github.com/${payload}`;
        const gistApiUrl = `https://api.github.com/gists/${payload}`;
        setTimeout(async () => {
          fetch(gistApiUrl)
            .then(results => {
              return results.json();
            })
            .then(data => {
              try {
                if (typeof data.files !== 'object' || data.files === null) {
                  throw new Error(
                    `Could not find Gist. Please check the URL and try again.`
                  );
                }
                const firstFile = Object.entries(data.files).find(
                  ([filename]) => filename.slice(-5) === '.json'
                );
                if (!firstFile) {
                  throw new Error(
                    `No file ending in '.json' found – please confirm the Gist has a valid authentication template in JSON format.`
                  );
                }
                const filename = firstFile[0];
                const file = firstFile[1];
                if (
                  typeof file !== 'object' ||
                  file === null ||
                  typeof (file as { content: string }).content !== 'string'
                ) {
                  throw new Error(
                    `Unexpected response from GitHub, returned file (${filename}) contents: ${file}`
                  );
                }
                const content = (file as { content: string }).content;
                console.log(
                  `Importing '${filename}' from ${gistUrl} as an authentication template.`
                );
                const template = importAuthenticationTemplate(
                  JSON.parse(content)
                );
                if (typeof template === 'string') {
                  throw new Error(
                    `Invalid authentication template: ${template}`
                  );
                }
                importTemplate(template);
                openTemplateSettings();
              } catch (e) {
                const error = `There was a problem importing the template from the GitHub Gist (${gistUrl}): ${e}`;
                window.alert(error);
                console.error(error);
                openWelcomePane();
              }
            })
            .catch(e => {
              const error = `There was a problem fetching the Gist (${gistApiUrl}) from GitHub. Please check the link and try again. ${e}`;
              window.alert(error);
              console.error(error);
              openWelcomePane();
            });
        }, 0);
      } else {
        console.log('Cleared unknown route:', route);
      }
      clearRoute();
    }

    return null;
  }
);
