import { ResolvedScript } from './resolve';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';

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
        if (segment.variable) {
          return [
            ...variables,
            { variable: segment.variable, bytecode: segment.value }
          ];
        }
      default:
        return variables;
    }
  }, []);
