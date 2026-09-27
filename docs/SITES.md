# Sites版について

Sites版は本人専用として利用します。公開範囲を変更する必要はありません。

## 使い始める

1. 既存のシナリオは、元のアプリでJSON出力し、Sites版の「JSONを読み込む」で取り込みます。
2. AI生成・GM相談には、使うプロバイダーのAPIキーをSitesの環境変数へ秘密の値として設定します。
3. 設定の反映後、「AI設定」で「利用可能」を確認し、プロバイダーとモデルを選びます。

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

元のNext.jsアプリを維持したまま、Sites側ではVinext/Cloudflare Workersに合わせた別のソースを管理しています。ドメイン処理は共通で、主な差分はルーティング、React 19の型、Tailwind 4、APIキー設定の案内です。Sites版を更新するときは、変更した共通処理をSites側へ反映して再配置してください。
