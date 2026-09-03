// 更新履歴（新しいものが上）
window.APP_VERSION = "1.0.0";
window.CHANGELOG = [
  {
    v: "1.0.0",
    date: "2026-09-04",
    notes: [
      "初版。Level 0 から番号だけの選択で潜っていく Backrooms 移動ゲーム",
      "レベル・ルートは空の状態から `level` コマンド(tools/level.py)で構築",
      "  add/set/danger/goal/remove、root/chain/fork、list/show/check/undo、--push対応",
      "SANITY 制: 危険レベルで減少 / 回復レベルで回復 / 0 で振り出しに戻る",
      "訪れたレベルは手帳(ノート)に記録。死んでも知識は残る",
      "goal 到達で脱出クリア。行き止まりはそのラン終了",
      "セーブは localStorage / 効果音・画面ゆれ演出 / 🔊トグル",
    ],
  },
];
