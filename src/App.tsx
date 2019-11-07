import React from 'react';
import 'normalize.css/normalize.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import 'react-mosaic-component/react-mosaic-component.css';
import './App.scss';
import { Editor } from './editor/Editor';
import { HeaderBar } from './header/HeaderBar';
import { Classes } from '@blueprintjs/core';
import { AsyncLoader } from './init/AsyncLoader';

export const App = () => (
  <div className={`App ${Classes.DARK}`}>
    <HeaderBar />
    <Editor />
    <AsyncLoader />
  </div>
);
