import { ResolvedScript } from './resolve';

export enum MonacoMarkerSeverity {
  Hint = 1,
  Info = 2,
  Warning = 4,
  Error = 8
}

export interface MonacoMarkerDataRequired {
  severity: MonacoMarkerSeverity;
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
