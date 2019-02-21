import {
  AppState,
  IDETemplateLockingScript,
  IDETemplateTestedScript,
  IDETemplateTestSetupScript,
  IDETemplateIsolatedScript,
  IDETemplateEntity,
  IDETemplateScript,
  IDETemplateUnlockingScript,
  IDETemplateTestCheckScript
} from '../../../state/types';
import {
  AuthenticationTemplateScript,
  AuthenticationTemplate,
  AuthenticationTemplateScriptTest,
  AuthenticationTemplateVariable
} from 'bitcoin-ts/build/main/lib/auth/templates/types';
import { createInsecureUuidV4 } from '../../../state/utils';

const extractPattern = (string: string, pattern: RegExp) => {
  const result = pattern.exec(string);
  return result ? result[1] : false;
};

const extractRedeemScript = (lockingScript: string) =>
  extractPattern(
    lockingScript,
    /^\s*OP_HASH160\s*<\s*\$\(\s*<\s*([\s\S]*)\s>\s*OP_HASH160\s*\)\s*>\s*OP_EQUAL\s*$/
  );

const extractUnlockingScriptFromUnlockingP2SH = (
  unlocks: string,
  unlockingScript: string
) =>
  extractPattern(
    unlockingScript,
    new RegExp(`^([\\s\\S]*\\S)\\s*<\\s*${unlocks}\\.redeem_script\\s*>\\s*$`)
  );

const buildLockingScriptForP2SH = (redeemScriptId: string) =>
  `OP_HASH160 <$(<${redeemScriptId}> OP_HASH160)> OP_EQUAL`;

const buildUnlockingScriptForP2SH = (
  redeemScriptId: string,
  strippedUnlockingScript: string
) => `${strippedUnlockingScript} <${redeemScriptId}>`;

/**
 * TODO: attempt to extract all P2SH scripts (which don't follow our
 *  `magicSuffix` convention) from imports.
 */
const extractP2sh = (
  lockingScriptId: string,
  lockingScript: string,
  unlockingScript: string
) => {
  const redeemScript = extractRedeemScript(lockingScript);
  const trimmedUnlock = extractUnlockingScriptFromUnlockingP2SH(
    lockingScriptId,
    unlockingScript
  );
  return redeemScript && trimmedUnlock
    ? { unlockingScript: trimmedUnlock, lockingScript: redeemScript }
    : false;
};

const extractTemplateScripts = (
  ideTemplate: AppState['currentTemplate']
): AuthenticationTemplateScript[] => {
  // first assemble all the locking scripts, save both the redeem_script and the true locking script
  const p2shLockingScripts = Object.values(
    ideTemplate.scriptsByInternalId
  ).filter(
    script => script.type === 'locking' && script.isP2SH
  ) as IDETemplateLockingScript[];
  const lockingAndUnlockingScripts = p2shLockingScripts.reduce<
    AuthenticationTemplateScript[]
  >((scripts, p2shLockingScript) => {
    const redeemScriptId = `${p2shLockingScript.id}.redeem_script`;
    const unlockingScripts = p2shLockingScript.childInternalIds
      .map(internalId => ideTemplate.scriptsByInternalId[internalId])
      .map(ideScript => ({
        id: ideScript.id,
        name: ideScript.name,
        script: buildUnlockingScriptForP2SH(redeemScriptId, ideScript.script),
        unlocks: p2shLockingScript.id
      }));
    return [
      ...scripts,
      {
        id: p2shLockingScript.id,
        name: p2shLockingScript.name,
        script: buildLockingScriptForP2SH(redeemScriptId)
      },
      {
        id: redeemScriptId,
        name: `${p2shLockingScript.name} Redeem Script`,
        script: p2shLockingScript.script
      },
      ...unlockingScripts
    ];
  }, []);
  const testedScripts = (Object.values(ideTemplate.scriptsByInternalId).filter(
    script => script.type === 'tested'
  ) as IDETemplateTestedScript[]).reduce<AuthenticationTemplateScript[]>(
    (scripts, testedScript) => {
      return [
        ...scripts,
        {
          id: testedScript.id,
          name: testedScript.name,
          script: testedScript.name,
          tests: testedScript.childInternalIds.map(internalId => {
            const testSetup = ideTemplate.scriptsByInternalId[
              internalId
            ] as IDETemplateTestSetupScript;
            const testCheck =
              ideTemplate.scriptsByInternalId[testSetup.testCheckInternalId];
            return {
              name: testSetup.name,
              setup: testSetup.script,
              check: testCheck.script
            };
          })
        }
      ];
    },
    []
  );
  const isolatedScripts = (Object.values(
    ideTemplate.scriptsByInternalId
  ).filter(
    script => script.type === 'isolated'
  ) as IDETemplateIsolatedScript[]).map<AuthenticationTemplateScript>(
    script => ({
      id: script.id,
      name: script.name,
      script: script.script
    })
  );
  return [
    ...lockingAndUnlockingScripts,
    ...testedScripts,
    ...isolatedScripts
  ].sort((a, b) => a.id.localeCompare(b.id));
};

