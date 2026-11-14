// lib/model.ts — Token Launch Radar: model nilai implied, skor risiko,
// confidence, farm plan, dan pemeriksaan board internal.
//
// Semua angka dihitung dari snapshot yang diberikan (DefiLlama, as_of dari
// snapshot itu sendiri). Tidak ada daftar nama protokol di dalam rumus,
// tidak ada tanggal berjalan, tidak ada angka acak, tidak ada network.
// Spesifikasi: MODEL.md di root entry ini.

export interface Protocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: Protocol[];
  watchlist: string[];
}

export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  category_multiple: number;
  risk_score: number;
  risk_band: string;
  confidence: string;
  farm_steps: string[];
}

export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number;
  change_7d: number | null;
}

export interface CategoryCalibration {
  category: string | null;
  calibration_n: number;
  median_ratio: number | null;
  multiple: number;
}

/** Bentuk yang dibaca dashboard untuk tabel kalibrasi (app.js renderModel). */
export interface MultipleCalibration {
  category: string | null;
  n: number;
  median: number | null;
  multiple: number;
}

export interface ModelInfo {
  formula: string;
  formula_note: string;
  global_median: number;
  shrink_prior_k: number;
  prior_k: number;
  multiple_min: number;
  multiple_max: number;
  clamp_min: number;
  clamp_max: number;
  growth_weight: number;
  growth_clamp_min: number;
  growth_clamp_max: number;
  maturity_base: number;
  maturity_cap_days: number;
  missing_listed_age_days: number;
  thin_calibration_max_n: number;
  categories: CategoryCalibration[];
  multiples: MultipleCalibration[];
  honesty_note: string;
}

export interface BoardData {
  as_of: string;
  source: string;
  floor_usd: number;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  live_size: number;
  model: ModelInfo;
  rows: BoardRow[];
  live: LiveRow[];
}

export interface Calibration {
  globalMedian: number;
  byCategory: Map<string | null, { n: number; median: number | null; multiple: number }>;
}

export const MODEL_VERSION = '1.0.0';

// Konstanta kalibrasi dan rumus (MODEL.md bagian 4).
export const SHRINK_PRIOR_K = 5;
export const MULTIPLE_MIN = 0.02;
export const MULTIPLE_MAX = 1.5;
export const GROWTH_WEIGHT = 0.5;
export const GROWTH_CLAMP_MIN = -60;
export const GROWTH_CLAMP_MAX = 120;
export const MATURITY_BASE = 0.6;
export const MATURITY_CAP_DAYS = 1095;
export const MISSING_LISTED_AGE_DAYS = 365;
export const THIN_CALIBRATION_MAX_N = 3;
export const LIVE_COMPARATOR_COUNT = 12;

// ---------------------------------------------------------------- util

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n % 2 === 1) return sorted[(n - 1) / 2] as number;
  return ((sorted[n / 2 - 1] as number) + (sorted[n / 2] as number)) / 2;
}

/** Hari kalender UTC antara dua tanggal YYYY-MM-DD (bisa negatif). */
export function daysBetween(fromYmd: string, toYmd: string): number {
  const parse = (s: string): number => {
    const [y, m, d] = s.split('-').map((t) => Number(t));
    return Date.UTC(y as number, (m as number) - 1, d as number);
  };
  return Math.round((parse(toYmd) - parse(fromYmd)) / 86400000);
}

/** Umur protokol dalam hari dari listed_at ke as_of; null bila listed_at null. */
export function ageDays(listedAt: string | null, asOf: string): number | null {
  if (listedAt === null) return null;
  return daysBetween(listedAt, asOf);
}

// ---------------------------------------------------------------- validasi snapshot

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function fail(msg: string): never {
  throw new Error(`snapshot tidak valid: ${msg}`);
}

/** Mem-parsing dan memvalidasi bentuk snapshot; melempar Error bila cacat. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail('bukan JSON yang valid');
  }
  if (!isRecord(raw)) fail('dokumen harus berupa objek JSON');
  const asOf = raw.as_of;
  if (typeof asOf !== 'string' || !DATE_RE.test(asOf) || Number.isNaN(Date.parse(asOf + 'T00:00:00Z'))) {
    fail('as_of harus tanggal YYYY-MM-DD yang valid');
  }
  if (typeof raw.source !== 'string' || raw.source.length === 0) fail('source harus string tak kosong');
  if (typeof raw.floor_usd !== 'number' || !Number.isFinite(raw.floor_usd) || raw.floor_usd < 0) {
    fail('floor_usd harus bilangan berhingga >= 0');
  }
  if (!Array.isArray(raw.protocols)) fail('protocols harus array');
  if (!Array.isArray(raw.watchlist)) fail('watchlist harus array');
  const seen = new Set<string>();
  const protocols: Protocol[] = raw.protocols.map((entry, i) => {
    if (!isRecord(entry)) fail(`protocols[${i}] harus objek`);
    const slug = entry.slug;
    const name = entry.name;
    if (typeof slug !== 'string' || slug.length === 0 || /\s/.test(slug)) fail(`protocols[${i}].slug harus string tak kosong tanpa spasi`);
    if (seen.has(slug)) fail(`slug duplikat: ${slug}`);
    seen.add(slug);
    if (typeof name !== 'string' || name.length === 0) fail(`protocols[${i}].name harus string tak kosong`);
    const category = entry.category;
    if (category !== null && typeof category !== 'string') fail(`protocols[${i}].category harus string atau null`);
    const chains = entry.chains;
    if (!Array.isArray(chains) || chains.some((c) => typeof c !== 'string' || c.length === 0)) {
      fail(`protocols[${i}].chains harus array string tak kosong`);
    }
    const tvl = entry.tvl_usd;
    if (typeof tvl !== 'number' || !Number.isFinite(tvl) || tvl < 0) fail(`protocols[${i}].tvl_usd harus bilangan >= 0`);
    const change = entry.change_7d;
    if (change !== null && (typeof change !== 'number' || !Number.isFinite(change))) {
      fail(`protocols[${i}].change_7d harus bilangan atau null`);
    }
    const mcap = entry.mcap_usd;
    // mcap boleh negatif: snapshot membawa satu sentinel -1 (AUTOfinance),
    // dan kalibrasi MODEL.md menghitungnya apa adanya (n = 144 termasuk dia).
    if (mcap !== null && (typeof mcap !== 'number' || !Number.isFinite(mcap))) {
      fail(`protocols[${i}].mcap_usd harus bilangan atau null`);
    }
    const listed = entry.listed_at;
    if (listed !== null && (typeof listed !== 'string' || !DATE_RE.test(listed))) {
      fail(`protocols[${i}].listed_at harus tanggal YYYY-MM-DD atau null`);
    }
    const gecko = entry.gecko_id;
    const symbol = entry.symbol;
    if (gecko !== null && typeof gecko !== 'string') fail(`protocols[${i}].gecko_id harus string atau null`);
    if (symbol !== null && typeof symbol !== 'string') fail(`protocols[${i}].symbol harus string atau null`);
    return {
      slug,
      name,
      category: category as string | null,
      chains: chains as string[],
      tvl_usd: tvl,
      change_7d: change as number | null,
      mcap_usd: mcap as number | null,
      listed_at: listed as string | null,
      gecko_id: gecko as string | null,
      symbol: symbol as string | null,
    };
  });
  const watchlist: string[] = raw.watchlist.map((entry, i) => {
    if (typeof entry !== 'string' || entry.length === 0) fail(`watchlist[${i}] harus string tak kosong`);
    if (!seen.has(entry)) fail(`watchlist[${i}] (${entry}) tidak ada di protocols`);
    return entry;
  });
  return { as_of: asOf, source: raw.source, floor_usd: raw.floor_usd, protocols, watchlist };
}

// ---------------------------------------------------------------- kalibrasi multiple

/**
 * Kalibrasi multiple per kategori dari snapshot itu sendiri: untuk setiap
 * protokol yang punya mcap_usd tercatat, rasio mcap_usd / tvl_usd; median
 * per kategori disusutkan ke median global dengan prior k = 5, lalu dijepit
 * ke [0,02, 1,50]. Kategori tanpa sampel (atau null) memakai median global.
 */
