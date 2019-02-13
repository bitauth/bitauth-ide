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

export const App = () => {
  // TODO: display warning if BigInt is undefined. Only Chrome is supported currently, but BigInt support will land in Firefox very soon: https://bugzilla.mozilla.org/show_bug.cgi?id=1522436 (it's behind `--enable-bigint` currently)
  return (
    <div className={`App ${Classes.DARK}`}>
      <HeaderBar />
      <Editor />
    </div>
  );
};
