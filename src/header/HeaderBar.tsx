import React from 'react';
import './HeaderBar.scss';
import { Button, MenuItem, Icon } from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';
import { AuthenticationVirtualMachineIdentifier } from 'bitcoin-ts/build/main/lib/auth/templates/types';
import { IDEMode } from '../state/types';
import GitHubLogo from './github-logo.svg';
import { IconNames } from '@blueprintjs/icons';
import { wrapInterfaceTooltip } from '../editor/common';

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
  { id: IDEMode.wallet, name: 'Wallet Mode', disabled: true }
];

const vms: IDESupportedVirtualMachine[] = [
  { id: 'BCH_2018_11', name: 'BCH 2018-11 VM', disabled: false },
  { id: 'BCH_2019_05', name: 'BCH 2019-05 VM', disabled: true },
  { id: 'BTC_2017_08', name: 'BTC 2017-08 VM', disabled: true },
  { id: 'BSV_2018_11', name: 'BSV 2018-11 VM', disabled: true }
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
      label={vm.disabled ? '(Not Yet Available)' : ''}
      onClick={handleClick}
      text={vm.name}
      disabled={vm.disabled}
    />
  );
};

export const HeaderBar = () => {
  return (
    <div className="HeaderBar">
      <div className="left-section">
        <h1 className="app-title">
          <span className="bitauth">bitauth</span>
          <span className="ide">IDE</span>
        </h1>
        <span className="status-badge">alpha</span>
        {/* TODO: email icon link with red notification dot before first click – tooltip: "We're building more development tools like BitAuth IDE. Interested in updates? Click to sign up." */}

        <a
          className="link github-logo"
          href="https://github.com/bitjson/bitauth-ide"
          target="_blank"
          title="View BitAuth IDE on GitHub"
        >
          <img src={GitHubLogo} alt="logo" />
          Bugs
        </a>
        {wrapInterfaceTooltip(
          <a
            className="link updates"
            href="https://bitauth.com/"
            target="_blank"
          >
            <Icon icon={IconNames.NOTIFICATIONS} iconSize={12} /> Updates
          </a>,
          'Get email updates when we launch new tools like BitAuth IDE →'
        )}
      </div>
      <div className="right-section">
        <div className="ide-mode-select">
          <ModeSelect
            itemRenderer={renderMode}
            items={ideModes}
            onItemSelect={() => console.log('TODO: build wallet mode 👀')}
            activeItem={ideModes[0]}
            filterable={false}
          >
            <Button text={ideModes[0].name} rightIcon="caret-down" />
          </ModeSelect>
        </div>
        <div className="vm-select">
          <VirtualMachineSelect
            itemRenderer={renderVm}
            items={vms}
            onItemSelect={() =>
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
    </div>
  );
};
