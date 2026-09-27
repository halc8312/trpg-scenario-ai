import { trpgScenarioFlow } from '@/data/scenario-flow'
import { FlowContext } from '@/lib/flow/flow-engine'
import { TRPGScenario } from '@/lib/types'

/** Resume from an explicit checkpoint, including errors saved by older versions. */
export function getScenarioResumePlan(scenario: TRPGScenario) {
  const steps = trpgScenarioFlow.steps
  const legacyStep = scenario.lastError?.match(/Flow execution failed at step ([a-z-]+):/)?.[1]
  const savedStep = scenario.generationStep ?? legacyStep
  let index = steps.findIndex(step => step.id === savedStep)
  if (index < 0) {
    // Older interrupted generations have no checkpoint. Keep a complete prefix.
    const present = [
      !!scenario.overview && !!scenario.truth,
      scenario.npcs.length > 0,
      scenario.locations.length > 0 && scenario.clues.length > 0,
      scenario.scenes.length > 0,
      scenario.endings.length > 0 && !!scenario.gmGuide
    ]
    index = present.findIndex(value => !value)
    if (index < 0) index = 5 // Validate completed content without regenerating it.
  }
  // A saved checkpoint cannot skip missing prerequisites.
  for (let i = 0; i < index; i++) {
    if (steps[i].output.some(key => (scenario as unknown as Record<string, unknown>)[key] === undefined)) {
      index = i
      break
    }
  }
  const context: FlowContext = { request: scenario.request }
  for (const step of steps.slice(0, index)) {
    for (const key of step.output) context[key] = (scenario as unknown as Record<string, unknown>)[key]
  }
  return { startStepId: steps[index].id, completedStepIds: steps.slice(0, index).map(step => step.id), context }
}

/** Clear generated sections only when explicitly starting a new whole generation. */
export function freshGenerationPatch(): Partial<TRPGScenario> {
  return {
    overview: undefined, truth: undefined, npcs: [], locations: [], clues: [], scenes: [], endings: [],
    gmGuide: undefined, validation: undefined, generationStep: trpgScenarioFlow.steps[0].id,
    status: 'generating', lastError: undefined, generationJobId: undefined
  }
}
