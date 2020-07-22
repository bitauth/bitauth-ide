import React from 'react';
import './WalletHistoryExplorer.scss';
import { AppState } from '../../../state/types';
import { connect } from 'react-redux';

interface WalletHistoryExplorerProps {
  // name: string;
}

interface WalletHistoryExplorerDispatch {}

export const WalletHistoryExplorer = connect(
  (state: AppState) => ({
    // name: state.currentTemplate.name
  }),
  {
    // updateTemplateName: ActionCreators.updateTemplateName,
  }
)((props: WalletHistoryExplorerProps & WalletHistoryExplorerDispatch) => {
  return (
    <div className="WalletHistoryExplorer EditorPane">
      <h2>[name] Wallet History</h2>
    </div>
  );
});