export function calibrate(protocols: Protocol[]): Calibration {
  const withMcap = protocols.filter((p) => p.mcap_usd !== null);
  const globalMedian = median(withMcap.map((p) => (p.mcap_usd as number) / p.tvl_usd)) as number;
  const buckets = new Map<string | null, number[]>();
  for (const p of withMcap) {
    const key = p.category;
    const list = buckets.get(key);
    if (list) list.push((p.mcap_usd as number) / p.tvl_usd);
    else buckets.set(key, [(p.mcap_usd as number) / p.tvl_usd]);
  }
  const byCategory = new Map<string | null, { n: number; median: number | null; multiple: number }>();
  for (const [category, ratios] of buckets) {
    const med = median(ratios) as number;
    const multiple = clamp(
      (ratios.length * med + SHRINK_PRIOR_K * globalMedian) / (ratios.length + SHRINK_PRIOR_K),
      MULTIPLE_MIN,
      MULTIPLE_MAX,
    );
    byCategory.set(category, { n: ratios.length, median: med, multiple });
  }
  return { globalMedian, byCategory };
}

export function categoryMultiple(calibration: Calibration, category: string | null): number {
  const entry = calibration.byCategory.get(category);
  if (!entry) return calibration.globalMedian;
  return entry.multiple;
}

// ---------------------------------------------------------------- rumus implied

/** Pengali pertumbuhan: 1 + 0,5 x change_7d yang dijepit ke [-60, +120]; null -> 1. */
export function growthMultiplier(change7d: number | null): number {
  if (change7d === null) return 1;
  return 1 + GROWTH_WEIGHT * (clamp(change7d, GROWTH_CLAMP_MIN, GROWTH_CLAMP_MAX) / 100);
}

/** Pengali maturitas: 0,6 + 0,4 x min(umur, 1095) / 1095; umur null -> 365 hari. */
export function maturityMultiplier(age: number | null): number {
  const effective = age === null ? MISSING_LISTED_AGE_DAYS : age;
  return MATURITY_BASE + (1 - MATURITY_BASE) * (Math.min(effective, MATURITY_CAP_DAYS) / MATURITY_CAP_DAYS);
}

export interface ImpliedBreakdown {
  value: number;
  multiple: number;
  growth: number;
  maturity: number;
  age: number | null;
}

/** impliedValue = TVL x multiple(kategori) x growth(change_7d) x maturity(umur). */
export function impliedValue(p: Protocol, calibration: Calibration, asOf: string): ImpliedBreakdown {
  const age = ageDays(p.listed_at, asOf);
  const multiple = categoryMultiple(calibration, p.category);
  const growth = growthMultiplier(p.change_7d);
  const maturity = maturityMultiplier(age);
  return {
    value: Math.round(p.tvl_usd * multiple * growth * maturity),
    multiple,
    growth,
    maturity,
    age,
  };
}

// ---------------------------------------------------------------- keanggotaan board

export function isPreToken(p: Protocol): boolean {
  return p.gecko_id === null && p.symbol === null;
}

const VERSION_SUFFIX_RE = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
const DERIVATIVE_WORD_RE = /\bwrapped\b|\bstaked\b|\bstaking\b/i;
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC']);
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/**
 * Aturan board (MODEL.md bagian 2): tidak mencatat token, bukan CEX, nama
 * tidak berakhiran penanda versi, bukan produk wrapped/staked/bridge dan
 * bukan diawali nama bursa. Watchlist dibaca apa adanya dari snapshot —
 * aturan ini hanya menentukan baris tambahan di luar watchlist.
 */
export function isBoardEligible(p: Protocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category === 'CEX') return false;
  if (VERSION_SUFFIX_RE.test(p.name)) return false;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (DERIVATIVE_WORD_RE.test(p.name)) return false;
  if (EXCHANGE_PREFIXES.some((prefix) => p.name.startsWith(prefix))) return false;
  return true;
}

// ---------------------------------------------------------------- risiko & confidence

const HIGH_RISK_STRUCTURAL = new Set([
  'Derivatives',
  'Leveraged Farming',
  'Restaking',
  'CDP',
  'Stablecoin Wrapper',
  'Dual-Token Stablecoin',
]);
const MEDIUM_RISK_STRUCTURAL = new Set(['Prediction Market', 'Chain']);

