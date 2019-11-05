import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import {
  ResolvedScript,
  ResolvedSegmentBytecode,
  ResolvedSegmentVariableBytecode,
  ResolvedSegmentScriptBytecode
} from 'bitcoin-ts';

export interface MonacoMarkerDataRequired {
  severity: monacoEditor.MarkerSeverity;
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface ResolvedVariable {
  variable: string;
  bytecode: Uint8Array;
}

export const getResolvedVariables = (
  compiledScript: ResolvedScript
): ResolvedVariable[] =>
  compiledScript.reduce<ResolvedVariable[]>((variables, segment) => {
    switch (segment.type) {
      case 'push':
      case 'evaluation':
        return [...variables, ...getResolvedVariables(segment.value)];
      case 'bytecode':
        if ('variable' in segment) {
          return [
            ...variables,
            { variable: segment.variable, bytecode: segment.value }
          ];
        }
      default:
        return variables;
    }
  }, []);
