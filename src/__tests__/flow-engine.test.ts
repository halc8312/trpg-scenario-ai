import { Flow, FlowEngine, FlowExecutor, FlowStepError } from '@/lib/flow/flow-engine'

const flow: Flow = {
  id: 'f',
  name: 'f',
  description: '',
  steps: [
    { id: 'a', name: 'A', type: 'write', input: [], output: ['a'], action: '', nextSteps: ['b'] },
    { id: 'b', name: 'B', type: 'write', input: [], output: ['b'], action: '', nextSteps: ['c'] },
    {
      id: 'c', name: 'C', type: 'write', input: [], output: ['c'], action: '', nextSteps: ['d'],
      conditions: [{ field: 'needC', operator: 'equals', value: true }]
    },
    { id: 'd', name: 'D', type: 'write', input: [], output: ['d'], action: '', nextSteps: [] }
  ]
}

function executor(fail?: string): FlowExecutor & { ran: string[] } {
  const ran: string[] = []
  return {
    ran,
    async executeStep(step) {
      ran.push(step.id)
      if (step.id === fail) throw new Error('boom')
      return { [step.id]: true }
    }
  }
}

describe('FlowEngine', () => {
  it('runs every step and skips steps whose conditions are not met', async () => {
    const exec = executor()
    const context = await new FlowEngine(flow, exec).execute({ needC: false })
    expect(exec.ran).toEqual(['a', 'b', 'd'])
    expect(context).toMatchObject({ a: true, b: true, d: true })
  })

  it('reports only the failing step and wraps the error with its name', async () => {
    const exec = executor('d')
    const engine = new FlowEngine(flow, exec)
    const failed: string[] = []
    engine.on('stepError', step => failed.push(step.id))

    const error = await engine.execute({ needC: true }).catch(e => e)
    expect(error).toBeInstanceOf(FlowStepError)
    expect(error.step.id).toBe('d')
    expect(error.message).toBe('「D」で失敗しました: boom')
    expect(failed).toEqual(['d'])
  })

  it('can resume from a given step with the saved context', async () => {
    const exec = executor()
    const context = await new FlowEngine(flow, exec).execute({ a: 'saved', needC: true }, { startStepId: 'c' })
    expect(exec.ran).toEqual(['c', 'd'])
    expect(context.a).toBe('saved')
  })
})
