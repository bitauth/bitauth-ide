import { AppState, ActiveDialog } from './types';
import { IDEMode } from './types';
import { CompilationData } from '../bitauth-script/resolve';
import { AuthenticationVirtualMachineIdentifier } from 'bitcoin-ts/build/main/lib/auth/templates/types';

// TODO: fetch this from a backend eventually
const latestKnownBlock = 561171;
const latestKnownBlockTimeUTC = 1549166880000; // static for now for determinism
/**
 * bigIntToScriptNumber(BigInt(60 * 60 * 24 * 30))
 */
const thirtyDaysInSeconds = Uint8Array.from([0, 141, 39]);

const privateKeys = {
  first: new Uint8Array(32).fill(1),
  second: new Uint8Array(32).fill(2),
  trusted: new Uint8Array(32).fill(3),

  my: new Uint8Array(32).fill(4)
};

export const supportedVirtualMachines: AuthenticationVirtualMachineIdentifier[] = [
  'BCH_2018_11',
  'BCH_2019_05',
  'BSV_2018_11',
  'BTC_2017_08'
];

const defaultVariableData: CompilationData = {
  keys: {
    /**
     * TODO: Cutting corners here – during development, these should actually be
     * derived from their respective `mock` field in the `AuthenticationTemplate`.
     */
    privateKeys
  },
  walletData: {
    /**
     * TODO: also cutting corners here – in a generalized wallet, this would be provided as a BitAuth Script (i.e. the number as a string: '2592000')
     */
    delay_seconds: thirtyDaysInSeconds
  },
  currentBlockTime: new Date(latestKnownBlockTimeUTC),
  currentBlockHeight: latestKnownBlock
};

const defaultNewTemplate: AppState['currentTemplate'] = {
  name: '2-of-2 with Business Continuity',
  description:
    'A 2-of-2 wallet, which after a specified delay, can be recovered by either of the original two keys and a signature from a trusted user (e.g. an attorney).\nThis scheme is described in more detail in BIP-65.',
  supportedVirtualMachines,
  entitiesById: {
    signer_1: {
      name: 'Signer 1',
      description: '',
      scriptIds: ['checksum', 'spend', 'recover_1'],
      variableIds: ['first', 'block_time', 'delay_seconds']
    },
    signer_2: {
      name: 'Signer 2',
      description: '',
      scriptIds: ['checksum', 'spend', 'recover_2'],
      variableIds: ['second']
    },
    trusted_party: {
      name: 'Trusted Party',
      description: '',
      scriptIds: ['checksum', 'recover_1', 'recover_2'],
      variableIds: ['trusted']
    }
  },
  variablesById: {
    first: {
      id: 'first',
      // derivationHardened: false,
      // derivationIndex: 0,
      // type: 'HDKey',
      type: 'Key',
      mock: '0x01',
      name: "Signer 1's HDKey",
      description: ''
    },
    block_time: {
      id: 'block_time',
      type: 'CurrentBlockTime'
    },
    delay_seconds: {
      id: 'delay_seconds',
      description:
        'The waiting period (from the time the wallet is created) after which the Trusted Party can assist with delayed recoveries. The delay is measured in seconds, e.g. 1 day is `86400`.',
      name: 'Recovery Delay (Seconds)',
      type: 'WalletData'
    },
    second: {
      id: 'second',
      // derivationHardened: false,
      // derivationIndex: 0,
      // type: 'HDKey',
      type: 'Key',
      mock: '0x02',
      name: "Signer 2's HDKey",
      description: ''
    },
    trusted: {
      id: 'trusted',
      // derivationHardened: false,
      // derivationIndex: 0,
      // type: 'HDKey',
      type: 'Key',
      mock: '0x03',
      name: "Trusted Party's HDKey",
      description: ''
    }
  },
  scriptsById: {
    checksum: {
      type: 'isolated',
      name: 'Create Safety Number',
      //       script: `$(
      //   <first.public_key>
      //   OP_SHA256
      //   <second.public_key>
      //   OP_SHA256
      //   <trusted.public_key>
      //   OP_SHA256
      //   OP_CAT
      //   OP_SHA256
      //   OP_CAT
      //   OP_HASH160
      // )`
      script: `
  <first.public_key>
  OP_SHA256
  <second.public_key>
  OP_SHA256
  <trusted.public_key>
  OP_SHA256
  OP_CAT
  OP_SHA256
  OP_CAT
  OP_HASH160
`
    },
    lock: {
      type: 'locking',
      name: '2-of-2 Vault',
      script: `OP_IF
  <$(
    <block_time> <delay_seconds>
    OP_ADD
  )>
  OP_CHECKLOCKTIMEVERIFY OP_DROP
  <trusted.public_key>
  OP_CHECKSIG OP_VERIFY
  <1>
OP_ELSE
  <2>
OP_ENDIF
<first.public_key> <second.public_key> <2>
OP_CHECKMULTISIG`,
      isP2SH: true,
      childIds: ['spend', 'recover_1', 'recover_2']
    },
    spend: {
      type: 'unlocking',
      name: 'Standard Spend',
      script: '<0>\n<first.signature_all>\n<second.signature_all>\n<0>',
      parentId: 'lock'
    },
    recover_1: {
      type: 'unlocking',
      name: 'Recover – Signer 1',
      script: '<0>\n<first.signature_all>\n<trusted.signature_all>\n<1>',
      parentId: 'lock'
    },
    recover_2: {
      type: 'unlocking',
      name: 'Recover – Signer 2',
      script: '<0>\n<second.signature_all>\n<trusted.signature_all>\n<1>',
      parentId: 'lock'
    }
  }
};

export const defaultState: AppState = {
  ideMode: IDEMode.editor,
  currentlyEditingId: 'recover_1',
  currentEditingMode: 'script',
  // TODO: from local storage
  savedTemplates: [],
  currentTemplate: defaultNewTemplate,
  currentVmId: 'BCH_2018_11',
  authenticationVirtualMachines: null,
  crypto: null,
  compilationData: defaultVariableData,
  activeDialog: ActiveDialog.none
};
