import React from 'react';
import './WalletEditor.scss';
import { AppState } from '../../../state/types';
import { connect } from 'react-redux';
import { wrapInterfaceTooltip } from '../../common';
import { Tree, ITreeNode, Button } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ActionCreators } from '../../../state/reducer';

const displaySatoshis = (satoshis: number) => `${satoshis / 1e8} tBCH`;

export const reduceWalletTree: (wallets: AppState['wallets']) => ITreeNode[] = (
  wallets
) => {
  return Object.entries(wallets.walletsByInternalId).map<ITreeNode>(
    ([walletId, wallet]) => {
      return {
        id: walletId,
        label: wallet.name,
        isExpanded: wallet.isExpanded,
        isSelected: wallet.isSelected,
        className: 'wallet',
        secondaryLabel: displaySatoshis(
          wallet.addresses.reduce(
            (sum, addressId) =>
              sum +
              wallets.addressesByInternalId[addressId].utxos.reduce(
                (sum, path) => sum + wallets.utxosByChainPath[path].satoshis,
                0
              ),
            0
          )
        ),
        childNodes: wallet.addresses.map<ITreeNode>((addressId) => {
          const address = wallets.addressesByInternalId[addressId];
          return {
            id: addressId,
            label: address.label,
            secondaryLabel: address.isExpanded
              ? undefined
              : displaySatoshis(
                  address.utxos.reduce(
                    (sum, path) =>
                      sum + wallets.utxosByChainPath[path].satoshis,
                    0
                  )
                ),
            isExpanded: address.isExpanded,
            className: 'address',
            childNodes: address.utxos.map<ITreeNode>((utxoChainPath) => {
              const utxo = wallets.utxosByChainPath[utxoChainPath];
              return {
                id: utxoChainPath,
                label: utxoChainPath,
                className: 'utxo',
                secondaryLabel: displaySatoshis(utxo.satoshis),
              };
            }),
          };
        }),
      };
    }
  );
};

interface WalletEditorProps {
  walletTree: ITreeNode[];
  fullyExpanded: boolean;
}

interface WalletEditorDispatch {
  toggleWalletTreeNode: typeof ActionCreators.toggleWalletTreeNode;
  toggleAllWalletTreeNodes: typeof ActionCreators.toggleAllWalletTreeNodes;
}

export const WalletEditor = connect(
  (state: AppState) => ({
    walletTree: reduceWalletTree(state.wallets),
    fullyExpanded: [
      ...Object.values(state.wallets.walletsByInternalId),
      ...Object.values(state.wallets.addressesByInternalId),
    ].every((node) => node.isExpanded),

    // true // true if any elements in the tree are collapsed
  }),
  {
    toggleWalletTreeNode: ActionCreators.toggleWalletTreeNode,
    toggleAllWalletTreeNodes: ActionCreators.toggleAllWalletTreeNodes,
  }
)((props: WalletEditorProps & WalletEditorDispatch) => {
  return (
    <div className="WalletEditor EditorPane">
      <h2>
        Testing Wallets
        <div className="header-buttons">
          {!props.fullyExpanded
            ? wrapInterfaceTooltip(
                <Button
                  icon={IconNames.EXPAND_ALL}
                  onClick={() => {
                    props.toggleAllWalletTreeNodes(true);
                  }}
                />,
                'Expand All'
              )
            : wrapInterfaceTooltip(
                <Button
                  icon={IconNames.COLLAPSE_ALL}
                  onClick={() => {
                    props.toggleAllWalletTreeNodes(false);
                  }}
                />,
                'Collapse All'
              )}

          {wrapInterfaceTooltip(
            <Button
              icon={IconNames.PLUS}
              onClick={() => {
                console.log('expand');
                // setEditScriptDialogIsOpen(true);
              }}
            />,
            'Create New Wallet'
          )}
        </div>
      </h2>
      <Tree
        onNodeClick={(node, path) => {
          console.log(node, path);
        }}
        onNodeCollapse={(node) => {
          props.toggleWalletTreeNode(
            String(node.id),
            String(node.className),
            false
          );
        }}
        onNodeExpand={(node) => {
          props.toggleWalletTreeNode(
            String(node.id),
            String(node.className),
            true
          );
        }}
        contents={props.walletTree}
      />
    </div>
  );
});
