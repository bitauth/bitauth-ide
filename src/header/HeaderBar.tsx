import React from 'react';
import './HeaderBar.scss';
import { Button, MenuItem } from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';
import { AuthenticationVirtualMachineIdentifier } from 'bitcoin-ts/build/main/lib/auth/templates/types';
import { IDEMode } from '../state/types';

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
      label={vm.disabled ? 'Not Yet Available' : ''}
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
