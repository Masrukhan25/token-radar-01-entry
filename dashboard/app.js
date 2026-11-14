"use strict";
/* Token Launch Radar — reads window.RADAR (from ../data.js). No network. */
const R = window.RADAR;
const $ = s => document.querySelector(s);
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ESC[c]);
function money(v) {
  if (v == null) return "—";
  const a = Math.abs(v);
  if (a >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return "$" + (v / 1e3).toFixed(1) + "K";
  return "$" + Math.round(v);
}
const full = v => v == null ? "—" : "$" + Math.round(v).toLocaleString("en-US");
const pct = v => v == null ? "—" : (v > 0 ? "+" : "") + v.toFixed(2) + "%";
const age = r => r.age_days == null ? "—" : r.age_days >= 365 ? (r.age_days / 365).toFixed(1) + " th" : r.age_days + " hari";
const band = b => '<span class="badge ' + (b === "Low" ? "low" : b === "High" ? "high" : "med") + '">' + esc(b) + "</span>";
const conf = c => '<span class="dot ' + c.toLowerCase() + '"></span>' + esc(c);
const M = (R && R.model) || {};
const GMED = M.global_median == null ? 0.1689 : M.global_median;

if (!R || !Array.isArray(R.rows)) {
  $("#err").hidden = false;
} else {
  init();
}

function init() {
  const rows = R.rows.slice().sort((a, b) => a.rank - b.rank);
  const live = (R.live || []).slice().sort((a, b) => (b.mcap_usd || 0) - (a.mcap_usd || 0));
  const top = rows.reduce((m, r) => Math.max(m, r.implied_value_usd || 0), 0);
  const bands = { Low: 0, Medium: 0, High: 0 };
  rows.forEach(r => { if (bands[r.risk_band] != null) bands[r.risk_band]++; });
  const totTvl = rows.reduce((s, r) => s + (r.tvl_usd || 0), 0);

  /* ---- summary ---- */
  $("#meta").innerHTML =
    "<span>Snapshot <b>" + esc(R.as_of || "—") + "</b></span>" +
    "<span>Sumber: <b>" + esc(R.source || "—") + "</b></span>" +
    "<span>Floor watchlist: <b>" + money(R.floor_usd) + "</b></span>" +
    "<span>Model: <b>" + esc(R.model_version || M.version || "—") + "</b></span>";
  $("#stats").innerHTML =
    stat("Protokol di board", rows.length, "pre-token, diranking") +
    stat("Watchlist", R.watchlist_size != null ? R.watchlist_size : "—", "floor " + money(R.floor_usd) + ", cakupan 100%") +
    stat("Total TVL board", money(totTvl), "dari " + rows.length + " protokol") +
    stat("Implied tertinggi", money(top), "peringkat 1 board", true) +
    stat("Pembanding bertoken", live.length, "market cap asli, di luar ranking");
  $("#mver").textContent = R.model_version || M.version || "—";
  $("#asof").textContent = R.as_of || "—";

  /* ---- charts ---- */
  barChart($("#chart-risk"), [["Low", bands.Low, "#16a34a"], ["Medium", bands.Medium, "#d97706"], ["High", bands.High, "#dc2626"]], "protokol");
  const top10 = rows.slice().sort((a, b) => b.implied_value_usd - a.implied_value_usd).slice(0, 10);
  barChart($("#chart-top"), top10.map(r => [r.name, r.implied_value_usd, "#4f46e5"]), null, money);

  /* ---- filters ---- */
  fillSelect($("#f-chain"), rows.flatMap(r => r.chains || []));
  fillSelect($("#f-cat"), rows.map(r => r.category).filter(Boolean));
  const F = { q: "", chain: "", cat: "", tvl: "", risk: "", sort: "implied_value_usd:desc" };
  const readF = () => {
    F.q = $("#f-q").value.trim().toLowerCase();
    F.chain = $("#f-chain").value; F.cat = $("#f-cat").value;
    F.tvl = $("#f-tvl").value; F.risk = $("#f-risk").value; F.sort = $("#f-sort").value;
  };
  const apply = () => {
    readF();
    let list = rows.filter(r => {
      if (F.q && (r.name + " " + r.slug).toLowerCase().indexOf(F.q) < 0) return false;
      if (F.chain && !(r.chains || []).includes(F.chain)) return false;
      if (F.cat && r.category !== F.cat) return false;
      if (F.risk && r.risk_band !== F.risk) return false;
      if (F.tvl === "s" && !(r.tvl_usd < 25e6)) return false;
      if (F.tvl === "m" && !(r.tvl_usd >= 25e6 && r.tvl_usd < 100e6)) return false;
      if (F.tvl === "l" && !(r.tvl_usd >= 100e6)) return false;
      return true;
    });
    const [key, dir] = F.sort.split(":");
    list = list.slice().sort((a, b) => cmp(a[key], b[key], dir));
    renderTable(list);
    $("#count").textContent = list.length + " dari " + rows.length + " protokol terlihat" +
      (list.length !== rows.length ? " — filter aktif" : "");
    document.querySelectorAll("#board th[data-sort]").forEach(th => {
      th.classList.toggle("sorted", th.dataset.sort === key);
      th.textContent = th.textContent.replace(/ [↑↓]$/, "") + (th.dataset.sort === key ? (dir === "desc" ? " ↓" : " ↑") : "");
    });
  };
  ["f-q", "f-chain", "f-cat", "f-tvl", "f-risk", "f-sort"].forEach(id =>
    $("#" + id).addEventListener("input", apply));
  $("#f-reset").addEventListener("click", () => {
    $("#f-q").value = ""; $("#f-chain").value = ""; $("#f-cat").value = "";
    $("#f-tvl").value = ""; $("#f-risk").value = ""; $("#f-sort").value = "implied_value_usd:desc";
    apply();
  });
  document.querySelectorAll("#board th[data-sort]").forEach(th => th.addEventListener("click", () => {
    const k = th.dataset.sort;
    const cur = $("#f-sort").value.split(":");
    $("#f-sort").value = k + ":" + (cur[0] === k && cur[1] === "desc" ? "asc" : "desc");
    apply();
  }));
  apply();

  /* ---- detail ---- */
  $("#tbody").addEventListener("click", e => {
    const tr = e.target.closest("tr[data-slug]");
    if (tr) openDetail(tr.dataset.slug);
  });
  $("#back").addEventListener("click", () => show("board"));
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => show(b.dataset.view)));

  renderLive(live);
  renderModel();
}

