'use client'

import { ReactNode } from 'react'
import { ListEditor, ObjectEditor } from './FormEditor'
import {
  buildRefOptions,
  clueFields,
  endingFields,
  gmGuideFields,
  locationFields,
  npcFields,
  overviewFields,
  sceneFields,
  truthFields
} from './schema'
import { TRPGScenario } from '@/lib/types'

export type EditableTab = 'overview' | 'truth' | 'npcs' | 'clues' | 'scenes' | 'endings'

interface ScenarioEditorProps {
  tab: EditableTab
  draft: TRPGScenario
  onChange: (draft: TRPGScenario) => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      {children}
    </section>
  )
}

const emptyOverview = {
  title: '', tagline: '', playerSynopsis: '', hook: '', recommendedSkills: [], estimatedPlayTime: '', recommendedPlayers: ''
}
const emptyTruth = {
  summary: '', backstory: '', antagonist: '', antagonistGoal: '', pastEvents: [], countdown: [], keyRevelations: []
}
const emptyGuide = { pacing: '', tips: [], rescueMeasures: [], safetyNotes: '' }

/**
 * 生成されたシナリオをフォームで直接編集する。変更は draft に反映され、保存時にまとめて確定する。
 */
export default function ScenarioEditor({ tab, draft, onChange }: ScenarioEditorProps) {
  const refs = buildRefOptions(draft)
  const set = (patch: Partial<TRPGScenario>) => onChange({ ...draft, ...patch })

  switch (tab) {
    case 'overview':
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <ObjectEditor
            value={draft.overview ?? emptyOverview}
            fields={overviewFields}
            refs={refs}
            onChange={overview => set({ overview: overview as TRPGScenario['overview'] })}
          />
        </div>
      )
    case 'truth':
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <ObjectEditor
            value={draft.truth ?? emptyTruth}
            fields={truthFields}
            refs={refs}
            onChange={truth => set({ truth: truth as TRPGScenario['truth'] })}
          />
        </div>
      )
    case 'npcs':
      return (
        <ListEditor
          items={draft.npcs}
          fields={npcFields}
          refs={refs}
          itemLabel="name"
          idPrefix="npc"
          addLabel="NPCを追加"
          newItem={() => ({
            name: '', role: '', description: '', personality: '', motivation: '', secret: '', stats: '',
            dialogueExamples: [], attitude: 'neutral'
          })}
          onChange={npcs => set({ npcs: npcs as TRPGScenario['npcs'] })}
        />
      )
    case 'clues':
      return (
        <div className="space-y-8">
          <Section title="場所">
            <ListEditor
              items={draft.locations}
              fields={locationFields}
              refs={refs}
              itemLabel="name"
              idPrefix="loc"
              addLabel="場所を追加"
              newItem={() => ({ name: '', description: '', atmosphere: '', features: [] })}
              onChange={locations => set({ locations: locations as TRPGScenario['locations'] })}
            />
          </Section>
          <Section title="手がかり">
            <ListEditor
              items={draft.clues}
              fields={clueFields}
              refs={refs}
              itemLabel="title"
              idPrefix="clue"
              addLabel="手がかりを追加"
              newItem={() => ({
                title: '', revelationId: refs.revelation[0]?.value ?? '', description: '',
                discovery: { skill: '', difficulty: '', notes: '' }
              })}
              onChange={clues => set({ clues: clues as TRPGScenario['clues'] })}
            />
          </Section>
        </div>
      )
    case 'scenes':
      return (
        <ListEditor
          items={draft.scenes}
          fields={sceneFields}
          refs={refs}
          itemLabel="title"
          idPrefix="scene"
          addLabel="シーンを追加"
          newItem={() => ({
            title: '', type: 'investigation', readAloud: '', gmNotes: '', objectives: [], checks: [],
            clueIds: [], npcIds: [], nextSceneIds: []
          })}
          onChange={scenes => set({ scenes: scenes as TRPGScenario['scenes'] })}
        />
      )
    case 'endings':
      return (
        <div className="space-y-8">
          <Section title="エンディング">
            <ListEditor
              items={draft.endings}
              fields={endingFields}
              refs={refs}
              itemLabel="title"
              idPrefix="end"
              addLabel="エンディングを追加"
              newItem={() => ({ title: '', condition: '', description: '', rewards: '' })}
              onChange={endings => set({ endings: endings as TRPGScenario['endings'] })}
            />
          </Section>
          <Section title="GM向けガイド">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
              <ObjectEditor
                value={draft.gmGuide ?? emptyGuide}
                fields={gmGuideFields}
                refs={refs}
                onChange={gmGuide => set({ gmGuide: gmGuide as TRPGScenario['gmGuide'] })}
              />
            </div>
          </Section>
        </div>
      )
  }
}
