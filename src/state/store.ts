import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import LogRocket from 'logrocket';
import {
  instantiateBitcoinCashVirtualMachine,
  instantiateSecp256k1,
  instantiateSha256
} from 'bitcoin-ts';
import { rootReducer, ActionCreators } from './reducer';
// TODO: async, use: https://github.com/redux-loop/redux-loop

export { Provider };

export const store = createStore(
  rootReducer,
  composeWithDevTools(applyMiddleware(LogRocket.reduxMiddleware()))
);

Promise.all([
  instantiateBitcoinCashVirtualMachine(),
  instantiateSecp256k1(),
  instantiateSha256()
]).then(([bch2018, secp256k1, sha256]) => {
  store.dispatch(
    ActionCreators.loadVMsAndCrypto({
      vms: {
        BCH_2018_11: bch2018,
        // TODO: add other VMs
        BCH_2019_05: bch2018,
        BTC_2017_08: bch2018,
        BSV_2018_11: bch2018
      },
      crypto: {
        sha256,
        secp256k1
      }
    })
  );
});
