// main.ts — Token Launch Radar (make.fun token-radar-01).
//
// Membaca snapshot dari --input (file atau direktori) atau jalur default,
// membangun board dari lib/model.ts, menulis board.json dan data.js,
// menyalin dashboard/ dan screenshots/ dari repo ke output, lalu menulis
// dossier.json lewat buildDossier dari vendor/makefun-board.ts.
//
// Hanya standard library Node. Tanpa network, tanpa tanggal berjalan,
// tanpa angka acak: tanggal yang dipakai hanya as_of dari snapshot, supaya
// dua run menulis byte yang sama.
//
// Pemakaian:
//   MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
//   node main.ts --input /input/snapshot.json        (output default /output)

import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-board.ts';
import { buildDashboardData, parseSnapshot, validateBoard } from './lib/model.ts';

const TEXT_MAX_BYTES = 65536;

function fail(message: string): never {
  console.error(`token-radar: ${message}`);
  process.exit(1);
}

/** Nilai argumen --input berupa "--input <path>" atau "--input=<path>". */
function inputArg(argv: string[]): string | null {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === '--input' && i + 1 < argv.length) return argv[i + 1] as string;
    if (arg.startsWith('--input=')) return arg.slice('--input='.length);
  }
  return null;
}

/** Jalur snapshot: argumen dulu, lalu kandidat default, yang pertama ada menang. */
function resolveSnapshotPath(given: string | null, repoRoot: string): string {
  const candidates: string[] = [];
  if (given !== null) candidates.push(given);
  candidates.push('/input/snapshot.json');
  candidates.push(join(repoRoot, 'input', 'snapshot.json'));
  candidates.push(join(repoRoot, '..', 'input', 'snapshot.json'));
  for (const candidate of candidates) {
    let path = candidate;
    try {
      if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'snapshot.json');
    } catch {
      continue;
    }
    if (existsSync(path) && statSync(path).isFile()) return path;
  }
  if (given !== null) fail(`snapshot tidak ditemukan di ${given}`);
  fail('snapshot tidak ditemukan: beri --input <file atau direktori snapshot>');
}

function main(): void {
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
  const snapshotPath = resolveSnapshotPath(inputArg(process.argv.slice(2)), repoRoot);

  let text: string;
  try {
    text = readFileSync(snapshotPath, 'utf8');
  } catch (err) {
    fail(`tidak bisa membaca snapshot ${snapshotPath}: ${(err as Error).message}`);
  }
  const snapshot = parseSnapshot(text as string);
  const data = buildDashboardData(snapshot);

  const boardErrors = validateBoard(data.rows, snapshot.watchlist);
  if (boardErrors.length > 0) {
    for (const error of boardErrors) console.error(`pemeriksaan board gagal: ${error}`);
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });

  // 1. board.json — objek dengan kunci rows.
  writeFileSync(join(outputDir, 'board.json'), `${JSON.stringify({ rows: data.rows }, null, 2)}\n`, 'utf8');

  // 2. data.js — variabel global jendela RADAR berisi satu objek JSON.
  writeFileSync(join(outputDir, 'data.js'), `window.RADAR = ${JSON.stringify(data, null, 2)};\n`, 'utf8');

  // 3. Salin dashboard/ dan screenshots/ dari repo ke output.
  for (const dir of ['dashboard', 'screenshots']) {
    const source = join(repoRoot, dir);
    if (!existsSync(source) || !statSync(source).isDirectory()) {
      fail(`direktori repo tidak ditemukan: ${source}`);
    }
    cpSync(source, join(outputDir, dir), { recursive: true });
  }

  // 4. dossier.json — byte-identik dengan hasil buildDossier atas output ini.
  let dossier: Uint8Array;
  try {
    dossier = buildDossier(outputDir, { text_max_bytes: TEXT_MAX_BYTES });
  } catch (err) {
    fail(`buildDossier gagal: ${(err as Error).message}`);
  }
  writeFileSync(join(outputDir, 'dossier.json'), dossier);

  console.log(
    `token-radar: ${data.board_size} baris board, ${data.watchlist_size} watchlist tercakup, ` +
      `${data.live_size} pembanding live, as_of ${data.as_of} -> ${outputDir}`,
  );
}

main();
