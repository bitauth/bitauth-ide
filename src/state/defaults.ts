import { AppState, ActiveDialog } from './types';
import { IDEMode } from './types';
import { AuthenticationVirtualMachineIdentifier } from 'bitcoin-ts/build/main/lib/auth/templates/types';

export const supportedVirtualMachines: AuthenticationVirtualMachineIdentifier[] = [
  'BCH_2019_05',
  'BCH_2019_11',
  'BSV_2018_11',
  'BTC_2017_08'
];

const defaultNewTemplate: AppState['currentTemplate'] = {
  name: '2-of-2 with Business Continuity',
  description:
    'A 2-of-2 wallet, which after a specified delay, can be recovered by either of the original two keys and a signature from a trusted user (e.g. an attorney).\nThis scheme is described in more detail in BIP-65.',
  supportedVirtualMachines,
  entitiesByInternalId: {
    '1586fd21-998b-4107-b617-e6cf10743c87': {
      name: 'Signer 1',
      id: 'signer_1',
      internalId: '1586fd21-998b-4107-b617-e6cf10743c87',
      description:
        'One of the two co-owners of this wallet. If Signer 1 is unable to sign, Signer 2 and Trusted Party can recover funds after 30 days.',
      usesAllScripts: true,
      scriptInternalIds: [],
      variableInternalIds: [
        'ef11bc39-1f0e-4229-bedf-657b94a35d83',
        '06b4ba26-7fc4-4818-9ae5-15e2d81c08c5',
        'beb0a8ed-acef-4922-81a9-8dfb72755fdb'
      ]
    },
    '3d0c5824-be9f-4c4a-9191-bcdbb324588f': {
      name: 'Signer 2',
      id: 'signer_2',
      internalId: '3d0c5824-be9f-4c4a-9191-bcdbb324588f',
      description:
        'One of the two co-owners of this wallet. If Signer 2 is unable to sign, Signer 1 and Trusted Party can recover funds after 30 days.',
      usesAllScripts: true,
      scriptInternalIds: [],
      variableInternalIds: ['3553e5bb-f523-41a3-ad15-b69388b4795a']
    },
    '6d53b584-21a5-45de-9f7e-94c4088598a1': {
      name: 'Trusted Party',
      id: 'trusted_party',
      internalId: '6d53b584-21a5-45de-9f7e-94c4088598a1',
      description:
        "A trusted party, like a lawyer or trusted employee. If either Signer is unable to sign, after 30 days, Trusted Party can help to recover funds by co-signing on that Signer's behalf.",
      usesAllScripts: true,
      scriptInternalIds: [],
      variableInternalIds: ['70649ebd-960d-4183-9c53-5ef5d358e2a2']
    }
  },
  variablesByInternalId: {
    'ef11bc39-1f0e-4229-bedf-657b94a35d83': {
      id: 'first',
      // derivationHardened: false,
      // derivationIndex: 0,
      // type: 'HDKey',
      type: 'Key',
      mock: '1111111111111111111111111111111111111111111111111111111111111111',
      name: "Signer 1's HDKey",
      description: ''
    },
    '06b4ba26-7fc4-4818-9ae5-15e2d81c08c5': {
      id: 'block_time',
      type: 'CurrentBlockTime',
      description: '',
      mock: '',
      name: ''
    },
    'beb0a8ed-acef-4922-81a9-8dfb72755fdb': {
      id: 'delay_seconds',
      description:
        'The waiting period (from the time the wallet is created) after which the Trusted Party can assist with delayed recoveries. The delay is measured in seconds, e.g. 1 day is 86400. Here we set the delay to 30 days (2592000).',
      name: 'Recovery Delay (Seconds)',
      type: 'WalletData',
      mock: '2592000'
    },
    '3553e5bb-f523-41a3-ad15-b69388b4795a': {
      id: 'second',
      // derivationHardened: false,
      // derivationIndex: 0,
      // type: 'HDKey',
      type: 'Key',
      mock: '1111111111111111111111111111111111111111111111111111111111111112',
      name: "Signer 2's HDKey",
      description: ''
    },
    '70649ebd-960d-4183-9c53-5ef5d358e2a2': {
      id: 'trusted',
      // derivationHardened: false,
      // derivationIndex: 0,
      // type: 'HDKey',
      type: 'Key',
      mock: '1111111111111111111111111111111111111111111111111111111111111113',
      name: "Trusted Party's HDKey",
      description: ''
    }
  },
  scriptsByInternalId: {
    //     '6d53b584-21a5-45de-9f7e-94c4088598a1': {
    //       type: 'isolated',
    //       id: 'checksum',
    //       internalId: '6d53b584-21a5-45de-9f7e-94c4088598a1',
    //       name: 'Create Safety Number',
    //       script: `
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
    // `
    //     },
    'b1331918-8ac8-460e-8243-3a8c3ca2d856': {
      type: 'locking',
      id: 'lock',
      internalId: 'b1331918-8ac8-460e-8243-3a8c3ca2d856',
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
      childInternalIds: [
        '92064a05-d097-4f11-92ba-119ccb686a58',
        '000bf50d-7f30-4811-971b-cbe7f983363d',
        '21222d0a-6120-4628-8901-0237e1745036'
      ]
    },
    '92064a05-d097-4f11-92ba-119ccb686a58': {
      type: 'unlocking',
      id: 'spend',
      internalId: '92064a05-d097-4f11-92ba-119ccb686a58',
      name: 'Standard Spend',
      script:
        '<0>\n<first.signature.all_outputs>\n<second.signature.all_outputs>\n<0>',
      parentInternalId: 'b1331918-8ac8-460e-8243-3a8c3ca2d856'
    },
    '000bf50d-7f30-4811-971b-cbe7f983363d': {
      type: 'unlocking',
      id: 'recover_1',
      internalId: '000bf50d-7f30-4811-971b-cbe7f983363d',
      name: 'Recover – Signer 1',
      script:
        '<0>\n<first.signature.all_outputs>\n<trusted.signature.all_outputs>\n<1>',
      parentInternalId: 'b1331918-8ac8-460e-8243-3a8c3ca2d856'
    },
    '21222d0a-6120-4628-8901-0237e1745036': {
      type: 'unlocking',
      id: 'recover_2',
      internalId: '21222d0a-6120-4628-8901-0237e1745036',
      name: 'Recover – Signer 2',
      script:
        '<0>\n<second.signature.all_outputs>\n<trusted.signature.all_outputs>\n<1>',
      parentInternalId: 'b1331918-8ac8-460e-8243-3a8c3ca2d856'
    }
  }
};

export const defaultState: AppState = {
  ideMode: IDEMode.editor,
  currentlyEditingInternalId: '000bf50d-7f30-4811-971b-cbe7f983363d',
  currentEditingMode: 'script',
  // TODO: from local storage
  savedTemplates: [],
  currentTemplate: defaultNewTemplate,
  currentVmId: 'BCH_2019_05',
  authenticationVirtualMachines: null,
  crypto: null,
  // compilationData: defaultVariableData,
  activeDialog: ActiveDialog.none
};
