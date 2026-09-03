/* =============================================================
   レベル定義データ
   -------------------------------------------------------------
   このファイルは `level` コマンド (tools/level.py) が自動生成します。
   手で編集しても構いませんが、その場合は下記フォーマットを厳守:
     - window.BR_CONFIG  = { ... };   ← 厳密なJSON（ダブルクォート必須）
     - window.BR_LEVELS  = { ... };   ← 厳密なJSON

   BR_LEVELS[id] = {
     "danger": 数値,   // 0=安全 / 正=危険(その分SANITY減) / 負=回復(その分回復)
     "routes": [id,..],// この階で提示される行き先ID（画面には番号だけ表示）
     "goal":   true,   // 任意。到達で脱出クリア
     "name":   "..",   // 任意。番号の下に小さく表示
     "note":   ".."    // 任意。到着時に1行表示
   }

   コマンド例:
     level add 2 --danger 25
     level root 0 to 2 --push
     level chain 0 1 2 3 10 --push
     level goal 10 --push
     level check
   ============================================================= */

window.BR_CONFIG = {
  "startLevel": "0",
  "startSanity": 100,
  "maxSanity": 100
};

/* ===== LEVELS DATA (level コマンドが管理) ===== */
window.BR_LEVELS = {};
