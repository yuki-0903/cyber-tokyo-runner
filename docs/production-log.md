# 🎮 Concept

サイバーパンク東京の路地裏を舞台にした、5分で遊べる2Dブラウザランナーゲーム。

プレイヤーはネオン街を走るキャラクターを左右に操作し、空から落ちてくるTokyo Cyber Debrisを避けながらスコアを伸ばす。  
操作はシンプルに「左右移動のみ」。スマホではタップ/長押し、PCでは矢印キーで遊べる。

---

# 🖼 Current State

## 実装済み機能

- Next.js App Router + TypeScript + Phaser 3
- Phaserはクライアント側のみで読み込み
- React UIとPhaser Canvasを分離
- `/game` 配下にゲーム処理を分離
- GitHub Pages公開対応
- スコア / ベストスコア
- HPバー
- ゲームオーバー
- リスタート
- 障害物ランダムスポーン
- 難易度の段階的上昇
- PC矢印キー操作
- スマホタップ/長押し操作

## UI

- 画像ベースUI
- STARTボタン
- RETRYボタン
- スコアパネル
- BESTスコアパネル
- HPバー
- Game Overポップアップ
- Orbitronフォント
- Phaser Graphicsに頼らないUI構成

## 演出

- タップ時の青白いネオンエフェクト
- 長押し中はエフェクトが残る
- 被弾時の軽い画面揺れ
- 赤い画面フラッシュではなく、画面端の赤いビネット演出
- ヒットストップ
- ノックバック
- 被弾パーティクル

## スマホ対応

- スマホ縦持ちでも横画面ゲームとして遊べる構成
- CSS回転ではなく、Phaserカメラ側で回転管理
- タップ座標をPhaserカメラ座標へ変換
- Canvas自体は画面いっぱいに固定

## BGM/SFX

- 現時点では未実装
- 次回改善候補

## 障害物

Tokyo Cyber Debris obstacle asset packを個別PNG化して使用。

例:

- broken neon sign
- hologram ad
- delivery drone
- cyber arm
- glowing eye
- energy drink can
- LED umbrella
- memory chip
- floating display
- ramen container
- police drone
- electric baton

## システム

- `ObstacleManager`で障害物管理を分離
- 障害物ごとのカテゴリー別挙動
- ドローンは回転
- 看板は点滅
- ホログラムは透明度変化
- データチップは高速回転
- 傘は揺れながら落下

---

# 🤖 AI Workflow

- ChatGPT  
  ゲーム企画、仕様整理、プロンプト設計、改善方針の相談

- GPT-image  
  背景、キャラクター、UI、障害物素材の生成

- Codex  
  Next.js / Phaser実装、アセット整理、バグ修正、GitHub Pages反映

- GitHub Issues  
  修正タスクの管理、ブランチ単位での作業整理

---

# 🧠 Prompt Library

## UI生成

```text
futuristic game ui buttons,
blue neon,
transparent background,
2D game asset pack
```

効果が高かった理由:

- 用途が「game ui buttons」と明確
- 色味をblue neonに絞った
- transparent background指定で切り分けやすかった
- asset pack指定により複数パーツ前提の画像になった

## UI切り分け

```text
このUI画像をPhaser3で使用できるように個別UIパーツへ切り分けてください。
button_start.png
button_retry.png
panel_score.png
hp_bar_fill.png
hp_bar_frame.png
popup_frame.png
```

効果が高かった理由:

- ファイル名を先に指定したことで実装に直結した
- Phaserで使う前提を明記したため、余白や透明背景の意識が揃った
- UIを「完成品」ではなく「部品」として扱えた

## 障害物生成

```text
Tokyo cyberpunk falling obstacle asset pack,
multiple different futuristic Tokyo objects falling from the sky,
transparent background,
single asset sheet,
consistent cyberpunk Tokyo aesthetic,
game ready sprites,
equal spacing between objects
```

効果が高かった理由:

- 世界観が具体的
- 落下物というゲーム内用途が明確
- equal spacing指定により切り分けやすかった
- isolated objects / no background指定が重要だった

## Codex実装指示

```text
assets/obstacles/ にあるTokyo Cyber Debris素材を使って、
障害物システムを実装してください。
ObstacleManagerクラスとして分離し、
将来障害物追加しやすい構成にしてください。
```

効果が高かった理由:

- 使用素材を明確に指定
- 仮図形禁止で実装品質が上がった
- クラス分離を指定したことで拡張しやすくなった

