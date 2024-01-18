/* istanbul ignore file */

import './TransactionEditor.css';
import { connect } from 'react-redux';

export const TransactionEditor = connect(
  () => ({
    // name: state.currentTemplate.name
  }),
  {
    // updateTemplateName: ActionCreators.updateTemplateName,
  },
)(() => {
  return (
    <div className="TransactionEditor EditorPane">
      <h2>Create Transaction</h2>
    </div>
  );
});
