import React, { useState } from 'react';
import './TemplateSettings.scss';
import {
  EditableText,
  FormGroup,
  Button,
  Icon,
  Intent,
  Alert,
  Checkbox
} from '@blueprintjs/core';
import { AppState, IDESupportedVM } from '../../state/types';
import { connect } from 'react-redux';
import { IconNames } from '@blueprintjs/icons';
import { ActionCreators } from '../../state/reducer';
import { AuthenticationVirtualMachineIdentifier } from 'bitcoin-ts/build/main/lib/auth/templates/types';

const availableVms: { [key in IDESupportedVM]: React.ReactNode } = {
  BCH_2019_05: (
    <span className="vm">
      <code>BCH_2019_05</code>
      <span className="chain">Bitcoin Cash</span>
      <span className="version">2019 May Update</span>
      <span className="tag live">live</span>
    </span>
  ),
  BCH_2019_11: (
    <span className="vm">
      <code>BCH_2019_11</code>
      <span className="chain">Bitcoin Cash</span>
      <span className="version">2019 November Proposal</span>
      <span className="tag spec">Spec</span>
    </span>
  ),
  BSV_2018_11: (
    <span className="vm">
      <code>BSV_2018_11</code>
      <span className="chain">Bitcoin SV</span>
      <span className="version">2018 November Update</span>
      <span className="tag live">Live</span>
    </span>
  ),
  BTC_2017_08: (
    <span className="vm">
      <code>BTC_2017_08</code>
      <span className="chain">Bitcoin</span>
      <span className="version">2017 August Update</span>
      <span className="tag live">Live</span>
    </span>
  )
};

interface TemplateSettingsProps {
  name: string;
  description: string;
  supportedVirtualMachines: AuthenticationVirtualMachineIdentifier[];
}

interface TemplateSettingsDispatch {
  updateTemplateName: typeof ActionCreators.updateTemplateName;
  updateTemplateDescription: typeof ActionCreators.updateTemplateDescription;
  updateTemplateSupportedVM: typeof ActionCreators.updateTemplateSupportedVM;
  resetTemplate: typeof ActionCreators.resetTemplate;
  importExport: typeof ActionCreators.importExport;
  showWelcomePane: typeof ActionCreators.showWelcomePane;
}

export const TemplateSettings = connect(
  (state: AppState) => ({
    name: state.currentTemplate.name,
    description: state.currentTemplate.description,
    supportedVirtualMachines: state.currentTemplate.supportedVirtualMachines
  }),
  {
    updateTemplateName: ActionCreators.updateTemplateName,
    updateTemplateDescription: ActionCreators.updateTemplateDescription,
    updateTemplateSupportedVM: ActionCreators.updateTemplateSupportedVM,
    resetTemplate: ActionCreators.resetTemplate,
    importExport: ActionCreators.importExport,
    showWelcomePane: ActionCreators.showWelcomePane
  }
)((props: TemplateSettingsProps & TemplateSettingsDispatch) => {
  const [promptDelete, setPromptDelete] = useState(false);
  const [importExportActive, setImportExportActive] = useState(false);
  return (
    <div className="TemplateSettings EditorPane">
      <h2>Authentication Template Settings</h2>
      <div className="EditorPaneContents template-settings">
        <h3 className="name">
          <EditableText
            maxLength={100}
            placeholder="Template Name"
            selectAllOnFocus={true}
            value={props.name}
            onChange={name => props.updateTemplateName(name)}
          />
        </h3>
        <div className="description">
          <EditableText
            maxLength={1000}
            minLines={3}
            multiline={true}
            placeholder="A brief description of this authentication template..."
            selectAllOnFocus={true}
            value={props.description}
            onChange={description =>
              props.updateTemplateDescription(description)
            }
          />
        </div>
        <div className="divider" />
        <FormGroup
          label={
            <span className="supported-vms-label">
              <h4>Supported Virtual Machines</h4>
              <p>
                Here you can edit the list of Virtual Machines that this
                authentication template supports.
              </p>
              <p>
                Bitcoin VMs vary in subtle but critical ways. While many
                templates will be usable across all VMs, each template must be
                reviewed for compatibility.
              </p>
            </span>
          }
          inline={true}
        >
          <div>
            {Object.entries(availableVms).map(([id, label]) => {
              const vm = id as IDESupportedVM;
              const enabled = props.supportedVirtualMachines.indexOf(vm) !== -1;
              return (
                <Checkbox
                  checked={enabled}
                  key={id}
                  labelElement={label}
                  value={id}
                  onChange={_ => {
                    props.updateTemplateSupportedVM(vm, !enabled);
                  }}
                />
              );
            })}
          </div>
        </FormGroup>
        <div className="divider" />
        <Button className="import-button" onClick={() => props.importExport()}>
          <Icon icon={IconNames.CHANGES} iconSize={10} />
          Import/Export Template...
        </Button>
        <Button
          className="delete-item-button"
          onClick={() => setPromptDelete(true)}
        >
          <Icon icon={IconNames.TRASH} iconSize={10} />
          Reset Template...
        </Button>
        <Alert
          cancelButtonText="Cancel"
          confirmButtonText="Reset Project"
          intent={Intent.DANGER}
          isOpen={promptDelete}
          canEscapeKeyCancel={true}
          canOutsideClickCancel={true}
          onCancel={() => setPromptDelete(false)}
          onConfirm={() => {
            props.resetTemplate();
            setPromptDelete(false);
            props.showWelcomePane();
          }}
        >
          <p>
            Are you sure you want to delete this entire project and start with a
            new authentication template?
          </p>
          <p>This cannot be undone.</p>
        </Alert>
      </div>
    </div>
  );
});
