# -*- coding: utf-8 -*-
"""一次性数据导出脚本：从生产数据源生成静态网页数据文件（2026-11-04）。

数据源（全部只读）：
- G:/AINK/card_generator.py 的 TIER_MAP（装备词条档位表）
- G:/AINK/shitou.py 的石头掉落模型参数（58% / 70.0963 / 28.9037 / 1）
- G:/AINK/assets/level_costs.json（升级成本，251~1200）
- G:/AINK/nikke-tier-web/nikke-tier-web-main/production.db（基地产出，1~700）

输出到 G:/AINK/nikke-static-web/data/。
"""
import ast
import json
import os
import sqlite3

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
os.makedirs(OUT, exist_ok=True)

# ---- 1. TIER_MAP：AST 提取（不 import，避免触发生产模块副作用） ----
src = open("G:/AINK/card_generator.py", encoding="utf-8").read()
tree = ast.parse(src)
tier_map = None
for node in ast.walk(tree):
    if isinstance(node, ast.Assign) and any(
        isinstance(t, ast.Name) and t.id == "TIER_MAP" for t in node.targets
    ):
        tier_map = ast.literal_eval(node.value)
        break
assert tier_map is not None, "TIER_MAP not found"
# 校验：词条数 + 每词条 15 档 + 等差规律（相邻档位差值集合应只有 1~2 种）
assert len(tier_map) == 9, f"expect 9 stats, got {len(tier_map)}"
for name, tiers in tier_map.items():
    assert len(tiers) == 15, f"{name}: {len(tiers)} tiers"
    vals = sorted(float(v) for v in tiers)
    diffs = {round(vals[i + 1] - vals[i], 2) for i in range(14)}
    assert len(diffs) <= 2, f"{name} 等差校验失败: {sorted(diffs)}"
with open(os.path.join(OUT, "tier-map.json"), "w", encoding="utf-8") as f:
    json.dump(tier_map, f, ensure_ascii=False, indent=1)

# ---- 2. 石头掉落模型（与 shitou._STONE_BATTLE_PMF 同参，浏览器内卷积） ----
stone_model = {
    "drop_rate": 0.58,
    "pmf": [0.700963, 0.289037, 0.01],
    "battles_normal": 3,
    "battles_double": 6,
    "max_stone": 18,
}
with open(os.path.join(OUT, "stone-model.json"), "w", encoding="utf-8") as f:
    json.dump(stone_model, f, ensure_ascii=False, indent=1)

# ---- 3. 升级成本 + 基地产出 ----
lc = json.load(open("G:/AINK/assets/level_costs.json", encoding="utf-8"))
assert isinstance(lc, list) and lc[0]["level"] == 251 and lc[-1]["level"] == 1200
conn = sqlite3.connect("G:/AINK/nikke-tier-web/nikke-tier-web-main/production.db")
rows = conn.execute(
    "SELECT level, credit_rate, data_rate, dust_rate FROM base_production ORDER BY level"
).fetchall()
conn.close()
prod = [
    {"level": r[0], "credit": r[1], "data": r[2], "dust": r[3]} for r in rows
]
assert prod[0]["level"] == 1 and prod[-1]["level"] == 700
upgrade = {"level_costs": lc, "base_production": prod}
with open(os.path.join(OUT, "upgrade.json"), "w", encoding="utf-8") as f:
    json.dump(upgrade, f, ensure_ascii=False)

# ---- 4. 单文件 JS 数据包（script 标签载入，file:// 直开也可用） ----
parts = [
    "window.APP_DATA = {};",
    "APP_DATA.tierMap = " + json.dumps(tier_map, ensure_ascii=False) + ";",
    "APP_DATA.stoneModel = " + json.dumps(stone_model, ensure_ascii=False) + ";",
    "APP_DATA.upgrade = " + json.dumps(upgrade, ensure_ascii=False) + ";",
]
with open(os.path.join(OUT, "app-data.js"), "w", encoding="utf-8") as f:
    f.write("\n".join(parts))

# ---- 汇总 ----
for fn in ("tier-map.json", "stone-model.json", "upgrade.json", "app-data.js"):
    p = os.path.join(OUT, fn)
    print(fn, os.path.getsize(p), "bytes")
print("tier stats:", len(tier_map), "| prod levels:", len(prod), "| cost levels:", len(lc))