## バグ修正指示

```text
スマホ時のみ、タップ判定を以下のように変更する。
上半分をタップ → 左移動
下半分をタップ → 右移動
PC時は従来通り、左右半分で判定する。
```

効果が高かった理由:

- PCとスマホの挙動差分が明確
- 期待する入力仕様が具体的
- バグ原因の仮説も含まれていた

## 演出追加指示

```text
タップした際はタップしたところが白と青のネオンの光がボワって出る感じ。
長押しの際は消えないようなデザインにしたい。
```

効果が高かった理由:

- 視覚イメージが具体的
- 単発タップと長押しの状態差が明確
- 操作説明をUI文字ではなく演出で伝えられた

---

# ⚠ Problems & Fixes

## スマホ操作問題

## 問題

スマホ縦持ちで横画面表示していると、タップした方向とキャラクター移動が一致しなかった。

## 原因

当初はCSSでCanvasを `rotate(90deg)` していた。  
そのため、見た目の座標とPhaser内部の入力座標がズレていた。

## 修正方法

CSS回転をやめ、Phaserカメラ側で回転を管理した。

- Canvas自体は画面に固定
- Phaserカメラをスマホ時のみ90度回転
- 入力座標は `camera.getWorldPoint()` でゲーム座標へ変換

## 今後の再発防止

CanvasそのものをCSSで回転しない。  
横固定ゲームはPhaser内のカメラ、レイアウト、入力座標変換で管理する。

---

## UI未反映問題

## 問題

UI画像を用意しても、実装側がテキストだけの簡易UIになりがちだった。

## 原因

「UIを使う」だけだと、AIが仮UIやテキストUIで代替しやすい。

## 修正方法

以下を明示した。

- Phaser Graphics禁止
- DOM UI禁止
- add.textだけの簡易UI禁止
- 必ずUI画像アセットを使用
- UISceneとして分離

## 今後の再発防止

AIにUI実装を頼む時は、禁止事項と使用ファイル名をセットで指定する。

---

## Phaser実装問題

## 問題

スマホ回転表示時にゲーム画面がCanvasからはみ出したり、背景が分割表示された。

## 原因

Phaserカメラの `centerOn` や `scroll` を使って回転位置を調整したことで、パララックス背景の `scrollFactor` と干渉した。

## 修正方法

- 回転時は `scroll` に頼らない
- `camera.setOrigin(...)`
- `camera.setRotation(Math.PI / 2)`
- Canvasは左上固定
- Phaserの `autoCenter` は `NO_CENTER`

## 今後の再発防止

回転表示時に `camera.scroll` で位置補正すると、scrollFactor付きレイヤーが崩れる。  
カメラ回転時は原点設計を優先する。

---

## AIの誤解釈

## 問題

「clientXをeffectXにして」と指示した時、AIがまだ回転分岐やPhaser座標変換を残してしまった。

## 原因

既存の複雑な座標変換ロジックが残っていたため、単純化指示を完全に反映できなかった。

## 修正方法

ログ出力で以下を可視化した。

- clientX / clientY
- visualX / visualY
- effectX / effectY

その後、根本原因をCSS回転に特定した。

## 今後の再発防止

入力バグはまず座標ログを出す。  
「ブラウザ座標」「Canvas座標」「ゲーム座標」を分けて確認する。

---

# ✨ Learnings

- UIは「完成画面」ではなく「用途別パーツ」として生成・切り分けると実装精度が上がる
- Phaser Graphics禁止を明記すると、画像ベースUIの品質が安定する
- スマホ横固定ゲームでCanvasをCSS回転すると、入力座標が破綻しやすい
- PhaserではCanvasを回すより、カメラやゲーム座標側で回転を扱う方が安全
- 障害物は細部よりシルエット重視にすると避けやすい
- 障害物は種類ごとに挙動差をつけると、単純な避けゲーでも飽きにくい
- タップ操作はボタンより画面分割の方がスマホでは直感的
- 操作説明を文字で置くより、タップエフェクトで「長押しできる」と伝える方が自然
- 被弾演出は強すぎると不快になる。画面全体赤フラッシュより、端の赤ビネットが良い
- AI実装では「禁止事項」「使用素材」「分離したいクラス名」を明記すると再利用性が上がる
- GitHub Pages公開前は `NEXT_PUBLIC_BASE_PATH` 付きでbuild確認する
- Next.js dev serverは本番build後に `.next` 状態がズレることがある。壊れたらdev server再起動

