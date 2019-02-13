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
  entitiesById: {
    owner: {
      name: 'Jason',
      description: '',
      scriptIds: [],
      variableIds: ['my']
    }
  },
  variablesById: {
    my: {
      type: 'Key',
      id: 'my'
    }
  },
  scriptsById: {
    1: {
      name: '1. BitAuth Script',
      type: 'isolated',
      script: `// Let's talk about BitAuth Script 🚀

OP_1`
    },
    2: {
      name: '2. Basics',
      type: 'isolated',
      script:
        '// Let\'s talk about BitAuth Script 🚀\n\nOP_1\n\nOP_DROP\n\n/**\n * You can <push> anything:\n */\n\n<1>          // Push a literal 1\n\nOP_DROP\n\n<0xabcdef>   // Push a hex literal\n\nOP_DROP\n\n<OP_1>       // Push the code for OP_1\n\nOP_DROP\n\n<"abc 👍">      // UTF8 string literals work too\n'
    },
    3: {
      name: '3. Simple Math',
      type: 'isolated',
      script: `<1> <2> OP_ADD`
    },
    4: {
      name: '4. First Validation',
      type: 'locking',
      script: `<2>
OP_ADD
<3> OP_EQUAL`,
      isP2SH: false,
      childIds: ['_4']
    },
    _4: {
      name: 'Just a 1',
      type: 'unlocking',
      script: `<1>`,
      parentId: '4'
    },
    5: {
      name: '5. Checking a Hash',
      type: 'locking',
      script: `OP_HASH160

<$(
    <1>
    OP_HASH160
)>

OP_EQUAL`,
      isP2SH: false,
      childIds: ['_5']
    },
    _5: {
      name: 'Still Just a 1',
      type: 'unlocking',
      script: `<1>`,
      parentId: '5'
    },

    6: {
      name: '6. Checking a Signature',
      type: 'locking',
      script: `<my.public_key>
OP_CHECKSIG`,
      isP2SH: false,
      childIds: ['_6']
    },
    _6: {
      name: 'A Real Example',
      type: 'unlocking',
      script: `<my.signature_all>`,
      parentId: '6'
    },
    7: {
      name: '7. Conditionals',
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
