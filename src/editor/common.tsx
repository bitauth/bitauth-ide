import React from 'react';
import {
  AppState,
  CurrentScripts,
  CurrentEntities,
  CurrentVariables
} from '../state/types';
import { AuthenticationTemplateVariable } from 'bitcoin-ts/build/main/lib/auth/templates/types';
import { IconNames } from '@blueprintjs/icons';
import { unknownValue } from '../utils';
import { Tooltip, Position } from '@blueprintjs/core';

/**
 * RegExp(`[a-zA-Z_][\.a-zA-Z0-9_-]*`)
 */
export const sanitizeId = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/\s/g, '_')
    .replace(/^[^a-zA-Z_]/g, '')
    .replace(/[^\.a-zA-Z0-9_-]/g, '');

export const getCurrentScripts = (state: AppState) =>
  Object.entries(state.currentTemplate.scriptsByInternalId)
    .reduce<CurrentScripts>(
      (prev, [internalId, obj]) => [
        ...prev,
        { internalId, id: obj.id, name: obj.name, type: obj.type }
      ],
      []
    )
    .sort((a, b) => a.name.localeCompare(b.name));

export const getCurrentEntities = (state: AppState) =>
  Object.entries(state.currentTemplate.entitiesByInternalId).reduce<
    CurrentEntities
  >(
    (prev, [internalId, entity]) => [
      ...prev,
      { internalId, name: entity.name, id: entity.id }
    ],
    []
  );

export const getCurrentVariables = (state: AppState) =>
  Object.entries(state.currentTemplate.variablesByInternalId).reduce<
    CurrentVariables
  >(
    (prev, [internalId, variable]) => [
      ...prev,
      { internalId, name: variable.name, id: variable.id }
    ],
    []
  );

export const wrapInterfaceTooltip = (
  content?: JSX.Element,
  tooltipValue?: string
) => (
  <Tooltip
    content={tooltipValue}
    portalClassName="interface-tooltip"
    targetClassName="interface-tooltip-target"
    position={Position.RIGHT}
    boundary="window"
  >
    {content}
  </Tooltip>
);

export const variableIcon = (type: AuthenticationTemplateVariable['type']) => {
  switch (type) {
    case 'CurrentBlockHeight':
      return IconNames.NUMERICAL;
    case 'CurrentBlockTime':
      return IconNames.TIME;
    case 'ExternalOperation':
      return IconNames.CODE_BLOCK;
    case 'HDKey':
      return IconNames.DIAGRAM_TREE;
    case 'Key':
      return IconNames.KEY;
    case 'TransactionData':
      return IconNames.FLOW_LINEAR;
    case 'WalletData':
      return IconNames.FLOW_BRANCH;
    default:
      return unknownValue(type);
  }
};
