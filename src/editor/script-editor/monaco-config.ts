// import * as monacoEditor, { editor, languages } from 'monaco-editor/esm/vs/editor/editor.api';
import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';

export const bitauthScript = 'bitauth-script';
export const bitauthDark = 'bitauth-dark';

// TODO: enable and disable 'renderLineHighlight' based on editor focus? (it's a little strange to have 2-3 lines highlighted in the editor at the same time)
export const monacoOptions: Monaco.editor.IEditorConstructionOptions = {
  automaticLayout: true,
  cursorBlinking: 'smooth',
  dragAndDrop: true,
  fontFamily: "'Fira Mono', monospace",
  scrollBeyondLastLine: false,
  contextmenu: false,
  minimap: {
    enabled: false
  },
  wordWrap: 'on',
  wrappingIndent: 'same'
};

const vibrantYellow = 'FFD700';
const subtleGray = '666677';
const salmon = 'D68D72';
const lightBlue = '8ADDFF';
const blue = '3C9DDA';
const fuchsia = 'D081C4';
const oak = 'd9daa2';
const red = 'FF0000';
const lightOlive = 'B5CEA8';
const darkOlive = '5BB498';

export const bitauthDarkMonarchTheme: Monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'delimiter.evaluation', foreground: vibrantYellow },
    { token: 'delimiter.push', foreground: subtleGray },
    { token: 'opcode.signature', foreground: fuchsia },
    { token: 'opcode.flow-control', foreground: salmon },
    { token: 'opcode.blocking', foreground: oak },
    { token: 'opcode.other', foreground: blue },
    { token: 'identifier', foreground: lightBlue },
    { token: 'literal.bigint', foreground: lightOlive },
    { token: 'literal.hex', foreground: darkOlive },
    { token: 'invalid', foreground: red }
  ],
  colors: {
    // "editorCursor.foreground": "#586677",
    // "editor.lineHighlightBackground": "#f9fcff",
    'editor.background': '#1D2023'
  }
};

export const bitauthScriptHoverProvider: Monaco.languages.HoverProvider = {
  provideHover: (model, position) => {
    const query = model.getWordAtPosition(position);

    // TODO: bitauth script hover provider
    if (query !== null) {
      switch (query.word) {
        case 'OP_0':
          return Promise.resolve({
            contents: [
              { value: '**OP_0**' },
              { value: 'Push the Script Number `0` onto the stack.' }
            ]
          });
        case 'OP_1':
          return Promise.resolve({
            contents: [
              { value: '**OP_1**' },
              { value: 'Push the Script Number `1` onto the stack.' }
            ]
          });
        case 'OP_DROP':
          return Promise.resolve({
            contents: [
              { value: '**OP_DROP**' },
              { value: 'Pop the top element from the stack and discard it.' }
            ]
          });
        case 'OP_ADD':
          return Promise.resolve({
            contents: [
              { value: '**OP_ADD**' },
              {
                value:
                  'Pop the top two elements off the stack as Script Numbers. Add them, then push the result.'
              }
            ]
          });
        case 'OP_CHECKSIG':
          return Promise.resolve({
            contents: [
              { value: '**OP_CHECKSIG**' },
              {
                value:
                  'Pop the top two elements off the stack. Treat the first as a public key and the second as a signature. If the signature is valid, push a Script Number 1, otherwise push a Script Number 0.'
              }
            ]
          });
        case 'OP_CHECKMULTISIG':
          return Promise.resolve({
            contents: [
              { value: '**OP_CHECKMULTISIG**' },
              {
                value:
                  'Pop elements off the stack: first pop the Script Number of public keys, then pop each of those public keys. Next, pop the Script Number of required signatures, then pop each of those signatures. Finally, pop a final Script Number which must be 0 due to a protocol bug. Checking each signature against each public key in order, if all signatures are valid – and the required number of signatures have been provided – push a Script Number 1, otherwise push a Script Number 0.'
              }
            ]
          });
        case 'OP_HASH160':
          return Promise.resolve({
            contents: [
              { value: '**OP_HASH160**' },
              {
                value:
                  'Pop the top element off the stack and pass it through sha256, then ripemd160, pushing the result onto the stack.'
              }
            ]
          });
        case 'OP_VERIFY':
          return Promise.resolve({
            contents: [
              { value: '**OP_VERIFY**' },
              {
                value:
                  'Pop the top element from the stack and error if it isn\'t "truthy".'
              }
            ]
          });
        case 'OP_EQUAL':
          return Promise.resolve({
            contents: [
              { value: '**OP_EQUAL**' },
              {
                value:
                  'Pop the top two elements off the stack and compare them byte-by-byte. If they are the same, push a Script Number 1, otherwise push a Script Number 0.'
              }
            ]
          });
      }
    }
  }
};

