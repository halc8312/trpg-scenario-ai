import { withNetworkRecovery } from '@/lib/ai/network-recovery'
import { getScenarioResumePlan, freshGenerationPatch } from '@/lib/services/scenario-resume'
import { FlowEngine } from '@/lib/flow/flow-engine'
import { trpgScenarioFlow } from '@/data/scenario-flow'
import { TRPGScenario } from '@/lib/types'

const interrupted = () => ({
  id:'saved',status:'error',request:{premise:'test'},aiSettings:{provider:'deepseek'},
  overview:{title:'Keep title'},truth:{summary:'Keep truth'},npcs:[{id:'npc-original'}],
  locations:[],clues:[],scenes:[],endings:[],
  lastError:'Flow execution failed at step design-locations-clues: TypeError: Load failed'
} as unknown as TRPGScenario)

describe('generation recovery', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true})
    Object.defineProperty(navigator,'onLine',{value:true,configurable:true})
  })
  afterEach(() => { jest.useRealTimers() })
  it('retries a temporary Load failed error without replaying completed flow steps', async () => {
    const call = jest.fn().mockRejectedValueOnce(new TypeError('Load failed')).mockResolvedValue('ok')
    const retry = jest.fn()
    const pending = withNetworkRecovery(call,{onRetry:retry})
    await jest.advanceTimersByTimeAsync(1000)
    await expect(pending).resolves.toBe('ok')
    expect(call).toHaveBeenCalledTimes(2)
    expect(retry).toHaveBeenCalledWith(1)
  })
  it('does not retry API authentication or balance errors', async () => {
    const call = jest.fn().mockRejectedValue(new Error('API error 402'))
    await expect(withNetworkRecovery(call)).rejects.toThrow('402')
    expect(call).toHaveBeenCalledTimes(1)
  })
  it('bounds repeated network failures to three attempts', async () => {
    const call = jest.fn().mockRejectedValue(new TypeError('Load failed'))
    const pending = withNetworkRecovery(call).catch(error => error)
    await jest.advanceTimersByTimeAsync(4000)
    expect(((await pending) as Error).message).toContain('続きから生成')
    expect(call).toHaveBeenCalledTimes(3)
  })
  it('waits for both foreground and connectivity before sending a request', async () => {
    Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true})
    Object.defineProperty(navigator,'onLine',{value:false,configurable:true})
    const call = jest.fn().mockResolvedValue('ok')
    const pending = withNetworkRecovery(call)
    await Promise.resolve()
    expect(call).not.toHaveBeenCalled()
    Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true})
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(call).not.toHaveBeenCalled()
    Object.defineProperty(navigator,'onLine',{value:true,configurable:true})
    window.dispatchEvent(new Event('online'))
    await expect(pending).resolves.toBe('ok')
    expect(call).toHaveBeenCalledTimes(1)
  })
  it('resumes legacy failures from clues, preserving the overview and NPCs', async () => {
    const target = interrupted()
    const plan = getScenarioResumePlan(target)
    expect(plan.startStepId).toBe('design-locations-clues')
    const calls: string[]=[]
    const engine = new FlowEngine(trpgScenarioFlow,{executeStep:async step=>{
      calls.push(step.id)
      return Object.fromEntries(step.output.map(key=>[key,key==='validation'?{needsRepair:false}:[]]))
    }})
    const result = await engine.execute(plan.context,plan.startStepId)
    expect(calls[0]).toBe('design-locations-clues')
    expect(calls).not.toContain('design-concept')
    expect(calls).not.toContain('create-npcs')
    expect(result.overview).toEqual(target.overview)
    expect(result.npcs).toEqual(target.npcs)
  })
  it('keeps checkpoints across reloads and does not skip missing prerequisites', () => {
    const target = {...interrupted(),lastError:undefined,generationStep:'structure-scenes',locations:[{id:'loc'}],clues:[{id:'clue'}]} as TRPGScenario
    expect(getScenarioResumePlan(target).startStepId).toBe('structure-scenes')
    expect(getScenarioResumePlan({...target,truth:undefined}).startStepId).toBe('design-concept')
    expect(freshGenerationPatch()).toMatchObject({locations:[],clues:[],generationStep:'design-concept'})
  })
})
