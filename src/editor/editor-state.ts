import {
  AppState,
  IDETemplateLockingScript,
  IDEActivatableScript,
  IDETemplateTestedScript,
  VariableDetails,
  IDEMode,
  ScenarioDetails,
  ScriptDetails,
} from '../state/types';
import {
  OpcodesBCH,
  createCompiler,
  AuthenticationProgramStateBCH,
  compilerOperationsBCH,
  TransactionContextCommon,
  AnyCompilationEnvironment,
  generateBytecodeMap,
  authenticationTemplateToCompilationEnvironmentVirtualizedTests,
  CompilerDefaults,
  createTransactionContextCommon,
  Input,
  CompilationData,
  createAuthenticationProgramEvaluationCommon,
  extractEvaluationSamplesRecursive,
  CompilationResultSuccess,
  EvaluationSample,
  Scenario,
  extractBytecodeResolutions,
  flattenBinArray,
  encodeDataPush,
  ScriptReductionTraceScriptNode,
} from '@bitauth/libauth';
import {
  StackItemIdentifyFunction,
  ProjectEditorMode,
  IDESupportedProgramState,
  ComputedEditorState,
  ScriptEditorFrame,
  EvaluationViewerLine,
  EvaluationViewerHighlight,
} from './editor-types';
import { exportAuthenticationTemplate } from '../state/import-export';
import { samplesToEvaluationLines } from '../btl-utils/editor-tooling';
import {
  OpcodesBCHTxInt,
  AuthenticationProgramStateBCHTxInt,
} from '../init/txint-vm';

const getVirtualizedUnlockingScriptId = (
  testSetupInternalId: string,
  testedScript: IDETemplateTestedScript
) => {
  const index = testedScript.childInternalIds.indexOf(testSetupInternalId);
  return `${CompilerDefaults.virtualizedTestUnlockingScriptPrefix}${testedScript.id}_${index}`;
};

const getVirtualizedCheckScriptId = (
  testSetupInternalId: string,
  testedScript: IDETemplateTestedScript
) => {
  const index = testedScript.childInternalIds.indexOf(testSetupInternalId);
  return `${CompilerDefaults.virtualizedTestCheckScriptPrefix}${testedScript.id}_${index}`;
};

/**
 * This method lets us pretend that the provided script was wrapped in a push
 * statement while retaining the correct line/column numbers for segments. This
 * allows sample generation to work as expected for "pushed" tested scripts.
 */
const wrapScriptReductionInPush = <ProgramState>(
  node: ScriptReductionTraceScriptNode<ProgramState>
) => {
  const wrappedBytecode = encodeDataPush(node.bytecode);
  return {
    bytecode: wrappedBytecode,
    range: {
      endColumn: node.range.endColumn,
      endLineNumber: node.range.endLineNumber,
      startColumn: 0,
      startLineNumber: 0,
    },
    script: [
      {
        bytecode: wrappedBytecode,
        push: {
          bytecode: node.bytecode,
          range: node.range,
          script: node.script,
        },
        range: {
          endColumn: node.range.endColumn,
          endLineNumber: node.range.endLineNumber,
          startColumn: 0,
          startLineNumber: 0,
        },
      },
    ],
  } as ScriptReductionTraceScriptNode<ProgramState>;
};

export const computeEditorState = <
  ProgramState extends IDESupportedProgramState
