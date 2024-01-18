/* istanbul ignore file */

import './WalletHistoryExplorer.css';
import { connect } from 'react-redux';

export const WalletHistoryExplorer = connect(
  () => ({
    // name: state.currentTemplate.name
  }),
  {
    // updateTemplateName: ActionCreators.updateTemplateName,
  },
)(() => {
  return (
    <div className="WalletHistoryExplorer EditorPane">
      <h2>[name] Wallet History</h2>
    </div>
  );
});