/** Skor risiko 0-100 (MODEL.md 6.1); makin besar makin berisiko. */
export function riskScore(p: Protocol, age: number | null): number {
  let score = 0;
  if (p.tvl_usd < 10_000_000) score += 25;
  else if (p.tvl_usd < 25_000_000) score += 15;
  else if (p.tvl_usd < 50_000_000) score += 5;
  if (p.change_7d === null) score += 15;
  else if (p.change_7d <= -25) score += 15;
  else if (p.change_7d <= -15) score += 5;
  else if (p.change_7d >= 100) score += 10;
  if (age === null) score += 15;
  else if (age < 90) score += 15;
  else if (age < 365) score += 5;
  if (p.chains.length === 1) score += 10;
  else if (p.chains.length >= 10) score += 5;
  if (p.category !== null && HIGH_RISK_STRUCTURAL.has(p.category)) score += 10;
  else if (p.category !== null && MEDIUM_RISK_STRUCTURAL.has(p.category)) score += 5;
  return Math.min(100, score);
}

export function riskBand(score: number): string {
  if (score >= 50) return 'High';
  if (score >= 25) return 'Medium';
  return 'Low';
}

/**
 * Confidence kelengkapan data (MODEL.md 6.2). Low didahulukan: protokol muda
 * (umur < 90 hari), TVL kecil (< $10 juta), atau dua field hilang sekaligus
 * tetap Low walau field lain lengkap dan TVL besar.
 */
export function confidenceLevel(p: Protocol, age: number | null): string {
  const low =
    (p.change_7d === null && p.listed_at === null) ||
    p.tvl_usd < 10_000_000 ||
    (age !== null && age < 90);
  if (low) return 'Low';
  const high = p.change_7d !== null && p.listed_at !== null && p.tvl_usd >= 50_000_000;
  if (high) return 'High';
  return 'Medium';
}

// ---------------------------------------------------------------- farm plan

type Tier = 'S' | 'M' | 'L';

function capitalTier(tvlUsd: number): Tier {
  if (tvlUsd < 25_000_000) return 'S';
  if (tvlUsd < 100_000_000) return 'M';
  return 'L';
}

const TIER_AMOUNTS: Record<Tier, { trial: string; main: string }> = {
  S: { trial: '$25–$100', main: '$100–$500' },
  M: { trial: '$50–$200', main: '$200–$1.000' },
  L: { trial: '$100–$500', main: '$500–$2.500' },
};

// Perkiraan biaya gas tipikal per interaksi, kondisi normal (MODEL.md 7.4).
// Bukan data snapshot: selalu ditulis sebagai rentang, bukan angka pasti.
const GAS_BY_CHAIN: Record<string, string> = {
  Ethereum: 'gas Ethereum $1–$15',
  Solana: 'gas Solana di bawah $0,05',
  Base: 'gas Base $0,05–$1',
  Arbitrum: 'gas Arbitrum $0,05–$1',
  Optimism: 'gas Optimism $0,05–$1',
  Unichain: 'gas Unichain $0,05–$1',
  Binance: 'gas BNB Chain $0,10–$1',
  Avalanche: 'gas Avalanche $0,05–$1',
  Polygon: 'gas Polygon $0,05–$1',
  Sui: 'gas Sui $0,05–$1',
  Aptos: 'gas Aptos $0,05–$1',
  Monad: 'gas Monad $0,05–$2',
  Plasma: 'gas Plasma $0,05–$2',
  'Hyperliquid L1': 'gas Hyperliquid L1 $0,05–$2',
  Ink: 'gas Ink $0,05–$2',
  Katana: 'gas Katana $0,05–$2',
  Arc: 'gas Arc $0,05–$2',
  Tempo: 'gas Tempo $0,05–$2',
  Stable: 'gas Stable $0,05–$2',
  'Robinhood Chain': 'gas Robinhood Chain $0,05–$2',
  Bitcoin: 'biaya on-chain Bitcoin bervariasi (bayar per byte)',
  Tron: 'gas Tron $0,50–$3',
};

// Urutan murah -> mahal untuk memilih rantai termurah yang didukung protokol.
const CHAIN_COST_RANK: Record<string, number> = {
  Solana: 1,
  Base: 2,
  Arbitrum: 2,
  Optimism: 2,
  Unichain: 2,
  Avalanche: 2,
  Polygon: 2,
  Sui: 2,
  Aptos: 2,
  Binance: 2,
  Monad: 3,
  Plasma: 3,
  'Hyperliquid L1': 3,
  Ink: 3,
  Katana: 3,
  Arc: 3,
  Tempo: 3,
  Stable: 3,
  'Robinhood Chain': 3,
  Tron: 4,
  Ethereum: 5,
  Bitcoin: 6,
};

/** Rantai termurah dari daftar chains protokol (seri: urutan pertama menang). */
export function cheapestChain(chains: string[]): string {
  let best = chains[0] as string;
  let bestRank = CHAIN_COST_RANK[best] ?? 3;
  for (const chain of chains) {
    const rank = CHAIN_COST_RANK[chain] ?? 3;
    if (rank < bestRank) {
      best = chain;
      bestRank = rank;
    }
  }
  return best;
}

function gasText(chain: string): string {
  return GAS_BY_CHAIN[chain] ?? `gas ${chain} $0,05–$2`;
}

