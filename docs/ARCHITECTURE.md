# 設計

## 全体像

```
ブラウザ                                   サーバー（Next.js API Routes）
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ FlowEngine（生成フローを実行）  │        │ /api/ai/complete              │
│   └ TRPGScenarioFlowExecutor  │─fetch─▶│   └ registry → 各アダプター     │──▶ OpenAI / Claude /
│ ScenarioValidator（検証）      │        │ /api/ai/providers（設定状況）   │    Gemini / DeepSeek
│ TRPGScenarioService（保存）    │        │ /api/ai/models（モデル一覧）    │
└──────────────────────────────┘        └──────────────────────────────┘
```

APIキーはサーバーの環境変数にのみ置き、ブラウザからは `/api/ai/*` を経由して呼び出します。

## 生成フロー

`src/data/scenario-flow.ts` で定義し、`src/lib/flow/flow-engine.ts` で実行します。

```
design-concept → create-npcs → design-locations-clues → structure-scenes
  → design-endings → validate-structure → repair-clues（手がかりが不足する場合のみ）→ finalize
```

最初に「真相」と「PLが到達すべき重要情報（keyRevelations）」を決め、そこから逆算して手がかりとシーンを配置します。
各要素はIDで互いを参照します（`rev-1`, `npc-1`, `loc-1`, `clue-1`, `scene-1`, `end-1`）。AIの出力は `scenario-normalizer.ts` でIDの欠落や重複、型の揺れを補正してから使います。

各ステップが終わるたびに途中結果を保存するため、途中で失敗しても生成済みのセクションは残ります。

## 構造検証（AIを使わない）

`src/lib/services/scenario-validator.ts`

| 観点 | 内容 |
| --- | --- |
| 手がかりの数 | 重要情報（critical）ごとに、PLが入手できる手がかりが3つ以上あるか。シーンに配置されているか、シーンの場所・NPCに紐づく手がかりだけを数える。足りなければ `repair-clues` で追加 |
| 参照の整合性 | 手がかり・シーンが参照する重要情報・場所・NPC・シーンのIDが存在するか |
| シーン遷移 | 導入シーンから全シーンに到達できるか、行き止まりがないか、クライマックスがあるか |
| エンディング | 1つ以上あるか（2つ以上を推奨） |
| 時間配分 | セッション時間に対してシーン数が適切か（1シーン30〜45分が目安） |

## AIプロバイダー

| ファイル | 役割 |
| --- | --- |
| `src/lib/ai/providers.ts` | プロバイダーの表示名・環境変数名・既定モデル・出力トークン数の既定値（ブラウザとサーバーで共通） |
| `src/lib/ai/server/registry.ts` | 環境変数からアダプターを生成 |
| `src/lib/ai/server/openai-compatible.ts` | OpenAI / Gemini / DeepSeek（OpenAI互換API） |
| `src/lib/ai/server/anthropic.ts` | Claude（Anthropic SDK、ストリーミングで受信、拒否時は `stop_reason: "refusal"` をエラーとして返す） |
| `src/lib/ai/client.ts` | ブラウザから `/api/ai/*` を呼ぶクライアント |

### プロバイダーを追加するには

1. `src/lib/ai/types.ts` の `AIProviderId` にIDを追加
2. `src/lib/ai/providers.ts` の `AI_PROVIDERS` に情報を追加
3. OpenAI互換APIなら `registry.ts` の `createAdapter` に `OpenAICompatibleAdapter` を追加、そうでなければ `AIProviderAdapter` を実装

## ゲームシステムを追加するには

`src/lib/types.ts` の `TRPGSystemId` にIDを追加し、`src/data/game-systems.ts` の `GAME_SYSTEMS` にプリセット（判定の書式、よく使う技能、NPC・敵のデータ形式、報酬の目安）を追加します。プロンプトはプリセットから自動で組み立てられます。
