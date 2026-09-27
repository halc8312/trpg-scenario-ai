import { AIProviderId } from '@/lib/ai/types'

// TRPGシナリオの型定義

export type TRPGSystemId = 'coc7' | 'dnd5e' | 'sw25' | 'generic'

export type ScenarioDifficulty = 'easy' | 'normal' | 'hard' | 'deadly'

export type ScenarioStatus = 'draft' | 'generating' | 'complete' | 'error'

// ユーザーがシナリオ作成時に指定する条件
export interface ScenarioRequest {
  systemId: TRPGSystemId
  workingTitle?: string
  genre: string
  premise: string
  setting?: string
  playerCount: number
  sessionHours: number
  difficulty: ScenarioDifficulty
  tone: string
  mustInclude?: string
  avoid?: string
}

export interface ScenarioAISettings {
  provider: AIProviderId
  model: string
  temperature: number
  maxTokens: number
}

// PL（プレイヤー）にも公開してよい概要情報
export interface ScenarioOverview {
  title: string
  tagline: string
  playerSynopsis: string
  hook: string
  recommendedSkills: string[]
  estimatedPlayTime: string
  recommendedPlayers: string
}

// 物語の核心となる情報（PLが探索で到達すべき事実）
export interface KeyRevelation {
  id: string
  fact: string
  importance: 'critical' | 'optional'
}

export interface TimelineEvent {
  time: string
  event: string
}

// GM/KPのみが知る真相
export interface ScenarioTruth {
  summary: string
  backstory: string
  antagonist: string
  antagonistGoal: string
  pastEvents: TimelineEvent[]
  // PCが何もしなかった場合に進行する出来事（時間制限の圧力）
  countdown: TimelineEvent[]
  keyRevelations: KeyRevelation[]
}

export interface ScenarioNPC {
  id: string
  name: string
  role: string
  description: string
  personality: string
  motivation: string
  secret: string
  stats: string
  dialogueExamples: string[]
  attitude: 'friendly' | 'neutral' | 'hostile'
}

export interface ScenarioLocation {
  id: string
  name: string
  description: string
  atmosphere: string
  features: string[]
}

export interface ClueDiscovery {
  skill: string
  difficulty: string
  notes: string
}

export interface ScenarioClue {
  id: string
  revelationId: string
  title: string
  description: string
  locationId?: string
  npcId?: string
  discovery: ClueDiscovery
  handout?: string
}

export interface SkillCheck {
  skill: string
  difficulty: string
  success: string
  failure: string
}

export interface Enemy {
  name: string
  count: number
  stats: string
  tactics: string
}

export interface Encounter {
  enemies: Enemy[]
  notes: string
}

export type SceneType = 'intro' | 'investigation' | 'social' | 'combat' | 'climax' | 'ending' | 'other'

export interface ScenarioScene {
  id: string
  title: string
  type: SceneType
  locationId?: string
  readAloud: string
  gmNotes: string
  objectives: string[]
  checks: SkillCheck[]
  clueIds: string[]
  npcIds: string[]
  nextSceneIds: string[]
  encounter?: Encounter
}

export interface ScenarioEnding {
  id: string
  title: string
  condition: string
  description: string
  rewards: string
}

export interface ScenarioGMGuide {
  pacing: string
  tips: string[]
  rescueMeasures: string[]
  safetyNotes: string
}

export type ScenarioIssueSeverity = 'error' | 'warning' | 'info'

export type ScenarioIssueCategory =
  | 'clue-coverage'
  | 'reference'
  | 'scene-flow'
  | 'ending'
  | 'balance'

export interface ScenarioIssue {
  severity: ScenarioIssueSeverity
  category: ScenarioIssueCategory
  message: string
  targetId?: string
}

export interface ScenarioValidationReport {
  score: number
  issues: ScenarioIssue[]
  // 手がかりの追加生成で修復すべき重要情報のID
  revelationsNeedingClues: string[]
  needsRepair: boolean
  checkedAt: Date
}

export type ContentIssueCategory = 'contradiction' | 'timeline' | 'npc' | 'rules' | 'safety' | 'balance' | 'other'

// AIが内容を読んで指摘した問題（構造検証では分からない矛盾など）
export interface ContentIssue {
  severity: ScenarioIssueSeverity
  category: ContentIssueCategory
  message: string
  suggestion: string
  targetIds: string[]
}

export interface ScenarioContentReview {
  summary: string
  issues: ContentIssue[]
  reviewedAt: Date
  model: string
}

export interface TRPGScenario {
  id: string
  status: ScenarioStatus
  request: ScenarioRequest
  aiSettings: ScenarioAISettings
  overview?: ScenarioOverview
  truth?: ScenarioTruth
  npcs: ScenarioNPC[]
  locations: ScenarioLocation[]
  clues: ScenarioClue[]
  scenes: ScenarioScene[]
  endings: ScenarioEnding[]
  gmGuide?: ScenarioGMGuide
  validation?: ScenarioValidationReport
  review?: ScenarioContentReview
  lastError?: string
  createdAt: Date
  updatedAt: Date
}

// 個別に再生成できるセクション
export type ScenarioSection = 'concept' | 'npcs' | 'locationsAndClues' | 'scenes' | 'endings'

export interface GMChatMessage {
  role: 'user' | 'assistant'
  content: string
}
