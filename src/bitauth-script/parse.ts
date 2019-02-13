import AuthenticationScriptParser from 'parse-atl';

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
