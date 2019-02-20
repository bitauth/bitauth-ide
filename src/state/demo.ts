import { AppState } from './types';
import { supportedVirtualMachines } from './defaults';

export const utf8Encoding = `<697475057>

// UTF-8 encoding! 🚀

<'💩'>

OP_ADD

// 👍
`;

export const demoTemplate: AppState['currentTemplate'] = {
  name: 'TABConf Demo',
  description: '',
  entitiesByInternalId: {
    '647017d8-7508-45e9-a10a-2d9ee49793ad': {
      name: 'Jason',
      id: 'owner',
      internalId: '647017d8-7508-45e9-a10a-2d9ee49793ad',
      description: '',
      usesAllScripts: true,
      scriptInternalIds: [],
      variableInternalIds: ['33ce1655-c1e3-42f3-94a7-36a607de040c']
    }
  },
  variablesByInternalId: {
    '33ce1655-c1e3-42f3-94a7-36a607de040c': {
      type: 'Key',
      id: 'my',
      description: '',
      mock: '1111111111111111111111111111111111111111111111111111111111111112',
      name: "Jason's Key"
    }
  },
  scriptsByInternalId: {
    'df7d48b3-bd0d-4c0c-81c3-691939d14ac8': {
      name: '1. BitAuth Script',
      id: '1',
      internalId: 'df7d48b3-bd0d-4c0c-81c3-691939d14ac8',
      type: 'isolated',
      script: `// Let's talk about BitAuth Script 🚀

OP_1`
    },
    'c8c613f6-981e-45df-9bd3-5e0e3dd6d6ae': {
      name: '2. Basics',
      id: '2',
      internalId: 'c8c613f6-981e-45df-9bd3-5e0e3dd6d6ae',
      type: 'isolated',
      script:
        '// Let\'s talk about BitAuth Script 🚀\n\nOP_1\n\nOP_DROP\n\n/**\n * You can <push> anything:\n */\n\n<1>          // Push a literal 1\n\nOP_DROP\n\n<0xabcdef>   // Push a hex literal\n\nOP_DROP\n\n<OP_1>       // Push the code for OP_1\n\nOP_DROP\n\n<"abc 👍">      // UTF8 string literals work too\n'
    },
    '70d3d271-9aab-4423-857f-65b51ab90808': {
      name: '3. Simple Math',
      id: '3',
      internalId: '70d3d271-9aab-4423-857f-65b51ab90808',
      type: 'isolated',
      script: `<1> <2> OP_ADD`
    },
    '628c8ffc-e9e4-4308-90d5-ac915f6b5f0b': {
      name: '4. First Validation',
      id: '4',
      internalId: '628c8ffc-e9e4-4308-90d5-ac915f6b5f0b',
      type: 'locking',
      script: `<2>
OP_ADD
<3> OP_EQUAL`,
      isP2SH: false,
      childInternalIds: ['c38ff39c-fce1-4264-b7a6-d9927afb80d3']
    },
    'c38ff39c-fce1-4264-b7a6-d9927afb80d3': {
      name: 'Just a 1',
      id: '_4',
      internalId: 'c38ff39c-fce1-4264-b7a6-d9927afb80d3',
      type: 'unlocking',
      script: `<1>`,
      parentInternalId: '628c8ffc-e9e4-4308-90d5-ac915f6b5f0b'
    },
    'e4841426-bda3-4195-adff-4f893a262419': {
      name: '5. Checking a Hash',
      id: '5',
      internalId: 'e4841426-bda3-4195-adff-4f893a262419',
      type: 'locking',
      script: `OP_HASH160

<$(
    <1>
    OP_HASH160
)>

OP_EQUAL`,
      isP2SH: false,
      childInternalIds: ['4e3c8b97-880f-4758-8288-7c6f04371f08']
    },
    '4e3c8b97-880f-4758-8288-7c6f04371f08': {
      name: 'Still Just a 1',
      id: '_5',
      internalId: '4e3c8b97-880f-4758-8288-7c6f04371f08',
      type: 'unlocking',
      script: `<1>`,
      parentInternalId: 'e4841426-bda3-4195-adff-4f893a262419'
    },

    '4723bd42-9d73-4b27-b860-9f9a70a79159': {
      name: '6. Checking a Signature',
      id: '6',
      internalId: '4723bd42-9d73-4b27-b860-9f9a70a79159',
      type: 'locking',
      script: `<my.public_key>
OP_CHECKSIG`,
      isP2SH: false,
      childInternalIds: ['211f02a3-7e06-4b3e-a593-2e895d8747a7']
    },
    '211f02a3-7e06-4b3e-a593-2e895d8747a7': {
      name: 'A Real Example',
      id: '_6',
      internalId: '211f02a3-7e06-4b3e-a593-2e895d8747a7',
      type: 'unlocking',
      script: `<my.signature_all>`,
      parentInternalId: '4723bd42-9d73-4b27-b860-9f9a70a79159'
    },
    '5e5962b3-7805-4478-b79a-557ff8a82d6a': {
      name: '7. Conditionals',
      id: '7',
      internalId: '5e5962b3-7805-4478-b79a-557ff8a82d6a',
      type: 'isolated',
      script: `<0>

OP_IF

<1>

OP_ELSE

<2>

OP_ELSE

<3>

OP_ELSE

<4>

OP_ENDIF`
    }
  },
  supportedVirtualMachines: supportedVirtualMachines
};