/** Satu kalimat risiko spesifik kategori, untuk langkah risiko generik. */
function categoryRiskSentence(p: Protocol): string {
  switch (p.category) {
    case 'Restaking':
      return 'Risiko slashing: 1 validator yang buruk dapat memotong sebagian dana yang di-stake ulang.';
    case 'Prediction Market':
      return 'Risiko penyelesaian pasar: 1 pasar dapat diselesaikan di luar perkiraan jika oracle atau juri memutuskan lain.';
    case 'Insurance':
      return 'Risiko klaim: 1 klaim dapat ditolak jika peristiwa tidak memenuhi syarat polis.';
    case 'Staking Pool':
      return 'Risiko staking: penarikan dapat antre 1–7 hari dan imbal hasil bergantung pada validator.';
    case 'Liquidity Manager':
      return 'Risiko rentang likuiditas: 1 posisi di luar rentang berhenti menghasilkan fee dan menanggung impermanent loss.';
    case 'Payments':
      return 'Risiko pembayaran: dana yang dikirim ke 1 alamat yang salah tidak dapat ditarik kembali.';
    case 'Indexes':
      return 'Risiko indeks: nilai indeks mengikuti keranjang asetnya dan dapat jatuh bersama pasar dalam 1 minggu.';
    case 'Collateral Markets':
      return 'Risiko agunan: 1 agunan yang jatuh nilainya dapat dilikuidasi jika rasio melewati ambang batas.';
    case 'CeDeFi':
      return 'Risiko kustodian: sebagian dana dikelola 1 pihak terpusat di luar kontrak.';
    case 'OTC Marketplace':
      return 'Risiko lawan transaksi: 1 perdagangan OTC bergantung pada kejujuran pihak lawan.';
    case 'Crypto Card Issuer':
      return 'Risiko penerbit kartu: kartu bergantung pada 1 penerbit dan jaringan pembayaran di luar kontrak.';
    case 'Governance Incentives':
      return 'Risiko tata kelola: insentif dapat diubah lewat 1 pemungutan suara kapan saja.';
    case 'CDP Manager':
      return 'Risiko agunan: 1 posisi dengan rasio agunan yang jatuh dapat memicu likuidasi.';
    case 'Interest Rate Derivatives':
      return 'Risiko suku bunga: 1 perubahan suku bunga dapat menggerus nilai posisi.';
    case 'Cross Chain Bridge':
      return 'Risiko jembatan: bug atau eksploitasi 1 jembatan dapat menghilangkan dana yang dijembatani.';
    case 'Farm':
      return 'Risiko hasil pertanian: imbal hasil dapat jatuh dalam 1 minggu saat insentif berakhir.';
    case 'Anchor BTC':
      return 'Risiko jangkar BTC: nilai token bergantung pada 1 cadangan BTC yang menjaminnya.';
    case 'Decentralized BTC':
      return 'Risiko jangkar BTC: nilai token bergantung pada cadangan BTC dan 1 mekanisme penebusan.';
    case 'Uncollateralized Lending':
      return 'Risiko kredit: 1 pinjaman tanpa agunan bergantung pada kelayakan peminjam dan dapat gagal bayar.';
    default:
      return 'Risiko kontrak: dana pengguna tersimpan dalam 1 kontrak; bug kontrak dapat menghilangkan dana.';
  }
}

/** Langkah risiko kedua khusus untuk protokol berskor High. */
function highRiskExtraStep(p: Protocol, score: number): string {
  const label = p.category ?? 'protokol ini';
  switch (p.category) {
    case 'Derivatives':
    case 'Basis Trading':
    case 'Leveraged Farming':
      return `Risiko tambahan ${label} (skor risiko ${score}, High): leverage dapat melikuidasi posisi dalam hitungan menit; jangan pernah memakai leverage di atas 2x di protokol ini.`;
    case 'CDP':
    case 'Stablecoin Wrapper':
    case 'Dual-Token Stablecoin':
      return `Risiko tambahan ${label} (skor risiko ${score}, High): stablecoin dapat lepas dari patoknya; jaga rasio agunan di atas 200% setiap saat.`;
    case 'Restaking':
      return `Risiko tambahan ${label} (skor risiko ${score}, High): slashing dapat memotong dana yang di-stake ulang; periksa rekam jejak validator sebelum deposit.`;
    case 'Prediction Market':
      return `Risiko tambahan ${label} (skor risiko ${score}, High): pasar dapat diselesaikan di luar perkiraan; jangan mempertaruhkan dana yang dibutuhkan.`;
    case 'Chain':
      return `Risiko tambahan ${label} (skor risiko ${score}, High): jembatan adalah titik gagal terbesar; jangan menjembatani lebih dari yang siap hilang.`;
    case 'RWA':
      return `Risiko tambahan ${label} (skor risiko ${score}, High): penerbit off-chain dapat gagal bayar; baca dokumen kustodian sebelum membeli.`;
    case 'Lending':
      return `Risiko tambahan ${label} (skor risiko ${score}, High): penarikan besar dapat macet saat likuiditas menipis; uji penarikan 2 kali sebelum posisi utama.`;
    case 'Dexs':
      return `Risiko tambahan ${label} (skor risiko ${score}, High): pool kecil dapat kehabisan likuiditas; periksa kedalaman pool sebelum swap besar.`;
    case 'Risk Curators':
    case 'Onchain Capital Allocator':
      return `Risiko tambahan ${label} (skor risiko ${score}, High): strategi kurator dapat berubah; baca ulang strategi sebelum menambah posisi.`;
    case 'Yield':
    case 'Yield Aggregator':
      return `Risiko tambahan ${label} (skor risiko ${score}, High): sumber yield dapat mengering saat insentif berakhir; jangan mengunci dana lebih dari 4 minggu sekaligus.`;
    default:
      return `Risiko tambahan ${label} (skor risiko ${score}, High): kurangi ukuran posisi hingga setengah tier di atas dan uji jalur keluar 2 kali sebelum menambah posisi.`;
  }
}

interface PlanContext {
  name: string;
  chain: string;
  gas: string;
  trial: string;
  main: string;
  riskSentence: string;
}

