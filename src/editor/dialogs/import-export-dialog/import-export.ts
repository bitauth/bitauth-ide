import {
  AppState,
  IDETemplateLockingScript,
  IDETemplateTestedScript,
  IDETemplateTestSetupScript,
  IDETemplateIsolatedScript,
  IDETemplateEntity,
  IDETemplateScript,
  IDETemplateUnlockingScript,
  IDETemplateTestCheckScript,
  IDEVariable
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

type ExtractedScript = AuthenticationTemplateScript & { id: string };

const extractTemplateScripts = (ideTemplate: AppState['currentTemplate']) => {
  // first assemble all the locking scripts, save both the redeem_script and the true locking script
  const p2shLockingScripts = Object.values(
    ideTemplate.scriptsByInternalId
  ).filter(
    script => script.type === 'locking' && script.isP2SH
  ) as IDETemplateLockingScript[];
  const lockingAndUnlockingScripts = p2shLockingScripts.reduce<
    ExtractedScript[]
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
  ) as IDETemplateTestedScript[]).reduce<ExtractedScript[]>(
    (scripts, testedScript) => {
      return [
        ...scripts,
        {
          id: testedScript.id,
          name: testedScript.name,
          script: testedScript.script,
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
  ) as IDETemplateIsolatedScript[]).map<ExtractedScript>(script => ({
    id: script.id,
    name: script.name,
    script: script.script
  }));
  return [...lockingAndUnlockingScripts, ...testedScripts, ...isolatedScripts]
    .sort((a, b) => a.id.localeCompare(b.id))
    .reduce<AuthenticationTemplate['scripts']>(
      (collected, script) => ({
        ...collected,
        [script.id]: {
          ...(script.name ? { name: script.name } : {}),
          script: script.script,
          ...(script.tests ? { tests: script.tests } : {}),
          ...(script.unlocks ? { unlocks: script.unlocks } : {})
        }
      }),
      {}
    );
};

export const extractTemplate = (
  currentTemplate: AppState['currentTemplate']
): AuthenticationTemplate => ({
  description: currentTemplate.description,
  name: currentTemplate.name,
  entities: Object.values(currentTemplate.entitiesByInternalId)
    .sort((a, b) => a.id.localeCompare(b.id))
    .reduce(
      (collected, ideEntity) => ({
        ...collected,
        [ideEntity.id]: {
          name: ideEntity.name,
          description: ideEntity.description,
          scripts: ideEntity.usesAllScripts
            ? Object.values(currentTemplate.scriptsByInternalId).map(
                ideScript => ideScript.id
              )
            : ideEntity.scriptInternalIds.map(
                internalId => currentTemplate.scriptsByInternalId[internalId].id
              ),
          variables: ideEntity.variableInternalIds.reduce((all, internalId) => {
            const variable = currentTemplate.variablesByInternalId[internalId];
            // const id = variable.id;
            // delete variable.id;
            const exported = { ...variable, id: undefined };
            return {
              ...all,
              [variable.id]: exported
            };
          }, {})
        }
      }),
      {}
    ),
  scripts: extractTemplateScripts(currentTemplate),
  supported: currentTemplate.supportedVirtualMachines.sort((a, b) =>
    a.localeCompare(b)
  ),
  version: 0
});

/**
 * TODO: tech debt:
 * This method was original written for a template format with arrays for
 * `entities` and `scripts`. It can probably be majorly simplified.
 */
export const importAuthenticationTemplate = (
  template: Partial<AuthenticationTemplate>
): AppState['currentTemplate'] | string => {
  if (!template) {
    return 'No authentication template provided.';
  }
  if (template.version !== 0) {
    return 'Only version 0 authentication templates are currently supported.';
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
  if (typeof template.entities !== 'object') {
    return `The 'entities' property must be an object.`;
  }
  if (typeof template.scripts !== 'object') {
    return `The 'scripts' property must be an object.`;
  }
  if (!Array.isArray(template.supported)) {
    return `The 'supported' property must be an array.`;
  }

  const scripts = Object.entries(template.scripts).map(([key, value]) => ({
    id: key,
    name: value.name,
    script: value.script,
    tests: value.tests,
    unlocks: value.unlocks
  }));

  const entities = Object.entries(template.entities).map(([key, value]) => ({
    id: key,
    description: value.description,
    name: value.name,
    scripts: value.scripts,
    variables: value.variables
  }));

  // try to detect our internal `.redeem_script` convention:
  const magicSuffix = '.redeem_script';
  const candidateRedeemScripts = scripts.filter(
    script => script.id.indexOf(magicSuffix) !== -1
  );
  const matchedLockingScripts = scripts.filter(script =>
    candidateRedeemScripts.some(candidate => {
      return (
        candidate.id.substring(0, candidate.id.length - magicSuffix.length) ===
        script.id
      );
    })
  );
  const templateScripts = scripts;
  const p2shScripts = matchedLockingScripts.reduce<IDETemplateScript[]>(
    (scripts, script) => {
      const redeemScriptId = `${script.id}${magicSuffix}`;
      const lockingId = createInsecureUuidV4();
      const matchingScript = templateScripts.find(s => s.id === redeemScriptId);
      if (matchingScript === undefined) {
        throw 'Could not find matching locking script.';
      }
      const children = templateScripts
        .filter(s => s.unlocks === script.id)
        .map<IDETemplateUnlockingScript>(unlocking => ({
          type: 'unlocking',
          id: unlocking.id,
          internalId: createInsecureUuidV4(),
          name: unlocking.name || 'Unnamed',
          parentInternalId: lockingId,
          script: unlocking.script
            ? unlocking.script
                .replace(
                  new RegExp(`<\s*${redeemScriptId.replace('.', '\\.')}\s*>`),
                  ''
                )
                .trim()
            : ''
        }));
      const locking: IDETemplateLockingScript = {
        type: 'locking',
        id: script.id,
        name: script.name || 'Unnamed',
        script: matchingScript.script,
        childInternalIds: children.map(c => c.internalId),
        internalId: lockingId,
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
              id: setupId.replace(/-/g, '_'),
              internalId: setupId,
              name: test.name || 'Unnamed',
              parentInternalId,
              script: test.setup || '',
              testCheckInternalId: checkId
            };
            const check: IDETemplateTestCheckScript = {
              type: 'test-check',
              id: checkId.replace(/-/g, '_'),
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

  const templateEntities = entities.map(entity => {
    const variables =
      entity.variables === undefined
        ? []
        : Object.entries(entity.variables).map<[string, IDEVariable]>(
            ([id, variableConfig]) => [
              createInsecureUuidV4(),
              {
                id,
                ...variableConfig
              } as IDEVariable
            ]
          );
    const ideEntity: IDETemplateEntity = {
      id: entity.id,
      internalId: createInsecureUuidV4(),
      name: entity.name || 'Unnamed',
      description: entity.description || '',
      scriptInternalIds: Array.isArray(entity.scripts)
        ? entity.scripts
            .map((id: string) => {
              const script = allIDEScripts.find(script => script.id === id);
              return script ? [script.internalId] : [];
            })
            .flat()
        : [],
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
    entitiesByInternalId: templateEntities
      .map(({ ideEntity }) => ideEntity)
      .reduce<{
        [internalId: string]: IDETemplateEntity;
      }>((byId, entity) => ({ ...byId, [entity.internalId]: entity }), {}),
    scriptsByInternalId: allIDEScripts.reduce<{
      [internalId: string]: IDETemplateScript;
    }>((scripts, script) => ({ ...scripts, [script.internalId]: script }), {}),
    supportedVirtualMachines: template.supported || [],
    variablesByInternalId: templateEntities
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
