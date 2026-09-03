#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
level  ---  BACKROOMS レベル/ルート管理コマンド

  level add <id> [危険度] [--goal] [--name "T"] [--note "..."]
      危険度は素の数値でOK:  level add 5 40   (=SANITY -40) /  level add 4 -15  (=回復)
  level root <from> to <to>[,<to2>,...]        ルート追加 (無い階は自動作成)
  level chain <id> <id> <id> ...               連続ルート a->b->c->... を一括作成
  level fork <from> <to> <to> ...              from から複数への分岐を一括作成
  level remove lev <id>                        レベル削除 (そのレベルへ向かうルートも掃除)
  level remove root <from> to <to>             ルート1本だけ削除
  level set <id> [危険度] [--goal|--no-goal] [--name ...] [--note ...]
  level danger <id> <N>                        危険度だけ変更 (set の短縮)
  level goal <id> [--off]                      脱出地点に指定 / 解除
  level start <id>                             開始レベルを変更 (BR_CONFIG.startLevel)
  level sanity <start> [<max>]                 SANITY設定を変更
  level list                                   グラフを一覧表示
  level show <id>                              1レベルの詳細
  level check                                  未到達/行き止まり/未定義リンク等を診断
  level undo                                   直前の変更を1回だけ取り消し

  どの変更コマンドにも  --push  を付けると完了後 git add/commit/push。
  --msg "..." でコミットメッセージ指定 (省略時は自動)。

  ID表記: "level2" / "lev2" / "2" はどれも "2" として扱う。
          "!" や "fun" などの非数値IDもそのまま使える。