/** Template langkah per kategori (MODEL.md 7.6), dirender dengan konteks protokol. */
function templateSteps(p: Protocol, ctx: PlanContext): { steps: string[]; total: string } {
  const { name, chain, gas, trial, main, riskSentence } = ctx;
  switch (p.category) {
    case 'Lending':
      return {
        steps: [
          `Verifikasi alamat kontrak lending ${name} di ${chain} lewat situs resminya; cocokkan 2 sumber — situs resmi dan dokumentasinya — lalu simpan bookmark (5 menit).`,
          `Deposit percobaan ${trial} ke pasar dengan TVL terbesar di ${name}, lalu konfirmasi saldo tercatat on-chain; waktu 5–10 menit, ${gas}.`,
          `Pinjam kecil maksimal 30% dari limit deposit untuk menguji mekanisme likuidasi dan biaya bunga; waktu 10 menit, catat bunga per jam.`,
          `Lunasi pinjaman lalu tarik sebagian deposit untuk memastikan jalur keluar berfungsi; waktu 10 menit, catat biaya penarikan.`,
          `[Spekulatif] Pertahankan deposit selama 4–12 minggu dengan 1 interaksi per minggu; snapshot tidak mencatat program poin apa pun, jadi ini pegangan biasa, bukan farming yang dijamin.`,
          `Risiko smart contract: dana terkunci di kontrak lending ${name} selama 4–12 minggu; bug atau eksploitasi dapat menghilangkan deposit; jangan pakai dana yang tidak siap hilang.`,
          `Risiko sybil: pakai 1 wallet saja; jangan pecah deposit ke banyak wallet untuk mengejar kelayakan, karena pola itu dapat didiskualifikasi.`,
        ],
        total: 'Total: ~45 menit sesi pertama, lalu ~15 menit/minggu selama 8 minggu.',
      };
    case 'Dexs':
      return {
        steps: [
          `Verifikasi alamat router dan pool resmi ${name} di ${chain} lewat situs resminya; cocokkan 2 sumber — situs resmi dan dokumentasinya — lalu simpan bookmark (5 menit).`,
          `Swap percobaan ${trial} di pasangan paling likuid dengan slippage maksimal 0,5%; waktu 5 menit, ${gas}.`,
          `Tambah likuiditas kecil ${trial} ke pool utama dan catat rentang harga serta fee tier yang dipilih; waktu 10 menit.`,
          `Uji penarikan likuiditas penuh sebelum menambah posisi; waktu 10 menit, pastikan jumlah yang kembali sesuai perkiraan.`,
          `[Spekulatif] Lakukan swap kecil 1 kali per minggu selama 4–8 minggu di pasangan yang sama; volume berkelanjutan, bukan 1 transaksi besar sekaligus.`,
          `Risiko smart contract: posisi likuiditas di ${name} menanggung impermanent loss; bug router dapat menghilangkan dana, dan 1 pool yang sepi dapat menjebak penarikan; jangan pakai dana yang tidak siap hilang.`,
          `Risiko sybil: pakai 1 wallet saja; volume wash trading antar wallet sendiri adalah pola sybil dan tidak dianjurkan.`,
        ],
        total: 'Total: ~30 menit sesi pertama, lalu ~10 menit/minggu selama 8 minggu.',
      };
    case 'RWA':
      return {
        steps: [
          `Baca dokumen tokenisasi dan syarat kelayakan yurisdiksi ${name} di ${chain} di situs resminya selama 15 menit; banyak produk RWA dibatasi geografi dan butuh KYC, jangan lanjut jika tidak memenuhi syarat.`,
          `Verifikasi alamat kontrak token RWA resmi ${name} di ${chain} lewat situs resminya; cocokkan 2 sumber — situs resmi dan dokumentasinya — lalu simpan bookmark (5 menit).`,
          `Beli percobaan ${trial} dan konfirmasi token tercatat di wallet; waktu 10–15 menit, ${gas}.`,
          `Uji penebusan atau penjualan kembali sebagian kecil untuk memastikan jalur keluar; penebusan bisa memakan 1–7 hari, catat waktunya.`,
          `[Spekulatif] Pegang posisi selama 4–12 minggu; produk RWA dinilai dari durasi pegangan, bukan frekuensi transaksi, dan snapshot tidak mencatat program poin apa pun.`,
          `Risiko smart contract dan penerbit: token ${name} bergantung pada 2 pihak off-chain — kustodian dan penerbit — bukan hanya kontrak; gagal bayar salah satunya dapat menghilangkan nilai token.`,
          `Risiko sybil: KYC berarti 1 identitas sama dengan 1 akun; multi-akun melanggar syarat dan dapat dibekukan.`,
        ],
        total: 'Total: ~45 menit sesi pertama, lalu ~10 menit/minggu selama 12 minggu.',
      };
    case 'Risk Curators':
      return {
        steps: [
          `Baca strategi vault ${name} di situs resminya selama 15 menit: aset yang dikelola, manajer, dan biaya kinerja; lalu verifikasi alamat vault resmi di ${chain}.`,
          `Deposit percobaan ${trial} ke vault utama dan konfirmasi saldo tercatat on-chain; waktu 10 menit, ${gas}.`,
          `Minta penarikan kecil dan catat lama antreannya; antrean penarikan vault kurator bisa 1–7 hari, jadi jangan tambah posisi sebelum penarikan percobaan berhasil.`,
          `Tambah posisi utama ${main} setelah penarikan percobaan berhasil; total sesi pertama sekitar 30 menit ditambah masa tunggu antrean.`,
          `[Spekulatif] Pertahankan deposit 8–12 minggu dengan 1 pengecekan per minggu; snapshot tidak mencatat program poin apa pun, jadi ini pegangan jangka panjang biasa, bukan farming yang dijamin.`,
          `Risiko smart contract: dana dikelola strategi kurator dan kontrak vault — 2 lapis risiko: bug di salah satu lapisan dapat menghilangkan deposit; jangan pakai dana yang tidak siap hilang.`,
          `Risiko sybil: pakai 1 wallet saja; memecah deposit ke banyak vault atau wallet tidak menambah kelayakan dan hanya menambah biaya gas.`,
        ],
        total: 'Total: ~30 menit sesi pertama plus antrean 1–7 hari, lalu ~15 menit/minggu selama 12 minggu.',
      };
    case 'Onchain Capital Allocator':
      return {
        steps: [
          `Baca strategi vault ${name} di situs resminya selama 15 menit: aset yang dikelola, manajer, dan biaya kinerja; lalu verifikasi alamat vault resmi di ${chain}.`,
          `Bandingkan alokasi strategi antar vault ${name} selama 15 menit sebelum memilih vault, karena allocator memindahkan dana antar strategi dan imbal hasilnya bergantung pada alokasi itu.`,
          `Deposit percobaan ${trial} ke vault pilihan dan konfirmasi saldo tercatat on-chain; waktu 10 menit, ${gas}.`,
          `Minta penarikan kecil dan catat lama antreannya; antrean penarikan vault bisa 1–7 hari, jadi jangan tambah posisi sebelum penarikan percobaan berhasil.`,
          `Tambah posisi utama ${main} setelah penarikan percobaan berhasil; total sesi pertama sekitar 45 menit ditambah masa tunggu antrean.`,
          `[Spekulatif] Pertahankan deposit 8–12 minggu dengan 1 pengecekan per minggu; snapshot tidak mencatat program poin apa pun, jadi ini pegangan jangka panjang biasa, bukan farming yang dijamin.`,
          `Risiko smart contract: dana dikelola strategi allocator dan kontrak vault — 2 lapis risiko: bug di salah satu lapisan dapat menghilangkan deposit; jangan pakai dana yang tidak siap hilang.`,
          `Risiko sybil: pakai 1 wallet saja; memecah deposit ke banyak vault atau wallet tidak menambah kelayakan dan hanya menambah biaya gas.`,
        ],
        total: 'Total: ~45 menit sesi pertama plus antrean 1–7 hari, lalu ~15 menit/minggu selama 12 minggu.',
      };
    case 'Yield':
    case 'Yield Aggregator':
      return {
        steps: [
          `Verifikasi alamat vault dan strategi resmi ${name} di ${chain} lewat situs resminya; cocokkan 2 sumber — situs resmi dan dokumentasinya — lalu simpan bookmark (5 menit).`,
          `Deposit percobaan ${trial} dan konfirmasi saldo tercatat on-chain; waktu 5–10 menit, ${gas}.`,
          `Catat sumber yield yang diklaim strategi — biaya, insentif, atau pendapatan protokol; jika tidak bisa dijelaskan dalam 1 kalimat, jangan tambah posisi.`,
          `Uji klaim hasil dan penarikan sebagian; waktu 10 menit, catat biaya dan waktu yang dibutuhkan.`,
          `[Spekulatif] Putar posisi tiap 2 minggu antar strategi di ${name} selama 8 minggu, dan catat tiap rotasi beserta hasilnya.`,
          `Risiko smart contract: strategi yield menumpuk 2 kontrak — vault dan protokol sumber yield; bug di salah satunya dapat menghilangkan deposit.`,
          `Risiko sybil: pakai 1 wallet saja; jangan pecah posisi ke banyak wallet untuk mengejar kelayakan.`,
        ],
        total: 'Total: ~40 menit sesi pertama, lalu ~15 menit tiap 2 minggu selama 8 minggu.',
      };
    case 'Derivatives':
    case 'Basis Trading':
    case 'Leveraged Farming':
      return {
        steps: [
          `Verifikasi alamat kontrak perpetual atau derivatif resmi ${name} di ${chain} lewat situs resminya; cocokkan 2 sumber — situs resmi dan dokumentasinya — lalu simpan bookmark (5 menit).`,
          `Buka posisi percobaan ${trial} dengan leverage maksimal 2x dan hitung harga likuidasi sebelum membuka posisi; waktu 10 menit, ${gas}.`,
          `Pasang stop loss dan tulis harga likuidasi untuk leverage 2x di catatan pribadi; jangan buka posisi tanpa angka likuidasi yang sudah dihitung.`,
          `Tutup posisi setelah 24 jam dan ukur biaya total — funding ditambah gas — selama 24 jam itu; waktu 5 menit.`,
          `[Spekulatif] Jika melanjutkan, batasi ke 1–2 posisi kecil per minggu selama 4 minggu; jangan martingale atau menggandakan posisi setelah rugi.`,
          `Risiko smart contract dan likuidasi: leverage 2x dapat menghabiskan margin dalam hitungan menit saat volatilitas tinggi; bug kontrak dapat menghilangkan dana.`,
          `Risiko sybil: pakai 1 wallet saja; membuka posisi berlawanan di 2 wallet adalah manipulasi dan tidak dianjurkan.`,
        ],
        total: 'Total: ~30 menit sesi pertama, lalu ~15 menit/minggu selama 4 minggu.',
      };
    case 'CDP':
    case 'Stablecoin Wrapper':
    case 'Dual-Token Stablecoin':
      return {
        steps: [
          `Verifikasi alamat kontrak CDP atau wrapper resmi ${name} di ${chain} lewat situs resminya; cocokkan 2 sumber — situs resmi dan dokumentasinya — lalu simpan bookmark (5 menit).`,
          `Mint percobaan kecil ${trial} dengan rasio agunan minimal 200% dan konfirmasi saldo tercatat; waktu 10 menit, ${gas}.`,
          `Uji penebusan kembali agunan dan catat biaya serta waktunya; waktu 10 menit, pastikan agunan kembali penuh.`,
          `Tambah posisi utama ${main} setelah penebusan percobaan berhasil; total sesi pertama sekitar 30 menit.`,
          `[Spekulatif] Pertahankan posisi CDP kecil selama 4–12 minggu dengan rasio agunan aman; jangan mendekati ambang likuidasi, dan snapshot tidak mencatat program poin apa pun.`,
          `Risiko smart contract dan depeg: stablecoin ${name} dapat lepas dari patoknya dan agunan dapat dilikuidasi jika rasio jatuh di bawah 200%; bug kontrak dapat menghilangkan dana.`,
          `Risiko sybil: pakai 1 wallet saja; jangan pecah posisi ke banyak wallet untuk mengejar kelayakan.`,
        ],
        total: 'Total: ~40 menit sesi pertama, lalu ~10 menit/minggu selama 12 minggu.',
      };
    case 'Chain':
      return {
        steps: [
          `Verifikasi alamat jembatan resmi ke ${name} di ${chain} dan biaya masuk-keluar di situs resminya; simpan bookmark dan jangan ikuti tautan dari media sosial (5 menit).`,
          `Jembatani jumlah percobaan ${trial} ke ${chain}; waktu 10–60 menit tergantung rantai asal, catat biaya jembatan yang sering lebih mahal dari transaksinya.`,
          `Lakukan 1 transaksi asli di ${chain} — swap atau deposit kecil ${trial} — dan konfirmasi tercatat on-chain; waktu 5 menit, ${gas}.`,
          `Jembatani kembali sebagian dana untuk memastikan jalur keluar berfungsi; waktu sama seperti saat masuk, 10–60 menit.`,
          `[Spekulatif] Ulangi 1 interaksi per minggu selama 4–8 minggu; snapshot tidak mencatat program poin apa pun, jadi ini pemakaian biasa, bukan farming yang dijamin.`,
          `Risiko smart contract dan jembatan: dana yang melewati 1 jembatan adalah risiko terbesar kategori ini; bug jembatan dapat menghilangkan dana yang dijembatani.`,
          `Risiko sybil: pakai 1 wallet saja; jangan buat banyak wallet untuk mengejar kelayakan.`,
        ],
        total: 'Total: ~60 menit sesi pertama, lalu ~15 menit/minggu selama 8 minggu.',
      };
    default:
      return {
        steps: [
          `Verifikasi alamat kontrak resmi ${name} di ${chain} lewat situs resminya; cocokkan 2 sumber — situs resmi dan dokumentasinya — lalu simpan bookmark (5 menit).`,
          `Lakukan transaksi percobaan ${trial} di fungsi utama ${name} dan konfirmasi tercatat on-chain; waktu 5–15 menit, ${gas}.`,
          `Uji jalur keluar penuh — penarikan, penebusan, atau pembatalan — sebelum menambah posisi; waktu 10 menit, catat waktu tunggunya.`,
          `Tambah posisi utama ${main} setelah jalur keluar terbukti berfungsi; total sesi pertama sekitar 30–90 menit.`,
          `[Spekulatif] Ulangi fungsi utama 1 kali per minggu selama 4–8 minggu; snapshot tidak mencatat program poin apa pun, jadi ini pemakaian biasa, bukan farming yang dijamin.`,
          `Risiko smart contract: ${riskSentence} Bug kontrak dapat menghilangkan dana; jangan pakai dana yang tidak siap hilang.`,
          `Risiko sybil: pakai 1 wallet saja; jangan membuat banyak wallet untuk mengejar kelayakan.`,
        ],
        total: 'Total: ~45 menit sesi pertama, lalu ~15 menit/minggu selama 8 minggu.',
      };
  }
}