---

# 🚀 Next Improvements

## UI

- スマホ用のタイトル画面最適化
- Game Over時のスコア演出強化
- HPバーの減少演出をより気持ちよくする

## 演出

- 障害物ごとの出現予兆
- ニアミス演出
- スコア上昇時のネオンパルス
- 背景のネオン点滅

## ゲームテンポ

- 30秒ごとの難易度フェーズ
- 障害物の組み合わせパターン
- スコア倍率やコンボ要素

## 難易度

- 最初の10秒はチュートリアル的に安全
- 高スコア帯では複数障害物スポーン
- 障害物サイズと速度の上限調整

## 音

- タップ音
- 被弾音
- スコア加算音
- サイバーパンク系BGM
- 障害物接近SE

## モバイルUX

- iOS Safariの全画面対応
- 端末回転ロック時の案内
- Safe Area対応
- 長押し時の入力安定性確認

---

# 📂 Reusable Assets

## UI構成

- STARTボタン
- RETRYボタン
- score panel
- HP bar
- popup frame

再利用ポイント:

- UI画像を `assets/ui/` にまとめる
- UISceneを独立させる
- UIManagerでボタン作成を共通化

## Phaser構成

- Next.js App Router
- Phaserはdynamic importでクライアントのみ
- React UIとPhaser Canvasを分離
- `/game` 配下にゲーム処理を集約

## ObstacleManager

再利用ポイント:

- 障害物リストをconfig化
- カテゴリーごとに挙動を分ける
- スポーン速度、落下速度、サイズをランダム化
- 難易度上昇をスコア依存にする

## MobileInput

再利用ポイント:

- CSS回転ではなくPhaserカメラ回転
- `camera.getWorldPoint()` を使う
- タップ/長押しを同じ入力として扱う
- エフェクトと移動判定を同じ座標系にする

## Prompt

再利用できる型:

```text
[ゲーム用途]
[世界観]
[必要オブジェクト]
[透明背景]
[game ready]
[consistent art style]
[equal spacing]
[Phaser game asset]
```

## エフェクト

- タップネオンエフェクト
- 長押し中の持続エフェクト
- 被弾ビネット
- ヒットストップ
- ノックバック
- 小パーティクル

---

# 📝 X Post Draft

## 案1

AIと一緒に、サイバーパンク東京の2Dブラウザゲームを制作中。  
今回はスマホ縦持ちでも横画面で遊べるように、CSS回転をやめてPhaserカメラ回転に変更。  
「見た目の座標」と「ゲーム内座標」のズレ、かなり学びが多かった。

## 案2

Next.js + Phaser 3 + AI生成素材で、Cyber Tokyo Runnerを制作中。  
UI、背景、障害物をAIで作りつつ、実装はCodexで整理。  
一番の学びは「CanvasをCSSで回すと入力座標が地獄になる」。次回からPhaser側で回す。

## 案3

AIゲーム制作ログ。  
サイバーパンク東京の避けゲーを作りながら、UI素材生成、障害物切り分け、スマホ操作、GitHub Pages公開まで実験。  
AIは速いけど、座標系やUXは人間が設計思想を持たないと崩れる。ここが面白い。

---

# 🧩 Planner Memory Candidate

- 横固定ゲームをスマホ縦持ちで遊ばせる場合、CanvasのCSS回転は避ける
- Phaserではカメラ回転と `camera.getWorldPoint()` を使うと入力座標が扱いやすい
- UI画像は「用途別ファイル名」を先に決めてから生成・切り分けする
- Phaser Graphics禁止を明記すると、画像ベースUIの実装精度が上がる
- 障害物は「世界観」よりも「シルエットで避けやすいこと」を優先する
- 障害物管理は `ObstacleManager` に分離し、config配列で追加できるようにする
- タップ操作は画面左右/上下の分割判定がスマホでは扱いやすい
- タップエフェクトは操作説明の代わりになる
- 被弾演出は強すぎる赤フラッシュより、画面端のビネットが良い
- AIへの実装指示では「禁止事項」「使用素材」「ファイル構成」「将来拡張」を明記する
- バグ調査では client座標、Canvas座標、ゲーム座標を分けてログ出力する
- GitHub Pages公開前は `NEXT_PUBLIC_BASE_PATH=/repo-name npm run build` で確認する
- Next.js dev serverは本番build後に壊れることがあるため、チャンク404時はdev server再起動を疑う
