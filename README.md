# TRPGシナリオAI 🎲

条件を入力するだけで、TRPGシナリオの **真相・NPC・手がかり・シーン・エンディング** までをAIが設計するWebアプリです。
生成後は「重要な情報に3つ以上の手がかりがあるか」「行き止まりのシーンがないか」を自動で検証し、さらにAIが内容の矛盾をチェックします。
作ったシナリオは画面上で編集でき、印刷・PDF化や、セッション中の進行補助にも使えます。

AIは **OpenAI / Claude / Gemini / DeepSeek** から選べ、画面上で切り替えられます。

## 主な機能

### シナリオを作る
- **対応システム**: クトゥルフ神話TRPG 7版 / D&D 5版 / ソード・ワールド2.5 / エモクロアTRPG / シノビガミ / ダブルクロス The 3rd Edition / インセイン / 汎用
- **一括生成**: 概要と導入、GM向けの真相とタイムライン、NPC（秘密・データ・台詞例）、場所と手がかり、シーン（読み上げ文・判定・戦闘）、エンディング、進行ガイド、サンプルキャラクター（任意）
- **生成中の様子を表示**: AIから受信中のテキストをリアルタイムに表示
- **途中から再開**: 生成が途中で失敗しても、完了済みの手順を飛ばして続きから再開

### 品質を確かめる
- **構造の自動検証**: 手がかりの冗長性（3つの手がかりの法則）、シーンの到達可能性、参照の整合性、エンディング、時間配分をスコア化
- **手がかりの自動補強**: 不足している重要情報に、別ルートの手がかりを追加
- **AIによる内容チェック**: 真相と手がかりの食い違い、時系列、NPCの言動、ルールの書式、NG要素などを指摘

### 仕上げる
- **手動編集**: すべてのセクションをフォームで編集（項目の追加・削除・並べ替え、参照の選択）
- **部分的な再生成**: セクションごとに追加の指示つきで作り直し。IDが変わっても参照を名前で自動的に張り直す
- **出力**: Markdown、JSON、印刷・PDF（GM用全文 / PL向け資料 / ハンドアウト / キャラクターシート）

### 遊ぶ
- **セッション画面**: システムに合わせたダイスローラー（CoC7版の成功度、DXの振り足し、エモクロアの成功数など）、タイマー、現在のシーンの確認、手がかりの入手状況、タイムライン、メモ
- **GM相談**: セッション中の予想外の行動やNPCの即興演技を、シナリオの真相を踏まえて相談

### 管理する
- **AI使用量と概算料金**: シナリオごと・全体のトークン数と料金の目安（料金表は編集可能）
- **保存とバックアップ**: ブラウザ内のデータベース（IndexedDB）に保存。全シナリオ・設定を1ファイルでバックアップ・復元

## セットアップ

Node.js 20 以上が必要です。

```bash
npm install
cp .env.example .env.local   # 使うプロバイダーのAPIキーを記入
npm run dev                  # http://localhost:3000
```

### 環境変数

| 変数 | 内容 |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI のAPIキー |
| `ANTHROPIC_API_KEY` | Claude（Anthropic）のAPIキー |
| `GEMINI_API_KEY` | Gemini（Google AI Studio）のAPIキー |
| `DEEPSEEK_API_KEY` | DeepSeek のAPIキー |
| `OPENAI_MODEL` など | 各プロバイダーの既定モデルの上書き（任意） |
| `OPENAI_BASE_URL` など | APIのURLの上書き（任意） |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | 両方設定するとサイト全体にBasic認証がかかる（公開サーバー向け） |

使うプロバイダーのキーだけ設定すれば動きます。APIキーはサーバー側でのみ使われ、ブラウザには送られません。

### AIの切り替え

右上の「AI設定」で、新規シナリオに使うプロバイダーとモデルの既定値を選べます。シナリオ作成画面でも個別に変更できます。
「一覧を取得」を押すと、各プロバイダーのAPIから現在利用できるモデルIDを取得して選択肢に表示します。

| プロバイダー | 既定モデル | 接続方式 |
| --- | --- | --- |
| OpenAI | `gpt-6-sol` | OpenAI SDK（Chat Completions） |
| Claude | `claude-opus-5` | Anthropic SDK（拒否時は別のClaudeモデルへ自動フォールバック） |
| Gemini | `gemini-3.8-flash` | Gemini の OpenAI 互換エンドポイント |
| DeepSeek | `deepseek-flash` | DeepSeek の OpenAI 互換エンドポイント |

すべてストリーミングで受信します。temperature を受け付けないモデル（OpenAI の推論モデル、新しい世代の Claude など）には自動的に送りません。

> **公開サーバーに置く場合の注意**: このアプリにはユーザー認証がありません。誰でもAPIキーを使ってAIを呼び出せる状態になるため、`BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` を設定するか、ローカルで使ってください。詳しくは [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) を参照してください。

## データの保存

シナリオはブラウザの IndexedDB に保存されます（以前のバージョンで localStorage に保存したデータは自動で移し替えます）。
別のブラウザや端末に移すときは、一覧画面の「バックアップ」から全データを書き出し、移行先で復元してください。

## 開発

```bash
npm test               # ユニットテスト・画面部品のテスト（AIはモック）
npm run test:coverage  # カバレッジつき
npm run test:e2e       # E2Eテスト（Playwright。AIの応答は固定データに差し替え）
npm run typecheck
npm run lint
npm run build
```

E2Eテストを初めて実行する前に `npx playwright install chromium` でブラウザを入れてください。

- 設計: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 公開・デプロイ: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
