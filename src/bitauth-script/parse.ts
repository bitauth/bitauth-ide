import * as P from 'parsimmon';

/**
 * TODO: @types/parsimmon provides a good option for fully typing this parser.
 * It's not in use because of some early hacks, but it would be good to switch
 * over to using it (rather than the set of interfaces added below).
 */
const AuthenticationScriptParser = P.createLanguage({
  script: r =>
    P.seqMap(
      P.regexp(/[\s]*/),
      r.expression.sepBy(P.regexp(/[\s]+/)).node('Script'),
      P.regexp(/[\s]*/),
      (_, expressions) => expressions
    ),
  expression: r =>
    P.alt(
      r.comment,
      r.push,
      r.evaluation,
      r.utf8,
      r.hex,
      r.bigint,
      r.identifier
    ),
  comment: r =>
    P.alt(r.singleLineComment, r.multiLineComment)
      .desc('a comment')
      .node('Comment'),
  singleLineComment: r =>
    P.seqMap(P.string('//'), P.regexp(/[^\n]*/), P.string('\n'), (_, comment) =>
      comment.trim()
    ),
  multiLineComment: r =>
    P.seqMap(
      P.string('/*'),
      P.regexp(/[\s\S]*(?=\*\/)/),
      P.string('*/'),
      (_, comment) => comment.trim()
    ),
  push: r =>
    P.seqMap(P.string('<'), r.script, P.string('>'), (_, push) => push)
      .desc('a push expression')
      .node('Push'),
  evaluation: r =>
    P.seqMap(
      P.string('$('),
      r.script,
      P.string(')'),
      (_, evaluation) => evaluation
    )
      .desc('an evaluation expression')
      .node('Evaluation'),
  identifier: r =>
    P.regexp(/[a-zA-Z_][\.a-zA-Z0-9_-]*/)
      .desc('a valid identifier')
      .node('Identifier'),
  utf8: r =>
    P.alt(
      P.seqMap(
        P.string('"'),
        P.regexp(/[^"]*/),
        P.string('"'),
        (_, literal) => literal
      ),
      P.seqMap(
        P.string("'"),
        P.regexp(/[^']*/),
        P.string("'"),
        (_, literal) => literal
      )
    )
      .desc('a UTF8 literal')
      .node('UTF8Literal'),
  hex: r =>
    P.seqMap(
      P.string('0x'),
      P.regexp(/(?:[0-9a-f]{2})+/i).desc('a valid hexadecimal string'),
      (_, literal) => literal
    )
      .desc('a hexadecimal literal')
      .node('HexLiteral'),
  bigint: r =>
    P.regexp(/[0-9]+/)
      .desc('an integer')
      .map(value => BigInt(value))
      .desc('an integer literal')
      .node('BigIntLiteral')
});

export interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}

export interface MarkedNode {
  start: SourcePosition;
  end: SourcePosition;
}

type StringSegmentType =
  | 'Comment'
  | 'Identifier'
  | 'UTF8Literal'
  | 'HexLiteral';

type RecursiveSegmentType = 'Push' | 'Evaluation';

interface BitAuthProgramSegment extends MarkedNode {
  name: string;
}

interface BitAuthStringSegment extends BitAuthProgramSegment {
  name: StringSegmentType;
  value: string;
}

interface BitAuthBigIntSegment extends BitAuthProgramSegment {
  name: 'BigIntLiteral';
  value: bigint;
}

interface BitAuthRecursiveSegment extends BitAuthProgramSegment {
  name: RecursiveSegmentType;
  value: BitAuthScriptSegment;
}

export interface BitAuthScriptSegment extends BitAuthProgramSegment {
  name: 'Script';
  value: (
    | BitAuthRecursiveSegment
    | BitAuthBigIntSegment
    | BitAuthStringSegment)[];
}

export type ParseResult =
  | { status: false; expected: string[]; index: SourcePosition }
  | { status: true; value: BitAuthScriptSegment };

export const parseBitAuthScript = (script: string): ParseResult =>
  AuthenticationScriptParser.script.parse(script);
