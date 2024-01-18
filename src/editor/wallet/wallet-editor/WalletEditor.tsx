/* istanbul ignore file */

import './WalletEditor.css';
import { ActionCreators } from '../../../state/reducer';
import { AppState } from '../../../state/types';
import { wrapInterfaceTooltip } from '../../common';

import { Button } from '@blueprintjs/core';
import { CollapseAll, ExpandAll, Plus } from '@blueprintjs/icons';
import { connect } from 'react-redux';

// const displaySatoshis = (satoshis: number) => `${satoshis / 1e8} tBCH`;

type WalletEditorProps = {
  fullyExpanded: boolean;
};

type WalletEditorDispatch = {
  toggleWalletTreeNode: typeof ActionCreators.toggleWalletTreeNode;
  toggleAllWalletTreeNodes: typeof ActionCreators.toggleAllWalletTreeNodes;
};

export const WalletEditor = connect(
  (state: AppState) => ({
    fullyExpanded: [
      ...Object.values(state.wallets.walletsByInternalId),
      ...Object.values(state.wallets.addressesByInternalId),
    ].every((node) => node.isExpanded),

    // true // true if any elements in the tree are collapsed
  }),
  {
    toggleWalletTreeNode: ActionCreators.toggleWalletTreeNode,
    toggleAllWalletTreeNodes: ActionCreators.toggleAllWalletTreeNodes,
  },
)((props: WalletEditorProps & WalletEditorDispatch) => {
  return (
    <div className="WalletEditor EditorPane">
      <h2>
        Testing Wallets
        <div className="header-buttons">
          {!props.fullyExpanded
            ? wrapInterfaceTooltip(
                <Button
                  icon={<ExpandAll />}
                  onClick={() => {
                    props.toggleAllWalletTreeNodes(true);
                  }}
                />,
                'Expand All',
              )
            : wrapInterfaceTooltip(
                <Button
                  icon={<CollapseAll />}
                  onClick={() => {
                    props.toggleAllWalletTreeNodes(false);
                  }}
                />,
                'Collapse All',
              )}

          {wrapInterfaceTooltip(
            <Button
              icon={<Plus />}
              onClick={() => {
                console.log('expand');
                // setEditScriptDialogIsOpen(true);
              }}
            />,
            'Create New Wallet',
          )}
        </div>
      </h2>
    </div>
  );
});
