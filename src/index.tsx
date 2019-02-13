import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import { App } from './App';
import * as serviceWorker from './serviceWorker';
import { Provider, store } from './state/store';
import LogRocket from 'logrocket';

if (process.env.NODE_ENV === 'production') {
  LogRocket.init('wkulwl/bitauth-ide');
  // TODO: full story, analytics, etc.
}

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
