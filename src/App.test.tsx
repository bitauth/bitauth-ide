import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './App';
import { configureStore, Provider } from './state/store';
// TODO: switch to cypress
it('renders without crashing', () => {
  const div = document.createElement('div');
  const store = configureStore();
  ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>,
    div
  );
  ReactDOM.unmountComponentAtNode(div);
});
