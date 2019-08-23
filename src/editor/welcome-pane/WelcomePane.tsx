import React, { useState } from 'react';
import './WelcomePane.scss';
import {
  EditableText,
  FormGroup,
  Button,
  Icon,
  Intent,
  Alert,
  Checkbox
} from '@blueprintjs/core';
import { AppState, IDETemplate } from '../../state/types';
import { connect } from 'react-redux';
import { IconNames } from '@blueprintjs/icons';
import { ActionCreators } from '../../state/reducer';
import single from '../../templates/single-sig.json';
import multi from '../../templates/2-of-3-template.json';
import continuity from '../../templates/2-of-2-continuity.json';
import zcf from '../../templates/zcf.json';
import { importAuthenticationTemplate } from '../dialogs/import-export-dialog/import-export';
import { AuthenticationTemplate, stringify } from 'bitcoin-ts';

const isValidTemplate = (result: IDETemplate | string): result is IDETemplate =>
  typeof result !== 'string';
const assertValidTemplate = (result: IDETemplate | string) => {
  if (!isValidTemplate(result)) {
    throw `Default template is invalid: ${result}`;
  }
  return result;
};

const defaultTemplates = {
  single: assertValidTemplate(
    importAuthenticationTemplate(single as AuthenticationTemplate)
  ),
  // multi: assertValidTemplate(
  //   importAuthenticationTemplate(multi as AuthenticationTemplate)
  // ),
  continuity: assertValidTemplate(
    importAuthenticationTemplate(continuity as AuthenticationTemplate)
  ),
  zcf: assertValidTemplate(
    importAuthenticationTemplate(zcf as AuthenticationTemplate)
  )
};

interface WelcomePaneDispatch {
  resetTemplate: typeof ActionCreators.resetTemplate;
  importTemplate: typeof ActionCreators.importTemplate;
  openTemplateSettings: typeof ActionCreators.openTemplateSettings;
}

const templateIconSize = 12;

export const WelcomePane = connect(
  (state: AppState) => ({}),
  {
    resetTemplate: ActionCreators.resetTemplate,
    importTemplate: ActionCreators.importTemplate,
    openTemplateSettings: ActionCreators.openTemplateSettings
  }
)((props: WelcomePaneDispatch) => {
  return (
    <div className="WelcomePane EditorPane">
      <div className="EditorPaneContents">
        <div className="welcome-box">
          <h3 className="instructions">Choose a template to begin</h3>
          <div
            className="starter-template"
            onClick={() => {
              props.importTemplate(defaultTemplates.single);
              props.openTemplateSettings();
            }}
          >
            <h4>
              <Icon icon={IconNames.PERSON} iconSize={templateIconSize} />
              Single Signature (P2PKH) &rarr;
            </h4>
            <p>Transactions are signed by only a single key.</p>
          </div>
          {/* <div
            className="starter-template"
            onClick={() => {
              // props.importTemplate(defaultTemplates.multi);
              props.openTemplateSettings();
            }}
          >
            <h4>
              <Icon icon={IconNames.PEOPLE} iconSize={templateIconSize} />
              2-of-3 Multi-Signature &rarr;
            </h4>
            <p>Transactions require any two of three co-owners to sign.</p>
          </div> */}
          <div
            className="starter-template"
            onClick={() => {
              props.importTemplate(defaultTemplates.continuity);
              props.openTemplateSettings();
            }}
          >
            <h4>
              <Icon icon={IconNames.TIME} iconSize={templateIconSize} />
              2-of-2 with Business Continuity &rarr;
            </h4>
            <p>
              Transactions require either both co-owners to sign, or after a
              delay, one co-owner and another trusted party.
            </p>
          </div>
          {/* <div
            className="starter-template"
            onClick={() => {
              // props.importTemplate(defaultTemplates.tree);
              props.openTemplateSettings();
            }}
          >
            <h4>
              <Icon icon={IconNames.DIAGRAM_TREE} iconSize={templateIconSize} />
              1-of-8 Tree Signature &rarr;
            </h4>
            <p>
              Transactions require any of 8 signers, without requiring the
              public revelation of the other 7 signers' public keys.
            </p>
          </div> */}
          {/* <div
            className="starter-template"
            onClick={() => {
              props.importTemplate(defaultTemplates.zcf);
              props.openTemplateSettings();
            }}
          >
            <h4>
              <Icon icon={IconNames.OFFLINE} iconSize={templateIconSize} />
              Zero-Confirmation Forfeit (ZCF) &rarr;
            </h4>
            <p>
              A single-signature wallet with a public bounty – if the owner
              attempts to double-spend, the bounty is forfeited to a miner.
            </p>
          </div> */}
          <div
            className="starter-template"
            onClick={() => {
              props.resetTemplate();
              props.openTemplateSettings();
            }}
          >
            <h4>
              <Icon icon={IconNames.CLEAN} iconSize={templateIconSize} />
              Empty Template &rarr;
            </h4>
            <p>A blank slate, ready for some creative genius.</p>
          </div>
        </div>
      </div>
    </div>
  );
});
