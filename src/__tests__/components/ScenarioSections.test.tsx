import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ValidationSection } from '@/components/scenario/ScenarioSections'
import GenerationProgress from '@/components/scenario/GenerationProgress'
import { trpgScenarioFlow } from '@/data/scenario-flow'
import { TRPGScenario } from '@/lib/types'

function scenario(overrides: Partial<TRPGScenario> = {}): TRPGScenario {
  return {
    id: 's', status: 'complete',
    request: { systemId: 'coc7', genre: '', premise: '', playerCount: 3, sessionHours: 3, difficulty: 'normal', tone: '' },
    aiSettings: { provider: 'anthropic', model: 'claude-opus-5', temperature: 0.8, maxTokens: 1000 },
    npcs: [{ id: 'npc-1', name: '宗像', role: '', description: '', personality: '', motivation: '', secret: '', stats: '', dialogueExamples: [], attitude: 'neutral' }],
    locations: [], clues: [], scenes: [], endings: [],
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides
  }
}

describe('ValidationSection', () => {
  it('offers to reinforce clues when needed', async () => {
    const user = userEvent.setup()
    const onReinforce = jest.fn()
    render(
      <ValidationSection
        scenario={scenario({
          validation: {
            score: 70,
            issues: [{ severity: 'error', category: 'clue-coverage', message: '手がかりが足りません' }],
            revelationsNeedingClues: ['rev-1'],
            needsRepair: true,
            checkedAt: new Date()
          }
        })}
        onReinforce={onReinforce}
      />
    )
    expect(screen.getByText('70')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'AIで手がかりを補強' }))
    expect(onReinforce).toHaveBeenCalled()
  })

  it('shows content review issues with target names and flags outdated reviews', () => {
    const reviewedAt = new Date('2026-09-01T00:00:00Z')
    render(
      <ValidationSection
        scenario={scenario({
          validation: { score: 100, issues: [], revelationsNeedingClues: [], needsRepair: false, checkedAt: new Date('2026-09-02T00:00:00Z') },
          review: {
            summary: '概ね良好',
            reviewedAt,
            model: 'claude-opus-5',
            issues: [{ severity: 'warning', category: 'npc', message: '口調が揺れている', suggestion: '敬語に統一', targetIds: ['npc-1'] }]
          }
        })}
      />
    )
    expect(screen.getByText('対象: 宗像')).toBeInTheDocument()
    expect(screen.getByText('直し方: 敬語に統一')).toBeInTheDocument()
    expect(screen.getByText(/このチェックの後にシナリオが変更されています/)).toBeInTheDocument()
  })
})

describe('GenerationProgress', () => {
  it('shows the percentage of finished steps and the text being received', () => {
    const statuses = Object.fromEntries(trpgScenarioFlow.steps.slice(0, 5).map(s => [s.id, 'done' as const]))
    render(<GenerationProgress flow={trpgScenarioFlow} stepStatuses={statuses} logs={[]} streamText={'x'.repeat(1234)} />)
    expect(screen.getByText(`${Math.round((5 / trpgScenarioFlow.steps.length) * 100)}%`)).toBeInTheDocument()
    expect(screen.getByText('AIから受信中… 1,234文字')).toBeInTheDocument()
  })
})
