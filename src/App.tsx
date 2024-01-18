import 'normalize.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import 'react-mosaic-component/react-mosaic-component.css';
import './App.css';

import { Editor } from './editor/Editor';
import { HeaderBar } from './header/HeaderBar';
import { Notifier } from './init/Notifier';
import { Router } from './init/Router';

import { Classes } from '@blueprintjs/core';

export const App = () => (
  <div className={`App ${Classes.DARK}`}>
    <HeaderBar />
    <Editor />
    <Router />
    <Notifier />
  </div>
);
