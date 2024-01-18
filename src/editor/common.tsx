import {
  AppState,
  CurrentEntities,
  CurrentScenarios,
  CurrentScripts,
  CurrentVariables,
  IDEVariable,
  ScriptType,
} from '../state/types';
import { unknownValue } from '../utils';

import { BuiltInVariables } from '@bitauth/libauth';
import { Tooltip } from '@blueprintjs/core';
import {
  Confirm,
  DiagramTree,
  Document,
  FlowBranch,
  FlowLinear,
  Key,
  Lock,
  Saved,
} from '@blueprintjs/icons';

/**
 * Disallow use of built-in IDs (if found, prefix them with an underscore)
 */
const disallowBuiltInIdentifiers = (id: string) =>
  (
    [
      BuiltInVariables.currentBlockHeight,
      BuiltInVariables.currentBlockTime,
      BuiltInVariables.signingSerialization,
    ] as string[]
  ).includes(id)
    ? `_${id}`
    : id;

/**
 * Convert a name or title into a conventional ID, e.g. `Some Name` -> `some_name`.
 *
 * RegExp(`[a-zA-Z_][.a-zA-Z0-9_-]*`)
 */
export const toConventionalId = (input: string) =>
  disallowBuiltInIdentifiers(
    input
      .toLowerCase()
      .trim()
      .replace(/\s/g, '_')
      .replace(/^[^a-zA-Z_]/g, '')
      .replace(/[^.a-zA-Z0-9_-]/g, ''),
  );

const abbreviationPrefixAndSuffixLength = 12;
export const abbreviateStackItem = (hex: string) =>
  hex.length <= abbreviationPrefixAndSuffixLength * 2
    ? hex
    : `${hex.substring(
        0,
        abbreviationPrefixAndSuffixLength,
      )}\u2026${hex.substring(
        hex.length - abbreviationPrefixAndSuffixLength,
        hex.length,
      )}`;

export const getCurrentScripts = (state: AppState) =>
  Object.entries(state.currentTemplate.scriptsByInternalId)
    .reduce<CurrentScripts>(
      (prev, [internalId, obj]) => [
        ...prev,
        { internalId, id: obj.id, name: obj.name, type: obj.type },
      ],
      [],
    )
    .sort((a, b) => a.name.localeCompare(b.name));

export const getCurrentEntities = (state: AppState) =>
  Object.entries(
    state.currentTemplate.entitiesByInternalId,
  ).reduce<CurrentEntities>(
    (prev, [internalId, entity]) => [
      ...prev,
      { internalId, name: entity.name, id: entity.id },
    ],
    [],
  );

export const getCurrentVariables = (state: AppState) =>
  Object.entries(
    state.currentTemplate.variablesByInternalId,
  ).reduce<CurrentVariables>(
    (prev, [internalId, variable]) => [
      ...prev,
      { internalId, name: variable.name, id: variable.id },
    ],
    [],
  );

export const getCurrentScenarios = (state: AppState) =>
  Object.entries(
    state.currentTemplate.scenariosByInternalId,
  ).reduce<CurrentScenarios>(
    (prev, [internalId, scenario]) => [
      ...prev,
      { internalId, name: scenario.name, id: scenario.id },
    ],
    [],
  );

export const getUsedIds = (state: AppState) => {
  const entities = getCurrentEntities(state).map((entity) => entity.id);
  const scenarios = getCurrentScenarios(state).map((scenario) => scenario.id);
  const scripts = getCurrentScripts(state).map((script) => script.id);
  const variables = getCurrentVariables(state).map((variable) => variable.id);
  return [...entities, ...scenarios, ...scripts, ...variables];
};

export const wrapInterfaceTooltip = (
  content?: JSX.Element,
  tooltipValue?: string,
) => (
  <Tooltip
    content={tooltipValue}
    portalClassName="interface-tooltip"
    position="bottom-left"
    boundary={document.body}
  >
    {content}
  </Tooltip>
);

export const variableIcon = (type: IDEVariable['type']) => {
  switch (type) {
    case 'HdKey':
      return <DiagramTree size={12} />;
    case 'Key':
      return <Key size={12} />;
    case 'AddressData':
      return <FlowLinear size={12} />;
    case 'WalletData':
      return <FlowBranch size={12} />;
    default:
      /* istanbul ignore next */
      return unknownValue(type);
  }
};

const size = 10;
const getIcon = (type: ScriptType) => {
  switch (type) {
    case 'isolated':
      return <Document size={size} />;
    case 'tested':
      return <Saved size={size} />;
    case 'locking':
      return <Lock size={size} />;
    case 'unlocking':
      return <Key size={size} />;
    case 'test-setup':
    case 'test-check':
      return <Confirm size={size} />;
    default:
      /* istanbul ignore next */
      return unknownValue(type);
  }
};

const getScriptTypeName = (type: ScriptType) => {
  switch (type) {
    case 'isolated':
      return 'Isolated Script';
    case 'tested':
      return 'Tested Script';
    case 'locking':
      return 'Locking Script';
    case 'unlocking':
      return 'Unlocking Script';
    case 'test-setup':
      return 'Test Setup Script';
    case 'test-check':
      return 'Test Checking Script';
    default:
      /* istanbul ignore next */
      return unknownValue(type);
  }
};

export const getScriptTooltipIcon = (type: ScriptType) =>
  wrapInterfaceTooltip(getIcon(type), getScriptTypeName(type));
