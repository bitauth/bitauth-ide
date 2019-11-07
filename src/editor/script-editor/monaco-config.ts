import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { languageBCH } from './bch-language';
import schemaJson from './authentication-template-v0.schema.json';
import { bitauthAuthenticationTemplateSchema } from '../constants';

export const bitauthTemplatingLanguage = 'bitauth-templating-language';
export const bitauthDark = 'bitauth-dark';

export const monacoOptions: Monaco.editor.IEditorConstructionOptions = {
  /**
   * TODO: This is a hack to get things working – we should manually call layout
   *  only when the Mosaic tile is being resized.
   */
  automaticLayout: true,
  cursorBlinking: 'smooth',
  dragAndDrop: true,
  fontFamily: "'Fira Mono', monospace",
  scrollBeyondLastLine: false,
  contextmenu: false,
  minimap: {
    enabled: false
  },
  folding: false,
  wordWrap: 'off', // TODO: identify lines which wrap and match the wrapping in the stack viewer (so we can set this back to `on`)
  wrappingIndent: 'same',
  scrollbar: {
    verticalScrollbarSize: 3
  }
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
    { token: 'opcode.push', foreground: subtleGray },
    { token: 'opcode.push-number', foreground: lightOlive },
    { token: 'opcode.disabled', foreground: red },
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

export const bitauthTemplatingLanguageMonarchLangaugeConfiguration = (
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
      beforeText: /^\s*\/\*\*(?!\/)([^*]|\*(?!\/))*$/,
      afterText: /^\s*\*\/$/,
      action: {
        indentAction: monacoLanguages.IndentAction.IndentOutdent,
        appendText: ' * '
      }
    },
    {
      // e.g. /** ...|
      beforeText: /^\s*\/\*\*(?!\/)([^*]|\*(?!\/))*$/,
      action: {
        indentAction: monacoLanguages.IndentAction.None,
        appendText: ' * '
      }
    },
    {
      // e.g.  * ...|
      beforeText: /^(\t|( {2}))* *( ([^*]|\*(?!\/))*)?$/,
      action: {
        indentAction: monacoLanguages.IndentAction.None,
        appendText: '* '
      }
    },
    {
      // e.g.  */|
      beforeText: /^(\t|( {2}))* \*\/\s*$/,
      action: {
        indentAction: monacoLanguages.IndentAction.None,
        removeText: 1
      }
    }
  ]
});

export const bitauthTemplatingLanguageMonarchLanguage = {
  // defaultToken: 'invalid', // set to 'invalid' to debug tokenization problems
  tokenPostfix: '.bitauth',
  brackets: [
    { open: '$(', close: ')', token: 'delimiter.evaluation' },
    { open: '<', close: '>', token: 'delimiter.push' }
  ],
  flowControlOpcodes: languageBCH.flowControlOpcodes,
  signatureCheckingOpcodes: languageBCH.signatureCheckingOpcodes,
  blockingOpcodes: languageBCH.blockingOpcodes,
  pushBytesOpcodes: languageBCH.pushBytesOpcodes,
  pushNumberOpcodes: languageBCH.pushNumberOpcodes,
  disabledOpcodes: [
    ...languageBCH.disabledOpcodes,
    ...languageBCH.unknownOpcodes,
    ...languageBCH.nopOpcodes
  ],
  otherOpcodes: languageBCH.otherOpcodes,
  bigint: /\d+(_+\d+)*/,
  hex: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
  tokenizer: {
    root: [
      [/0[xX](@hex)/, 'literal.hex'], // HexLiteral
      [/(@bigint)/, 'literal.bigint'], // BigIntLiteral
      [
        /[a-zA-Z_][.a-zA-Z0-9_-]+/,
        {
          cases: {
            '@flowControlOpcodes': 'opcode.flow-control',
            '@signatureCheckingOpcodes': 'opcode.signature',
            '@blockingOpcodes': 'opcode.blocking',
            '@pushBytesOpcodes': 'opcode.push',
            '@pushNumberOpcodes': 'opcode.push-number',
            '@disabledOpcodes': 'opcode.disabled',
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
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment']
    ],
    string_double: [[/[^"$]+/, 'string'], [/"/, 'string', '@pop']],
    string_single: [[/[^'$]+/, 'string'], [/'/, 'string', '@pop']]
  }
} as Monaco.languages.IMonarchLanguage;

export const registerBitauthTemplatingLanguage = (monaco: typeof Monaco) => {
  monaco.languages.register({ id: bitauthTemplatingLanguage });
  monaco.languages.setMonarchTokensProvider(
    bitauthTemplatingLanguage,
    bitauthTemplatingLanguageMonarchLanguage
  );
  monaco.languages.setLanguageConfiguration(
    bitauthTemplatingLanguage,
    bitauthTemplatingLanguageMonarchLangaugeConfiguration(monaco.languages)
  );
  monaco.editor.defineTheme(bitauthDark, bitauthDarkMonarchTheme);
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [
      {
        uri: bitauthAuthenticationTemplateSchema,
        schema: schemaJson
      }
    ]
  });
};

export const prepMonaco = (monaco: typeof Monaco) => {
  if (monaco.languages.getLanguages().length < 3) {
    registerBitauthTemplatingLanguage(monaco);
  }
};