"""

import sys, os, re, json, subprocess, shutil

try:  # Windows コンソールでの文字化け対策
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
LEVELS_JS = os.path.join(REPO, "js", "levels.js")
BAK = os.path.join(HERE, ".levels.bak.js")

HEADER = '''/* =============================================================
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

'''


def die(msg, code=1):
    print("level: " + msg, file=sys.stderr)
    sys.exit(code)


def norm_id(s):
    s = str(s).strip()
    m = re.match(r'^(?:level|lev|lv)\s*[-_]?\s*(.+)$', s, re.IGNORECASE)
    if m and m.group(1).strip():
        s = m.group(1).strip()
    # 入力しづらいギリシャ文字のショートハンド:  "8it" -> "8η"
    s = re.sub(r'it', 'η', s, flags=re.IGNORECASE)
    return s


def read_model():
    if not os.path.exists(LEVELS_JS):
        return {"startLevel": "0", "startSanity": 100, "maxSanity": 100}, {}
    txt = open(LEVELS_JS, encoding="utf-8").read()
    cfg = _extract_json(txt, "BR_CONFIG") or {"startLevel": "0", "startSanity": 100, "maxSanity": 100}
    lv = _extract_json(txt, "BR_LEVELS")
    if lv is None:
        lv = {}
    return cfg, lv


def _extract_json(txt, name):
    # 実際の代入は「行頭の window.NAME =」。ヘッダーコメント内の例に一致しないよう
    # 行頭一致を優先し、無ければ最後の出現を使う。
    ms = list(re.finditer(r'(?m)^\s*window\.' + re.escape(name) + r'\s*=\s*', txt))
    if not ms:
        ms = list(re.finditer(r'window\.' + re.escape(name) + r'\s*=\s*', txt))
    if not ms:
        return None
    m = ms[-1]
    i = m.end()
    if i >= len(txt) or txt[i] not in "{[":
        return None
    depth = 0
    in_str = False
    esc = False
    start = i
    while i < len(txt):
        c = txt[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c in "{[":
                depth += 1
            elif c in "}]":
                depth -= 1
                if depth == 0:
                    frag = txt[start:i + 1]
                    try:
                        return json.loads(frag)
                    except Exception as e:
                        die("js/levels.js の %s を読めません: %s" % (name, e))
        i += 1
    die("js/levels.js の %s が閉じていません" % name)


def write_model(cfg, levels, backup=True):
    if backup and os.path.exists(LEVELS_JS):
        shutil.copyfile(LEVELS_JS, BAK)
    # レベルは数値優先→文字列でソート
    def key(k):
        try:
            return (0, float(k))
        except ValueError:
            return (1, 0.0)
    ordered = {}
    for k in sorted(levels.keys(), key=lambda k: (key(k), str(k))):
        v = levels[k]
        row = {"danger": int(v.get("danger", 0)), "routes": list(v.get("routes", []))}
        if v.get("goal"):
            row["goal"] = True
        if v.get("name"):
            row["name"] = v["name"]
        if v.get("note"):
            row["note"] = v["note"]
        ordered[k] = row

    out = HEADER
    out += "window.BR_CONFIG = " + json.dumps(cfg, ensure_ascii=False, indent=2) + ";\n\n"
    out += "/* ===== LEVELS DATA (level コマンドが管理) ===== */\n"
    if not ordered:
        out += "window.BR_LEVELS = {};\n"
    else:
        lines = []
        for k, v in ordered.items():
            lines.append("  " + json.dumps(k, ensure_ascii=False) + ": " +
                         json.dumps(v, ensure_ascii=False))
        out += "window.BR_LEVELS = {\n" + ",\n".join(lines) + "\n};\n"
    open(LEVELS_JS, "w", encoding="utf-8", newline="\n").write(out)


def ensure_level(levels, lid):
    if lid not in levels:
        levels[lid] = {"danger": 0, "routes": []}
    return levels[lid]


# ---------- git ----------
def git(*args):
    return subprocess.run(["git", "-C", REPO, *args], capture_output=True, text=True)


def do_push(msg):
    st = git("status", "--porcelain")
    if not st.stdout.strip():
        print("push: 変更なし")
        return
    git("add", "-A")
    c = git("commit", "-m", msg)
    if c.returncode != 0:
        die("commit 失敗:\n" + c.stdout + c.stderr)
    p = git("push")
    if p.returncode != 0:
        die("push 失敗:\n" + p.stdout + p.stderr)
    print("pushed: " + msg)


# ---------- flags ----------
def pop_flags(args):
    """--push / --msg "x" を取り出して残りを返す"""
    push = False
    msg = None
    rest = []
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--push":
            push = True
        elif a == "--msg":
            i += 1
            msg = args[i] if i < len(args) else None
        else:
            rest.append(a)
        i += 1
    return rest, push, msg


def pop_opt(args, name, has_value=True):
    """--name value / --name を抜き出す。戻り: (value or True or None, remaining)"""
    out = None
    rest = []
    i = 0
    while i < len(args):
        if args[i] == name:
            if has_value:
                i += 1
                out = args[i] if i < len(args) else None
            else:
                out = True
        else:
            rest.append(args[i])
        i += 1
    return out, rest


def split_targets(items):
    """['2,3', '4'] -> ['2','3','4'] （カンマ/スペース混在OK）"""
    res = []
    for it in items:
        for p in str(it).replace(" ", ",").split(","):
            p = norm_id(p)
            if p:
                res.append(p)
    return res


def pop_bare_int(rest):
    """id の後ろに置かれた素の数値 (例: `level add 5 40`) を危険度として取り出す"""
    for i, tok in enumerate(rest):
        if i == 0:
            continue  # rest[0] は id
        if re.match(r'^[+-]?\d+$', str(tok)):
            return int(tok), rest[:i] + rest[i + 1:]
    return None, rest


# ---------- commands ----------
def cmd_add(rest):
    danger, rest = pop_opt(rest, "--danger")
    goal, rest = pop_opt(rest, "--goal", has_value=False)
    name, rest = pop_opt(rest, "--name")
    note, rest = pop_opt(rest, "--note")
    if not rest:
        die("使い方: level add <id> [危険度] [--goal] [--name ..] [--note ..]")
    lid = norm_id(rest[0])
    if danger is None:
        danger, rest = pop_bare_int(rest)
    cfg, levels = read_model()
    lv = ensure_level(levels, lid)
    if danger is not None:
        lv["danger"] = int(danger)
    if goal:
        lv["goal"] = True
    if name is not None:
        lv["name"] = name
    if note is not None:
        lv["note"] = note
    write_model(cfg, levels)
    print("add: level %s  %s" % (lid, json.dumps(levels[lid], ensure_ascii=False)))
    return "level: add %s" % lid


def cmd_root(rest):
    # level root <from> to <to>[,<to>...]
    if "to" in rest:
        k = rest.index("to")
        frm = norm_id(rest[0]) if k >= 1 else None
        tos = split_targets(rest[k + 1:])
    else:
        die('使い方: level root <移動前> to <移動先>[,<移動先>...]')
    if not frm or not tos:
        die('使い方: level root <移動前> to <移動先>[,<移動先>...]')
    cfg, levels = read_model()
    a = ensure_level(levels, frm)
    added = []
    for t in tos:
        ensure_level(levels, t)
        if t not in a["routes"]:
            a["routes"].append(t)
            added.append(t)
    write_model(cfg, levels)
    print("root: %s -> %s" % (frm, ", ".join(tos) if tos else "(なし)") +
          (" (新規 %s)" % ",".join(added) if added else " (既存)"))
    return "level: root %s to %s" % (frm, ",".join(tos))


def cmd_chain(rest):
    ids = split_targets(rest)
    if len(ids) < 2:
        die("使い方: level chain <id> <id> [<id> ...]  (2個以上)")
    cfg, levels = read_model()
    for i in range(len(ids) - 1):
        a = ensure_level(levels, ids[i])
        ensure_level(levels, ids[i + 1])
        if ids[i + 1] not in a["routes"]:
            a["routes"].append(ids[i + 1])
    write_model(cfg, levels)
    print("chain: " + " -> ".join(ids))
    return "level: chain " + ">".join(ids)


def cmd_fork(rest):
    ids = split_targets(rest)
    if len(ids) < 2:
        die("使い方: level fork <from> <to> <to> ...")
    frm, tos = ids[0], ids[1:]
    cfg, levels = read_model()
    a = ensure_level(levels, frm)
    for t in tos:
        ensure_level(levels, t)
        if t not in a["routes"]:
            a["routes"].append(t)
    write_model(cfg, levels)
    print("fork: %s -> %s" % (frm, ", ".join(tos)))
    return "level: fork %s -> %s" % (frm, ",".join(tos))


def cmd_remove(rest):
    if not rest:
        die("使い方: level remove lev <id>  |  level remove root <from> to <to>")
    what = rest[0].lower()
    rest = rest[1:]
    cfg, levels = read_model()
    if what in ("lev", "level"):
        if not rest:
            die("使い方: level remove lev <id>")
        lid = norm_id(rest[0])
        if lid not in levels:
            die("level %s は存在しません" % lid)
        del levels[lid]
        cleaned = 0
        for v in levels.values():
            before = len(v["routes"])
            v["routes"] = [r for r in v["routes"] if r != lid]
            cleaned += before - len(v["routes"])
        write_model(cfg, levels)
        print("remove lev: %s (向かうルート %d 本も削除)" % (lid, cleaned))
        return "level: remove lev %s" % lid
    elif what in ("root", "route"):
        if "to" not in rest:
            die("使い方: level remove root <from> to <to>")
        k = rest.index("to")
        frm = norm_id(rest[0])
        tos = split_targets(rest[k + 1:])
        if frm not in levels:
            die("level %s は存在しません" % frm)
        removed = []
        for t in tos:
            if t in levels[frm]["routes"]:
                levels[frm]["routes"].remove(t)
                removed.append(t)
        write_model(cfg, levels)
        print("remove root: %s -/-> %s" % (frm, ", ".join(removed) or "(該当なし)"))
        return "level: remove root %s to %s" % (frm, ",".join(tos))
    else:
        die("remove の対象は lev か root です")


def cmd_set(rest):
    danger, rest = pop_opt(rest, "--danger")
    goal, rest = pop_opt(rest, "--goal", has_value=False)
    nogoal, rest = pop_opt(rest, "--no-goal", has_value=False)
    name, rest = pop_opt(rest, "--name")
    note, rest = pop_opt(rest, "--note")
    if not rest:
        die("使い方: level set <id> [危険度] [--goal|--no-goal] [--name ..] [--note ..]")
    lid = norm_id(rest[0])
    if danger is None:
        danger, rest = pop_bare_int(rest)
    cfg, levels = read_model()
    if lid not in levels:
        die("level %s は存在しません (先に level add %s)" % (lid, lid))
    lv = levels[lid]
    if danger is not None:
        lv["danger"] = int(danger)
    if goal:
        lv["goal"] = True
    if nogoal:
        lv.pop("goal", None)
    if name is not None:
        lv["name"] = name if name != "" else lv.pop("name", None)
    if note is not None:
        lv["note"] = note if note != "" else lv.pop("note", None)
    write_model(cfg, levels)
    print("set: level %s  %s" % (lid, json.dumps(levels[lid], ensure_ascii=False)))
    return "level: set %s" % lid


def cmd_danger(rest):
    if len(rest) < 2:
        die("使い方: level danger <id> <N>")
    return cmd_set([rest[0], "--danger", rest[1]])


def cmd_goal(rest):
    off, rest = pop_opt(rest, "--off", has_value=False)
    if not rest:
        die("使い方: level goal <id> [--off]")
    return cmd_set([rest[0], "--no-goal" if off else "--goal"])


def cmd_start(rest):
    if not rest:
        die("使い方: level start <id>")
    lid = norm_id(rest[0])
    cfg, levels = read_model()
    cfg["startLevel"] = lid
    write_model(cfg, levels)
    print("start: 開始レベル = %s" % lid)
    return "level: start %s" % lid


def cmd_sanity(rest):
    if not rest:
        die("使い方: level sanity <start> [<max>]")
    cfg, levels = read_model()
    cfg["startSanity"] = int(rest[0])
    if len(rest) > 1:
        cfg["maxSanity"] = int(rest[1])
    write_model(cfg, levels)
    print("sanity: start=%s max=%s" % (cfg["startSanity"], cfg["maxSanity"]))
    return "level: sanity %s/%s" % (cfg["startSanity"], cfg.get("maxSanity"))


def cmd_list(_rest):
    cfg, levels = read_model()
    print("開始: LEVEL %s   SANITY %s/%s   (%d レベル)" %
          (cfg.get("startLevel"), cfg.get("startSanity"), cfg.get("maxSanity"), len(levels)))
    if not levels:
        print("  (空)  level add / chain で追加してください")
        return None
    for k, v in _sorted(levels):
        tags = []
        d = v.get("danger", 0)
        tags.append("危険+%d" % d if d > 0 else "回復%d" % d if d < 0 else "安全")
        if v.get("goal"):
            tags.append("GOAL")
        if v.get("name"):
            tags.append('"%s"' % v["name"])
        arrow = " -> " + ", ".join(v.get("routes", [])) if v.get("routes") else " -> (行き止まり)"
        print("  %-6s [%s]%s" % (k, " ".join(tags), arrow))
    return None


def cmd_show(rest):
    if not rest:
        die("使い方: level show <id>")
    lid = norm_id(rest[0])
    cfg, levels = read_model()
    if lid not in levels:
        die("level %s は存在しません" % lid)
    print(json.dumps({lid: levels[lid]}, ensure_ascii=False, indent=2))
    incoming = [k for k, v in levels.items() if lid in v.get("routes", [])]
    print("ここへ入れる階: " + (", ".join(incoming) if incoming else "(なし)"))
    return None


def cmd_check(_rest):
    cfg, levels = read_model()
    start = cfg.get("startLevel")
    problems = 0
    if start not in levels:
        print("NG  開始レベル %s が未定義" % start); problems += 1
    # 未定義リンク
    for k, v in _sorted(levels):
        for r in v.get("routes", []):
            if r not in levels:
                print("NG  %s -> %s : 行き先 %s が未定義" % (k, r, r)); problems += 1
    # 到達可能性 (BFS)
    seen = set()
    if start in levels:
        stack = [start]
        while stack:
            cur = stack.pop()
            if cur in seen:
                continue
            seen.add(cur)
            for r in levels.get(cur, {}).get("routes", []):
                if r in levels:
                    stack.append(r)
    for k in levels:
        if k not in seen:
            print("--  %s : 開始から到達不可" % k)
    # 行き止まり (goalでないのにroutes空)
    for k, v in _sorted(levels):
        if not v.get("routes") and not v.get("goal"):
            print("--  %s : 行き止まり (goalでない)" % k)
    # goalに到達できるか
    reachable_goal = any(levels[k].get("goal") for k in seen if k in levels)
    if not reachable_goal:
        print("NG  開始から到達できる GOAL が無い"); problems += 1
    if problems == 0:
        print("OK  致命的な問題なし  (-- は情報)")
    else:
        print("---- 致命的な問題 %d 件" % problems)
    return None


def cmd_undo(_rest):
    if not os.path.exists(BAK):
        die("取り消せる変更がありません (バックアップ無し)")
    shutil.copyfile(BAK, LEVELS_JS)
    os.remove(BAK)
    print("undo: 直前の変更を取り消しました")
    return "level: undo"


def _sorted(levels):
    def key(k):
        try:
            return (0, float(k), "")
        except ValueError:
            return (1, 0.0, str(k))
    return [(k, levels[k]) for k in sorted(levels.keys(), key=key)]


MUT = {
    "add": cmd_add, "root": cmd_root, "chain": cmd_chain, "fork": cmd_fork,
    "remove": cmd_remove, "rm": cmd_remove, "set": cmd_set, "danger": cmd_danger,
    "goal": cmd_goal, "start": cmd_start, "sanity": cmd_sanity, "undo": cmd_undo,
}
RO = {"list": cmd_list, "ls": cmd_list, "show": cmd_show, "check": cmd_check}


def main(argv):
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(__doc__)
        return
    sub = argv[0].lower()
    rest, push, msg = pop_flags(argv[1:])
    if sub in RO:
        RO[sub](rest)
        return
    if sub in MUT:
        auto_msg = MUT[sub](rest)
        if push:
            do_push(msg or auto_msg or ("level: " + sub))
        return
    die("不明なサブコマンド: %s   (level --help)" % sub)


if __name__ == "__main__":
    main(sys.argv[1:])
