# AI Provider Comparison Tool - 作業記録

## 実装内容

### 2026-05-04

#### Phase 1: 初期実装
- **Next.jsプロジェクト初期化** (`create-next-app`)
- **必要なパッケージインストール**: `openai`, `lucide-react`
- **プロジェクト構造作成**:
  ```
  ai-provider-comparison/
  ├── app/
  │   ├── api/compare/route.ts          # SSEストリーミング API
  │   ├── api/providers/route.ts        # プロバイダ一覧取得
  │   └── api/providers/config/route.ts # プロバイダ設定取得
  ├── components/
  │   ├── MetricsDisplay.tsx            # レイテンシー/トークン表示
  │   ├── PromptInput.tsx               # プロンプト入力フォーム
  │   ├── ProviderSelector.tsx          # プロバイダ選択UI
  │   └── ResponsePanel.tsx             # レスポンス表示パネル
  ├── lib/
  │   ├── providers.ts                  # プロバイダ設定管理
  │   └── types.ts                      # TypeScript型定義
  ├── .env.example                       # 環境変数サンプル
  ├── next.config.ts                     # Next.js設定（standalone出力）
  └── Procfile                           # build.io用
  ```

#### 実装した機能
1. **並列APIリクエスト**: 2つのプロバイダに同時にストリーミングリクエスト
2. **Server-Sent Events (SSE)**: リアルタイムレスポンス表示
3. **メトリクス表示**: E2Eレイテンシー、トークン使用量
4. **プロバイダ選択UI**: 2つのプロバイダをドロップダウンで選択
5. **分割画面**: 左右に2プロバイダの出力を同時表示

#### Gitリポジトリ作成
- リポジトリ名: `ai-api-compare`
- アカウント: `STAN110-sn`
- URL: https://github.com/STAN110-sn/ai-api-compare
- 初回コミットを`main`ブランチにプッシュ完了

---

### 2026-05-05

#### Phase 2: モデル選択機能追加

**要件**: 環境変数で複数モデルを指定し、UI上で選択できるようにする

#### 変更内容
1. **環境変数形式変更**:
   - 以前: `PROVIDER_A_MODEL=gpt-4`
   - 新しい形式: `PROVIDER_A_MODELS=gpt-4o:GPT-4o,gpt-4-turbo:GPT-4 Turbo`

2. **型定義更新** (`lib/types.ts`):
   - `ModelConfig` インターフェース追加
   - `ProviderConfig` に `models` フィールド追加
   - `ProviderInfo` インターフェース追加

3. **プロバイダ設定管理更新** (`lib/providers.ts`):
   - `parseModels()` 関数追加（環境変数からモデルリストをパース）
   - `getProviderConfig()` に `selectedModelId` パラメータ追加

4. **UI更新** (`components/ProviderSelector.tsx`):
   - プロバイダ選択ドロップダウンに加え、モデル選択ドロップダウン追加
   - プロバイダ変更時にモデルリスト自動更新

5. **メインページ更新** (`app/page.tsx`):
   - `modelA`, `modelB` state追加
   - `selectedModelAName`, `selectedModelBName` で選択したモデルをレスポンスパネルのタイトルに表示

6. **API更新** (`app/api/providers/config/route.ts`):
   - リクエストボディに `modelAId`, `modelBId` を追加

7. **`.env.example`更新**:
   - 新しい形式で4プロバイダのサンプルを記載

---

## PR作成時の問題

### 問題の背景
初期コミットを`main`ブランチに直接プッシュしてしまい、その後のモデル選択機能の変更も同じ`main`ブランチで作業してしまった。

### 試行した方法と結果

#### 試行1: featureブランチからPR作成
```bash
git checkout -b feature/model-selector
git push -u origin feature/model-selector
```
**結果**: 成功（ブランチ作成とプッシュはできた）

#### 試行2: マージコンフリクトの発生
`main`ブランチから`feature/model-selector`ブランチを作成しようとした際、以下の問題が発生：

1. **ディレクトリ構造の問題**:
   - プロジェクトが `ai-provider-comparison/` サブディレクトリにあった
   - ルートディレクトリにもGitリポジトリが初期化されていた
   - ファイル移動操作中にGitの状態が混乱した

2. **ファイル移動後のGit状態**:
   ```
   On branch feature/model-selector
   No commits yet
   ```
   - すべてのファイルが未追跡（untracked）として扱われる
   - 以前のコミット履歴が失われたように見える

3. **リモートとの同期問題**:
   - `git fetch origin` は成功
   - しかし `main` ブランチと `feature/model-selector` ブランチの関係が不明確

4. **マージコンフリクト**:
   ```
   CONFLICT (add/add): Merge conflict in app/api/providers/config/route.ts
   CONFLICT (add/add): Merge conflict in app/page.tsx
   CONFLICT (add/add): Merge conflict in components/ProviderSelector.tsx
   CONFLICT (add/add): Merge conflict in lib/providers.ts
   CONFLICT (add/add): Merge conflict in lib/types.ts
   ```
   - `git cherry-pick` や `git rebase` を試したが、両方のブランチで同じファイルが「新規追加」として扱われるためコンフリクト発生

#### 現在の状態
- `feature/model-selector` ブランチは存在
- モデル選択機能の変更がステージングされている（コミット待ち）
- Gitリポジトリの状態が複雑になってしまっている

---

## 推奨される解決策

### オプション1: 強制プッシュで修正（最もシンプル）
```bash
# featureブランチに切り替え（すでにいるはず）
git checkout feature/model-selector

# 変更をコミット
git add .
git commit -m "feat: add model selector UI for multiple models per provider"

# mainブランチにforce push（履歴を上書き）
git push origin feature/model-selector

# GitHubでPR作成（Web UIまたは gh CLI）
gh pr create --title "feat: add model selector UI" --body "..."
```

### オプション2: きれいに作り直す
```bash
# ローカルのfeatureブランチを削除
git branch -D feature/model-selector

# mainブランチから新しいfeatureブランチを作成
git checkout main
git pull origin main
git checkout -b feature/model-selector

# 変更を再適用（手動またはパッチファイルから）
...

# コミットしてプッシュ
git add .
git commit -m "feat: add model selector UI"
git push -u origin feature/model-selector
```

### オプション3: 手動でPR作成（Web UI）
GitHubのWebインターフェースから手動でPR作成：
1. https://github.com/STAN110-sn/ai-api-compare にアクセス
2. "Pull requests" タブをクリック
3. "New pull request" をクリック
4. base: `main` ← compare: `feature/model-selector`
5. タイトルと説明を入力して作成

---

## 備考

- **build.ioへのデプロイ**: `Procfile` は作成済み（`web: npm start`）
- **環境変数設定**: `.env.example` をコピーして実際のAPIキーを設定する必要がある
- **複数モデル対応**: 最大4プロバイダ（A, B, C, D）まで設定可能、各プロバイダに複数モデルを指定可能
- **モデル形式**: `model-id:Display Name,model-id-2:Display Name 2`
