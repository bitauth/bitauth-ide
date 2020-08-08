import React, { useState, useEffect } from 'react';
import './HeaderBar.scss';
import {
  Button,
  MenuItem,
  Icon,
  Popover,
  PopoverInteractionKind,
} from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';
import { AuthenticationVirtualMachineIdentifier } from '@bitauth/libauth';
import { IDEMode, AppState, ActiveDialog } from '../state/types';
import GitHubLogo from './github-logo.svg';
import { IconNames } from '@blueprintjs/icons';
import { wrapInterfaceTooltip } from '../editor/common';
import { connect } from 'react-redux';
import { ActionCreators } from '../state/reducer';
import { GuideDialog } from '../editor/dialogs/guide-dialog/GuideDialog';
import {
  localStorageEventHasNeverHappened,
  LocalStorageEvents,
} from '../state/local-storage';
import { workingOnWalletMode } from '../state/defaults';

interface IDESupportedModes {
  id: IDEMode;
  name: string;
  disabled: boolean;
}

interface IDESupportedVirtualMachine {
  id: AuthenticationVirtualMachineIdentifier;
  name: string;
  disabled: boolean;
}

const ideModes: IDESupportedModes[] = [
  { id: IDEMode.editor, name: 'Editor Mode', disabled: false },
  { id: IDEMode.wallet, name: 'Wallet Mode', disabled: !workingOnWalletMode },
];

const vms: IDESupportedVirtualMachine[] = [
  { id: 'BCH_2020_05', name: 'BCH 2020-05 VM', disabled: false },
  { id: 'BCH_2020_11', name: 'BCH 2020-11 VM', disabled: true },
  { id: 'BTC_2017_08', name: 'BTC 2017-08 VM', disabled: true },
  { id: 'BSV_2018_11', name: 'BSV 2018-11 VM', disabled: true },
];

const ModeSelect = Select.ofType<IDESupportedModes>();
const VirtualMachineSelect = Select.ofType<IDESupportedVirtualMachine>();

const renderMode: ItemRenderer<IDESupportedModes> = (
  ideMode,
  { handleClick, modifiers }
) => {
  return (
    <MenuItem
      active={modifiers.active}
      key={ideMode.id}
      label={ideMode.disabled ? '(Not Yet Available)' : ''}
      onClick={handleClick}
      text={ideMode.name}
      disabled={ideMode.disabled}
    />
  );
};

const renderVm: ItemRenderer<IDESupportedVirtualMachine> = (
  vm,
  { handleClick, modifiers }
) => {
  return (
    <MenuItem
      active={modifiers.active}
      key={vm.id}
      label={vm.disabled ? '(See GitHub Issues)' : ''}
      onClick={handleClick}
      text={vm.name}
      disabled={vm.disabled}
    />
  );
};

interface HeaderDispatch {
  openGuide: typeof ActionCreators.openGuide;
  closeDialog: typeof ActionCreators.closeDialog;
  setIDEMode: typeof ActionCreators.setIDEMode;
}
interface HeaderProps extends HeaderDispatch {
  activeDialog: ActiveDialog;
  ideMode: IDEMode;
}

export const HeaderBar = connect(
  (state: AppState) => ({
    activeDialog: state.activeDialog,
    ideMode: state.ideMode,
  }),
  {
    openGuide: ActionCreators.openGuide,
    closeDialog: ActionCreators.closeDialog,
    setIDEMode: ActionCreators.setIDEMode,
  }
)((props: HeaderProps) => {
  const [introPopoverVisible, setIntroPopoverVisible] = useState(false);
  const currentIDEMode = ideModes.find((mode) => mode.id === props.ideMode);
  if (currentIDEMode === undefined) {
    throw new Error('Invalid IDE Mode');
  }
  useEffect(() => {
    if (
      localStorageEventHasNeverHappened(
        LocalStorageEvents.GuidePopoverDismissed
      )
    ) {
      setTimeout(() => {
        setIntroPopoverVisible(true);
      }, 3000);
    }
  }, []);
  return (
    <div className="HeaderBar">
      <div className="left-section">
        <h1 className="app-title">
          <span className="bitauth">bitauth</span>
          <span className="ide">IDE</span>
        </h1>
        <Popover
          portalClassName="intro-popover"
          content={<p>New to Bitauth IDE? Check out the guide!</p>}
          interactionKind={PopoverInteractionKind.CLICK}
          isOpen={introPopoverVisible}
          onInteraction={(state) => {
            if (state === false) {
              setIntroPopoverVisible(false);
            }
          }}
        >
          {wrapInterfaceTooltip(
            <button
              className="link"
              onClick={() => props.openGuide()}
              tabIndex={1}
            >
              <Icon icon={IconNames.MANUAL} iconSize={12} /> Guide
            </button>,
            'Open the Bitauth IDE guide.'
          )}
        </Popover>
        {wrapInterfaceTooltip(
          <a
            className="link"
            href="https://t.me/bitauth_ide"
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={2}
          >
            <Icon icon={IconNames.CHAT} iconSize={12} /> Join Chat
          </a>,
          'Get help or share feedback in the community Telegram group →'
        )}
        {wrapInterfaceTooltip(
          <a
            className="link github-logo"
            href="https://github.com/bitauth/bitauth-ide/issues"
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={3}
          >
            <img src={GitHubLogo} alt="logo" />
            Report a bug
          </a>,
          'Please report bugs in our GitHub issue tracker →'
        )}
        {wrapInterfaceTooltip(
          <a
            className="link"
            href="https://twitter.com/bitauth"
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={4}
          >
            <Icon icon={IconNames.NOTIFICATIONS} iconSize={12} /> Get updates
          </a>,
          'Get updates about Bitauth IDE on Twitter →'
        )}
      </div>
      <div className="right-section">
        <div className="ide-mode-select">
          <ModeSelect
            itemRenderer={renderMode}
            items={ideModes}
            onItemSelect={(e) => props.setIDEMode(e.id)}
            activeItem={currentIDEMode}
            filterable={false}
          >
            <Button text={currentIDEMode.name} rightIcon="caret-down" />
          </ModeSelect>
        </div>
        <div className="vm-select">
          <VirtualMachineSelect
            itemRenderer={renderVm}
            items={vms}
            onItemSelect={() =>
              // TODO: if template supports VM, switch – otherwise ask with a popup.
              console.log(
                'TODO: if template supports VM, switch – otherwise ask with a popup.'
              )
            }
            activeItem={vms[0]}
            filterable={false}
          >
            <Button text={vms[0].name} rightIcon="caret-down" />
          </VirtualMachineSelect>
        </div>
      </div>
      <GuideDialog
        activeDialog={props.activeDialog}
        closeDialog={props.closeDialog}
      />
    </div>
  );
});
