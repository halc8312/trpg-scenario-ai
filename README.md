# TRPGシナリオAI 🎲

条件を入力するだけで、TRPGシナリオの **真相・NPC・手がかり・シーン・エンディング** までをAIが設計するWebアプリです。
生成後は「重要な情報に3つ以上の手がかりがあるか」「行き止まりのシーンがないか」などを自動で検証し、手がかりが足りなければAIが補強します。

AIは **OpenAI / Claude / Gemini / DeepSeek** から選べ、画面上で切り替えられます。

## 主な機能

- **対応システム**: クトゥルフ神話TRPG 7版 / D&D 5版 / ソード・ワールド2.5 / 汎用（判定の書式・技能・データ形式をシステムごとに調整）
- **一括生成**: 概要と導入、GM向けの真相とタイムライン、NPC（秘密・データ・台詞例）、場所と手がかり、シーン（読み上げ文・判定・戦闘）、エンディング、進行ガイド
- **構造の自動検証**: 手がかりの冗長性（3つの手がかりの法則）、シーンの到達可能性、ID参照の整合性、エンディング、時間配分をスコア化
- **手がかりの自動補強**: 不足している重要情報に、別ルートの手がかりを追加してシーンへ配置
- **部分的な再生成**: セクションごとに追加の指示つきで作り直し
- **出力**: Markdown（PL向け情報とGM向け情報を分けて出力）/ JSON（読み込みも可能）
- **GM相談**: セッション中の予想外の行動やNPCの即興演技を、シナリオの真相を踏まえて相談

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
| Claude | `claude-opus-5` | Anthropic SDK（ストリーミング、拒否時の自動フォールバック付き） |
| Gemini | `gemini-3.8-flash` | Gemini の OpenAI 互換エンドポイント |
| DeepSeek | `deepseek-flash` | DeepSeek の OpenAI 互換エンドポイント |

temperature を受け付けないモデル（OpenAI の推論モデル、新しい世代の Claude など）には自動的に送らないようになっています。

> **公開サーバーに置く場合の注意**: このアプリにはユーザー認証がありません。誰でもAPIキーを使ってAIを呼び出せる状態になるため、`BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` を設定するか、ローカルで使ってください。

## データの保存

シナリオはブラウザの localStorage に保存されます。別のブラウザや端末に移すときは「JSON出力」→「JSONを読み込む」を使ってください。

## 開発

```bash
npm test            # ユニットテスト（AIはモック）
npm run typecheck   # 型チェック
npm run lint
npm run build
```

設計の詳細は [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照してください。