function stat(k, v, s, hot) {
  return '<div class="stat' + (hot ? " hot" : "") + '"><div class="k">' + k + '</div><div class="v">' + v + '</div><div class="s">' + esc(s) + "</div></div>";
}
function fillSelect(sel, vals) {
  [...new Set(vals)].sort().forEach(v => {
    const o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o);
  });
}
function cmp(a, b, dir) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const d = typeof a === "string" ? a.localeCompare(b) : a - b;
  return dir === "desc" ? -d : d;
}
function renderTable(list) {
  $("#tbody").innerHTML = list.map(r =>
    '<tr data-slug="' + esc(r.slug) + '"><td>' + r.rank + "</td>" +
    '<td><span class="name">' + esc(r.name) + '</span><br><span class="slug">' + esc(r.slug) + "</span></td>" +
    '<td><span class="chips">' + (r.chains || []).slice(0, 3).map(c => '<span class="chip">' + esc(c) + "</span>").join("") +
    ((r.chains || []).length > 3 ? '<span class="chip">+' + ((r.chains || []).length - 3) + "</span>" : "") + "</span></td>" +
    "<td>" + esc(r.category || "—") + "</td>" +
    '<td class="num">' + money(r.tvl_usd) + "</td>" +
    '<td class="num"><strong>' + money(r.implied_value_usd) + "</strong></td>" +
    '<td class="num ' + (r.change_7d > 0 ? "up" : r.change_7d < 0 ? "down" : "") + '">' + pct(r.change_7d) + "</td>" +
    '<td class="num">' + age(r) + "</td>" +
    '<td class="num">' + band(r.risk_band) + ' <span class="hint">' + r.risk_score + "</span></td>" +
    '<td><button type="button" class="btn small">Detail</button></td></tr>'
  ).join("") || '<tr><td colspan="10">Tidak ada protokol yang cocok dengan filter.</td></tr>';
}

