# 開発状況と残りの作業

## 実装済み

| # | 内容 |
| --- | --- |
| 2 | 生成内容の手動編集（全セクション、追加・削除・並べ替え・参照の選択） |
| 3 | 再生成・編集で参照先が変わったときの自動修正 |
| 4 | AIによる内容の矛盾チェック |
| 5 | 失敗・中断した生成の途中再開 |
| 6 | ストリーミング表示（生成・再生成・GM相談） |
| 7 | サンプルキャラクター（PC）の作成 |
| 8 | 印刷・PDF出力（GM用 / PL向け / ハンドアウト / キャラクター） |
| 9 | エモクロア・シノビガミ・DX3・インセインへの対応 |
| 10 | セッション画面（ダイス・タイマー・シーン・手がかり・メモ） |
| 11 | AI使用量と概算料金の表示 |
| 12 | IndexedDBへの保存、バックアップと復元 |
| 13 | 画面部品のテスト、アクセシビリティ検査、スマホ表示の確認 |
| 14 | CI設定（`docs/github-actions-ci.yml`、手動で有効化が必要）、Docker、公開手順 |

## 残りの作業

### 1. 実際のAIでの動作確認とプロンプトの調整（DeepSeek）

これまでのテストはすべてAIの応答を固定データに差し替えて行っているため、実際のAIではまだ動かしていない。

準備:
- クラウド環境の設定で環境変数 `DEEPSEEK_API_KEY` を追加し、新しいセッションを開く
- `.env.local` に `DEEPSEEK_API_KEY` を書いて `npm run dev` を起動する

確認手順:
```bash
npm run generate:sample -- --provider deepseek --system coc7
npm run generate:sample -- --provider deepseek --model deepseek-v4-pro --system shinobigami --pregens
```
（`out/` に JSON と Markdown が保存され、構造検証スコア・内容チェックの指摘・使用量が表示される）

確認する点:
- 全ステップで JSON として解析できる応答が返るか（再試行の頻度）
- 各システム（8種類）で判定の書式・データ形式がルールに沿っているか
- 構造検証のスコアと、手がかりの補強が機能しているか
- 内容チェックの指摘が妥当か（過剰・不足）
- 1シナリオあたりの所要時間とトークン数・料金
- 画面上でのストリーミング表示、GM相談、途中再開

問題があれば `src/lib/services/scenario-prompts.ts`（プロンプト）と `src/data/game-systems.ts`（システムごとの指示）を調整する。

### そのほかの候補

- CIの有効化: `docs/github-actions-ci.yml` を `.github/workflows/ci.yml` として GitHub 上で追加する
- 他のプロバイダー（OpenAI / Claude / Gemini）での実動作確認
- OpenAI・Gemini の料金の既定値（公式の料金表で確認して `src/lib/ai/usage.ts` に追加）
