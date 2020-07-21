import React from 'react';
import './TransactionEditor.scss';
import { AppState } from '../../../state/types';
import { connect } from 'react-redux';

interface TransactionEditorProps {
  // name: string;
}

interface TransactionEditorDispatch {}

export const TransactionEditor = connect(
  (state: AppState) => ({
    // name: state.currentTemplate.name
  }),
  {
    // updateTemplateName: ActionCreators.updateTemplateName,
  }
)((props: TransactionEditorProps & TransactionEditorDispatch) => {
  return (
    <div className="TransactionEditor EditorPane">
      <h2>Create Transaction</h2>
    </div>
  );
});
