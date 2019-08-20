// import './bitauth-script/bitauth-script.debug';
import React from 'react';
import 'normalize.css/normalize.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import 'react-mosaic-component/react-mosaic-component.css';
import './App.scss';
import { Editor } from './editor/Editor';
import { HeaderBar } from './header/HeaderBar';
import { Classes } from '@blueprintjs/core';
import { connect } from 'react-redux';
import { ActionCreators } from './state/reducer';
import { AppState } from './state/types';
import {
  instantiateSecp256k1,
  instantiateSha256,
  instantiateVirtualMachineBCH
} from 'bitcoin-ts';

const AsyncLoader = connect(
  ({ crypto, authenticationVirtualMachines }: AppState) => ({
    crypto,
    authenticationVirtualMachines
  }),
  {
    loadVMsAndCrypto: ActionCreators.loadVMsAndCrypto
  }
)(
  ({
    crypto,
    authenticationVirtualMachines,
    loadVMsAndCrypto
  }: {
    crypto: AppState['crypto'];
    authenticationVirtualMachines: AppState['authenticationVirtualMachines'];
    loadVMsAndCrypto: typeof ActionCreators.loadVMsAndCrypto;
  }) => {
    const supportsBigInt = typeof BigInt !== 'undefined';
    if (
      (supportsBigInt && crypto === null) ||
      authenticationVirtualMachines === null
    ) {
      setTimeout(() => {
        Promise.all([
          instantiateVirtualMachineBCH(),
          instantiateSecp256k1(),
          instantiateSha256()
        ]).then(([BCH_2019_05, secp256k1, sha256]) => {
          loadVMsAndCrypto({
            vms: {
              BCH_2019_05: BCH_2019_05,
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

    // TODO: display warning if BigInt is undefined. Only Chrome is supported currently, but BigInt support will land in Firefox very soon: https://bugzilla.mozilla.org/show_bug.cgi?id=1522436 (it's behind `--enable-bigint` currently)
    return supportsBigInt ? null : <div className="unsupported-browser" />;
  }
);

export const App = () => (
  <div className={`App ${Classes.DARK}`}>
    <HeaderBar />
    <Editor />
    <AsyncLoader />
  </div>
);
