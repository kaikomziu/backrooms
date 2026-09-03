# BACKROOMS ─ レベル移動

Level 0 から「番号だけ」の選択で潜っていく Backrooms 移動ゲーム。
探索要素はなし。**どのレベル番号が安全か**を手帳に記録しながら、SANITY を保って脱出地点を目指す。

公開: https://kaikomziu.github.io/backrooms/

## 遊び方
- 画面には現在のレベルと、行ける先のレベル番号ボタンだけが出る
- ボタンを押すと即移動。安全なら無傷、危険なら SANITY が減る、回復レベルなら回復
- 一度行ったレベルは手帳に危険度が記録される（次からボタンの枠色でも分かる）
- SANITY 0 で振り出し。**手帳の知識は死んでも残る**
- `goal` レベルに着けば脱出クリア。行き止まりに入るとそのランは終了

初期状態はレベル 0 件（空）。下の `level` コマンドで自分でレベルとルートを組む。

---

## `level` コマンド（レベル/ルート管理）

`backrooms/` フォルダで実行する。Windows は `level`（cmd）または `.\level.ps1`（PowerShell）、
その他は `python tools/level.py`。

```bat
level add 2 --danger 25
level root 0 to 2 --push
```

### レベル操作
| コマンド | 説明 |
|---|---|
| `level add <id> [--danger N] [--goal] [--name "T"] [--note "..."]` | レベル追加 |
| `level set <id> [--danger N] [--goal\|--no-goal] [--name ..] [--note ..]` | レベル編集 |
| `level danger <id> <N>` | 危険度だけ変更（`set --danger` の短縮） |
| `level goal <id> [--off]` | 脱出地点に指定 / 解除 |
| `level remove lev <id>` | レベル削除（そのレベルへ向かうルートも自動で掃除） |

`danger`: `0`=安全 / 正=危険（その分 SANITY 減） / 負=回復（その分回復）

### ルート操作（一方通行）
| コマンド | 説明 |
|---|---|
| `level root <移動前> to <移動先>[,<移動先2>...]` | ルート追加。無いレベルは自動作成 |
| `level chain <id> <id> <id> ...` | 連続ルート `a→b→c→…` を一括作成 |
| `level fork <from> <to> <to> ...` | `from` から複数への分岐を一括作成 |
| `level remove root <移動前> to <移動先>` | ルート1本だけ削除 |

### 設定・確認・その他
| コマンド | 説明 |
|---|---|
| `level start <id>` | 開始レベルを変更 |
| `level sanity <start> [<max>]` | SANITY 設定を変更 |
| `level list` | グラフを一覧表示 |
| `level show <id>` | 1レベルの詳細＋「ここへ入れる階」 |
| `level check` | 未到達 / 行き止まり / 未定義リンク / GOAL 到達可否を診断 |
| `level undo` | 直前の変更を1回だけ取り消し |

### 共通オプション
- `--push` … 変更コマンドの後に `git add / commit / push` を自動実行
- `--msg "..."` … コミットメッセージを指定（省略時は自動）

### ID の書き方
- `level2` / `lev2` / `2` はすべて `2` として扱う
- `!` や `fun` などの非数値 ID もそのまま使える
- **`it` は `η` に変換**される（例: `level add 8it` → レベル `8η`）

### 使用例
```bat
level add 0 --name "The Lobby" --note "黄色い壁紙。ここから潜る。"
level chain 0 1 2 3 10          :: 0→1→2→3→10 の一本道
level fork 1 4 5                :: レベル1から4と5へ分岐
level danger 2 25              :: レベル2を危険に
level danger 4 -15             :: レベル4は回復部屋
level goal 10                  :: レベル10を脱出地点に
level add 8it --danger 40      :: レベル8η（激ヤバ）
level root 5 to 8it            :: 5→8η
level check                    :: 整合性チェック
level list --push --msg "初版レベル構成"
```

---

## 構成
```
index.html      UI / スタイル
js/game.js      エンジン（SANITY・手帳・遷移・演出）。触らなくていい
js/levels.js    レベル定義データ（level コマンドが自動生成）
js/version.js   更新履歴
tools/level.py  level コマンド本体
level.cmd / level.ps1   Windows 用ラッパー
```

セーブは localStorage（キー `backrooms_v1`）。
