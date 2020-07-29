import { ActionCreators } from '../../src/state/reducer';
import {
  instantiateRipemd160,
  instantiateSecp256k1,
  instantiateSha256,
  instantiateSha512,
  instantiateVirtualMachineBCH,
} from '@bitauth/libauth';

Cypress.Commands.add('hideGuidePopover', () => {
  cy.window().then((window) => {
    window.localStorage.setItem('BITAUTH_IDE_GUIDE_POPOVER_DISMISSED', 1);
  });
});

/**
 * This command attempts to re-use previously instantiated WASM instances (saved
 * to `window.Cypress.vmsAndCryptoWasm`) rather than allowing the app to
 * re-instantiate the WASM instances on each reload. This is valuable for 2
 * reasons:
 * - Instantiating WASM is slow, so re-using instances makes tests much faster.
 * - A persistent bug in Chrome occasionally causes an error when re-creating
 *   too many WASM instances:
 *   https://github.com/emscripten-core/emscripten/issues/8126
 */
Cypress.Commands.add('loadVmsAndCrypto', () => {
  cy.window()
    .its('store')
    .then((store) => {
      const loadVmsAndCrypto = ([
        ripemd160,
        secp256k1,
        sha256,
        sha512,
        BCH_2019_05,
      ]) => {
        const action = ActionCreators.loadVMsAndCrypto({
          vms: {
            BCH_2020_05: BCH_2019_05,
            // TODO: add other VMs
            BCH_2020_11_SPEC: BCH_2019_05,
            BTC_2017_08: BCH_2019_05,
            BSV_2020_02: BCH_2019_05,
          },
          crypto: { ripemd160, secp256k1, sha256, sha512 },
        });
        store.dispatch(action);
      };
      if (window.Cypress.vmsAndCryptoWasm === undefined) {
        Promise.all([
          instantiateRipemd160(),
          instantiateSecp256k1(),
          instantiateSha256(),
          instantiateSha512(),
          instantiateVirtualMachineBCH(),
        ]).then((wasm) => {
          loadVmsAndCrypto(wasm);
          window.Cypress.vmsAndCryptoWasm = Promise.resolve(wasm);
        });
      } else {
        window.Cypress.vmsAndCryptoWasm.then((wasm) => {
          loadVmsAndCrypto(wasm);
        });
      }
    });
});

Cypress.Commands.add('startBitauthIDE', () => {
  cy.hideGuidePopover();
  cy.loadVmsAndCrypto();
});