/**
 * Farm plan lengkap untuk satu protokol: template kategori dirender dengan
 * nama, rantai termurah, tier modal, dan gas; disisipi langkah data tidak
 * lengkap bila change_7d/listed_at null, dan langkah risiko kedua bila skor
 * High. Langkah terakhir selalu membawa total waktu yang dianggarkan.
 * Tidak ada nama pool, nama program poin, atau angka reward — snapshot
 * tidak membawa satu pun dari itu.
 */
export function farmSteps(p: Protocol, age: number | null, score: number): string[] {
  const tier = capitalTier(p.tvl_usd);
  const amounts = TIER_AMOUNTS[tier];
  const chain = cheapestChain(p.chains);
  const ctx: PlanContext = {
    name: p.name,
    chain,
    gas: gasText(chain),
    trial: amounts.trial,
    main: amounts.main,
    riskSentence: categoryRiskSentence(p),
  };
  const { steps, total } = templateSteps(p, ctx);
  const out = [...steps];
  const missing: string[] = [];
  if (p.change_7d === null) missing.push('perubahan TVL 7 hari (change_7d)');
  if (p.listed_at === null) missing.push('tanggal mulai tercatat (listed_at)');
  if (missing.length > 0) {
    out.splice(
      1,
      0,
      `Data snapshot untuk ${p.name} tidak lengkap: ${missing.length} field tidak tercatat — ${missing.join(' dan ')}. Perlakukan semua angka di halaman ini sebagai perkiraan dan verifikasi TVL live sebelum transaksi apa pun.`,
    );
  }
  if (score >= 50) {
    out.splice(out.length - 1, 0, highRiskExtraStep(p, score));
  }
  const last = out[out.length - 1] as string;
  out[out.length - 1] = `${last} ${total}`;
  return out;
}

