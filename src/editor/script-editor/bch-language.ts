import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { OpcodesBCH, OpcodeDescriptionsBCH, Range } from 'bitcoin-ts';

const opcodeNames = Object.keys(OpcodesBCH).filter(
  key => key.slice(0, 3) === 'OP_'
);

const unknownOpcodes = opcodeNames.filter(
  key => key.slice(0, 10) === 'OP_UNKNOWN'
);

const disabledOpcodes = [
  'OP_RESERVED',
  'OP_VER',
  'OP_VERIF',
  'OP_VERNOTIF',
  'OP_INVERT',
  'OP_RESERVED1',
  'OP_RESERVED2',
  'OP_2MUL',
  'OP_2DIV',
  'OP_MUL',
  'OP_LSHIFT',
  'OP_RSHIFT'
];

const pushBytesOpcodes = opcodeNames
  .filter(key => key.slice(0, 12) === 'OP_PUSHBYTES')
  .concat('OP_PUSHDATA_1', 'OP_PUSHDATA_2', 'OP_PUSHDATA_4');

const pushNumberOpcodes = [
  'OP_1NEGATE',
  'OP_0',
  'OP_1',
  'OP_2',
  'OP_3',
  'OP_4',
  'OP_5',
  'OP_6',
  'OP_7',
  'OP_8',
  'OP_9',
  'OP_10',
  'OP_11',
  'OP_12',
  'OP_13',
  'OP_14',
  'OP_15',
  'OP_16'
];

const nopOpcodes = [
  'OP_NOP',
  'OP_NOP1',
  'OP_NOP4',
  'OP_NOP6',
  'OP_NOP5',
  'OP_NOP7',
  'OP_NOP8',
  'OP_NOP9',
  'OP_NOP10'
];

const flowControlOpcodes = ['OP_IF', 'OP_NOTIF', 'OP_ENDIF', 'OP_ELSE'];
const signatureCheckingOpcodes = [
  'OP_CHECKSIG',
  'OP_CHECKMULTISIG',
  'OP_CHECKDATASIG'
];
const blockingOpcodes = [
  'OP_RETURN',
  'OP_VERIFY',
  'OP_EQUALVERIFY',
  'OP_NUMEQUALVERIFY',
  'OP_CHECKSIGVERIFY',
  'OP_CHECKMULTISIGVERIFY',
  'OP_CHECKLOCKTIMEVERIFY',
  'OP_CHECKSEQUENCEVERIFY',
  'OP_CHECKDATASIGVERIFY'
];

const sortedOpcodes = [
  ...unknownOpcodes,
  ...disabledOpcodes,
  ...pushBytesOpcodes,
  ...pushNumberOpcodes,
  ...nopOpcodes,
  ...flowControlOpcodes,
  ...signatureCheckingOpcodes,
  ...blockingOpcodes
];
const otherOpcodes = opcodeNames.filter(c => sortedOpcodes.indexOf(c) === -1);

export const languageBCH = {
  unknownOpcodes,
  disabledOpcodes,
  pushBytesOpcodes,
  pushNumberOpcodes,
  nopOpcodes,
  flowControlOpcodes,
  signatureCheckingOpcodes,
  blockingOpcodes,
  otherOpcodes
};

/**
 * Format: [description, optionalExampleString]
 * `description` is prose description, `optionalExampleString` is the example
 * string illustrating stack operations.
 */
const descriptions = Object.entries(OpcodeDescriptionsBCH)
  .filter(([key]) => key.slice(0, 3) === 'OP_')
  .reduce<{ [opcode: string]: [string, string?] }>((map, [key, value]) => {
    const parts = value.split('(E.g.');
    const description = parts[0];
    const example = parts[1];
    return {
      ...map,
      [key]:
        example !== undefined
          ? [description, example.slice(0, example.length - 1)]
          : [description]
    };
  }, {});

/**
 * Monaco hover providers are global, so we have to ensure we're
 * looking at the correct script.
 */
export const isCorrectScript = (
  model: Monaco.editor.ITextModel,
  script: string
) => model.getValue() === script;

export const opcodeHoverProviderBCH = (
  script: string
): Monaco.languages.HoverProvider => ({
  provideHover: (model, position) => {
    if (!isCorrectScript(model, script)) {
      return;
    }
    const query = model.getWordAtPosition(position);
    if (query !== null) {
      if (descriptions[query.word] !== undefined) {
        const exampleString = descriptions[query.word][1];
        return {
          contents: [
            { value: `**${query.word}**` },
            ...(exampleString !== undefined ? [{ value: exampleString }] : []),
            { value: descriptions[query.word][0] }
          ]
        };
      }
    }
  }
});

const completableOpcodes = [
  ...flowControlOpcodes,
  ...signatureCheckingOpcodes,
  ...blockingOpcodes,
  ...otherOpcodes
];

const opcodeSuggestions = (range: Range) =>
  completableOpcodes.map<Monaco.languages.CompletionItem>(opcode => ({
    label: opcode,
    detail: descriptions[opcode][1],
    documentation: descriptions[opcode][0],
    kind: Monaco.languages.CompletionItemKind.Function,
    insertText: opcode,
    range
  }));

export const opcodeCompletionItemProviderBCH: Monaco.languages.CompletionItemProvider = {
  triggerCharacters: [''],
  provideCompletionItems: (model, position) => {
    const query = model.getWordAtPosition(position);
    const columns = model.getWordUntilPosition(position);
    const range: Range = {
      startColumn: columns.startColumn,
      endColumn: columns.endColumn,
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber
    };
    const suggestions =
      query !== null &&
      (query.word === 'O' ||
        query.word === 'OP' ||
        query.word.slice(0, 3) === 'OP_')
        ? opcodeSuggestions(range)
        : [];
    return { suggestions };
  }
};
