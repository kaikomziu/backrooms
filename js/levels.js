/* =============================================================
   レベル定義データ  ---  出典: Backrooms Wiki (JA) backrooms.fandom.com/ja
   -------------------------------------------------------------
   このファイルは `level` コマンド (tools/level.py) が管理します。
   danger: 0=安全 / 正=危険(SANITY減) / 負=回復     routes: 行き先ID(番号のみ表示)
   name:   Wiki のレベル名     goal:true=脱出(現実)     開始は BR_CONFIG.startLevel
   危険度は JA Wiki の「危険度 X/5」を SANITY 減少量に変換:
     0-2→0(安全) / 3→8 / 4→24 / 5→45(激ヤバ)
   ルートは各レベルの「出口」「入口」節から採取（一方通行の有向グラフ）
   無印通常階層 + 通常階層η。Level 0 → 0η が η 層への入口。ゴールは Level 3999 →「現実」
   ============================================================= */

window.BR_CONFIG = {
  "startLevel": "0",
  "startSanity": 100,
  "maxSanity": 100
};

/* ===== LEVELS DATA (level コマンドが管理) ===== */
window.BR_LEVELS = {
  "-2": {"danger": 8, "routes": ["0", "2", "13", "14"], "name": "Overflow（オーバーフロー）"},
  "-1": {"danger": 0, "routes": ["0", "2", "-2"], "name": "The Glitched Hall（グリッチホール）"},
  "0": {"danger": 0, "routes": ["1", "2", "-1", "0η", "46"], "name": "The Lobby（ロビー）"},
  "1": {"danger": 0, "routes": ["0", "2", "24", "46"], "name": "The Habitable Zone（生存可能領域）"},
  "2": {"danger": 0, "routes": ["0", "3", "4", "126"], "name": "Pipe Dreams（パイプの夢々）"},
  "3": {"danger": 24, "routes": ["4", "5", "6", "126"], "name": "The Electrical Station（電気局）"},
  "4": {"danger": 0, "routes": ["3", "5", "6", "71"], "name": "The Abandoned Office（廃オフィス）"},
  "5": {"danger": 8, "routes": ["3", "4", "6", "78"], "name": "The Hotel（ホテル）"},
  "6": {"danger": 24, "routes": ["3", "5", "7", "8", "9"], "name": "Lights Out（消灯）"},
  "7": {"danger": 24, "routes": ["4", "8", "37", "178"], "name": "Thalassophobia（海洋恐怖症）"},
  "8": {"danger": 45, "routes": ["7", "9", "10"], "name": "The Cave System（洞窟網）"},
  "9": {"danger": 24, "routes": ["10", "11"], "name": "The Darkened Suburbs（暗闇の郊外）"},
  "10": {"danger": 0, "routes": ["11", "958"], "name": "The Field of Wheat（小麦畑）"},
  "11": {"danger": 0, "routes": ["0", "1", "2", "3", "4", "5", "12", "13", "33", "52", "118", "138", "142", "178", "3999"], "name": "The Endless City（無限の都市）"},
  "12": {"danger": 0, "routes": ["13"], "name": "The Matrix（マトリックス）"},
  "13": {"danger": 8, "routes": ["3", "-1", "14"], "name": "The Infinite Apartments（無限マンション）"},
  "14": {"danger": 8, "routes": ["-2"], "name": "The Military Hospital（軍事病院）"},
  "18": {"danger": 8, "routes": ["52", "142"], "name": "Memories（思い出）"},
  "24": {"danger": 0, "routes": ["1"], "name": "The Moon（月）"},
  "33": {"danger": 8, "routes": ["11"], "name": "The Infinite Mall（無限モール）"},
  "37": {"danger": 0, "routes": ["4", "7"], "name": "The Poolrooms（ザ・プールルームズ）"},
  "46": {"danger": 8, "routes": ["4"], "name": "The Arabian Desert（アラビアンの砂漠）"},
  "52": {"danger": 0, "routes": ["11"], "name": "The School（学校）"},
  "71": {"danger": 24, "routes": ["4"], "name": "Void Basement（空っぽな地下室）"},
  "78": {"danger": 8, "routes": ["11"], "name": "The Space Station（宇宙ステーション）"},
  "103": {"danger": 0, "routes": ["0", "5"], "name": "Trade Center（取引所）"},
  "118": {"danger": 0, "routes": ["11"], "name": "Snowy Sakuras（雪桜）"},
  "126": {"danger": 8, "routes": ["5"], "name": "Last Dance（最後のダンス）"},
  "138": {"danger": 8, "routes": ["103", "178"], "name": "Golden Gai（ゴールデン街）"},
  "142": {"danger": 8, "routes": ["11", "18"], "name": "Earthjump Studio™（アースジャンプスタジオ™）"},
  "178": {"danger": 0, "routes": ["11", "138"], "name": "Kyoto Dreams（京都の夢々）"},
  "958": {"danger": 0, "routes": ["10"], "name": "Stargazing（天体観測）"},
  "3999": {"danger": 0, "routes": ["現実"], "name": "The True Ending（本当の終わり）"},
  "-753η": {"danger": 8, "routes": ["6η", "8η", "178η", "6.1η"], "name": "古の浴場"},
  "-27η": {"danger": 0, "routes": ["0η", "61η"], "name": "足元にご注意"},
  "-1η": {"danger": 0, "routes": ["6210η"], "name": "The Uninhabited Basements（無人地階）"},
  "0η": {"danger": 0, "routes": ["1", "-1", "1η", "8η", "-1η", "23η", "23.1η", "6210η"], "name": "The Lobby（ロビー）"},
  "1η": {"danger": 8, "routes": ["8η", "20η", "23η", "30η"], "name": "The Liminalrooms（ザ・リミナルルームズ）"},
  "3η": {"danger": 8, "routes": ["4η", "5η", "6η", "8η", "23η", "30η", "75η", "178η", "6.1η", "23.1η"], "name": "色褪せない記憶"},
  "4η": {"danger": 0, "routes": ["4", "5η", "8η", "23η", "519η", "6.1η", "6210η"], "name": "プレイルーム"},
  "5η": {"danger": 8, "routes": ["6η", "8η", "13η", "20η", "23η", "6.1η", "23.1η"], "name": "遠い昔の思い出"},
  "6η": {"danger": 8, "routes": ["8η", "20η", "23η", "30η", "56η", "6.1η", "23.1η"], "name": "壊れかけの街"},
  "6.1η": {"danger": 8, "routes": ["11", "118", "13η", "23η", "178η", "519η", "-753η"], "name": "万国ビュッフェ"},
  "8η": {"danger": 0, "routes": ["0η", "3η", "4η", "5η", "6η", "9η", "13η", "16η", "20η", "23η", "30η", "35η", "43η", "48η", "56η", "61η", "75η", "-27η", "178η", "519η", "6.1η", "723η", "-753η", "1165η", "23.1η", "5963η"], "name": "地下通路"},
  "9η": {"danger": 0, "routes": ["3η", "8η", "20η", "6.1η"], "name": "雨の公園"},
  "13η": {"danger": 8, "routes": ["8", "5η", "16η", "-753η", "6210η"], "name": "山の民"},
  "16η": {"danger": 0, "routes": ["8η", "13η", "35η", "178η", "6.1η", "23.1η"], "name": "紅葉の渓谷"},
  "20η": {"danger": 8, "routes": ["9", "3η", "6η", "8η", "118", "178η", "519η"], "name": "二月駅"},
  "23η": {"danger": 8, "routes": ["3η", "8η", "519η", "6.1η", "23.1η"], "name": "BackRooms教会"},
  "23.1η": {"danger": 8, "routes": ["118", "23η", "178η", "519η"], "name": "BackRooms寺院"},
  "30η": {"danger": 8, "routes": ["8η", "178η", "-753η"], "name": "スピーカールーム"},
  "35η": {"danger": 0, "routes": ["8η", "519η"], "name": "太古社"},
  "43η": {"danger": 24, "routes": ["8η", "6.1η"], "name": "裏裏路地"},
  "48η": {"danger": 0, "routes": ["43η"], "name": "和室の残影"},
  "56η": {"danger": 0, "routes": ["8η", "48η", "61η", "75η", "178η", "519η", "6.1η"], "name": "駄菓子屋"},
  "61η": {"danger": 24, "routes": ["23η", "75η", "-27η", "178η", "6.1η", "23.1η"], "name": "薄暗い通路"},
  "75η": {"danger": 8, "routes": ["48η", "178η", "6.1η", "23.1η"], "name": "追懐の回廊"},
  "178η": {"danger": 8, "routes": ["6η", "8η", "118", "138", "16η", "20η", "30η", "48η", "61η", "75η", "3999", "519η", "-753η", "23.1η", "6210η"], "name": "京都の夢"},
  "519η": {"danger": 8, "routes": ["8η", "118", "20η", "23η", "61η", "178η", "6.1η"], "name": "裏弓道場"},
  "723η": {"danger": 24, "routes": ["11", "8η", "23η", "6.1η"], "name": "Darkness and Lights（暗闇と灯り）"},
  "1165η": {"danger": 45, "routes": ["0", "11", "8η", "23η", "178η", "519η", "-753η", "23.1η"], "name": "狂った市街地"},
  "5963η": {"danger": 8, "routes": ["178η", "6.1η", "-753η"], "name": "禁足の団地"},
  "6210η": {"danger": 8, "routes": ["0η", "11", "1η", "33", "3η", "4η", "8η", "118", "138", "13η", "23η", "30η", "48η", "178η", "6.1η", "-753η", "23.1η"], "name": "The Housewares（生活雑貨）"},
  "現実": {"danger": 0, "routes": [], "name": "The Frontrooms", "goal": true}
};
