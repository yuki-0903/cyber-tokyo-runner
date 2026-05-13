# Cyber Tokyo Runner

Next.js App Router + TypeScript + Phaser 3 の2Dブラウザゲームです。ReactはHUDと画面レイアウト、PhaserはCanvas内のゲーム処理だけを担当します。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## GitHub Pages

`main` ブランチにpushすると、GitHub Actionsで静的サイトを書き出してGitHub Pagesへデプロイします。

公開URL:

```text
https://yuki-0903.github.io/cyber-tokyo-runner/
```

ローカルでGitHub Pages用の書き出しを確認する場合:

```bash
NEXT_PUBLIC_BASE_PATH=/cyber-tokyo-runner npm run build
```

## ディレクトリ構成

```text
app/
  globals.css
  layout.tsx
  page.tsx
components/
  GameShell.tsx
  PhaserCanvas.tsx
game/
  createGame.ts
  scenes/
    GameScene.ts
  systems/
    GameEvents.ts
    GameServices.ts
  types/
    GameState.ts
public/
  assets/
    backgrounds/
    sprites/
    tilesets/
    ui/
```

## 設計メモ

- `app/page.tsx` で `dynamic(..., { ssr: false })` を使い、PhaserをSSR対象から外しています。
- `components/PhaserCanvas.tsx` がCanvasのマウントだけを担当します。
- `game/createGame.ts` で `await import("phaser")` し、Phaserをクライアント側のみで読み込みます。
- `game/scenes/GameScene.ts` にプレイヤー移動、敵スポーン、スコア、ゲームオーバー、リスタートを実装しています。
- `game/systems/GameEvents.ts` はReact UIとPhaserの橋渡しです。
- `game/systems/GameServices.ts` は将来のランキング、ログイン、課金、ステージ追加の差し替え境界です。
