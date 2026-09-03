/* =============================================================
   Backrooms 移動エンジン
   - levels.js の BR_CONFIG / BR_LEVELS を読んで動く
   - 「番号だけの選択で潜っていく」以外のルールはここ
   ============================================================= */
(function () {
  "use strict";

  var CFG = window.BR_CONFIG || { startLevel: "0", startSanity: 100, maxSanity: 100 };
  var LEVELS = window.BR_LEVELS || {};
  var SAVE_KEY = "backrooms_v1";

  // ---- 永続データ（死んでも残る） -------------------------------
  var store = {
    journal: {},      // id -> { visits, danger }
    runs: 0,          // 挑戦回数
    wins: 0,          // 脱出成功回数
    bestDepth: 0,     // 到達した最大の「深さ」(訪問数)
    sound: true,
  };

  // ---- ラン中の状態（死ぬとリセット） --------------------------
  var run = null; // { current, sanity, path: [] }

  // ---- DOM -----------------------------------------------------
  var el = {};
  function $(id) { return document.getElementById(id); }

  // ---- セーブ / ロード ----------------------------------------
  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && typeof d === "object") {
          store.journal = d.journal || {};
          store.runs = d.runs || 0;
          store.wins = d.wins || 0;
          store.bestDepth = d.bestDepth || 0;
          store.sound = d.sound !== false;
        }
      }
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(store)); } catch (e) {}
  }

  // ---- サウンド（WebAudio 合成、ファイル不要） ----------------
  var actx = null;
  function ac() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    return actx;
  }
  function beep(freq, dur, type, vol) {
    if (!store.sound) return;
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(c.destination);
    var t = c.currentTime;
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.2));
    o.start(t); o.stop(t + (dur || 0.2) + 0.02);
  }
  function sfxMove()  { beep(320, 0.12, "square", 0.10); setTimeout(function () { beep(220, 0.18, "square", 0.09); }, 90); }
  function sfxSafe()  { beep(520, 0.10, "sine", 0.12); setTimeout(function () { beep(680, 0.14, "sine", 0.11); }, 80); }
  function sfxHurt()  { beep(140, 0.30, "sawtooth", 0.16); }
  function sfxHeal()  { beep(440, 0.10, "sine", 0.10); setTimeout(function () { beep(620, 0.12, "sine", 0.10); }, 70); setTimeout(function () { beep(820, 0.16, "sine", 0.10); }, 150); }
  function sfxDead()  { beep(200, 0.5, "sawtooth", 0.18); setTimeout(function () { beep(90, 0.7, "sawtooth", 0.18); }, 180); }
  function sfxWin()   { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { beep(f, 0.22, "triangle", 0.14); }, i * 130); }); }

  // ---- 画面演出 ----------------------------------------------
  function flash(color) {
    var f = el.flash;
    f.style.transition = "none";
    f.style.background = color;
    f.style.opacity = "0.85";
    // reflow
    void f.offsetWidth;
    f.style.transition = "opacity .6s ease";
    f.style.opacity = "0";
  }
  function shake(strength) {
    var s = el.stage;
    s.style.animation = "none";
    void s.offsetWidth;
    s.style.setProperty("--shake", (strength || 6) + "px");
    s.style.animation = "br-shake .4s ease";
  }

  function journalOf(id) { return store.journal[id] || null; }

  // ---- ゲーム進行 ------------------------------------------
  function newRun() {
    if (!LEVELS || Object.keys(LEVELS).length === 0 || !LEVELS[CFG.startLevel]) {
      run = null;
      renderSetup();
      return;
    }
    run = { current: CFG.startLevel, sanity: CFG.startSanity, path: [CFG.startLevel] };
    var st = LEVELS[CFG.startLevel];
    recordVisit(CFG.startLevel, st ? (st.danger || 0) : 0);
    renderAll();
  }

  function renderSetup() {
    el.play.hidden = true;
    el.end.hidden = false;
    el.endTitle.textContent = "レベル未設定";
    el.endTitle.className = "end-title lose";
    var missing = LEVELS && Object.keys(LEVELS).length > 0
      ? "開始レベル \"" + CFG.startLevel + "\" が js/levels.js にありません。"
      : "js/levels.js にレベルがありません。";
    el.endMsg.textContent = missing + " level コマンドで組んでください。";
    el.endPath.textContent = "例)  level add " + CFG.startLevel +
      "   /   level chain " + CFG.startLevel + " 1 2 3 10   /   level goal 10   /   level check";
    renderJournal();
    renderStats();
  }

  function recordVisit(id, danger) {
    var j = store.journal[id] || { visits: 0, danger: null };
    j.visits += 1;
    j.danger = danger;
    store.journal[id] = j;
  }

  function choose(id) {
    if (!run) return;
    var lvl = LEVELS[id];
    if (!lvl) {
      // 定義漏れ：安全な空き部屋として扱い、行き止まりにする
      lvl = { danger: 0, routes: [] };
    }
    var danger = lvl.danger || 0;

    run.current = id;
    run.path.push(id);
    run.sanity = Math.max(0, Math.min(CFG.maxSanity, run.sanity - danger));
    recordVisit(id, danger);

    // 深さ記録
    if (run.path.length - 1 > store.bestDepth) store.bestDepth = run.path.length - 1;

    // 演出
    sfxMove();
    setTimeout(function () {
      if (danger > 0)      { flash("#7a1010"); shake(Math.min(14, 4 + danger / 4)); sfxHurt(); }
      else if (danger < 0) { flash("#0d5a2a"); sfxHeal(); }
      else                 { sfxSafe(); }
    }, 140);

    save();

    // 判定
    if (run.sanity <= 0) {
      setTimeout(endRun.bind(null, "dead"), 260);
      return;
    }
    if (lvl.goal) {
      store.wins += 1; store.runs += 1; save();
      setTimeout(endRun.bind(null, "win"), 260);
      return;
    }
    var routes = (lvl.routes || []).filter(function (r) { return r != null; });
    if (routes.length === 0) {
      setTimeout(endRun.bind(null, "stuck"), 260);
      return;
    }
    renderAll();
  }

  function endRun(reason) {
    if (reason === "dead" || reason === "stuck") {
      store.runs += 1; save();
    }
    renderEnd(reason);
  }

  // ---- 描画 ------------------------------------------------
  function renderAll() {
    el.end.hidden = true;
    el.play.hidden = false;

    var id = run.current;
    var lvl = LEVELS[id] || { danger: 0, routes: [] };

    el.levelNum.textContent = "LEVEL " + id;
    el.levelName.textContent = lvl.name || "";
    el.levelName.hidden = !lvl.name;
    el.note.textContent = lvl.note || "";
    el.note.hidden = !lvl.note;

    // SANITY バー
    var pct = Math.round((run.sanity / CFG.maxSanity) * 100);
    el.sanFill.style.width = pct + "%";
    el.sanFill.className = "san-fill " + (pct <= 25 ? "crit" : pct <= 50 ? "low" : "");
    el.sanText.textContent = "SANITY " + run.sanity + " / " + CFG.maxSanity;

    // パンくず（このランの経路）
    el.path.textContent = run.path.join("  →  ");

    // 選択肢
    el.choices.innerHTML = "";
    var routes = (lvl.routes || []).filter(function (r) { return r != null; });
    if (lvl.goal) {
      var g = document.createElement("div");
      g.className = "goal-tag";
      g.textContent = "▲ 脱出地点";
      el.choices.appendChild(g);
    }
    routes.forEach(function (rid) {
      var j = journalOf(rid);
      var b = document.createElement("button");
      b.className = "choice" + (j ? " visited" : "");
      var big = document.createElement("span");
      big.className = "choice-num";
      big.textContent = rid;
      b.appendChild(big);
      var tag = document.createElement("span");
      tag.className = "choice-tag";
      tag.textContent = j ? "行ったことがある" : "？";
      b.appendChild(tag);
      b.addEventListener("click", function () { choose(rid); });
      el.choices.appendChild(b);
    });

    renderJournal();
    renderStats();
  }

  function renderJournal() {
    var ids = Object.keys(LEVELS).sort(function (a, b) {
      var na = parseFloat(a), nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a < b ? -1 : 1;
    });
    el.journal.innerHTML = "";
    ids.forEach(function (id) {
      var j = journalOf(id);
      var row = document.createElement("div");
      row.className = "j-row" + (j ? "" : " j-unknown") + (run && run.current === id ? " j-here" : "");
      var n = document.createElement("span"); n.className = "j-id"; n.textContent = id;
      var s = document.createElement("span"); s.className = "j-state";
      s.textContent = j ? (j.visits > 1 ? "訪問 " + j.visits + "回" : "訪問済み") : "未探索";
      row.appendChild(n); row.appendChild(s);
      el.journal.appendChild(row);
    });
    var known = Object.keys(store.journal).length;
    el.jCount.textContent = known + " / " + ids.length + " 到達";
  }

  function renderStats() {
    el.stRuns.textContent = store.runs;
    el.stWins.textContent = store.wins;
    el.stDepth.textContent = store.bestDepth;
  }

  function renderEnd(reason) {
    el.play.hidden = true;
    el.end.hidden = false;
    var title, msg, cls;
    if (reason === "win") {
      title = "脱出成功"; cls = "win";
      msg = "LEVEL " + run.current + " から外の光の中へ出た。（" + (run.path.length - 1) + " 回の移動）";
      flash("#0d5a2a"); sfxWin();
    } else if (reason === "stuck") {
      title = "行き止まり"; cls = "lose";
      msg = "LEVEL " + run.current + " から先はない。ここで力尽きた。";
      shake(10); sfxDead();
    } else {
      title = "SANITY 0"; cls = "lose";
      msg = "LEVEL " + run.current + " で正気を失った。ロビーへ引き戻される……";
      flash("#7a1010"); shake(16); sfxDead();
    }
    el.endTitle.textContent = title;
    el.endTitle.className = "end-title " + cls;
    el.endMsg.textContent = msg;
    el.endPath.textContent = run.path.join("  →  ");
    renderJournal();
    renderStats();
  }

  // ---- 初期化 ---------------------------------------------
  function bind() {
    el.stage = $("stage");
    el.flash = $("flash");
    el.play = $("play");
    el.end = $("end");
    el.levelNum = $("levelNum");
    el.levelName = $("levelName");
    el.note = $("note");
    el.sanFill = $("sanFill");
    el.sanText = $("sanText");
    el.path = $("path");
    el.choices = $("choices");
    el.journal = $("journal");
    el.jCount = $("jCount");
    el.stRuns = $("stRuns");
    el.stWins = $("stWins");
    el.stDepth = $("stDepth");
    el.endTitle = $("endTitle");
    el.endMsg = $("endMsg");
    el.endPath = $("endPath");

    $("againBtn").addEventListener("click", newRun);
    $("soundBtn").addEventListener("click", function () {
      store.sound = !store.sound; save();
      $("soundBtn").textContent = store.sound ? "🔊" : "🔇";
    });
    $("wipeBtn").addEventListener("click", function () {
      if (!confirm("手帳と記録をすべて消去します。よろしいですか？")) return;
      store = { journal: {}, runs: 0, wins: 0, bestDepth: 0, sound: store.sound };
      save(); newRun();
    });

    var vv = $("verText");
    if (vv && window.APP_VERSION) vv.textContent = "v" + window.APP_VERSION;
  }

  window.addEventListener("DOMContentLoaded", function () {
    load();
    bind();
    $("soundBtn").textContent = store.sound ? "🔊" : "🔇";
    newRun();
  });
})();