>(
  state: AppState
): ComputedEditorState<ProgramState> => {
  const {
    ideMode,
    crypto,
    authenticationVirtualMachines,
    currentEditingMode,
    currentlyEditingInternalId,
    currentScenarioInternalId,
  } = state;
  if (crypto === null || authenticationVirtualMachines === null) {
    return { editorMode: ProjectEditorMode.loading };
  }
  if (ideMode === IDEMode.wallet) {
    return { editorMode: ProjectEditorMode.wallet };
  }
  if (currentEditingMode === 'welcome') {
    return { editorMode: ProjectEditorMode.welcome };
  }
  if (currentEditingMode === 'importing') {
    return { editorMode: ProjectEditorMode.importing };
  }
  if (currentEditingMode === 'template-settings') {
    return { editorMode: ProjectEditorMode.templateSettingsEditor };
  }
  if (currentEditingMode === 'entity') {
    return { editorMode: ProjectEditorMode.entityEditor };
  }
  if (currentlyEditingInternalId === undefined) {
    return { editorMode: ProjectEditorMode.templateSettingsEditor };
  }
  const vm = authenticationVirtualMachines[state.currentVmId];
  const template = exportAuthenticationTemplate(state.currentTemplate);
  const environment = authenticationTemplateToCompilationEnvironmentVirtualizedTests(
    template
  );

  /**
   * Map variable InternalIds to entity InternalIds
   */
  const variableOwnership: {
    [variableInternalId: string]: string;
  } = Object.entries(state.currentTemplate.entitiesByInternalId).reduce(
    (previous, [entityInternalId, content]) =>
      content.variableInternalIds
        .map((variableInternalId) => ({
          [variableInternalId]: entityInternalId,
        }))
        .reduce((done, next) => ({ ...done, ...next }), { ...previous }),
    {}
  );
  const variableDetails: VariableDetails = Object.entries(
    state.currentTemplate.variablesByInternalId
  ).reduce((variables, [internalId, variable]) => {
    const entity =
      state.currentTemplate.entitiesByInternalId[variableOwnership[internalId]];
    return {
      ...variables,
      [variable.id]: {
        variable,
        entity: { name: entity.name, id: entity.id },
      },
    };
  }, {});

  const scriptDetails: ScriptDetails = Object.values(
    state.currentTemplate.scriptsByInternalId
  )
    .filter(
      (ideScript) =>
        ideScript.type !== 'test-setup' && ideScript.type !== 'test-check'
    )
    .reduce(
      (scripts, ideScript) => ({ ...scripts, [ideScript.id]: ideScript }),
      {}
    );

  const templateScenario =
    currentScenarioInternalId === undefined
      ? undefined
      : state.currentTemplate.scenariosByInternalId[currentScenarioInternalId];

  const scenarioId = templateScenario?.id;

  const currentScript = state.currentTemplate.scriptsByInternalId[
    currentlyEditingInternalId
  ] as IDEActivatableScript;

  /**
   * If `true`, the scenario is expected to make this script succeed. If
   * `false`, the scenario is expected to make this script fail. If `undefined`,
   * the default scenario is being used and it's expected to pass for all
   * scripts but isolated scripts (which have no verifiable result).
   */
  const scenarioIsExpectedToPass =
    currentScript.type === 'isolated' || currentScenarioInternalId === undefined
      ? undefined
      : currentScript.passesInternalIds.includes(currentScenarioInternalId)
      ? true
      : currentScript.failsInternalIds.includes(currentScenarioInternalId)
      ? false
      : (() => {
          console.error(
            "Invalid application state: it shouldn't be possible to compile a script with a scenario it doesn't support. There's a problem with the reducer."
          );
          return undefined;
        })();

  /**
   * All available scenarios, sorted by `name`.
   */
  const availableScenarios: ScenarioDetails['availableScenarios'] =
    currentScript.type === 'isolated'
      ? []
      : [...currentScript.passesInternalIds, ...currentScript.failsInternalIds]
          .map(
            (internalId) =>
              state.currentTemplate.scenariosByInternalId[internalId]
          )
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((scenario) => ({
            id: scenario.id,
            name: scenario.name,
            internalId: scenario.internalId,
          }));

  const vmOpcodes =
    state.currentVmId === 'BCH_2022_05_SPEC' ? OpcodesBCHTxInt : OpcodesBCH;

  const compiler = createCompiler<
    TransactionContextCommon,
    AnyCompilationEnvironment<TransactionContextCommon>,
    OpcodesBCH,
    AuthenticationProgramStateBCH
  >({
    ...environment,
    opcodes: generateBytecodeMap(vmOpcodes),
    operations: compilerOperationsBCH,
    ripemd160: crypto.ripemd160,
    secp256k1: crypto.secp256k1,
    sha256: crypto.sha256,
    sha512: crypto.sha512,
    vm,
    createAuthenticationProgram: createAuthenticationProgramEvaluationCommon,
  });

  const {
    editorMode,
    isPushed,
    /** `true` if current script is an unlocking script which unlocks a P2SH
     * locking script. */
    isP2sh,
    /**
     * All `IDEActivatableScript`s have a virtualized "locking script":
     * - unlocking scripts have a real locking script
     * - isolated scripts are treated as a locking script themselves (with an
     * empty unlocking script)
     * - tested scripts are concatenated with their check scripts to create a
     * virtualized "locking script" which should complete in a valid state (a
     * single `1` on the stack, etc.)
     */
    lockingScriptId,
    /**
     * The internal ID of the script being evaluated (in evaluation order)
     */
    scriptEditorEvaluationTrace,
    /**
     * The ID of the active "unlocking script". For unlocking/locking script
     * pairs, the unlocking script's ID. For tested scripts, the ID of the
     * "virtualized" unlocking script. For isolate scripts, `undefined`.
     */
    unlockingScriptId,
  } =
    currentScript.type === 'isolated'
      ? {
          editorMode: ProjectEditorMode.isolatedScriptEditor,
          isPushed: false,
          isP2sh: false,
          lockingScriptId: currentScript.id,
          scriptEditorEvaluationTrace: [currentScript.internalId],
          unlockingScriptId: undefined,
        }
      : currentScript.type === 'unlocking'
      ? {
          editorMode: ProjectEditorMode.scriptPairEditor,
          isPushed: false,
          isP2sh: (state.currentTemplate.scriptsByInternalId[
            currentScript.parentInternalId
          ] as IDETemplateLockingScript).isP2SH,
          lockingScriptId: (state.currentTemplate.scriptsByInternalId[
            currentScript.parentInternalId
          ] as IDETemplateLockingScript).id,
          scriptEditorEvaluationTrace: [
            currentScript.internalId,
            currentScript.parentInternalId,
          ],
          unlockingScriptId: currentScript.id,
        }
      : {
          editorMode: ProjectEditorMode.testedScriptEditor,
          isPushed: (state.currentTemplate.scriptsByInternalId[
            currentScript.parentInternalId
          ] as IDETemplateTestedScript).pushed,
          isP2sh: false,
          lockingScriptId: (state.currentTemplate.scriptsByInternalId[
            currentScript.parentInternalId
          ] as IDETemplateTestedScript).id,
          scriptEditorEvaluationTrace: [
            currentScript.internalId,
            currentScript.parentInternalId,
            currentScript.testCheckInternalId,
          ],
          unlockingScriptId: getVirtualizedUnlockingScriptId(
            currentScript.internalId,
            state.currentTemplate.scriptsByInternalId[
              currentScript.parentInternalId
            ] as IDETemplateTestedScript
          ),
        };

  /**
   * The id of each source script in use.
   */
  const scriptEditorEvaluationSource = scriptEditorEvaluationTrace.map(
    (internalId) => state.currentTemplate.scriptsByInternalId[internalId].script
  );

  const scenario = compiler.generateScenario({ unlockingScriptId, scenarioId });

  const lockingScriptCompilation =
    typeof scenario === 'string'
      ? undefined
      : compiler.generateBytecode(lockingScriptId, scenario.data, true);

  const checkScriptCompilation =
    currentScript.type === 'test-setup' && typeof scenario !== 'string'
      ? compiler.generateBytecode(
          getVirtualizedCheckScriptId(
            currentScript.internalId,
            state.currentTemplate.scriptsByInternalId[
              currentScript.parentInternalId
            ] as IDETemplateTestedScript
          ),
          scenario.data,
          true
        )
      : undefined;

  const dataWithTransactionContext: CompilationData | undefined =
    typeof scenario === 'string'
      ? undefined
      : {
          ...scenario.data,
          transactionContext: createTransactionContextCommon(scenario.program),
        };

  const unlockingScriptCompilation =
    unlockingScriptId === undefined || dataWithTransactionContext === undefined
      ? undefined
      : compiler.generateBytecode(
          unlockingScriptId,
          dataWithTransactionContext,
          true
        );

  /**
   * Evaluations are only attempted if each expected compilation was successful.
   */
  const tryEvaluation =
    lockingScriptCompilation !== undefined &&
    lockingScriptCompilation.success &&
    (checkScriptCompilation === undefined || checkScriptCompilation.success) &&
    (unlockingScriptCompilation === undefined ||
      unlockingScriptCompilation.success);

  /**
   * For isolated scripts, the "virtualized" locking bytecode is just the
   * isolated script. For standard unlocking/locking script pairs, the real
   * locking script is used. For tested scripts, the locking and check scripts
   * are concatenated as if they were both part of the same locking script;
   * also, if the tested script is marked as `pushed`, its result is wrapped in
   * a push operation for testing.
   */
  const virtualizedLockingBytecode =
    lockingScriptCompilation !== undefined && lockingScriptCompilation.success
      ? checkScriptCompilation !== undefined && checkScriptCompilation.success
        ? flattenBinArray([
            isPushed
              ? encodeDataPush(lockingScriptCompilation.bytecode)
              : lockingScriptCompilation.bytecode,
            checkScriptCompilation.bytecode,
          ])
        : lockingScriptCompilation.bytecode
      : /**
         * This should never be used, as a failure in locking script compilation
         * would cause the same failure during `coveredBytecode` generation in
         * unlocking script compilation.
         */
        Uint8Array.of();

  const virtualizedUnlockingBytecode =
    unlockingScriptCompilation === undefined
      ? Uint8Array.of()
      : (unlockingScriptCompilation as CompilationResultSuccess<ProgramState>)
          .bytecode;

  const debugTrace = tryEvaluation
    ? vm.debug({
        inputIndex: (scenario as Scenario).program.inputIndex,
        sourceOutput: {
          lockingBytecode: virtualizedLockingBytecode,
          satoshis: (scenario as Scenario).program.sourceOutput.satoshis,
        },
        spendingTransaction: {
          /**
           * Valid scenarios contain only one `input` with an undefined
           * `unlockingBytecode`. Here we replace that value with our virtualized
           * unlocking bytecode.
           */
          inputs: (scenario as Scenario).program.spendingTransaction.inputs.map<Input>(
            (input) => ({
              outpointIndex: input.outpointIndex,
              outpointTransactionHash: input.outpointTransactionHash,
              sequenceNumber: input.sequenceNumber,
              unlockingBytecode:
                input.unlockingBytecode === undefined
                  ? virtualizedUnlockingBytecode
                  : input.unlockingBytecode,
            })
          ),
          locktime: (scenario as Scenario).program.spendingTransaction.locktime,
          outputs: (scenario as Scenario).program.spendingTransaction.outputs,
          version: (scenario as Scenario).program.spendingTransaction.version,
        },
      })
    : undefined;

  const verifyResult: NonNullable<
    ScenarioDetails['selectedScenario']
  >['verifyResult'] =
    debugTrace === undefined
      ? undefined
      : vm.verify(
          (debugTrace[
            debugTrace.length - 1
          ] as unknown) as AuthenticationProgramStateBCHTxInt &
            AuthenticationProgramStateBCH
        );

  const resolvedIdentifiers = [
    lockingScriptCompilation,
    unlockingScriptCompilation,
  ].reduce<{
    [fullIdentifier: string]: Uint8Array;
  }>(
    (vars, result) =>
      result !== undefined && 'resolve' in result
        ? {
            ...vars,
            ...extractBytecodeResolutions(result.resolve).reduce<{
              [fullIdentifier: string]: Uint8Array;
            }>(
              (all, resolution) =>
                ['variable', 'script', 'UTF8Literal'].includes(resolution.type)
                  ? { ...all, [resolution.text]: resolution.bytecode }
                  : all,
              {}
            ),
          }
        : vars,
    {}
  );

  const bytecodeToIdentifierMap = Object.entries(resolvedIdentifiers).reduce<{
    [stringifiedArray: string]: string;
  }>(
    (all, [identifier, bytecode]) => ({
      ...all,
      [bytecode.toString()]: identifier,
    }),
    {}
  );

  const stackItemIdentifyIgnoreList = ['0', '1'];
  const identifyStackItems: StackItemIdentifyFunction = (item) =>
    (stackItemIdentifyIgnoreList.indexOf(item.toString()) === -1 &&
      bytecodeToIdentifierMap[item.toString()]) ||
    false;

  /**
   * The remaining states from the debug trace which have not yet been matched
   * to samples.
   */
  let remainingStates = debugTrace as ProgramState[] | undefined;

  const scriptEditorFrames = scriptEditorEvaluationTrace.map<
    ScriptEditorFrame<ProgramState>
  >((internalId) => {
    const script = state.currentTemplate.scriptsByInternalId[internalId];
    const { used, compilation } =
      script.type === 'test-setup' || script.type === 'unlocking'
        ? { used: 'unlocking', compilation: unlockingScriptCompilation }
        : script.type === 'test-check'
        ? { used: 'check', compilation: checkScriptCompilation }
        : { used: 'locking', compilation: lockingScriptCompilation };

    let frameSamples: EvaluationSample<ProgramState>[] | undefined;
    let evaluationLines: EvaluationViewerLine<ProgramState>[] | undefined;
    if (tryEvaluation) {
      const successfulCompilation = compilation as CompilationResultSuccess<ProgramState>;
      const lastSourceLine = successfulCompilation.parse.end.line;
      const reduction = successfulCompilation.reduce;
      if (isP2sh && used === 'locking') {
        const p2shStates = 5;
        /**
         * Trim off P2SH states – we don't show that part in the IDE. (It's always
         * the same, and the compiler should never mess it up.)
         */
        remainingStates = (remainingStates as ProgramState[]).slice(p2shStates);
      } else if (script.type === 'isolated') {
        /**
         * Trim off state from virtualized (empty) unlocking script.
         */
        remainingStates = (remainingStates as ProgramState[]).slice(1);
      } else if (script.type === 'test-check' && !isPushed) {
        /**
         * Since the actual locking script and and test-check script are
         * concatenated for evaluation, the "initial state" for the check script
         * is missing, shifting all remaining states back one sample. To avoid
         * this, we simulate the "initial state" by duplicating the first
         * remaining state before extracting samples.
         *
         * However, if a tested script is "pushed" for testing, this effect is
         * offset by the pushed sample, so duplication can be skipped.
         */
        remainingStates =
          remainingStates === undefined || remainingStates.length === 0
            ? []
            : [remainingStates[0], ...remainingStates];
      }
      const nodes =
        isPushed && script.type === 'tested'
          ? wrapScriptReductionInPush(reduction).script
          : reduction.script;
      const evaluationRange = reduction.range;
      const { samples, unmatchedStates } = extractEvaluationSamplesRecursive({
        evaluationRange,
        nodes,
        trace: remainingStates as ProgramState[],
      });
      remainingStates = unmatchedStates;
      frameSamples = samples;
      const linesNeeded = lastSourceLine + 2;
      evaluationLines = samplesToEvaluationLines(samples, linesNeeded);
    }

    const scriptName =
      script.type === 'test-check'
        ? state.currentTemplate.scriptsByInternalId[script.testSetupInternalId]
            .name
        : script.name;

    return {
      compilation,
      samples: frameSamples,
      script: script.script,
      scriptId: script.id,
      scriptInternalId: script.internalId,
      scriptName,
      scriptType: script.type,
      evaluationLines,
      monacoModel: script.monacoModel,
    };
  });

  const lastFrame = scriptEditorFrames[scriptEditorFrames.length - 1];
  if (
    scenarioIsExpectedToPass &&
    verifyResult === true &&
    lastFrame.evaluationLines !== undefined
  ) {
    const lastLineWithState = lastFrame.evaluationLines
      .slice()
      .reverse()
      .find((line) => line.state !== undefined);
    if (lastLineWithState !== undefined) {
      lastLineWithState.highlight = EvaluationViewerHighlight.success;
    }
    // TODO: add highlights, help info for failing scenarios (both expected and unexpected)
  }

  const scenarioDetails: ScenarioDetails = {
    availableScenarios,
    generatedScenario: scenario,
    selectedScenario:
      templateScenario === undefined
        ? undefined
        : {
            description: templateScenario.description,
            /**
             * If templateScenario is defined, we should always know whether the
             * selected scenario is expected to pass.
             */
            expectedToPass: scenarioIsExpectedToPass as boolean,
            id: templateScenario.id,
            name: templateScenario.name,
            verifyResult,
          },
  };

  return {
    editorMode,
    isPushed,
    isP2sh,
    identifyStackItems,
    scenarioDetails,
    scriptDetails,
    scriptEditorEvaluationSource,
    scriptEditorEvaluationTrace,
    scriptEditorFrames,
    variableDetails,
  };
};
