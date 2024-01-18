import './WelcomePane.css';
import { ideImportWalletTemplate } from '../../state/import-export';
import { ActionCreators } from '../../state/reducer';
import { IDETemplate } from '../../state/types';
import recoverable from '../../templates/2-of-2-recoverable.json';
import multi from '../../templates/2-of-3.json';
import { createInsecureUuidV4 } from '../../utils';

import { WalletTemplate, walletTemplateP2pkh } from '@bitauth/libauth';
import { Clean, People, Person, Repeat, Time } from '@blueprintjs/icons';
import { connect } from 'react-redux';

const isValidTemplate = (result: IDETemplate | string): result is IDETemplate =>
  typeof result !== 'string';
const assertValidTemplate = (result: IDETemplate | string) => {
  /* istanbul ignore next */
  if (!isValidTemplate(result)) {
    throw new Error(`Default template is invalid: ${result}`);
  }
  return result;
};

const defaultTemplates = {
  single: assertValidTemplate(ideImportWalletTemplate(walletTemplateP2pkh)),
  multi: assertValidTemplate(ideImportWalletTemplate(multi as WalletTemplate)),
  recoverable: assertValidTemplate(
    ideImportWalletTemplate(recoverable as WalletTemplate),
  ),
};

type WelcomePaneDispatch = {
  importExport: typeof ActionCreators.importExport;
  importTemplate: typeof ActionCreators.importTemplate;
  openTemplateSettings: typeof ActionCreators.openTemplateSettings;
  resetTemplate: typeof ActionCreators.resetTemplate;
  createScript: typeof ActionCreators.createScript;
};

const iconSize = 12;

export const WelcomePane = connect(() => ({}), {
  importExport: ActionCreators.importExport,
  importTemplate: ActionCreators.importTemplate,
  openTemplateSettings: ActionCreators.openTemplateSettings,
  resetTemplate: ActionCreators.resetTemplate,
  createScript: ActionCreators.createScript,
})((props: WelcomePaneDispatch) => (
  <div className="WelcomePane EditorPane">
    <div className="EditorPaneContents">
      <div className="welcome-box">
        <h3 className="instructions">Choose a template to begin</h3>
        <button
          className="starter-template"
          onClick={() => {
            props.importTemplate(defaultTemplates.single);
            props.openTemplateSettings();
          }}
        >
          <h4>
            <Person size={iconSize} />
            Single Signature (P2PKH) &rarr;
          </h4>
          <p>Transactions are signed by only a single key.</p>
        </button>
        <button
          className="starter-template"
          onClick={() => {
            props.importTemplate(defaultTemplates.multi);
            props.openTemplateSettings();
          }}
        >
          <h4>
            <People size={iconSize} />
            2-of-3 Multi-Signature &rarr;
          </h4>
          <p>Transactions require any two of three co-owners to sign.</p>
        </button>
        <button
          className="starter-template"
          onClick={() => {
            props.importTemplate(defaultTemplates.recoverable);
            props.openTemplateSettings();
          }}
        >
          <h4>
            <Time size={iconSize} />
            2-of-2 Recoverable Vault &rarr;
          </h4>
          <p>
            Transactions require either both co-owners to sign, or after a
            delay, one co-owner and another trusted party.
          </p>
        </button>
        {/* <div
            className="starter-template"
            onClick={() => {
              // props.importTemplate(defaultTemplates.tree);
              props.openTemplateSettings();
            }}
          >
            <h4>
              <DiagramTree size={iconSize} />
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
              <Offline size={iconSize} />
              Zero-Confirmation Escrow (ZCE) &rarr;
            </h4>
            <p>
              A single-signature wallet with a public bounty – if the owner
              attempts to double-spend, the bounty is forfeited to a miner.
            </p>
          </div> */}
        <button
          className="starter-template"
          onClick={() => {
            props.resetTemplate();
            props.createScript({
              name: 'Scratch Pad',
              id: 'scratch_pad',
              internalId: createInsecureUuidV4(),
              type: 'isolated',
              contents: `/**
* This simple template makes it easy to experiment 
* with most opcodes.
* 
* Note, this script is evaluated as a locking script.
* To work with keys and signatures, add an unlocking
* script and key variables, or try starting from
* another template.
*/

<'hello'> <'🌎'>
OP_CAT
OP_HASH160
<0xfec6d89ec9eb8665b1fd48c9e7ff2aa2aaf2a200>
OP_EQUAL
<2>
OP_ADD`,
            });
          }}
        >
          <h4>
            <Clean size={iconSize} />
            Scratch Pad &rarr;
          </h4>
          <p>A blank slate, ready for some creative genius.</p>
        </button>
        <button
          className="starter-template"
          onClick={() => {
            props.resetTemplate();
            props.importExport();
          }}
        >
          <h4>
            <Repeat size={iconSize} />
            Import or Restore Template &rarr;
          </h4>
          <p>Import or restore a template from a previous session.</p>
        </button>
      </div>
    </div>
  </div>
));
