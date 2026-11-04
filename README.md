# 爱萌 NIKKE 工具箱 · 静态版（2026-11-04）

纯静态网页（零后端、零登录、零构建），与 Streamlit 完整版并存互补。
现有网页/代码零改动——本目录是全新独立的。

## 功能

| 模块 | 内容 | 数据源（导出自） |
|---|---|---|
| 石头概率 | 单战 58%/1 颗 70.0963%/2 颗 28.9037%/3 颗 1%；普通日 3 战、双倍日 6 战卷积分布图 + 查询 | `shitou.py` 掉落模型 |
| 档位速查 | TIER_MAP 全 9 词条 × 15 档速查表 + 数值吸附判阶（与 bot 档位闸门同源阈值 档距×0.45） | `card_generator.py` TIER_MAP |
| 升级资源 | 基地 251~1200 区间信用点/经验/核心尘埃需求 + 按基地产出（1~700）折算时长 | `assets/level_costs.json` + `production.db` |

## 使用

- 直接双击 `index.html` 即可（数据内联在 `data/app-data.js`，file:// 也能跑）；
- 或本地起服务：`python -m http.server 8899 -d G:\AINK\nikke-static-web`；
- 部署到 Cloudflare Pages / GitHub Pages：把整个目录上传即可，无需构建步骤。

## 数据更新

生产数据变了以后重跑导出脚本（只读生产源，写入本目录 data/）：

```
python G:\AINK\nikke-static-web\scripts\export_static_data.py
```

脚本内置断言：TIER_MAP 必须 9 词条 × 15 档且各词条相邻档位差值 ≤2 种（等差校验），
不满足会直接报错，防止把脏表导出去。

## 文件

```
nikke-static-web/
├── index.html      页面骨架（三视图）
├── style.css       深色主题
├── app.js          全部逻辑（视图切换/卷积/吸附/区间计算）
├── data/
│   ├── app-data.js     单文件数据包（页面实际加载）
│   ├── tier-map.json   档位表（备份）
│   ├── stone-model.json 掉落模型参数（备份）
│   └── upgrade.json    升级成本+基地产出（备份）
└── scripts/
    └── export_static_data.py  一次性导出脚本
```