// ---------------------------------------------------------------- board

/** Pembanding bertoken: mcap_usd asli, tanpa rank, tanpa implied value. */
export function liveComparators(snapshot: Snapshot, count: number = LIVE_COMPARATOR_COUNT): LiveRow[] {
  return snapshot.protocols
    .filter((p) => p.mcap_usd !== null)
    .sort((a, b) => (b.mcap_usd as number) - (a.mcap_usd as number) || a.slug.localeCompare(b.slug))
    .slice(0, count)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: [...p.chains],
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd as number,
      change_7d: p.change_7d,
    }));
}

export interface BuiltBoard {
  rows: BoardRow[];
  calibration: Calibration;
  live: LiveRow[];
}

/** Membangun board: hanya protokol yang lolos aturan board, diurutkan implied desc. */
export function buildBoard(snapshot: Snapshot): BuiltBoard {
  const calibration = calibrate(snapshot.protocols);
  const scored = snapshot.protocols
    .filter((p) => isBoardEligible(p))
    .map((p) => {
      const breakdown = impliedValue(p, calibration, snapshot.as_of);
      const score = riskScore(p, breakdown.age);
      return { p, breakdown, score };
    })
    .sort((a, b) => b.breakdown.value - a.breakdown.value || a.p.slug.localeCompare(b.p.slug));
  const rows: BoardRow[] = scored.map((entry, i) => {
    const { p, breakdown, score } = entry;
    return {
      rank: i + 1,
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: [...p.chains],
      tvl_usd: p.tvl_usd,
      change_7d: p.change_7d,
      listed_at: p.listed_at,
      age_days: breakdown.age,
      implied_value_usd: breakdown.value,
      growth_multiplier: breakdown.growth,
      maturity_multiplier: breakdown.maturity,
      category_multiple: breakdown.multiple,
      risk_score: score,
      risk_band: riskBand(score),
      confidence: confidenceLevel(p, breakdown.age),
      farm_steps: farmSteps(p, breakdown.age, score),
    };
  });
  return { rows, calibration, live: liveComparators(snapshot) };
}