export const extractTemplate = (
  currentTemplate: AppState['currentTemplate']
): AuthenticationTemplate => {
  return {
    description: currentTemplate.description,
    name: currentTemplate.name,
    entities: Object.values(currentTemplate.entitiesByInternalId)
      .map(ideEntity => ({
        id: ideEntity.id,
        name: ideEntity.name,
        description: ideEntity.description,
        scripts: ideEntity.usesAllScripts
          ? Object.values(currentTemplate.scriptsByInternalId).map(
              ideScript => ideScript.id
            )
          : ideEntity.scriptInternalIds.map(
              internalId => currentTemplate.scriptsByInternalId[internalId].id
            ),
        variables: ideEntity.variableInternalIds.map(
          internalId => currentTemplate.variablesByInternalId[internalId]
        )
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    scripts: extractTemplateScripts(currentTemplate),
    supported: currentTemplate.supportedVirtualMachines.sort((a, b) =>
      a.localeCompare(b)
    ),
    version: 1
  };
};

export const importAuthenticationTemplate = (
  template: Partial<AuthenticationTemplate>
): AppState['currentTemplate'] | string => {
  if (!template) {
    return 'No authentication template provided.';
  }
  if (template.version !== 1) {
    return 'Only version 1 authentication templates are currently supported.';
  }
  if (template.name !== undefined && typeof template.name !== 'string') {
    return `If provided, the 'name' property must be a string.`;
  }
  if (
    template.description !== undefined &&
    typeof template.description !== 'string'
  ) {
    return `If provided, the 'description' property must be a string.`;
  }
  if (!Array.isArray(template.entities)) {
    return `The 'entities' property must be an array.`;
  }
  if (!Array.isArray(template.scripts)) {
    return `The 'scripts' property must be an array.`;
  }
  if (!Array.isArray(template.supported)) {
    return `The 'supported' property must be an array.`;
  }

  const scriptIdUsage = template.scripts.reduce(
    (map, script) => ({
      ...map,
      [script.id]: map[script.id] === undefined ? 0 : map[script.id]
    }),
    {}
  );

  if (Object.values(scriptIdUsage).some(val => val > 1)) {
    return `Encountered non-unique script ID: ${Object.entries(scriptIdUsage)
      .filter(([id, val]) => val > 1)
      .join(', ')}`;
  }

  // try to detect our internal `.redeem_script` convention:
  const magicSuffix = '.redeem_script';
  const candidateRedeemScripts = template.scripts.filter(
    script => script.id.indexOf(magicSuffix) !== -1
  );
  const matchedLockingScripts = template.scripts.filter(script =>
    candidateRedeemScripts.some(candidate => {
      return (
        candidate.id.substring(0, candidate.id.length - magicSuffix.length) ===
        script.id
      );
    })
  );
  const templateScripts = template.scripts;
  const p2shScripts = matchedLockingScripts.reduce<IDETemplateScript[]>(
    (scripts, script) => {
      const lockingId = createInsecureUuidV4();
      const children = templateScripts
        .filter(s => s.unlocks === script.id)
        .map<IDETemplateUnlockingScript>(unlocking => ({
          type: 'unlocking',
          id: unlocking.id,
          internalId: createInsecureUuidV4(),
          name: unlocking.name || 'Unnamed',
          parentInternalId: lockingId,
          script: unlocking.script || ''
        }));
      const locking: IDETemplateLockingScript = {
        type: 'locking',
        id: script.id,
        name: script.name || 'Unnamed',
        script: templateScripts.find(s => s.id === `${script.id}${magicSuffix}`)
          .script,
        childInternalIds: children.map(c => c.internalId),
        internalId: createInsecureUuidV4(),
        isP2SH: true
      };
      return [...scripts, locking, ...children];
    },
    []
  );

  const otherScripts = templateScripts.filter(
    script =>
      !p2shScripts.some(
        existing =>
          existing.id === script.id ||
          (existing.type === 'locking' &&
            existing.isP2SH &&
            `${existing.id}${magicSuffix}` === script.id)
      )
  );

  const isolatedAndTestedScripts = otherScripts.reduce<IDETemplateScript[]>(
    (scripts, script) => {
      const parentInternalId = createInsecureUuidV4();
      if (Array.isArray(script.tests)) {
        const testScripts = (script.tests as Array<
          AuthenticationTemplateScriptTest
        >).reduce<(IDETemplateTestSetupScript | IDETemplateTestCheckScript)[]>(
          (tScripts, test) => {
            const setupId = createInsecureUuidV4();
            const checkId = createInsecureUuidV4();
            const setup: IDETemplateTestSetupScript = {
              type: 'test-setup',
              id: '',
              internalId: setupId,
              name: test.name || 'Unnamed',
              parentInternalId,
              script: test.setup || '',
              testCheckInternalId: checkId
            };
            const check: IDETemplateTestCheckScript = {
              type: 'test-check',
              id: '',
              internalId: checkId,
              name: '',
              script: test.check || '',
              testSetupInternalId: setupId
            };
            return [...tScripts, setup, check];
          },
          []
        );
        const tested: IDETemplateTestedScript = {
          type: 'tested',
          childInternalIds: testScripts
            .filter(s => s.type === 'test-setup')
            .map(s => s.internalId),
          internalId: parentInternalId,
          id: script.id,
          script: script.script || '',
          name: script.name || 'Unnamed'
        };
        return [...scripts, tested, ...testScripts];
      }
      const isolated: IDETemplateIsolatedScript = {
        type: 'isolated',
        id: script.id,
        script: script.script || '',
        internalId: parentInternalId,
        name: script.name || 'Unnamed'
      };
      return [...scripts, isolated];
    },
    []
  );

  const allIDEScripts = [...p2shScripts, ...isolatedAndTestedScripts];

  const entities = template.entities.map(entity => {
    const variables = !Array.isArray(entity.variables)
      ? []
      : (entity.variables as AuthenticationTemplateVariable[]).map<
          [string, AuthenticationTemplateVariable]
        >((config: any) => [createInsecureUuidV4(), config]);
    const ideEntity: IDETemplateEntity = {
      id: entity.id,
      internalId: createInsecureUuidV4(),
      name: entity.name || 'Unnamed',
      description: entity.description || '',
      scriptInternalIds: Array.isArray(entity.scripts)
        ? entity.scripts.map((id: string) => {
            const script = allIDEScripts.find(script => script.id === id);
            return (script && script.internalId) || undefined;
          })
        : [], // TODO:
      usesAllScripts: false,
      variableInternalIds: variables.map(([internalId]) => internalId)
    };
    return {
      ideEntity,
      variables
    };
  });

  // TODO: check contents of variables to confirm they're properly-formed

  return {
    name: template.name || '',
    description: template.description || '',
    entitiesByInternalId: entities
      .map(({ ideEntity }) => ideEntity)
      .reduce<{
        [internalId: string]: IDETemplateEntity;
      }>((byId, entity) => ({ ...byId, [entity.internalId]: entity }), {}),
    scriptsByInternalId: allIDEScripts.reduce<{
      [internalId: string]: IDETemplateScript;
    }>((scripts, script) => ({ ...scripts, [script.internalId]: script }), {}),
    supportedVirtualMachines: template.supported || [],
    variablesByInternalId: entities
      .map(({ variables }) => variables)
      .flat()
      .reduce(
        (variables, [internalId, variable]) => ({
          ...variables,
          [internalId]: variable
        }),
        {}
      )
  };
};
