'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { ScenarioSection, TRPGScenario } from '@/lib/types'

const KEYS: Record<ScenarioSection, (keyof TRPGScenario)[]> = {
  concept: ['overview', 'truth'], npcs: ['npcs'], locationsAndClues: ['locations', 'clues'],
  scenes: ['scenes'], endings: ['endings', 'gmGuide']
}
const LABELS: Record<string, string> = {
  overview: '概要', truth: '真相', npcs: 'NPC', locations: '場所', clues: '手がかり', scenes: 'シーン', endings: '結末', gmGuide: '進行ガイド',
  title: 'タイトル', name: '名前', tagline: 'キャッチコピー', playerSynopsis: 'PL向けあらすじ', hook: '導入', recommendedSkills: '推奨技能',
  estimatedPlayTime: '想定時間', recommendedPlayers: '推奨人数', summary: '真相の要約', backstory: '背景', antagonist: '黒幕', antagonistGoal: '黒幕の目的',
  pastEvents: '過去の出来事', countdown: 'タイムライン', time: '時期', event: '出来事', keyRevelations: '重要情報', fact: '事実',
  role: '役割', description: '説明', personality: '性格', motivation: '動機', secret: '秘密', stats: 'データ', dialogueExamples: '台詞例',
  atmosphere: '雰囲気', features: '特徴', discovery: '発見方法', skill: '技能', difficulty: '難易度', notes: '補足', handout: '配布資料',
  readAloud: '読み上げ文', gmNotes: 'GMメモ', objectives: '目的', checks: '判定', success: '成功時', failure: '失敗時',
  encounter: '戦闘', enemies: '敵', count: '人数・体数', tactics: '戦術', condition: '到達条件', rewards: '報酬',
  pacing: '時間配分', tips: '進行のコツ', rescueMeasures: '救済策', safetyNotes: '事前に共有する注意事項'
}
const HIDDEN = new Set(['id', 'revelationId', 'locationId', 'npcId', 'clueIds', 'npcIds', 'nextSceneIds', 'importance', 'attitude', 'type'])

export default function ScenarioEditor({ scenario, section, onSave, onCancel }: {
  scenario: TRPGScenario; section: ScenarioSection;
  onSave: (patch: Partial<TRPGScenario>) => void; onCancel: () => void
}) {
  const [draft, setDraft] = useState<Record<string, any>>(() =>
    JSON.parse(JSON.stringify(Object.fromEntries(KEYS[section].map(key => [key, scenario[key]])))))
  const change = (path: (string | number)[], value: unknown) => setDraft(previous => {
    const next = JSON.parse(JSON.stringify(previous))
    let target = next
    for (const key of path.slice(0, -1)) target = target[key]
    target[path[path.length - 1]] = value
    return next
  })
  const render = (value: any, path: (string | number)[], label: string): React.ReactNode => {
    if (value === undefined || value === null) return null
    const id = `edit-${path.join('-')}`
    if (typeof value === 'string' || typeof value === 'number') return (
      <label key={id} className="block space-y-1" htmlFor={id}>
        <span className="text-sm font-medium">{label}</span>
        {typeof value === 'number' ? <input id={id} type="number" min={1} value={value}
          onChange={event => change(path, Number(event.target.value))} className="w-full rounded border p-2 bg-transparent" /> :
          <textarea id={id} rows={value.length > 80 ? 4 : 2} value={value}
            onChange={event => change(path, event.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 p-2 bg-transparent" />}
      </label>
    )
    const entries = Array.isArray(value) ? value.map((item, index) => [index, item]) : Object.entries(value)
    return <fieldset key={id} className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <legend className="px-2 font-semibold">{label}</legend>
      {entries.filter(([key]) => !HIDDEN.has(String(key))).map(([key, item]) => render(item, [...path, key],
        typeof key === 'number' ? `${label} ${key + 1}${item?.name || item?.title ? `: ${item.name || item.title}` : ''}` : LABELS[key] || key))}
    </fieldset>
  }
  return <form className="space-y-5 bg-white dark:bg-gray-800 rounded-lg p-5" onSubmit={event => { event.preventDefault(); onSave(draft) }}>
    <p className="text-sm text-gray-600 dark:text-gray-300">保存前の内容を履歴に残します。真相やNPCを変更した場合は、関連する文章との整合性も確認してください。</p>
    {Object.entries(draft).map(([key, value]) => render(value, [key], LABELS[key] || key))}
    {section === 'scenes' && (draft.scenes ?? []).map((scene: any, index: number) => <label key={scene.id} className="block">
      <span className="text-sm font-medium">「{scene.title}」の遷移先（複数選択可）</span>
      <select multiple className="block w-full border rounded p-2 bg-transparent" value={scene.nextSceneIds}
        onChange={event => change(['scenes', index, 'nextSceneIds'], Array.from(event.target.selectedOptions, option => option.value))}>
        {draft.scenes.map((target: any) => <option key={target.id} value={target.id}>{target.title}</option>)}
      </select>
    </label>)}
    <div className="flex gap-2"><Button type="submit">変更を保存</Button><Button type="button" variant="secondary" onClick={onCancel}>キャンセル</Button></div>
  </form>
}
