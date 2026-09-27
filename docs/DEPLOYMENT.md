# 公開・デプロイ

> **注意**: このアプリにはユーザー登録・ログインの仕組みがありません。インターネットに公開すると、URLを知っている人が誰でもあなたのAPIキーでAIを呼び出せます。
> 公開する場合は必ず `BASIC_AUTH_USER` と `BASIC_AUTH_PASSWORD` を設定し、サイト全体にパスワードをかけてください。

シナリオのデータは各利用者のブラウザ（IndexedDB）に保存されます。サーバー側にデータベースは不要です。

## Vercel

1. [Vercel](https://vercel.com/) で GitHub の `trpg-scenario-ai` リポジトリをインポートする（設定はそのままでよい）
2. Project Settings → Environment Variables に、使うプロバイダーのAPIキーと `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` を追加する
3. デプロイする

シナリオ生成の1ステップは、モデルによっては数分かかります。`/api/ai/complete` は応答をストリーミングで返しますが、関数の実行時間の上限（プランによって異なります）を超えると途中で切れます。その場合は「続きから再開」で再開できます。

## Docker（自前のサーバー）

```bash
docker build -t trpg-scenario-ai .
docker run -d -p 3000:3000 --env-file .env.local --name trpg-scenario-ai trpg-scenario-ai
```

`http://サーバーのアドレス:3000` で開けます。HTTPSで公開する場合は、前段に Caddy や nginx などのリバースプロキシを置いてください。
ストリーミングを使うため、リバースプロキシで応答のバッファリングを無効にしてください（nginx の場合は `proxy_buffering off;`）。

## Node.js で直接動かす

```bash
npm ci
npm run build
npm start          # PORT 環境変数でポートを変更できる
```

## CI

CIの設定は [`docs/github-actions-ci.yml`](github-actions-ci.yml) にあります。
GitHub の画面で「Add file → Create new file」からファイル名を `.github/workflows/ci.yml` にして、この内容を貼り付けてコミットすると有効になります
（Claude の GitHub 連携にはワークフローファイルを作成する権限がないため、手動での追加が必要です）。

有効にすると、push と pull request のたびに次を実行します。

| ジョブ | 内容 |
| --- | --- |
| Lint / Typecheck / Unit tests / Build | ESLint、型チェック、Jest（カバレッジ下限つき）、本番ビルド |
| E2E (Playwright) | PCとスマホの画面幅で主要な操作を確認（AIの応答は固定データに差し替えるためAPIキー不要） |
| Docker image | Dockerイメージをビルドし、起動して応答を確認 |