/** Info model untuk data.js: konstanta, tabel multiple, dan penjelasan rumus. */
export function modelInfo(calibration: Calibration, protocols: Protocol[]): ModelInfo {
  const seen = new Set<string | null>();
  const categories: CategoryCalibration[] = [];
  for (const p of protocols) {
    if (seen.has(p.category)) continue;
    seen.add(p.category);
    const entry = calibration.byCategory.get(p.category);
    categories.push({
      category: p.category,
      calibration_n: entry ? entry.n : 0,
      median_ratio: entry ? entry.median : null,
      multiple: entry ? entry.multiple : calibration.globalMedian,
    });
  }
  categories.sort((a, b) => {
    if (a.category === null && b.category === null) return 0;
    if (a.category === null) return 1;
    if (b.category === null) return -1;
    return (a.category as string).localeCompare(b.category as string);
  });
  return {
    formula:
      'implied_value_usd = tvl_usd x category_multiple x growth(change_7d) x maturity(age_days), dibulatkan ke dolar terdekat. category_multiple = median rasio market-cap/TVL per kategori yang disusutkan ke median global dengan prior 5 lalu dijepit ke [0,02, 1,50]. growth = 1 + 0,5 x change_7d yang dijepit ke [-60, +120] persen (null = 1). maturity = 0,6 + 0,4 x min(umur hari, 1095) / 1095 (listed_at null = 365 hari).',
    formula_note:
      'Implied value adalah TVL dikali multiple kategori, lalu dikali faktor pertumbuhan 7 hari dan faktor maturitas umur tanpa token. Multiple kategori adalah median rasio market-cap/TVL per kategori yang disusutkan ke median global dengan prior k = 5, lalu dijepit ke [0,02, 1,50] agar satu outlier tidak mengatur ranking.',
    global_median: calibration.globalMedian,
    shrink_prior_k: SHRINK_PRIOR_K,
    prior_k: SHRINK_PRIOR_K,
    multiple_min: MULTIPLE_MIN,
    multiple_max: MULTIPLE_MAX,
    clamp_min: MULTIPLE_MIN,
    clamp_max: MULTIPLE_MAX,
    growth_weight: GROWTH_WEIGHT,
    growth_clamp_min: GROWTH_CLAMP_MIN,
    growth_clamp_max: GROWTH_CLAMP_MAX,
    maturity_base: MATURITY_BASE,
    maturity_cap_days: MATURITY_CAP_DAYS,
    missing_listed_age_days: MISSING_LISTED_AGE_DAYS,
    thin_calibration_max_n: THIN_CALIBRATION_MAX_N,
    categories,
    // Alias bentuk dashboard: isi SAMA dengan categories, hanya nama field
    // yang dashboard baca (n / median, bukan calibration_n / median_ratio).
    multiples: categories.map((c) => ({
      category: c.category,
      n: c.calibration_n,
      median: c.median_ratio,
      multiple: c.multiple,
    })),
    honesty_note:
      'Snapshot tidak membawa data program poin, program airdrop, tanggal peluncuran token, atau syarat kelayakan apa pun. Langkah bertanda [Spekulatif] adalah asumsi, bukan fakta. "Tidak mencatat token" berarti DefiLlama tidak mencatat gecko_id atau symbol — bukan bukti protokol itu tidak punya token.',
  };
}

/** Objek data lengkap untuk dashboard (data.js). */
export function buildDashboardData(snapshot: Snapshot): BoardData {
  const { rows, calibration, live } = buildBoard(snapshot);
  return {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: rows.length,
    live_size: live.length,
    model: modelInfo(calibration, snapshot.protocols),
    rows,
    live,
  };
}

// ---------------------------------------------------------------- pemeriksaan internal

/**
 * Pemeriksaan board internal. Mengembalikan daftar pesan error (kosong =
 * lolos): cakupan watchlist, rank 1..N masing-masing sekali, implied tidak
 * naik seiring rank naik, tidak semua implied sama, farm_steps 3–12 string
 * 20–600 karakter setelah trim, implied bilangan bulat positif, dan ukuran
 * board dalam gerbang 100–4000.
 */
export function validateBoard(rows: BoardRow[], watchlist: string[]): string[] {
  const errors: string[] = [];
  if (rows.length < 100 || rows.length > 4000) {
    errors.push(`ukuran board ${rows.length} di luar gerbang 100–4000`);
  }
  const byRank = new Map<number, BoardRow>();
  const slugs = new Set<string>();
  let previous: number | null = null;
  let allSame = rows.length > 1;
  let firstValue: number | null = null;
  const sorted = [...rows].sort((a, b) => a.rank - b.rank);
  for (const row of sorted) {
    if (!Number.isInteger(row.rank) || row.rank < 1) errors.push(`rank tidak valid pada ${row.slug}: ${row.rank}`);
    if (byRank.has(row.rank)) errors.push(`rank duplikat: ${row.rank}`);
    byRank.set(row.rank, row);
    if (slugs.has(row.slug)) errors.push(`slug duplikat: ${row.slug}`);
    slugs.add(row.slug);
    if (typeof row.name !== 'string' || row.name.length === 0) errors.push(`nama kosong pada ${row.slug}`);
    if (!Number.isInteger(row.implied_value_usd) || row.implied_value_usd <= 0) {
      errors.push(`implied_value_usd tidak valid pada ${row.slug}: ${row.implied_value_usd}`);
    }
    if (firstValue === null) firstValue = row.implied_value_usd;
    else if (row.implied_value_usd !== firstValue) allSame = false;
    if (previous !== null && row.implied_value_usd > previous) {
      errors.push(`implied naik dari rank ${row.rank - 1} ke ${row.rank} (${previous} -> ${row.implied_value_usd})`);
    }
    previous = row.implied_value_usd;
    if (!Array.isArray(row.farm_steps) || row.farm_steps.length < 3 || row.farm_steps.length > 12) {
      errors.push(`farm_steps ${row.slug} berjumlah ${Array.isArray(row.farm_steps) ? row.farm_steps.length : 'bukan array'} (harus 3–12)`);
    } else {
      row.farm_steps.forEach((step, i) => {
        if (typeof step !== 'string') {
          errors.push(`farm_steps[${i}] ${row.slug} bukan string`);
          return;
        }
        const len = step.trim().length;
        if (len < 20 || len > 600) errors.push(`farm_steps[${i}] ${row.slug} panjang ${len} karakter (harus 20–600)`);
      });
    }
  }
  for (let r = 1; r <= rows.length; r++) {
    if (!byRank.has(r)) errors.push(`rank hilang: ${r}`);
  }
  if (allSame) errors.push('semua implied_value_usd sama — bukan ranking');
  for (const slug of watchlist) {
    if (!slugs.has(slug)) errors.push(`watchlist tidak tercakup: ${slug}`);
  }
  return errors;
}