export const bitauthScriptMonarchLangaugeConfiguration = (
  monacoLanguages: typeof Monaco.languages
): Monaco.languages.LanguageConfiguration => ({
  autoClosingPairs: [
    { open: '<', close: '>' },
    { open: '$(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
    { open: '/**', close: ' */', notIn: ['string'] },
    { open: 'OP_IF', close: ' OP_ENDIF', notIn: ['string', 'comment'] },
    { open: 'OP_NOTIF', close: ' OP_ENDIF', notIn: ['string', 'comment'] }
  ],
  brackets: [['<', '>'], ['$(', ')']],
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/']
  },
  onEnterRules: [
    {
      // e.g. /** | */
      beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
      afterText: /^\s*\*\/$/,
      action: {
        indentAction: monacoLanguages.IndentAction.IndentOutdent,
        appendText: ' * '
      }
    },
    {
      // e.g. /** ...|
      beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
      action: {
        indentAction: monacoLanguages.IndentAction.None,
        appendText: ' * '
      }
    },
    {
      // e.g.  * ...|
      beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
      action: {
        indentAction: monacoLanguages.IndentAction.None,
        appendText: '* '
      }
    },
    {
      // e.g.  */|
      beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
      action: {
        indentAction: monacoLanguages.IndentAction.None,
        removeText: 1
      }
    }
  ]
});

export const bitauthScriptMonarchLanguage = {
  // defaultToken: 'invalid', // set to 'invalid' debug tokenization problems
  tokenPostfix: '.bitauth',
  brackets: [
    { open: '$(', close: ')', token: 'delimiter.evaluation' },
    { open: '<', close: '>', token: 'delimiter.push' }
  ],
  flowControlOpcodes: ['OP_IF', 'OP_NOTIF', 'OP_ENDIF', 'OP_ELSE'],
  signatureOpcodes: ['OP_CHECKSIG', 'OP_CHECKDATASIG'],
  blockingOpcodes: [
    'OP_RETURN',
    'OP_VERIFY',
    'OP_EQUALVERIFY',
    'OP_NUMEQUALVERIFY',
    'OP_CHECKSIGVERIFY',
    'OP_CHECKMULTISIGVERIFY',
    'OP_CHECKLOCKTIMEVERIFY',
    'OP_CHECKSEQUENCEVERIFY'
  ],
  otherOpcodes: [
    'OP_PICK',
    'OP_ADD',
    'OP_DROP',
    'OP_SWAP',
    'OP_EQUAL',
    'OP_HASH160'
  ],
  bigint: /\d+(_+\d+)*/,
  hex: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
  tokenizer: {
    root: [
      [/0[xX](@hex)/, 'literal.hex'], // HexLiteral
      [/(@bigint)/, 'literal.bigint'], // BigIntLiteral
      [
        /[a-zA-Z_][\.a-zA-Z0-9_-]+/,
        {
          cases: {
            '@flowControlOpcodes': 'opcode.flow-control',
            '@signatureOpcodes': 'opcode.signature',
            '@blockingOpcodes': 'opcode.blocking',
            '@otherOpcodes': 'opcode.other',
            '@default': 'identifier'
          }
        }
      ],
      { include: '@whitespace' },
      [/[<>)]|\$\(/, '@brackets'],
      [/"/, 'string', '@string_double'], // UTF8Literal
      [/'/, 'string', '@string_single'] // UTF8Literal
    ],
    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment']
    ],
    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment']
    ],
    string_double: [[/[^"$]+/, 'string'], [/"/, 'string', '@pop']],
    string_single: [[/[^'$]+/, 'string'], [/'/, 'string', '@pop']]
  }
} as Monaco.languages.IMonarchLanguage;

export const registerBitauthScript = (monaco: typeof Monaco) => {
  monaco.languages.register({ id: bitauthScript });
  monaco.languages.setMonarchTokensProvider(
    bitauthScript,
    bitauthScriptMonarchLanguage
  );
  monaco.languages.setLanguageConfiguration(
    bitauthScript,
    bitauthScriptMonarchLangaugeConfiguration(monaco.languages)
  );
  monaco.languages.registerHoverProvider(
    bitauthScript,
    bitauthScriptHoverProvider
  );
  monaco.editor.defineTheme(bitauthDark, bitauthDarkMonarchTheme);
};