/* ---- SVG bar charts (inline, built from data) ---- */
function barChart(el, data, unit, fmt) {
  const W = 560, rowH = 30, max = Math.max.apply(null, data.map(d => d[1])) || 1;
  let y = 8, s = '<svg viewBox="0 0 ' + W + " " + (data.length * rowH + 16) + '" role="img">';
  data.forEach(d => {
    const w = Math.max(2, (d[1] / max) * 300);
    const label = d[0].length > 22 ? d[0].slice(0, 21) + "…" : d[0];
    s += '<text class="bar-label" x="0" y="' + (y + 13) + '">' + esc(label) + "</text>" +
      '<rect x="150" y="' + y + '" width="' + w.toFixed(1) + '" height="18" rx="4" fill="' + d[2] + '"/>' +
      '<text class="bar-val" x="' + (158 + w) + '" y="' + (y + 13) + '">' + (fmt ? fmt(d[1]) : d[1] + " " + (unit || "")) + "</text>";
    y += rowH;
  });
  el.innerHTML = s + "</svg>";
}

/* ---- detail view ---- */
function openDetail(slug) {
  const r = R.rows.find(x => x.slug === slug);
  if (!r) return;
  const mult = r.category_multiple;
  const thin = (M.multiples || []).find(m => m.category === r.category);
  const thinNote = thin && thin.n <= 3 ? ' <span class="tag thin">kalibrasi tipis (n = ' + thin.n + ")</span>" : "";
  const missing = [];
  if (r.change_7d == null) missing.push("change_7d");
  if (r.listed_at == null) missing.push("listed_at");
  const reasons = riskReasons(r);
  $("#detail").innerHTML =
    '<div class="card"><div class="dhead"><h2>#' + r.rank + " " + esc(r.name) + "</h2>" + band(r.risk_band) +
    '<span class="hint">risiko ' + r.risk_score + "/100 · confidence " + conf(r.confidence) + "</span></div>" +
    '<p class="hint">' + esc(r.slug) + " · " + esc(r.category || "tanpa kategori") + " · tercatat sejak " + esc(r.listed_at || "tidak diketahui") + "</p>" +
    '<div class="kv">' +
    kv("TVL", money(r.tvl_usd), full(r.tvl_usd)) +
    kv("Implied value", money(r.implied_value_usd), full(r.implied_value_usd)) +
    kv("Pertumbuhan 7 hari", pct(r.change_7d), r.change_7d == null ? "tidak dilaporkan" : "perubahan TVL") +
    kv("Umur", age(r), r.age_days == null ? "listed_at tidak ada" : r.age_days + " hari tanpa token") +
    "</div>" +
    '<div class="chips">' + (r.chains || []).map(c => '<span class="chip">' + esc(c) + "</span>").join("") + "</div></div>" +

    '<div class="card"><h2>Breakdown nilai implied — <code>impliedValue</code></h2>' +
    '<table class="break"><thead><tr><th>Faktor</th><th class="num">Nilai</th><th>Artinya</th></tr></thead><tbody>' +
    "<tr><td>TVL</td><td class=\"num\">" + full(r.tvl_usd) + "</td><td>Nilai yang dikelola protokol saat ini.</td></tr>" +
    "<tr><td>Multiple kategori (" + esc(r.category || "—") + ")" + thinNote + "</td><td class=\"num\">× " + (mult == null ? "—" : mult.toFixed(4)) + "</td><td>" + multipleNote(r) + "</td></tr>" +
    "<tr><td>Pengali growth (7 hari " + pct(r.change_7d) + ")</td><td class=\"num\">× " + (r.growth_multiplier == null ? "—" : r.growth_multiplier.toFixed(5)) + "</td><td>Pertumbuhan dijepit −60% s.d. +120% dan dibobot setengah; " + (r.change_7d == null ? "tanpa data, netral (×1)." : "satu minggu berisik, jadi efeknya dibatasi.") + "</td></tr>" +
    "<tr><td>Pengali maturity (" + age(r) + ")</td><td class=\"num\">× " + (r.maturity_multiplier == null ? "—" : r.maturity_multiplier.toFixed(5)) + "</td><td>Naik linier 0,60 → 1,00 selama 3 tahun tanpa token; umur lebih panjang = rekor lebih teruji.</td></tr>" +
    "<tr class=\"total\"><td>Implied value</td><td class=\"num\">" + full(r.implied_value_usd) + "</td><td>TVL × multiple × growth × maturity, dibulatkan ke dolar terdekat.</td></tr>" +
    "</tbody></table></div>" +

    '<div class="card"><h2>Thesis peluncuran token</h2><p>' + thesis(r) + "</p></div>" +

    '<div class="card"><h2>Farm plan</h2>' +
    '<p class="honest"><strong>Pernyataan kejujuran:</strong> snapshot tidak membawa data program poin, program airdrop, tanggal peluncuran token, atau syarat kelayakan apa pun. Tidak ada langkah di bawah ini yang mengklaim ada program yang “confirmed” atau “dijamin”. Langkah bertanda <span class="tag spec">[Spekulatif]</span> bertumpu pada asumsi “jika suatu hari ada program”.</p>' +
    (missing.length ? '<p class="honest"><strong>Data tidak lengkap:</strong> ' + missing.join(" dan ") + " hilang di snapshot untuk protokol ini — perlakukan semua angka di halaman ini sebagai perkiraan dan verifikasi TVL live sebelum bertransaksi.</p>" : "") +
    '<ol class="steps">' + (r.farm_steps || []).map(step => {
      const spec = step.indexOf("[Spekulatif]") === 0;
      const txt = spec ? step.slice(13).trim() : step;
      return "<li><span>" + (spec ? '<span class="tag spec">[Spekulatif]</span> ' : "") + esc(txt) + "</span></li>";
    }).join("") + "</ol></div>" +

    '<div class="card"><h2>Penilaian risiko</h2><div class="riskgrid"><div>' +
    "<p>Skor <strong>" + r.risk_score + "/100</strong> — pita " + band(r.risk_band) + ". Confidence data: <strong>" + esc(r.confidence) + "</strong>.</p>" +
    "<ul>" + reasons.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul></div><div>" +
    "<p><strong>Yang perlu diwaspadai sebelum memakai protokol ini:</strong></p><ul>" +
    "<li>Dana yang dideposit terkunci di smart contract protokol; bug atau eksploitasi dapat menghilangkannya.</li>" +
    "<li>Jangan memakai leverage kecuali langkah farm menyebutkannya secara eksplisit.</li>" +
    "<li>Satu wallet per orang — membuat banyak wallet untuk memanipulasi kelayakan adalah pola sybil dan dapat didiskualifikasi.</li>" +
    "<li>Implied value bukan harga dan bukan janji token akan diluncurkan.</li></ul></div></div></div>";
  show("detail");
  window.scrollTo(0, 0);
}
function kv(k, v, s) {
  return '<div class="cell"><div class="k">' + k + '</div><div class="v">' + v + '</div><div class="s">' + esc(s) + "</div></div>";
}
function multipleNote(r) {
  const m = r.category_multiple;
  if (m == null) return "Tidak ada multiple kategori; memakai median global.";
  if (m > GMED * 1.5) return "Pasar menghargai TVL kategori ini jauh di atas rata-rata (median global " + GMED + ").";
  if (m < GMED * 0.7) return "Pasar menghargai TVL kategori ini jauh di bawah rata-rata (median global " + GMED + ").";
  return "Sekitar median global " + GMED + " — kategori ini dihargai pasar wajar.";
}
function thesis(r) {
  const s = [];
  s.push(esc(r.name) + " mengelola " + full(r.tvl_usd) + " di " + (r.chains || []).length + " rantai sebagai " + esc(r.category || "protokol tanpa kategori") +
    ", dan model menilainya " + full(r.implied_value_usd) + " — peringkat " + r.rank + " dari " + R.rows.length + " di board.");
  const m = r.category_multiple;
  if (m != null && m > GMED * 1.5) s.push("Klaim ini terutama didorong kategori: multiple " + m.toFixed(4) + " jauh di atas median global " + GMED + ", jadi satu dolar TVL-nya dihargai pasar lebih mahal daripada protokol kebanyakan.");
  else if (m != null && m < GMED * 0.7) s.push("Klaim ini justru ditekan kategori: multiple " + m.toFixed(4) + " jauh di bawah median global " + GMED + ", jadi TVL besarnya tidak diterjemahkan menjadi nilai token yang besar — dan itu adalah pembeda utama model ini.");
  else s.push("Multiple kategorinya dekat dengan median global, jadi nilainya sebagian besar mengikuti ukuran TVL-nya sendiri.");
  if (r.change_7d != null && r.change_7d >= 5) s.push("Momentumnya mendukung: TVL naik " + pct(r.change_7d) + " dalam 7 hari, sehingga pengali growth di atas 1.");
  else if (r.change_7d != null && r.change_7d <= -15) s.push("Momentumnya melemah: TVL turun " + pct(r.change_7d) + " dalam 7 hari, tetapi jepit growth membatasi hukumannya — satu minggu buruk tidak menghapus rekor panjangnya.");
  else if (r.change_7d == null) s.push("Pertumbuhan 7 harinya tidak dilaporkan, jadi komponen growth netral dan penilaiannya bertumpu pada TVL, kategori, dan umur.");
  if (r.age_days != null && r.age_days >= 1095) s.push("Dengan umur " + age(r) + " tanpa token, ia mendapat pengali maturitas penuh — rekornya sudah melewati setidaknya satu siklus pasar.");
  else if (r.age_days != null && r.age_days < 90) s.push("Ia masih sangat muda (" + age(r) + "), jadi pengali maturitasnya rendah dan confidence-nya Low — angka ini lebih rapuh daripada peringkatnya.");
  else s.push("Umurnya " + age(r) + " memberi pengali maturitas menengah — cukup lama untuk dipercaya, belum cukup lama untuk mendapat nilai penuh.");
  return s.join(" ");
}
function riskReasons(r) {
  const out = [];
  if (r.tvl_usd < 1e7) out.push("TVL di bawah $10 jt: likuiditas tipis dan mudah ditinggalkan.");
  else if (r.tvl_usd < 25e6) out.push("TVL $10–25 jt: masih kecil untuk ukuran board.");
  else if (r.tvl_usd < 5e7) out.push("TVL $25–50 jt: menengah, di bawah floor watchlist.");
  else out.push("TVL di atas $50 jt: ukuran memberi bantalan likuiditas.");
  if (r.change_7d == null) out.push("Momentum 7 hari tidak diketahui — tidak bisa dinilai.");
  else if (r.change_7d <= -25) out.push("TVL turun tajam " + pct(r.change_7d) + " dalam seminggu.");
  else if (r.change_7d >= 100) out.push("Lonjakan ekstrem " + pct(r.change_7d) + " — biasanya insentif sesaat, bukan pertumbuhan organik.");
  if (r.age_days == null) out.push("Umur tidak diketahui (listed_at hilang).");
  else if (r.age_days < 90) out.push("Berumur kurang dari 90 hari — belum teruji satu kuartal.");
  else if (r.age_days < 365) out.push("Berumur kurang dari setahun — masih muda.");
  const n = (r.chains || []).length;
  if (n === 1) out.push("Hanya di satu rantai (" + esc((r.chains || [])[0] || "") + "): outage rantai itu adalah seluruh eksposur.");
  else if (n >= 10) out.push("Tersebar di " + n + " rantai: permukaan smart contract dan jembatan makin besar.");
  if (["Derivatives", "Leveraged Farming", "Restaking", "CDP", "Stablecoin Wrapper", "Dual-Token Stablecoin"].includes(r.category))
    out.push("Kategori " + r.category + ": risiko leverage, likuidasi, slashing, atau depeg.");
  if (["Prediction Market", "Chain"].includes(r.category))
    out.push("Kategori " + r.category + ": risiko penyelesaian pasar atau risiko rantai dasar.");
  if (!out.length) out.push("Tidak ada penanda risiko besar dari field snapshot.");
  return out;
}

