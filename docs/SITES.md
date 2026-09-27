# Sites版について

Sites版は本人専用として利用します。公開範囲を変更する必要はありません。

## 使い始める

1. 既存のシナリオは、元のアプリでJSON出力し、Sites版の「JSONを読み込む」で取り込みます。
2. 「AI設定」の「DeepSeek APIキー」にキーを貼り付け、「接続確認して保存」を押します。接続確認では公式APIのモデル一覧を取得し、生成は行いません。
3. 保存後はDeepSeek / `deepseek-flash`が既定になります。設定画面からキーの置き換え・削除もできます。
4. OpenAI・Claude・Geminiを使う場合は、対応するAPIキーをSitesの環境変数へ秘密の値として設定します。

| AI | 環境変数 |
| --- | --- |
| OpenAI | `OPENAI_API_KEY` |
| Claude | `ANTHROPIC_API_KEY` |
| Gemini | `GEMINI_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |

キーは少なくとも1つ必要です。キー未設定でもJSON読込、文章編集、構造検証、履歴復元、Markdown/JSON出力は利用できます。
APIキーをチャット本文やリポジトリへ貼り付けないでください。OpenAIの場合は、OpenAI Developersプラグインを使ったキー設定も可能です。

## 保存と移行

シナリオと変更履歴はブラウザのlocalStorageへ保存します。元のアプリとSites版はURLが異なるため、自動的には引き継がれません。端末・ブラウザ間の移行にはJSONを使います。読込時は変更履歴を持ち込まず、現在のシナリオを検証し直します。

## 実装

元のNext.jsアプリを維持したまま、Sites側ではVinext/Cloudflare Workersに合わせた別のソースを管理しています。ドメイン処理は共通で、主な差分はルーティング、React 19の型、Tailwind 4、DeepSeekキーの設定・保存機能です。SitesではキーをAES-256-GCMで暗号化してD1に保存し、暗号鍵は秘密の環境変数 `AI_CREDENTIAL_SECRET` に置きます。保存済みキーがある間は暗号鍵を変更しないでください。キー本体はブラウザの保存領域やAPIの応答には含めません。本人専用のSitesアクセス制御と、変更APIの同一オリジン確認を使用します。Sites版を更新するときは、変更した共通処理をSites側へ反映して再配置してください。

## DeepSeekのモデル

2026年9月27日確認時点のFlash系API名は `deepseek-flash`（DeepSeek V4.1 Flash）です。旧名 `deepseek-chat` / `deepseek-reasoner` / `deepseek-v4-flash` は読み込み・送信時に新しい名前へ置き換えます。シナリオ生成は非思考モード（`reasoning_effort: "none"`）を使用します。

公式資料: https://api-docs.deepseek.com/updates/ 、https://api-docs.deepseek.com/api/create-chat-completion/

## 中断と再開

生成中は完了したセクションと次の工程を保存します。通信が切れた場合は最大2回だけ再試行し、復帰時には前面表示・オンラインを待ちます。停止後は「続きから生成」で再開できます。以前のバージョンで保存された `design-locations-clues` のエラーも、概要・NPCを使って場所・手がかりから再開します。

Sites版ではQStash無料枠によるバックグラウンド実行に対応しています。「AI設定」からQStashを接続し、疎通確認が成功すると有効になります。詳細は `docs/BACKGROUND_GENERATION.md` を参照してください。有効時は生成中のシナリオと進捗もD1に保存し、画面を開き直すと取得します。
