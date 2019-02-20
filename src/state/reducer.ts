import {
  ImmerReducer,
  createReducerFunction,
  createActionCreators,
  setPrefix
} from 'immer-reducer';
import {
  AppState,
  IDEMode,
  IDELoadedVMsAndCrypto,
  ActiveDialog,
  BaseScriptType,
  IDETemplateLockingScript,
  IDETemplateIsolatedScript,
  IDETemplateTestedScript
} from './types';
import { editor } from 'monaco-editor';
import { defaultState } from './defaults';
import { unknownValue } from '../utils';
import { createInsecureUuidV4 } from './utils';
import { AuthenticationTemplateVariable } from 'bitcoin-ts/build/main/lib/auth/templates/types';

class App extends ImmerReducer<AppState> {
  setIDEMode(mode: IDEMode) {
    this.draftState.ideMode = mode;
  }
  loadVMsAndCrypto({ vms, crypto }: IDELoadedVMsAndCrypto) {
    this.draftState.authenticationVirtualMachines = vms;
    this.draftState.crypto = crypto;
  }
  openTemplateSettings() {
    this.draftState.currentEditingMode = 'template-settings';
  }
  newEntity() {
    this.draftState.activeDialog = ActiveDialog.newEntity;
  }
  createEntity({
    internalId,
    name,
    id
  }: {
    internalId: string;
    name: string;
    id: string;
  }) {
    this.draftState.currentTemplate.entitiesByInternalId[internalId] = {
      internalId,
      id,
      name,
      description: '',
      scriptInternalIds: [],
      usesAllScripts: true,
      variableInternalIds: []
    };
    this.draftState.currentEditingMode = 'entity';
    this.draftState.currentlyEditingInternalId = internalId;
  }
  activateEntity(internalId: string) {
    this.draftState.currentEditingMode = 'entity';
    this.draftState.currentlyEditingInternalId = internalId;
  }
  updateEntityName(internalId: string, name: string) {
    this.draftState.currentTemplate.entitiesByInternalId[
      internalId
    ].name = name;
  }
  updateEntityDescription(internalId: string, description: string) {
    this.draftState.currentTemplate.entitiesByInternalId[
      internalId
    ].description = description;
  }
  updateEntityId(internalId: string, id: string) {
    this.draftState.currentTemplate.entitiesByInternalId[internalId].id = id;
  }
  updateEntityScriptUsage(internalId: string, usesAllScripts: boolean) {
    this.draftState.currentTemplate.entitiesByInternalId[
      internalId
    ].usesAllScripts = usesAllScripts;
  }
  updateEntityScripts(
    internalId: string,
    changes: { [scriptInternalId: string]: boolean }
  ) {
    const previousValues = this.draftState.currentTemplate.entitiesByInternalId[
      internalId
    ].scriptInternalIds.reduce(
      (map, internalId) => ({
        ...map,
        [internalId]: true
      }),
      {} as { [internalId: string]: boolean }
    );
    const merged = { ...previousValues, ...changes };
    const result = Object.keys(merged).filter(internalId => merged[internalId]);
    this.draftState.currentTemplate.entitiesByInternalId[
      internalId
    ].scriptInternalIds = result;
  }
  deleteEntity(internalId: string) {
    const variables = this.draftState.currentTemplate.entitiesByInternalId[
      internalId
    ].variableInternalIds;
    variables.map(variableInternalId => {
      delete this.draftState.currentTemplate.variablesByInternalId[
        variableInternalId
      ];
    });
    delete this.draftState.currentTemplate.entitiesByInternalId[internalId];
    this.draftState.currentlyEditingInternalId = undefined;
  }
  upsertVariable({
    owningEntityInternalId,
    internalId,
    name,
    description,
    id,
    type,
    mock
  }: {
    owningEntityInternalId: string;
    internalId?: string;
    name: string;
    description: string;
    id: string;
    mock: string;
    type: AuthenticationTemplateVariable['type'];
  }) {
    const variableInternalId = internalId || createInsecureUuidV4();
    const variable =
      this.draftState.currentTemplate.variablesByInternalId[
        variableInternalId
      ] || {};
    variable.name = name;
    variable.description = description;
    variable.id = id;
    variable.type = type;
    variable.mock = mock;
    this.draftState.currentTemplate.variablesByInternalId[
      variableInternalId
    ] = variable;
    const target = this.draftState.currentTemplate.entitiesByInternalId[
      owningEntityInternalId
    ].variableInternalIds;
    if (target.indexOf(variableInternalId) === -1) {
      target.push(variableInternalId);
    }
  }
  deleteVariable(internalId: string) {
    const entities = Object.keys(
      this.draftState.currentTemplate.entitiesByInternalId
    );
    entities.map(entityInternalId => {
      const variables = this.draftState.currentTemplate.entitiesByInternalId[
        entityInternalId
      ].variableInternalIds;
      this.draftState.currentTemplate.entitiesByInternalId[
        entityInternalId
      ].variableInternalIds = variables.filter(
        variableInternalId => variableInternalId !== internalId
      );
    });
    delete this.draftState.currentTemplate.variablesByInternalId[internalId];
  }
  updateScript({
    event,
    internalId: internalId,
    script
  }: {
    event: editor.IModelContentChangedEvent;
    internalId: string;
    script: string;
  }) {
    this.draftState.currentTemplate.scriptsByInternalId[
      internalId
    ].script = script;
  }
  activateScript(internalId: string) {
    this.draftState.currentEditingMode = 'script';
    this.draftState.currentlyEditingInternalId = internalId;
  }
  newScript() {
    this.draftState.activeDialog = ActiveDialog.newScript;
  }
  editScript({
    internalId,
    name,
    id,
    isP2SH
  }: {
    internalId: string;
    name: string;
    id: string;
    isP2SH?: boolean;
  }) {
    this.draftState.currentTemplate.scriptsByInternalId[internalId].name = name;
    this.draftState.currentTemplate.scriptsByInternalId[internalId].id = id;
    if (isP2SH !== undefined) {
      (this.draftState.currentTemplate.scriptsByInternalId[
        internalId
      ] as IDETemplateLockingScript).isP2SH = isP2SH;
    }
  }
  createScript(script: {
    internalId: string;
    id: string;
    name: string;
    type: BaseScriptType;
    parentInternalId?: string;
  }) {
    this.draftState.currentEditingMode = 'script';
    switch (script.type) {
      case 'isolated':
        this.draftState.currentTemplate.scriptsByInternalId[
          script.internalId
        ] = {
          internalId: script.internalId,
          type: script.type,
          script: '',
          id: script.id,
          name: script.name
        };
        this.draftState.currentlyEditingInternalId = script.internalId;
        return;
      case 'locking':
        this.draftState.currentTemplate.scriptsByInternalId[
          script.internalId
        ] = {
          internalId: script.internalId,
          type: script.type,
          script: '',
          id: script.id,
          name: script.name,
          childInternalIds: [],
          isP2SH: true
        };
        this.draftState.currentlyEditingInternalId = undefined;
        return;
      case 'unlocking':
        const lockingInternalId = script.parentInternalId as string;
        this.draftState.currentTemplate.scriptsByInternalId[
          script.internalId
        ] = {
          internalId: script.internalId,
          type: script.type,
          script: '',
          id: script.id,
          name: script.name,
          parentInternalId: lockingInternalId
        };
        const lock = this.draftState.currentTemplate.scriptsByInternalId[
          lockingInternalId
        ] as IDETemplateLockingScript;
        lock.childInternalIds.push(script.internalId);
        this.draftState.currentlyEditingInternalId = script.internalId;
        return;
      case 'test-setup':
        const testSetupInternalId = script.internalId;
        const checkInternalId = createInsecureUuidV4();
        const parentInternalId = script.parentInternalId as string;
        this.draftState.currentlyEditingInternalId = script.internalId;
        this.draftState.currentTemplate.scriptsByInternalId[checkInternalId] = {
          type: 'test-check',
          script: '',
          id: `${script.id}_check`,
          internalId: checkInternalId,
          name: '',
          testSetupInternalId
        };
        this.draftState.currentTemplate.scriptsByInternalId[
          testSetupInternalId
        ] = {
          type: script.type,
          script: '',
          id: script.id,
          internalId: testSetupInternalId,
          name: script.name,
          parentInternalId,
          testCheckInternalId: checkInternalId
        };
        const parent = this.draftState.currentTemplate.scriptsByInternalId[
          parentInternalId
        ] as IDETemplateIsolatedScript | IDETemplateTestedScript;
        if (parent.type === 'tested') {
          parent.childInternalIds.push(testSetupInternalId);
        } else {
          const cast = (parent as unknown) as IDETemplateTestedScript;
          cast.type = 'tested';
          cast.childInternalIds = [testSetupInternalId];
        }
        return;
      default:
        unknownValue(script.type);
    }
  }
  deleteScript(internalId: string) {
    const deleteTarget = this.draftState.currentTemplate.scriptsByInternalId[
      internalId
    ];
    const deleteInternalIds = [
      internalId,
      ...(deleteTarget.type === 'locking' || deleteTarget.type === 'tested'
        ? deleteTarget.childInternalIds
        : deleteTarget.type === 'test-setup'
        ? [deleteTarget.testCheckInternalId]
        : [])
    ];
    deleteInternalIds.map(scriptInternalId => {
      delete this.draftState.currentTemplate.scriptsByInternalId[
        scriptInternalId
      ];
    });

    const entities = Object.keys(
      this.draftState.currentTemplate.entitiesByInternalId
    );
    entities.map(entityInternalId => {
      const referencedScriptInternalIds = this.draftState.currentTemplate
        .entitiesByInternalId[entityInternalId].scriptInternalIds;
      this.draftState.currentTemplate.entitiesByInternalId[
        entityInternalId
      ].scriptInternalIds = referencedScriptInternalIds.filter(
        iId => deleteInternalIds.indexOf(iId) === -1
      );
    });
    this.draftState.currentlyEditingInternalId = undefined;
  }
  closeDialog() {
    this.draftState.activeDialog = ActiveDialog.none;
  }
  changeTemplate(template: AppState['currentTemplate']) {
    this.draftState.currentTemplate = template;
    this.draftState.currentlyEditingInternalId = undefined;
    this.draftState.currentEditingMode = undefined;
  }
}

setPrefix('BITAUTH_IDE');
export const rootReducer = createReducerFunction(App, defaultState);
export const ActionCreators = createActionCreators(App);