/* ---- live comparators ---- */
function renderLive(live) {
  $("#livebody").innerHTML = live.map(p =>
    "<tr><td><span class=\"name\">" + esc(p.name) + '</span><br><span class="slug">' + esc(p.slug) + "</span></td>" +
    "<td>" + esc(p.category || "—") + "</td>" +
    '<td><span class="chips">' + (p.chains || []).slice(0, 3).map(c => '<span class="chip">' + esc(c) + "</span>").join("") + "</span></td>" +
    '<td class="num">' + money(p.tvl_usd) + "</td>" +
    '<td class="num"><strong>' + money(p.mcap_usd) + "</strong></td>" +
    '<td class="num">' + (p.mcap_usd && p.tvl_usd ? (p.mcap_usd / p.tvl_usd).toFixed(4) : "—") + "</td>" +
    '<td class="num ' + (p.change_7d > 0 ? "up" : p.change_7d < 0 ? "down" : "") + '">' + pct(p.change_7d) + "</td></tr>"
  ).join("");
}

/* ---- model view ---- */
function renderModel() {
  $("#formula").textContent = M.formula || "impliedValue = TVL × multiple(category) × growth(change_7d) × maturity(ageDays)";
  $("#formula-note").textContent = M.formula_note || "";
  $("#gmed").textContent = GMED;
  $("#pk").textContent = M.prior_k == null ? 5 : M.prior_k;
  $("#clamp").textContent = (M.clamp_min == null ? 0.02 : M.clamp_min) + "–" + (M.clamp_max == null ? 1.5 : M.clamp_max);
  const mults = (M.multiples || []).slice().sort((a, b) => b.multiple - a.multiple);
  $("#calibbody").innerHTML = mults.map(m =>
    "<tr><td>" + esc(m.category) + "</td>" +
    '<td class="num">' + m.n + "</td>" +
    '<td class="num">' + (m.median == null ? "—" : m.median.toFixed(4)) + "</td>" +
    '<td class="num"><strong>' + m.multiple.toFixed(4) + "</strong></td>" +
    "<td>" + (m.n <= 3 ? '<span class="tag thin">kalibrasi tipis</span>' : m.multiple >= (M.clamp_max == null ? 1.5 : M.clamp_max) ? '<span class="tag thin">terjepit batas atas</span>' : "—") + "</td></tr>"
  ).join("");
}

/* ---- navigation ---- */
function show(view) {
  document.querySelectorAll(".view").forEach(v => { v.hidden = v.id !== "view-" + view; });
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.view === view || (view === "detail" && b.dataset.view === "board")));
}
