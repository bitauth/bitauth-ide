import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import { ResolvedScript } from 'bitcoin-ts';

export interface MonacoMarkerDataRequired {
  severity: monacoEditor.MarkerSeverity;
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface ResolvedIdentifier {
  identifier: string;
  bytecode: Uint8Array;
}

export const getResolvedIdentifier = (
  compiledScript: ResolvedScript
): ResolvedIdentifier[] =>
  compiledScript.reduce<ResolvedIdentifier[]>((variables, segment) => {
    switch (segment.type) {
      case 'push':
      case 'evaluation':
        return [...variables, ...getResolvedIdentifier(segment.value)];
      case 'bytecode':
        if ('variable' in segment) {
          return [
            ...variables,
            { identifier: segment.variable, bytecode: segment.value }
          ];
        }
        if ('script' in segment) {
          return [
            ...variables,
            { identifier: segment.script, bytecode: segment.value }
          ];
        }
      // eslint-disable-line no-fallthrough
      default:
        return variables;
    }
  }, []);
