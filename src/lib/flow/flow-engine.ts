// 複数ステップのAI処理を順番に実行する汎用フローエンジン

export interface Flow {
  id: string
  name: string
  description: string
  steps: FlowStep[]
}

export interface FlowStep {
  id: string
  name: string
  type: 'read' | 'analyze' | 'write' | 'validate' | 'update'
  input: string[]
  output: string[]
  action: string
  conditions?: FlowCondition[]
  nextSteps: string[]
}

export interface FlowCondition {
  field: string
  operator: 'equals' | 'contains' | 'greater' | 'less'
  value: any
}

export interface FlowContext {
  [key: string]: any
}

export interface FlowExecutor {
  executeStep(step: FlowStep, context: FlowContext): Promise<FlowContext>
}

type FlowEventType = 'stepStart' | 'stepComplete' | 'stepError' | 'flowComplete' | 'log'

interface FlowEventListeners {
  stepStart: ((step: FlowStep) => void)[]
  stepComplete: ((step: FlowStep) => void)[]
  stepError: ((step: FlowStep, error: Error) => void)[]
  flowComplete: ((context: FlowContext) => void)[]
  log: ((message: string, type?: 'info' | 'warning' | 'error') => void)[]
}

export class FlowEngine {
  private flow: Flow
  private executor: FlowExecutor
  private context: FlowContext = {}
  private executionHistory: string[] = []
  private eventListeners: FlowEventListeners = {
    stepStart: [],
    stepComplete: [],
    stepError: [],
    flowComplete: [],
    log: []
  }

  constructor(flow: Flow, executor: FlowExecutor) {
    this.flow = flow
    this.executor = executor
  }

  on(event: 'stepStart' | 'stepComplete', listener: (step: FlowStep) => void): void
  on(event: 'stepError', listener: (step: FlowStep, error: Error) => void): void
  on(event: 'flowComplete', listener: (context: FlowContext) => void): void
  on(event: 'log', listener: (message: string, type?: 'info' | 'warning' | 'error') => void): void
  on(event: FlowEventType, listener: any): void {
    this.eventListeners[event].push(listener)
  }

  off(event: FlowEventType, listener: any): void {
    const listeners = this.eventListeners[event]
    const index = listeners.indexOf(listener)
    if (index > -1) {
      listeners.splice(index, 1)
    }
  }

  private emit(event: 'stepStart' | 'stepComplete', step: FlowStep): void
  private emit(event: 'stepError', step: FlowStep, error: Error): void
  private emit(event: 'flowComplete', context: FlowContext): void
  private emit(event: 'log', message: string, type?: 'info' | 'warning' | 'error'): void
  private emit(event: FlowEventType, ...args: any[]): void {
    const listeners = this.eventListeners[event]
    listeners.forEach(listener => (listener as any)(...args))
  }

  // FlowExecutorにログ出力機能を提供
  log(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.emit('log', message, type)
  }

  async execute(initialContext: FlowContext = {}): Promise<FlowContext> {
    this.context = { ...initialContext }
    this.executionHistory = []

    const startStep = this.flow.steps[0]
    if (!startStep) {
      throw new Error('Flow has no steps')
    }

    await this.executeStep(startStep.id)
    this.emit('flowComplete', this.context)
    return this.context
  }

  private async executeStep(stepId: string): Promise<void> {
    const step = this.flow.steps.find(s => s.id === stepId)
    if (!step) {
      throw new Error(`Step ${stepId} not found`)
    }

    this.executionHistory.push(stepId)

    if (step.conditions && !this.evaluateConditions(step.conditions)) {
      if (step.nextSteps.length > 0) {
        await this.executeStep(step.nextSteps[0])
      }
      return
    }

    try {
      this.emit('stepStart', step)
      const newContext = await this.executor.executeStep(step, this.context)
      this.context = { ...this.context, ...newContext }

      for (const outputKey of step.output) {
        if (!(outputKey in newContext)) {
          console.warn(`Expected output ${outputKey} not found in step ${stepId}`)
        }
      }

      this.emit('stepComplete', step)

    } catch (error: any) {
      console.error(`Error executing step ${stepId}:`, error)
      this.emit('stepError', step, error)
      throw new Error(`Flow execution failed at step ${stepId}: ${error}`)
    }
    // 後続ステップの失敗を完了済みのステップへ重複通知しない。
    for (const nextStepId of step.nextSteps) await this.executeStep(nextStepId)
  }

  private evaluateConditions(conditions: FlowCondition[]): boolean {
    return conditions.every(condition => {
      const value = this.getValueFromContext(condition.field)
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value
        case 'contains':
          return String(value).includes(String(condition.value))
        case 'greater':
          return Number(value) > Number(condition.value)
        case 'less':
          return Number(value) < Number(condition.value)
        default:
          return false
      }
    })
  }

  private getValueFromContext(path: string): any {
    const parts = path.split('.')
    let value = this.context

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part]
      } else {
        return undefined
      }
    }

    return value
  }

  getExecutionHistory(): string[] {
    return [...this.executionHistory]
  }

  getContext(): FlowContext {
    return { ...this.context }
  }
}
