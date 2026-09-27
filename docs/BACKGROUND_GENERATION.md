# バックグラウンド生成の追加設定

実装は準備済みですが、追加の実行環境を設定するまでは無効です。既定ではブラウザでの生成と途中再開を利用します。

## 構成

- Sites: AIキー、シナリオ、進捗をD1に保存。認証済みユーザーだけが開始・確認できます。
- Render Cron: 毎分、本人専用Sitesの実行APIへ接続し、待機中の工程を順番に実行。待機ジョブがなければ即終了します。
- スマホ: 開始要求と進捗確認だけを行い、画面を閉じてもRender側の実行は継続します。
- DeepSeekのキーと生成内容はRenderへ送りません。Renderには本人専用Sitesに接続する認証情報を秘密の環境変数で保存します。

## 作成するサービス

| 項目 | 値 |
| --- | --- |
| 種別 | Render Cron Job |
| 名前 | trpg-scenario-runner |
| プラン | 0.5c-512mb |
| リージョン | Singapore |
| リポジトリ | https://github.com/halc8312/trpg-scenario-ai |
| ブランチ | codex/scenario-reliability-20260927 |
| スケジュール | `* * * * *` |
| Build Command | `true` |
| Start Command | `node workers/scenario-runner.mjs` |
| 自動デプロイ | 無効（検証済みの変更を手動反映） |

費用は2026-09-27確認時点で月額最低1米ドル、実際の稼働時間に応じた従量課金です。DeepSeekのAPI料金は別です。
公式: https://render.com/docs/cronjobs

## 環境変数

Render:
- `SITE_ORIGIN`: `https://trpg-scenario-workbench.halcy.chatgpt.site`
- `SITES_AUTH_TOKEN`: Sitesの接続用トークン（秘密値。ログやソースへ保存しない）
- `SCENARIO_RUNNER_SECRET`: この実行API専用に生成したランダムな秘密値

Sites:
- `SCENARIO_RUNNER_SECRET`: Renderと同じ秘密値
- `BACKGROUND_GENERATION_ENABLED`: Renderから疎通確認後に `true` にして再配置

有料サービス作成とRenderワークスペースの確認後に設定します。Sitesのアクセス範囲は本人専用のままです。

## 動作・復旧

通常、開始してから約1分以内に実行を開始します。混雑時は待機します。
各工程が完了するたびに内容と次の工程を保存します。実行権の期限を10分に設定し、二重実行を防止します。実行プロセスが強制終了した場合は期限切れ後の次回実行で続行します。AI処理のタイムアウト・APIエラーは生成を停止し、「続きから生成」で復旧できます。
同じ開始IDは重複して追加せず、同じシナリオに実行中のジョブがある場合はその進捗を取得します。
実行中に生成要求が通信切断された場合、AI API側で完了したリクエストが再試行され、追加の利用料金が発生する可能性があります。
