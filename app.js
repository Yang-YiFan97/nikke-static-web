/* 爱萌 NIKKE 工具箱 · 静态版逻辑（2026-11-04）
 * 数据源：data/app-data.js（scripts/export_static_data.py 从生产源导出）
 * 石头模型与 shitou.get_drop_prob_value 同参；档位吸附与 bot_tier 档位闸门同思路。
 */
(function () {
  "use strict";
  var D = window.APP_DATA || {};
  var tierMap = D.tierMap || {};
  var stoneModel = D.stoneModel || {};
  var upgrade = D.upgrade || { level_costs: [], base_production: [] };

  /* ---------- 视图切换 ---------- */
  var navBtns = document.querySelectorAll("nav button");
  navBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      navBtns.forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      document.querySelectorAll(".view").forEach(function (v) {
        v.classList.toggle("active", v.id === "view-" + b.dataset.view);
      });
    });
  });

  /* ---------- 石头概率 ---------- */
  function battlePMF() {
    var dr = stoneModel.drop_rate, pmf = stoneModel.pmf;
    return [1 - dr, dr * pmf[0], dr * pmf[1], dr * pmf[2]];
  }
  // n 次战斗的总颗数分布（卷积），与 shitou 精确卷积一致
  function distFor(n) {
    var per = battlePMF();
    var cur = [1];
    for (var i = 0; i < n; i++) {
      var next = [];
      for (var s = 0; s <= 3 * (i + 1); s++) {
        var p = 0;
        for (var k = 0; k <= 3; k++) {
          if (s - k >= 0 && s - k < cur.length) p += per[k] * cur[s - k];
        }
        next.push(p);
      }
      cur = next;
    }
    return cur;
  }
  function fmtPct(p) {
    if (p <= 0) return "~0%";
    if (p < 0.000001) return "≈0";
    if (p < 0.0001) return "<0.01%";
    return (p * 100).toFixed(2) + "%";
  }
  function renderStone() {
    var isDouble = document.querySelector('input[name=stone-day]:checked').value === "double";
    var battles = isDouble ? stoneModel.battles_double : stoneModel.battles_normal;
    var dist = distFor(battles);
    var q = parseInt(document.getElementById("stone-q").value, 10);
    var qOut = document.getElementById("stone-q-out");
    if (!isNaN(q) && q >= 0 && q < dist.length) {
      qOut.textContent = "P(总颗数=" + q + ") = " + fmtPct(dist[q]);
    } else {
      qOut.textContent = "";
    }
    var wrap = document.getElementById("stone-charts");
    wrap.innerHTML = "";
    var card = document.createElement("div");
    card.className = "chart-card";
    var title = document.createElement("h3");
    title.innerHTML = isDouble
      ? '双倍日分布（6 战）<span class="badge" style="background:#ef4444">6 战</span>'
      : '普通日分布（3 战）<span class="badge" style="background:#2563eb">3 战</span>';
    card.appendChild(title);
    var maxP = Math.max.apply(null, dist);
    var bars = document.createElement("div");
    bars.className = "bars";
    dist.forEach(function (p, i) {
      var col = document.createElement("div");
      col.className = "bar-col" + (i === q ? " hot" : "");
      var pct = document.createElement("div");
      pct.className = "pct";
      pct.textContent = p >= 0.0001 ? (p * 100).toFixed(1) : "";
      var bar = document.createElement("div");
      bar.className = "bar";
      bar.style.height = Math.max(p / maxP * 100, 1.5) + "%";
      bar.style.background = isDouble ? "var(--red-bar)" : "var(--blue-bar)";
      if (i === q) bar.style.boxShadow = "0 0 0 2px var(--gold)";
      var num = document.createElement("div");
      num.className = "num";
      num.textContent = i;
      col.appendChild(pct); col.appendChild(bar); col.appendChild(num);
      bars.appendChild(col);
    });
    card.appendChild(bars);
    wrap.appendChild(card);
  }
  document.querySelectorAll('input[name=stone-day]').forEach(function (r) {
    r.addEventListener("change", renderStone);
  });
  document.getElementById("stone-q").addEventListener("input", renderStone);

  /* ---------- 档位速查 ---------- */
  var statNames = Object.keys(tierMap);
  var statSel = document.getElementById("tier-stat");
  statNames.forEach(function (n) {
    var o = document.createElement("option");
    o.value = n; o.textContent = n;
    statSel.appendChild(o);
  });
  // 档位吸附：与 bot_tier 思路一致——最近档位，阈值=档距×0.45
  function snapTier(stat, value) {
    var tiers = tierMap[stat];
    var entries = Object.keys(tiers).map(function (v) { return [parseFloat(v), tiers[v]]; })
      .sort(function (a, b) { return a[0] - b[0]; });
    var gap = (entries[entries.length - 1][0] - entries[0][0]) / (entries.length - 1);
    var thresh = gap * 0.45;
    var best = null, bestDist = Infinity;
    entries.forEach(function (e) {
      var d = Math.abs(e[0] - value);
      if (d < bestDist) { bestDist = d; best = e; }
    });
    return { entry: best, dist: bestDist, accept: bestDist <= thresh };
  }
  function tierClass(t) { return t <= 11 ? "t1" : (t <= 14 ? "t2" : "t3"); }
  function renderTier() {
    var stat = statSel.value;
    var raw = document.getElementById("tier-value").value.trim();
    var out = document.getElementById("tier-out");
    var hitTier = null;
    if (raw !== "" && !isNaN(parseFloat(raw))) {
      var r = snapTier(stat, parseFloat(raw));
      if (r.accept) {
        hitTier = r.entry[1];
        out.textContent = "≈ " + r.entry[0] + " → 第 " + r.entry[1] + " 阶（偏移 " + r.dist.toFixed(2) + "）";
      } else {
        out.textContent = "无匹配档位（最近 " + r.entry[0] + " 偏移 " + r.dist.toFixed(2) + " 过大）";
      }
    } else {
      out.textContent = "";
    }
    var tiers = tierMap[stat];
    var keys = Object.keys(tiers).sort(function (a, b) { return parseFloat(a) - parseFloat(b); });
    var html = "<table><tr><th>档位</th><th>数值</th><th>档位</th><th>数值</th></tr>";
    var half = Math.ceil(keys.length / 2);
    var left = keys.slice(0, half), right = keys.slice(half);
    for (var i = 0; i < half; i++) {
      html += "<tr>";
      for (var s = 0; s < 2; s++) {
        var k = s === 0 ? left[i] : right[i];
        if (k === undefined) { html += '<td class="t1"></td><td></td>'; continue; }
        var t = tiers[k];
        html += '<td class="' + tierClass(t) + (t === hitTier ? " hitx" : "") + '">' + t + " 阶</td><td>" + k + "</td>";
      }
      html += "</tr>";
    }
    html += "</table>";
    html += '<p class="tier-note">颜色：≤11 低档（灰） · 12~14 金档 · 15 最高档（红）。输入数值自动吸附最近档位。</p>';
    document.getElementById("tier-table").innerHTML = html;
    if (hitTier !== null) {
      var row = document.querySelector("#tier-table td.hitx");
      if (row && row.parentElement) row.parentElement.classList.add("hit");
    }
  }
  statSel.addEventListener("change", renderTier);
  document.getElementById("tier-value").addEventListener("input", renderTier);

  /* ---------- 升级资源 ---------- */
  var costs = upgrade.level_costs;
  var prod = upgrade.base_production;
  function costBetween(from, to) {
    // cum[L] = 从 251 升到 L 的累计；区间需求 = cum 差
    var byLevel = {};
    costs.forEach(function (c) { byLevel[c.level] = c; });
    var cFrom = byLevel[from], cTo = byLevel[to];
    if (!cFrom || !cTo) return null;
    return {
      credit: cTo.cum_credit - cFrom.cum_credit,
      exp: cTo.cum_exp - cFrom.cum_exp,
      dust: cTo.cum_core_dust - cFrom.cum_core_dust
    };
  }
  function prodAt(level) {
    var byLevel = {};
    prod.forEach(function (p) { byLevel[p.level] = p; });
    return byLevel[level];
  }
  function fmtNum(n) {
    if (n >= 1e8) return (n / 1e8).toFixed(2) + " 亿";
    if (n >= 1e4) return (n / 1e4).toFixed(2) + " 万";
    return n.toLocaleString("zh-CN");
  }
  function fmtDur(hours) {
    if (!isFinite(hours)) return "—";
    if (hours >= 24) return (hours / 24).toFixed(1) + " 天";
    if (hours >= 1) return hours.toFixed(1) + " 小时";
    return (hours * 60).toFixed(0) + " 分钟";
  }
  function renderUpgrade() {
    var from = parseInt(document.getElementById("up-from").value, 10);
    var to = parseInt(document.getElementById("up-to").value, 10);
    var base = parseInt(document.getElementById("up-base").value, 10);
    var wrap = document.getElementById("upgrade-result");
    if (!(from >= 251 && from <= 1200 && to >= 251 && to <= 1200 && to > from)) {
      wrap.innerHTML = '<p class="tier-note">请输入 251~1200 的等级区间（目标需大于当前）。</p>';
      return;
    }
    var need = costBetween(from, to);
    if (!need) { wrap.innerHTML = '<p class="tier-note">区间数据缺失。</p>'; return; }
    var p = prodAt(base);
    // credit/data 每分钟 → 每小时 ×60；dust 每小时
    var perHour = p ? {
      credit: p.credit * 60, data: p.data * 60, dust: p.dust
    } : null;
    var cards = [
      { k: "信用点 Credit", v: fmtNum(need.credit), s: perHour ? "≈ " + fmtDur(need.credit / perHour.credit) : "" },
      { k: "经验 EXP", v: fmtNum(need.exp), s: perHour ? "≈ " + fmtDur(need.exp / perHour.data) : "" },
      { k: "核心尘埃 Dust", v: fmtNum(need.dust), s: perHour ? "≈ " + fmtDur(need.dust / perHour.dust) : "" }
    ];
    var html = '<div class="up-grid">';
    cards.forEach(function (c) {
      html += '<div class="up-card"><div class="k">' + c.k + '</div><div class="v">' + c.v +
              '</div><div class="s">按基准基地产出折算 ' + c.s + '</div></div>';
    });
    html += "</div>";
    if (!p) html += '<p class="tier-note">基准等级超出产出表（1~700）。</p>';
    else html += '<p class="tier-note">基准基地 LV' + base + ' 产出/小时：信用点 ' + fmtNum(perHour.credit) +
                 " · 经验 " + fmtNum(perHour.data) + " · 尘埃 " + fmtNum(perHour.dust) + "</p>";
    wrap.innerHTML = html;
  }
  ["up-from", "up-to", "up-base"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", renderUpgrade);
  });

  /* ---------- 首渲染 ---------- */
  renderStone();
  renderTier();
  renderUpgrade();
})();
