# MODEL.md — Token Launch Radar (make.fun token-radar-01)

Spesifikasi model dan playbook untuk entry token-radar-01. Dokumen ini prosa +
rumus. Semua angka di sini dihitung dari `input/snapshot.json` (DefiLlama,
`as_of` 2026-11-14, 758 protokol, floor watchlist $50.000.000) dengan skrip
analisis Node 22 — tidak ada angka yang ditebak, tidak ada nama protokol yang
di-hardcode ke dalam rumus, dan tidak ada data program poin/airdrop karena
snapshot memang tidak membawanya.

Aturan baca: "mencatat token" berarti DefiLlama mencatat `gecko_id` atau
`symbol` untuk protokol itu. "Tidak mencatat token" berarti keduanya null.
Snapshot bukan bukti tidak adanya token — hanya bukti tidak adanya catatan.

---

## 1. Ringkasan temuan dari snapshot (semua angka terhitung)

### 1.1 Ukuran snapshot

| Kelompok | n | Total TVL | TVL median | TVL maks |
|---|---:|---:|---:|---:|
| Semua protokol | 758 | $465,70 miliar | $33,74 juta | $116,08 miliar (Binance CEX) |
| Watchlist (40) | 40 | $12,93 miliar | $152,79 juta | $2,75 miliar |
| Tanpa token tercatat | 342 | $135,80 miliar | $28,40 juta | $13,82 miliar (Bybit, CEX — lihat §2) |
| Bertoken + market cap tercatat | 144 | $92,18 miliar | $30,00 juta | $26,32 miliar |

Total TVL $465,70 miliar sangat didominasi CEX: Binance saja $116,08 miliar.
Itu sebabnya CEX dikeluarkan dari board (§2) — kalau tidak, board akan
didominasi bursa, bukan peluncuran token.

### 1.2 Distribusi `change_7d` (perubahan TVL 7 hari, persen)

| Kelompok | n terisi | null | Median | Kuartil bawah | Kuartil atas | Min | Maks | % negatif |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Semua | 754 | 4 | −8,23% | −11,53% | −2,51% | −72,71% | +4.448,47% | 85,0% |
| Watchlist | 40 | 0 | −3,29% | −9,45% | +0,12% | −28,53% | +11,23% | 70,0% |
| Tanpa token | 340 | 2 | −6,82% | −10,64% | −1,06% | −72,71% | +4.448,47% | 79,1% |
| Bertoken + mcap | 144 | 0 | −9,27% | −12,50% | −5,26% | −40,10% | +26,70% | 90,3% |

Bacaan: minggu snapshot adalah minggu turun luas (median semua protokol
−8,23%). Watchlist menahan penurunan lebih baik dari rata-rata (median
−3,29%). Maksimum +4.448,47% adalah satu outlier (Shift DeFi, TVL
$47,6 juta, umur 45 hari) — angka sebesar ini adalah alasan komponen
pertumbuhan harus dijepit (§4.3). Hanya 7 dari 758 protokol yang bergerak
lebih dari ±50% dalam seminggu.

### 1.3 Distribusi umur (`listed_at` ke `as_of` 2026-11-14, hari)

| Kelompok | n terisi | null | Median | Kuartil bawah | Kuartil atas | Maks | Umur ≥ 1.095 hari | Umur < 90 hari |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Semua | 645 | 113 | 677 | 366 | 1.100 | 1.851 | 163 | 53 |
| Watchlist | 38 | 2 | 512 | 189 | 637 | 1.563 | 1 | 4 |
| Tanpa token | 318 | 24 | 513 | 233 | 777 | 1.845 | 34 | 37 |

`listed_at` hilang pada 113 dari 758 protokol (14,9%) — komponen maturitas
harus punya nilai pengganti yang eksplisit (§4.4). Dua anggota watchlist
tanpa `listed_at`: Lightning Network dan Noble.

### 1.4 Distribusi TVL (bucket)

| Bucket TVL | Semua | Watchlist | Tanpa token | Board (§2) |
|---|---:|---:|---:|---:|
| $5–10 juta | 145 | 0 | 69 | 44 |
| $10–25 juta | 186 | 0 | 85 | 61 |
| $25–50 juta | 108 | 0 | 56 | 33 |
| $50–100 juta | 101 | 13 | 45 | 24 |
| $100–250 juta | 89 | 17 | 37 | 22 |
| $250 juta–$1 miliar | 66 | 6 | 27 | 9 |
| > $1 miliar | 63 | 4 | 23 | 5 |

### 1.5 Rantai dan kategori

Watchlist (40): Ethereum 26 (65%), Monad 15, Base 12, Binance 11, Arbitrum 8,
Hyperliquid L1 7, Avalanche 7, Solana 7, Plasma 6. Kategori watchlist:
Risk Curators 12, RWA 7, Onchain Capital Allocator 3, Basis Trading 2,
Lending 2, Chain 2, Yield 2, lalu 10 kategori dengan masing-masing 1 anggota
(Restaking, Dexs, CeDeFi, Insurance, Payments, Governance Incentives,
Staking Pool, Stablecoin Wrapper, Collateral Markets, CDP).

Board 198 baris (§2): Ethereum 98 (49,5%), Base 39, Binance 36, Arbitrum 33,
Solana 32, Monad 27, Hyperliquid L1 20, Avalanche 16, Plasma 16, Robinhood
Chain 14; 116 rantai berbeda muncul; median 1 rantai per protokol; 113 dari
198 hanya di satu rantai. Kategori board: Risk Curators 34, Dexs 21, Onchain
Capital Allocator 18, RWA 16, Lending 16, Yield 15, Derivatives 13, CDP 9,
Yield Aggregator 9, Basis Trading 8, Chain 4, Staking Pool 3, Liquidity
Manager 3, lalu 20 kategori kecil (lihat tabel kalibrasi §4.2).

Tanpa token tercatat (342): kategori terbesar adalah CEX 42, Liquid Staking
38, Risk Curators 34, Bridge 28, Dexs 26 — tiga yang pertama dari lima ini
adalah tepat kategori yang dikeluarkan dari board (§2), karena produknya
bukan peluncuran token baru.

---

## 2. Siapa yang masuk board: 198 baris (bukan 289)

Aturan keanggotaan board, semuanya fungsi dari field snapshot (bukan daftar
nama):

1. Tidak mencatat token: `gecko_id` null DAN `symbol` null. (342 protokol.)
2. Bukan CEX: `category` bukan `CEX`. (Mengeluarkan 42; terbesar adalah
   Bybit $13,82 miliar, Bitfinex $12,57 miliar, Robinhood $12,17 miliar.)
3. Nama tidak berakhiran penanda versi: tidak cocok dengan pola spasi
   diikuti `V2`, `v2`, `2.0`, dan sejenisnya di akhir nama. (Mengeluarkan 11:
   Aera V2, Aera V3, BDEX V3, Bucket Protocol V2, BulbaSwap V3, Metric V1,
   PotatoSwap V2, Privacy Pools V1, RocketSwap Anubis V2, Royco V2, Rysk V12.)
4. Bukan produk wrapped / staked / bridge dari token yang sudah berdagang:
   `category` bukan `Bridge`, `Canonical Bridge`, `Liquid Staking`,
   `Liquid Restaking`, `Restaked BTC`; nama tidak mengandung kata utuh
   `wrapped`, `staked`, atau `staking` (huruf apa pun); nama tidak diawali
   nama bursa (Binance, Coinbase, Bybit, Kraken, Bitget, OKX, Bitfinex,
   Gemini).

Tiga aturan pertama saja menghasilkan **289** protokol. Aturan keempat
mengeluarkan 91 lagi — dan 91 ini penting: 10 terbesarnya adalah WBTC
($7,91 miliar, Bridge), Binance staked ETH ($7,45 miliar, Liquid Staking),
Coinbase Bridge ($7,23 miliar), Binance Bitcoin ($4,66 miliar), USDT0
($3,57 miliar), Base Bridge ($2,74 miliar), CCIP ($1,80 miliar), Unit,
Binance Staked SOL, dan Kraken Bitcoin. WBTC adalah Bitcoin di Ethereum dan
Binance staked ETH adalah ETH di produk staking Binance — "token"-nya sudah
ada dan sudah berdagang. Meranking mereka sebagai peluncuran token yang
akan datang adalah kesalahan faktual dan melanggar kriteria juri nomor 2
(board memisahkan protokol bertoken dari yang belum datang).

**Board = 198 baris** yang lolos keempat aturan. Keempat puluh anggota
watchlist semuanya lolos (sudah diverifikasi terhadap daftar), jadi cakupan
watchlist 100%. Board 198 baris memenuhi gerbang (100–4.000 baris), terdiri
dari 40 watchlist + 158 protokol di luar watchlist — 138 di antaranya di
bawah floor $50 juta. Contoh terbaik dari "floor bukan langit-langit":
Sentora Curator, Risk Curators, TVL $2,76 miliar, TIDAK ada di watchlist
(DefiLlama mencatat parent protocol untuknya, yang bukan salah satu dari
10 field snapshot), dan model ini menempatkannya di peringkat 2 board.

Catatan jujur: aturan keempat memakai `parentProtocol` DefiLlama untuk
watchlist, tetapi field itu tidak ada di snapshot — jadi builder TIDAK BOLEH
mencoba menghitung ulang watchlist dari snapshot. Watchlist dibaca apa
adanya dari field `watchlist` snapshot; aturan di atas hanya menentukan
tambahan 158 baris di luar watchlist.

---

## 3. Pemisahan: board vs pembanding bertoken

- **Board (`board.json`, 198 baris): HANYA protokol pre-token dari §2.**
  Setiap baris punya `rank` 1–198, `implied_value_usd` dari rumus §4, dan
  `farm_steps`. Tidak ada satu pun protokol bertoken di board.
- **Pembanding bertoken: ditampilkan terpisah di dashboard** (panel
  "Benchmark — token yang sudah berdagang", BUKAN baris board, BUKAN bagian
  dari ranking). Panel ini memakai `mcap_usd` ASLI dari snapshot, bukan
  implied value, dan tidak pernah diberi rank. Hanya 144 protokol yang bisa
  jadi pembanding, karena hanya itulah yang punya `mcap_usd` tercatat;
  272 protokol bertoken lainnya mencatat `symbol`/`gecko_id` tetapi TIDAK
  punya market cap — mereka tidak bisa ditampilkan dengan harga dan tidak
  boleh ditebak harganya. Panel pembanding disarankan berisi 10–24 protokol
  terbesar berdasarkan `mcap_usd`, masing-masing dengan rasio mcap/TVL-nya
  supaya pembaca melihat dari mana multiple §4.2 berasal.
- Alasan pemisahan ini: implied value adalah klaim "berapa token ini AKAN
  bernilai JIKA diluncurkan dengan rekor seperti sekarang". Market cap
  adalah fakta "berapa token ini bernilai SEKARANG". Mencampur keduanya
  dalam satu ranking membandingkan klaim dengan fakta — rankingnya menjadi
  tidak berarti, dan juri menilainya sebagai kegagalan kriteria 2.

---

## 4. Rumus nilai implied: `impliedValue`

Satu fungsi yang sama menilai semua baris. Tidak ada daftar nama protokol
di dalam rumus; semua masukan adalah angka snapshot.

```
impliedValue = TVL × multiple(category) × growth(change_7d) × maturity(ageDays)
```

dengan `TVL` = `tvl_usd` (dolar), `ageDays` = jumlah hari dari `listed_at`
ke `as_of` (2026-11-14). Hasil dibulatkan ke dolar terdekat (bilangan bulat).
Keempat faktor dijelaskan di bawah. Semua faktor positif, jadi
`implied_value_usd` selalu positif — dan pada board 198 baris nilainya
terverifikasi semua berbeda (min $413.375, median $4.028.537,
maks $1.384.164.505), sehingga rankingnya benar-benar sebuah ranking.

### 4.1 Kenapa rumus ini mengalahkan model starter

Model starter memakai multiple datar 0,25 untuk semua kategori. Kalibrasi
§4.2 menunjukkan median rasio market-cap/TVL global adalah 0,1689 — jadi
0,25 datar melebih-lebihkan protokol tipikal sekitar 48% — dan yang lebih
penting, rasio antar kategori berbeda sampai puluhan kali lipat (median
kategori dari 0,0059 sampai 2,9747 sebelum penyusutan). Multiple datar
membuat ranking hampir sama dengan ranking TVL mentah; multiple per
kategori membuat ranking menjawab pertanyaan kompetisi yang sebenarnya:
kategori mana yang pasarnya menghargai TVL-nya lebih mahal. Komponen
pertumbuhan dan maturitas dipertahankan bentuknya dari starter karena
bentuk itu sudah benar — hanya maknanya yang diperjelas di bawah.

### 4.2 `multiple(category)` — multiple per kategori yang dikalibrasi

Kalibrasi memakai HANYA snapshot ini: untuk setiap protokol yang punya
`mcap_usd` tercatat (n = 144 dari 758), hitung rasio `mcap_usd / tvl_usd`,
lalu ambil median per kategori. Median dipilih, bukan rata-rata, karena
rasio sangat menceng: rata-rata global 4,48 sedangkan median 0,1689 —
rata-rata didominasi segelintir outlier (maksimum 400,20).

Statistik kalibrasi global (n = 144): kuartil bawah 0,0315; median 0,1689;
kuartil atas 0,9999; minimum ≈ 0,0000; maksimum 400,2045. Outlier maksimum
adalah satu Prediction Market dengan TVL kecil dan market cap besar —
tepat jenis sampel yang tidak boleh mengatur multiple sendirian.

Karena banyak kategori sampelnya tipis (hanya 10 kategori yang punya n ≥ 5),
median mentah kategori disusutkan (shrunk) ke arah median global dengan
kekuatan prior k = 5, lalu dijepit:

```
multiple(category) = jepit( (n × medianKategori + 5 × 0,1689) / (n + 5) , 0,02 , 1,50 )
```

dengan n = jumlah protokol berkategori itu yang punya market cap tercatat.
Jika kategori tidak punya satu pun sampel (n = 0) atau `category` null,
pakai median global 0,1689. Jepit bawah 0,02 dan atas 1,50 menjaga satu
outlier tidak merusak ranking: tanpa jepit, Prediction Market akan mendapat
multiple 66,84 (dari satu sampel berasio 400,20) dan Token Locker 2,84.

Tabel kalibrasi final untuk kategori yang muncul di board 198 baris:

| Kategori | n board | n kalibrasi | Median mentah | Multiple final |
|---|---:|---:|---:|---:|
| Risk Curators | 34 | 1 | 2,9747 | 0,6365 |
| Dexs | 21 | 11 | 0,3424 | 0,2882 |
| Onchain Capital Allocator | 18 | 3 | 0,0059 | 0,1078 |
| RWA | 16 | 9 | 0,2748 | 0,2370 |
| Lending | 16 | 15 | 0,1324 | 0,1415 |
| Yield | 15 | 13 | 0,1206 | 0,1340 |
| Derivatives | 13 | 2 | 2,1619 | 0,7383 |
| CDP | 9 | 3 | 0,1687 | 0,1688 |
| Yield Aggregator | 9 | 5 | 0,0504 | 0,1096 |
| Basis Trading | 8 | 8 | 0,4822 | 0,3617 |
| Chain | 4 | 1 | 3,0264 | 0,6452 |
| Staking Pool | 3 | 2 | 0,0018 | 0,1211 |
| Liquidity Manager | 3 | 1 | 0,0150 | 0,1433 |
| Leveraged Farming | 2 | 1 | 0,1725 | 0,1695 |
| Restaking | 2 | 2 | 0,0246 | 0,1277 |
| Anchor BTC | 2 | 0 | — | 0,1689 |
| Decentralized BTC | 2 | 0 | — | 0,1689 |
| CeDeFi | 2 | 0 | — | 0,1689 |
| Dual-Token Stablecoin | 2 | 2 | 0,0158 | 0,1252 |
| Farm | 2 | 1 | 0,0000 | 0,1407 |
| Prediction Market | 2 | 1 | 400,2045 | 1,5000 (terjepit) |
| Stablecoin Wrapper | 2 | 0 | — | 0,1689 |
| Uncollateralized Lending | 1 | 0 | — | 0,1689 |
| Interest Rate Derivatives | 1 | 0 | — | 0,1689 |
| Cross Chain Bridge | 1 | 4 | 1,2205 | 0,6363 |
| CDP Manager | 1 | 0 | — | 0,1689 |
| OTC Marketplace | 1 | 0 | — | 0,1689 |
| Insurance | 1 | 0 | — | 0,1689 |
| Payments | 1 | 2 | 0,1813 | 0,1724 |
| Governance Incentives | 1 | 1 | 0,0000 | 0,1407 |
| Crypto Card Issuer | 1 | 0 | — | 0,1689 |
| Indexes | 1 | 3 | 0,1477 | 0,1609 |
| Collateral Markets | 1 | 0 | — | 0,1689 |

Kategori kalibrasi lain yang TIDAK muncul di board (untuk referensi
pembanding): Liquid Staking median 0,0343 (n = 11); CEX 0,0620 (n = 11);
Canonical Bridge 0,7464 (n = 8); Bridge 0,0884 (n = 8); Yield Aggregator
sudah di atas; Token Locker 9,5204 (n = 2, tidak dipakai mentah);
Privacy 0,9691 (n = 3); Restaking sudah di atas.

Tiga catatan kejujuran tentang tabel ini, yang harus tampil di dashboard
sebagai catatan kaki model:

1. **Risk Curators (multiple 0,6365) bertumpu pada SATU sampel**
   (api3, rasio 2,9747). Penyusutan sudah menariknya turun dari 2,9747 ke
   0,6365, tetapi ini tetap multiple paling tidak kokoh di papan atas —
   dan 34 dari 198 baris board adalah Risk Curators, termasuk peringkat
   1–3. Jika sampel ini ternyata bukan representasi kategori, peringkat
   atas akan bergeser. Dashboard harus menandai multiple berbasis n = 1
   sebagai "kalibrasi tipis".
2. **Onchain Capital Allocator (multiple 0,1078) bertumpu pada tiga
   sampel yang semuanya sangat kecil** (Concrete 0,0191; Grove Finance
   0,0059; Yieldnest ≈ 0,0000). Akibatnya Veda — TVL $1,56 miliar,
   peringkat 3 TVL watchlist — jatuh ke implied $134,17 juta. Itu klaim
   model yang jujur dari data: token allocator sejauh ini dihargai pasar
   sangat murah relatif terhadap TVL yang mereka kelola. Jangan "memperbaiki"
   angka ini dengan tangan; kalau datanya berkata begitu, biarkan berkata
   begitu, dan beri label kalibrasi tipis (n = 3).
3. **Prediction Market (multiple 1,5000) adalah multiple yang terjepit
   oleh batas atas.** Tanpa jepit, satu sampel berasio 400,20 akan membuat
   Polymarket International ($320,2 juta TVL) menjadi peringkat 1 board
   dengan implied belasan miliar dolar. Jepit 1,50 adalah keputusan
   kehati-hatian yang disengaja, bukan hasil data — nyatakan begitu.

### 4.3 `growth(change_7d)` — komponen pertumbuhan 7 hari

```
growth = 1 + 0,5 × jepit(change_7d, −60, +120) / 100
```

Jika `change_7d` null, growth = 1 (netral — tidak ada informasi, jangan
menghukum dan jangan memberi hadiah). Nilai komponen ini berkisar 0,70
(pada −60%) sampai 1,60 (pada +120%).

Kenapa dijepit seperti starter, dan kenapa bobotnya 0,5:

- **Jepit bawah −60%**: penurunan TVL lebih dari 60% dalam seminggu
  biasanya berarti migrasi, peretasan, atau penarikan paksa — bukan sinyal
  "lebih murah" yang linier. Tanpa jepit, protokol yang kehilangan 72,71%
  (minimum snapshot) akan dihukum sampai faktor 0,64; dengan jepit,
  hukumannya berhenti di 0,70. Bedanya kecil, tetapi jepit menjaga satu
  minggu buruk tidak menghapus tiga tahun rekor.
- **Jepit atas +120%**: kenaikan di atas 120% dalam seminggu hampir selalu
  insentif jangka pendek atau satu deposito besar, bukan pertumbuhan
  organik yang bertahan. Tanpa jepit, Shift DeFi (+4.448,47%) akan mendapat
  faktor 23,24 dan mendominasi board sendirian. Dengan jepit, faktornya
  1,60 — masih hadiah terbesar yang dimungkinkan, tetapi tidak merusak
  ranking.
- **Bobot 0,5**: pertumbuhan satu minggu adalah sinyal yang berisik —
  median minggu ini −8,23% untuk SEMUA protokol, jadi sebagian besar
  gerakan adalah kondisi pasar, bukan kualitas protokol. Bobot setengah
  berarti pertumbuhan hanya menggeser nilai sampai ±30–60%, tidak pernah
  mengalahkan perbedaan TVL atau kategori yang besar.

### 4.4 `maturity(ageDays)` — komponen maturitas (umur tanpa token)

```
maturity = 0,6 + 0,4 × min(ageDays, 1095) / 1095
```

Jika `listed_at` null, pakai `ageDays` = 365 hari (maturity 0,7333). Nilai
komponen berkisar 0,6 (baru tercatat hari ini) sampai 1,0 (tercatat ≥ 1.095
hari = 3 tahun).

Kenapa kurva ini: "berapa lama protokol berjalan tanpa token" adalah satu
dari tiga masukan yang diminta juri, dan maknanya adalah ketahanan. Protokol
yang bertahan tiga tahun tanpa token telah melewati setidaknya satu siklus
pasar penuh dengan TVL yang masih tercatat — rekornya lebih dapat dipercaya
daripada protokol berumur 45 hari yang TVL-nya bisa hilang minggu depan.
Kurva linier dari 0,6 ke 1,0 selama 3 tahun dipilih karena sederhana dan
dapat dijelaskan dalam satu kalimat; kemiringannya sengaja landai (faktor
maksimal hanya 1,67× dari baru ke matang) supaya umur tidak pernah
mengalahkan TVL dan kategori. Umur median board adalah 513 hari
(maturity ≈ 0,787), jadi komponen ini biasanya memotong nilai sekitar
20% — diskon kehati-hatian untuk protokol yang relatif muda, bukan
hukuman berat.

Perbedaan dari starter: starter memakai bentuk yang sama tetapi
membingkainya sebagai "umur protokol". Di sini maknanya ditegaskan sebagai
umur TANPA token — karena untuk radar peluncuran, yang penting bukan
berapa lama protokol ada, melainkan berapa lama ia membangun nilai yang
belum diberi token.

---

## 5. Contoh hitung manual (3 teratas watchlist)

Semua angka di bawah dihitung dari snapshot dengan rumus §4. Builder HARUS
mendapat angka yang sama persis (pembulatan ke dolar terdekat) dari
implementasinya — jika berbeda, implementasinya salah.

### Contoh 1 — Steakhouse Financial (peringkat 1 board)

- TVL = $2.753.981.495; kategori Risk Curators (n kalibrasi = 1,
  median mentah 2,9747 → tersusut ke 0,6365); `change_7d` = −2,1935%;
  `listed_at` → umur 543 hari.
- multiple = (1 × 2,9747 + 5 × 0,1689) / 6 = 0,6365
- growth = 1 + 0,5 × (−2,1935) / 100 = 0,98903
- maturity = 0,6 + 0,4 × 543 / 1095 = 0,79836
- **impliedValue = 2.753.981.495 × 0,6365 × 0,98903 × 0,79836
  = $1.384.164.505**
- Perbandingan starter (multiple datar 0,25): $543.636.080. Model baru
  menilai Steakhouse 2,5× lebih tinggi karena pasar menghargai kategori
  kurator risiko jauh di atas rata-rata — klaim yang berasal dari data,
  bukan dari preferensi.

### Contoh 2 — Gauntlet (peringkat 3 board)

- TVL = $1.577.685.462; kategori Risk Curators (multiple sama 0,6365);
  `change_7d` = +5,645%; umur 543 hari.
- multiple = 0,6365
- growth = 1 + 0,5 × 5,645 / 100 = 1,02822
- maturity = 0,79836 (umur sama dengan Steakhouse)
- **impliedValue = 1.577.685.462 × 0,6365 × 1,02822 × 0,79836
  = $824.374.805**
- Perbandingan starter: $323.776.463. Gauntlet dan Steakhouse berumur sama
  dan berkategori sama, jadi selisihnya murni TVL (×1,75) dan pertumbuhan
  mingguan (×1,04) — contoh yang baik bahwa rumus ini transparan.

### Contoh 3 — Veda (peringkat 7 board)

- TVL = $1.563.415.482; kategori Onchain Capital Allocator (n kalibrasi = 3,
  median mentah 0,0059 → tersusut ke 0,1078); `change_7d` = −8,2898%;
  umur 632 hari.
- multiple = (3 × 0,0059 + 5 × 0,1689) / 8 = 0,1078
- growth = 1 + 0,5 × (−8,2898) / 100 = 0,95855
- maturity = 0,6 + 0,4 × 632 / 1095 = 0,83087
- **impliedValue = 1.563.415.482 × 0,1078 × 0,95855 × 0,83087
  = $134.170.867**
- Perbandingan starter: $311.287.338. Veda adalah contoh kebalikan dari
  Steakhouse: TVL hampir sama dengan Gauntlet, tetapi implied-nya 6× lebih
  kecil karena kategorinya dihargai pasar sangat murah. Ini BUKAN bug —
  ini adalah pembeda utama model ini dari starter, dan harus dijelaskan
  di dashboard pada halaman detail Veda (tiga sampel kalibrasi semuanya
  berasio di bawah 0,02).

### Pemeriksaan kewarasan board penuh

Di bawah rumus ini, 15 besar board adalah: Steakhouse Financial
($1.384,2 juta), Sentora Curator ($1.329,7 juta), Gauntlet ($824,4 juta),
Polymarket International ($477,7 juta), Nonce Capital ($191,8 juta), USDD
($144,7 juta), Veda ($134,2 juta), RockawayX ($125,9 juta), Hive Protocol
($114,2 juta), Hyperithm ($110,2 juta), K3 Capital ($100,9 juta),
Clearstar ($78,1 juta), Bittensor dTAO ($65,0 juta), BitFi Basis
($61,4 juta), Galaxy Curation ($58,1 juta). Anggota watchlist tersebar di
peringkat 1–90; 26 dari 40 besar adalah anggota watchlist. Nilai implied
terkecil di board adalah $413.375 dan semuanya berbeda — ranking valid.

---

## 6. Skor risiko dan level confidence (dari field snapshot saja)

Keduanya dihitung per protokol dari field snapshot saja, tanpa data luar.
Skor risiko dan confidence adalah DUA hal berbeda: risiko menilai
"seberapa berbahaya memakai protokol ini", confidence menilai "seberapa
lengkap data yang mendasari penilaiannya". Keduanya tampil di setiap baris
detail, berdampingan dengan implied value.

### 6.1 Skor risiko (0–100; makin besar makin berisiko)

Jumlahkan poin di bawah ini, lalu jepit pada 100. Tiap komponen dijelaskan
dengan kata-kata supaya juri bisa mengikuti penalarannya:

| Komponen | Aturan | Poin | Alasan |
|---|---|---|---|
| Ukuran TVL | < $10 juta | +25 | TVL kecil = likuiditas tipis, mudah dimanipulasi, mudah ditinggalkan |
|  | $10–25 juta | +15 |  |
|  | $25–50 juta | +5 |  |
|  | ≥ $50 juta | 0 |  |
| Momentum 7 hari | `change_7d` null | +15 | Momentum tidak diketahui = tidak bisa dinilai |
|  | ≤ −25% | +15 | Penarikan tajam dalam seminggu |
|  | −25% s.d. −15% | +5 | Penurunan berarti |
|  | ≥ +100% | +10 | Lonjakan ekstrem, biasanya insentif sesaat (sudah dijepit di §4.3, tetapi tetap dicatat sebagai risiko) |
|  | lainnya | 0 |  |
| Umur | `listed_at` null | +15 | Umur tidak diketahui |
|  | < 90 hari | +15 | Belum teruji melewati satu kuartal |
|  | 90–365 hari | +5 | Masih muda |
|  | ≥ 365 hari | 0 |  |
| Jumlah rantai | 1 rantai | +10 | Konsentrasi satu rantai: bug atau outage rantai itu = seluruh eksposur |
|  | ≥ 10 rantai | +5 | Bentang terlalu lebar: permukaan smart contract dan jembatan makin besar |
|  | 2–9 rantai | 0 |  |
| Risiko struktural kategori | Derivatives, Leveraged Farming, Restaking, CDP, Stablecoin Wrapper, Dual-Token Stablecoin | +10 | Leverage/likuidasi, slashing, atau risiko depeg |
|  | Prediction Market, Chain | +5 | Risiko penyelesaian pasar / risiko rantai dasar |
|  | kategori lain | 0 |  |

Pita risiko: **Low** 0–24; **Medium** 25–49; **High** 50 ke atas.
Distribusi pada board 198 baris (terhitung): Low 95, Medium 91, High 12;
skor tengah (median) 25; rentang 0–75. Contoh: Steakhouse Financial
skor 5 (Low — TVL raksasa, umur 543 hari, turun hanya −2,19%);
Shift DeFi skor 40 (Medium — umur 45 hari dan lonjakan +4.448%
yang dijepit); Firelight skor 15 (Low).

### 6.2 Level confidence (kelengkapan data)

- **High**: `change_7d` terisi DAN `listed_at` terisi DAN TVL ≥ $50 juta.
  Artinya: semua masukan rumus ada dan protokolnya cukup besar untuk
  dinilai serius. (52 dari 198 baris.)
- **Low**: `change_7d` null DAN `listed_at` null, ATAU TVL < $10 juta,
  ATAU umur < 90 hari. Artinya: sebagian besar penilaian bertumpu pada
  asumsi pengganti (growth netral, umur 365 hari) atau pada TVL yang
  terlalu kecil untuk dipercaya. (61 dari 198 baris.)
- **Medium**: semua yang lain. (85 dari 198 baris.)

Contoh: Steakhouse Financial High; Lightning Network Medium (umur tidak
diketahui, TVL $217,9 juta); Estate-protocol Medium (`change_7d` null —
satu dari hanya 2 baris board dengan `change_7d` null, satunya Swan DAO).

Catatan: confidence rendah TIDAK mengeluarkan protokol dari board — ia
hanya memberi label. Mengeluarkan protokol justru menyembunyikan
ketidakpastian dari pembaca.

---

## 7. Farm plan: template per kategori dan per chain

### 7.1 Pernyataan kejujuran (wajib tampil di dashboard)

> **Snapshot tidak membawa data program poin, program airdrop, tanggal
> peluncuran token, atau syarat kelayakan apa pun.** Tidak ada satu pun
> langkah di board ini yang boleh mengklaim ada program poin/airdrop yang
> "confirmed", "terverifikasi", atau "dijamin" untuk protokol tertentu.
> Semua langkah di bawah adalah playbook UMUM untuk kategori itu: cara
> memakai protokol sebagaimana mestinya, dengan ukuran modal, biaya, waktu,
> dan risiko yang dinyatakan apa adanya. Bagian yang bersifat spekulatif
> (misalnya "aktivitas ini MUNGKIN dicatat jika suatu hari ada program")
> diberi label **[Spekulatif]** di langkahnya. Jangan pernah menulis nama
> pool, nama program poin, atau angka reward spesifik — snapshot tidak
> membawa satu pun dari itu, dan mengarangnya adalah fabrikasi.

### 7.2 Aturan bentuk (gerbang)

- Setiap protokol mendapat **3–12 langkah**; setiap langkah, setelah
  dipangkas spasi, **20–600 karakter**. Langkah yang lebih pendek dari
  20 karakter adalah slogan, bukan langkah; yang lebih panjang dari 600
  karakter harus dipecah dua.
- Setiap langkah adalah SATU aksi konkret dengan angka: jumlah modal,
  biaya gas, atau durasi. Larangan: langkah tanpa angka ("Jelajahi
  protokol ini", "Tetap update").
- Setiap plan mencakup, dalam langkah-langkahnya: (a) verifikasi dan
  percobaan kecil dulu, (b) aksi utama dengan modal bertingkat menurut
  TVL, (c) biaya gas per chain, (d) waktu yang dibutuhkan, (e) risiko
  smart contract, (f) risiko sybil — yaitu larangan membuat banyak wallet
  untuk memanipulasi kelayakan, dan peringatan bahwa aktivitas semacam itu
  dapat didiskualifikasi oleh proyek mana pun dan tidak pernah dianjurkan.

### 7.3 Modal bertingkat menurut TVL (saran ukuran, bukan nasihat investasi)

| Tier | TVL protokol | Transaksi percobaan | Posisi utama (sekali jalan) |
|---|---|---|---|
| S (kecil) | < $25 juta | $25–$100 | $100–$500 |
| M (menengah) | $25–100 juta | $50–$200 | $200–$1.000 |
| L (besar) | ≥ $100 juta | $100–$500 | $500–$2.500 |

Alasan tiering: protokol kecil lebih mungkin illiquid dan lebih berisiko —
modal percobaan kecil membatasi kerugian jika penarikan macet; protokol
besar lebih dalam likuiditasnya sehingga posisi lebih besar masih bisa
keluar. Selalu mulai dari transaksi percobaan; jangan pernah memasukkan
posisi utama sebelum percobaan berhasil dikonfirmasi on-chain. Modal di
atas adalah contoh ukuran untuk satu wallet; jangan memakai leverage
kecuali langkah kategori itu secara eksplisit menyebutkannya (hanya
kategori Derivatives / Leveraged Farming, dan di sana pun dengan peringatan
likuidasi).

### 7.4 Estimasi biaya gas per chain (perkiraan umum, BUKAN data snapshot)

Biaya gas berubah tiap menit mengikuti kemacetan; angka di bawah adalah
rentang tipikal per interaksi (satu transaksi) pada kondisi normal, untuk
perencanaan saja — builder harus menuliskannya sebagai rentang, bukan
angka pasti:

| Chain | Biaya tipikal per interaksi | Catatan waktu |
|---|---|---|
| Ethereum | $1–$15 | 15 detik–5 menit sampai final; paling mahal, pakai hanya untuk transaksi percobaan kecil atau posisi besar |
| Base, Arbitrum, Optimism, Unichain | $0,05–$1 | 1–5 detik; rantai utama untuk farming berbiaya rendah |
| Solana | < $0,05 | < 1 detik; pastikan wallet punya sedikit SOL untuk sewa akun |
| Binance (BNB Chain) | $0,10–$1 | ~3 detik |
| Monad, Plasma, Hyperliquid L1, Ink, Katana, Arc, Tempo, Stable, Robinhood Chain | $0,05–$2 | Rantai baru — verifikasi biaya live sebelum transaksi besar; jembatan ke rantai ini sering lebih mahal daripada transaksinya sendiri |
| Avalanche, Polygon, Sui, Aptos | $0,05–$1 | 1–3 detik |
| Bitcoin (untuk produk BTCFi / staking BTC) | Biaya on-chain bervariasi (bayar per byte); Lightning bernilai sen | Transaksi Bitcoin lambat (10–60 menit konfirmasi); jangan pakai untuk langkah yang butuh kecepatan |
| Tron | $0,50–$3 (atau gratis dengan bandwidth/energy yang di-stake) | ~3 detik |

Jika sebuah protokol ada di BANYAK rantai (misalnya Lagoon di 23 rantai),
plan memakai rantai termurah yang didukung protokol itu dan menyebut
nama rantai itu secara eksplisit di langkah pertama — jangan menyuruh
pembaca menebak rantai mana.

### 7.5 Waktu

- Satu aksi (swap, deposit, stake, claim): 2–15 menit termasuk menunggu
  konfirmasi, kecuali dinyatakan lain.
- Satu sesi farming lengkap (verifikasi + percobaan + posisi utama):
  30–90 menit.
- Kadensi: ulangi aksi utama seminggu sekali selama 4–12 minggu;
  farming satu kali lalu berhenti adalah pola yang paling mudah
  dikenali sebagai tidak organik. Total waktu yang harus dianggarkan
  ditulis di langkah terakhir setiap plan (misalnya "Total: ~45 menit
  sesi pertama, lalu ~15 menit/minggu selama 8 minggu").
- Selalu sisakan waktu keluar (exit): langkah penarikan/exit harus ada
  di setiap plan, dengan perkiraan waktunya sendiri (misalnya penarikan
  staking bisa antre 1–7 hari — tulis apa adanya jika kategorinya
  mengenal antrean penarikan).

### 7.6 Template per kategori

Setiap template di bawah adalah kerangka langkah; builder merendernya
menjadi kalimat lengkap dengan nama protokol, rantai, tier modal (§7.3),
dan biaya gas (§7.4) yang sesuai — tanpa menambah nama pool atau program
apa pun. **[Spekulatif]** menandai langkah yang bertumpu pada asumsi
"jika suatu hari ada token/program" (bukan fakta snapshot).

**Lending (16 baris board).** 1) Verifikasi alamat kontrak lending di
situs resmi protokol dan simpan bookmark; jangan ikuti tautan dari media
sosial. 2) Deposit percobaan tier S/M/L ke pasar dengan TVL terbesar di
protokol itu, konfirmasi saldo tercatat (5–10 menit, gas per §7.4).
3) Pinjam kecil (≤ 30% dari limit) terhadap deposit untuk menguji
mekanisme likuidasi dan biaya bunga (10 menit). 4) Lunasi pinjaman dan
tarik sebagian deposit untuk memastikan jalur keluar berfungsi
(10 menit, catat biaya). 5) **[Spekulatif]** Pertahankan deposit selama
4–12 minggu dengan satu interaksi per minggu (deposit/tarik kecil) —
aktivitas berkelanjutan adalah yang umumnya dicatat program, jika ada.
6) Risiko smart contract: dana terkunci di kontrak lending; bug atau
eksploitasi dapat menghilangkan deposit; jangan deposit dana yang tidak
siap hilang. 7) Risiko sybil: satu wallet per orang; jangan pecah deposit
ke banyak wallet untuk mengejar kelayakan.

**Dexs (21 baris).** 1) Verifikasi alamat router/pool resmi. 2) Swap
percobaan kecil di pasangan paling likuid (5 menit, slippage ≤ 0,5%).
3) Tambah likuiditas kecil ke pool utama (tier percobaan), catat
rentang/fee tier yang dipilih (10 menit). 4) **[Spekulatif]** Lakukan
swap mingguan kecil selama 4–8 minggu di pasangan yang sama — volume
berkelanjutan, bukan sekali besar. 5) Uji penarikan likuiditas penuh
sebelum menambah posisi (10 menit). 6) Risiko smart contract: risiko
impermanent loss pada posisi likuiditas dan bug router; 7) Risiko sybil:
satu wallet; volume wash trading antar wallet sendiri adalah pola
sybil dan tidak dianjurkan.

**RWA — Real World Assets (16 baris).** 1) Baca dokumen tokenisasi dan
syarat kelayakan yurisdiksi di situs resmi — banyak produk RWA dibatasi
geografi dan memerlukan KYC; jangan lanjut jika tidak memenuhi syarat.
2) Verifikasi alamat kontrak token RWA resmi. 3) Pembelian percobaan
tier percobaan (10–15 menit, gas per §7.4). 4) Uji penebusan/penjualan
kembali sebagian kecil untuk memastikan jalur keluar (waktu penebusan
bisa 1–7 hari — tulis apa adanya). 5) **[Spekulatif]** Pegang posisi
selama 4–12 minggu; produk RWA dinilai dari durasi pegangan, bukan
frekuensi transaksi. 6) Risiko smart contract + risiko penerbit: token
bergantung pada kustodian/penerbit off-chain, bukan hanya kontrak;
7) Risiko sybil: KYC berarti satu identitas = satu akun; multi-akun
melanggar syarat dan dapat dibekukan.

**Risk Curators (34 baris — kategori terbesar board).** 1) Baca strategi
vault kurator: aset yang dikelola, manajer, dan biaya kinerja di situs
resmi. 2) Verifikasi alamat vault resmi (kurator sering punya banyak
vault — pastikan vault yang TVL-nya tercatat di snapshot). 3) Deposit
percobaan tier percobaan ke vault utama (10 menit). 4) Uji penarikan
kecil: antrean penarikan vault dapat memakan 1–7 hari — catat waktunya
(5 menit untuk meminta, lalu tunggu). 5) **[Spekulatif]** Pertahankan
deposit 8–12 minggu; kurator menilai deposan jangka panjang, bukan
masuk-keluar cepat. 6) Risiko smart contract: dana dikelola strategi
manajer + kontrak vault — dua lapis risiko (strategi dan kontrak);
7) Risiko sybil: satu wallet; memecah deposit ke banyak vault/wallet
tidak menambah kelayakan dan menambah biaya gas.

**Onchain Capital Allocator (18 baris).** Sama kerangkanya dengan Risk
Curators (verifikasi vault → deposit percobaan → uji penarikan →
pegang 8–12 minggu), dengan tambahan langkah: bandingkan alokasi
strategi antar vault allocator itu sebelum memilih vault (15 menit
membaca), karena allocator memindahkan dana antar strategi dan imbal
hasilnya bergantung pada alokasi tersebut. Risiko dan larangan sybil
sama dengan Risk Curators.

**Yield & Yield Aggregator (24 baris gabungan).** 1) Verifikasi alamat
vault/strategy resmi. 2) Deposit percobaan tier percobaan (5–10 menit).
3) Catat sumber yield yang diklaim strategi (biaya, insentif, atau
pendapatan protokol) — jika tidak bisa dijelaskan dalam satu kalimat,
jangan tambah posisi. 4) Uji klaim/penarikan hasil (10 menit).
5) **[Spekulatif]** Putar posisi tiap 2 minggu antar strategi di
protokol yang sama selama 8 minggu, dengan catatan tiap rotasi.
6) Risiko smart contract: strategi yield menumpuk kontrak (vault +
protokol sumber yield) — risiko berlapis; 7) Risiko sybil: satu wallet.

**Derivatives, Basis Trading, Leveraged Farming (23 baris gabungan).**
1) Verifikasi alamat kontrak perpetual/derivatif resmi. 2) Buka posisi
percobaan dengan leverage RENDAH (≤ 2×) dan ukuran tier percobaan
(10 menit). 3) Pasang stop dan hitung harga likuidasi SEBELUM membuka
posisi — tulis angkanya di catatan pribadi. 4) Tutup posisi dan ukur
biaya total (funding + gas) selama 24 jam (5 menit). 5) **[Spekulatif]**
Jika melanjutkan, batasi ke 1–2 posisi kecil per minggu selama 4 minggu;
jangan martingale (menggandakan posisi setelah rugi). 6) Risiko smart
contract + risiko likuidasi: leverage dapat menghabiskan margin dalam
hitungan menit saat volatilitas tinggi; 7) Risiko sybil: satu wallet;
membuka posisi berlawanan di dua wallet adalah manipulasi dan tidak
dianjurkan.

**CDP, Stablecoin Wrapper, Dual-Token Stablecoin (11 baris gabungan).**
1) Verifikasi alamat kontrak CDP/wrapper resmi. 2) Mint percobaan kecil
dengan rasio agunan ≥ 200% (10 menit). 3) Uji penebusan kembali agunan
(10 menit, catat biaya dan waktu). 4) **[Spekulatif]** Pertahankan
posisi CDP kecil selama 4–12 minggu dengan rasio agunan aman; jangan
mendekati ambang likuidasi. 5) Risiko smart contract + risiko depeg:
stablecoin dapat lepas dari patoknya dan agunan dapat dilikuidasi;
6) Risiko sybil: satu wallet.

**Chain (4 baris).** 1) Verifikasi alamat bridge/jembatan resmi ke
rantai itu dan biaya masuk-keluar. 2) Jembatani jumlah percobaan kecil
(waktu 10–60 menit tergantung rantai asal). 3) Lakukan satu transaksi
asli di rantai itu (swap atau deposit kecil, 5 menit). 4) Jembatani
kembali sebagian untuk memastikan jalur keluar (waktu sama seperti
masuk). 5) **[Spekulatif]** Ulangi satu interaksi per minggu selama
4–8 minggu. 6) Risiko smart contract + risiko jembatan: dana di
jembatan adalah risiko terbesar kategori ini; 7) Risiko sybil:
satu wallet.

**Payments, Prediction Market, Insurance, Indexes, Collateral Markets,
CeDeFi, OTC Marketplace, Crypto Card Issuer, Governance Incentives,
CDP Manager, Interest Rate Derivatives, Cross Chain Bridge, Staking Pool,
Restaking, Farm, Liquidity Manager, Anchor BTC, Decentralized BTC,
Uncollateralized Lending (sisanya).** Pakai template generik kategori:
1) Verifikasi alamat kontrak resmi di situs resmi. 2) Transaksi
percobaan tier percobaan di fungsi utama protokol (5–15 menit, gas
per §7.4). 3) Uji jalur keluar penuh (penarikan/penebusan/pembatalan)
sebelum menambah posisi (10 menit, catat waktu tunggunya). 4) **[Spekulatif]**
Ulangi fungsi utama seminggu sekali selama 4–8 minggu. 5) Risiko smart
contract: sebutkan risiko spesifik kategori itu dalam satu kalimat
(misalnya untuk Restaking: risiko slashing; untuk Prediction Market:
risiko penyelesaian pasar; untuk Insurance: risiko klaim ditolak).
6) Risiko sybil: satu wallet per orang; jangan membuat banyak wallet.

**Aturan tambahan untuk semua template.** Jika protokol hanya ada di
satu rantai (113 dari 198 baris board), langkah pertama WAJIB menyebut
nama rantai itu. Jika protokol punya `change_7d` null atau `listed_at`
null, satu langkah harus berbunyi: "Data snapshot untuk protokol ini
tidak lengkap (tulis field mana yang hilang) — perlakukan semua angka
di halaman ini sebagai perkiraan dan verifikasi TVL live sebelum
transaksi." Jika skor risiko High (§6.1), langkah risiko harus diperluas
menjadi dua langkah: satu untuk smart contract, satu untuk risiko
kategori spesifik.

### 7.7 Contoh plan lengkap (Steakhouse Financial — Risk Curators, tier L)

1. "Verifikasi alamat vault Steakhouse Financial di situs resminya dan simpan bookmark; jangan ikuti tautan dari media sosial atau grup chat." (138 karakter)
2. "Deposit percobaan $100–$500 ke vault utama di Ethereum dan konfirmasi saldo tercatat on-chain; waktu 10 menit, gas Ethereum $1–$15." (130 karakter)
3. "Minta penarikan kecil $50 dan catat lama antreannya (vault kurator bisa 1–7 hari) sebelum menambah posisi apa pun." (115 karakter)
4. "Tambah posisi utama $500–$2.500 setelah penarikan percobaan berhasil; total sesi pertama sekitar 30 menit plus masa tunggu antrean." (133 karakter)
5. "[Spekulatif] Pertahankan deposit 8–12 minggu dengan satu pengecekan mingguan; snapshot tidak mencatat program poin apa pun, jadi ini adalah pegangan jangka panjang biasa, bukan farming yang dijamin." (185 karakter)
6. "Risiko smart contract: dana dikelola strategi kurator dan kontrak vault — bug di salah satu lapisan dapat menghilangkan deposit; jangan pakai dana yang tidak siap hilang." (179 karakter)
7. "Risiko sybil: pakai satu wallet saja; memecah deposit ke banyak wallet tidak menambah kelayakan dan hanya menambah biaya gas." (129 karakter)

Tujuh langkah, masing-masing 115–185 karakter — semuanya di dalam batas
20–600 karakter dan 3–12 langkah. Builder memakai pola ini untuk semua
198 baris, mengganti nama, rantai, tier, dan gas sesuai protokolnya.

---

## 8. Lampiran: 40 watchlist berdasarkan TVL

(TVL dolar; `change_7d` persen; umur hari dari `listed_at` ke 2026-11-14;
"—" = `listed_at` null. Rantai ditulis jumlahnya + tiga pertama.)

| # | Protokol | Kategori | TVL | ch7d | Umur | Rantai |
|---:|---|---|---:|---:|---:|---:|
| 1 | Steakhouse Financial | Risk Curators | $2.753.981.495 | −2,19% | 543 | 11 (Base, Ethereum, Robinhood Chain…) |
| 2 | Gauntlet | Risk Curators | $1.577.685.462 | +5,65% | 543 | 14 (Base, Binance, Ethereum…) |
| 3 | Veda | Onchain Capital Allocator | $1.563.415.482 | −8,29% | 632 | 13 (Ink, Ethereum, Optimism…) |
| 4 | USDD | CDP | $1.055.793.606 | −2,81% | 611 | 3 (Tron, Ethereum, Binance) |
| 5 | Nonce Capital | Risk Curators | $513.783.671 | −9,74% | 45 | 2 (Ethereum, Optimism) |
| 6 | Upshift | Onchain Capital Allocator | $499.083.733 | +8,31% | 710 | 15 (Ethereum, Stellar, Flare…) |
| 7 | Bittensor dTAO | Dexs | $376.026.255 | −6,56% | 56 | 1 (Bittensor) |
| 8 | OnRe | RWA | $308.882.355 | +0,11% | 488 | 1 (Solana) |
| 9 | RockawayX | Risk Curators | $292.506.628 | −2,55% | 233 | 10 (Ethereum, Solana, Pharos…) |
| 10 | Symbiotic | Collateral Markets | $253.923.299 | −12,03% | 886 | 1 (Ethereum) |
| 11 | OpenTrade | RWA | $241.501.527 | −1,64% | 708 | 3 (Avalanche, Ethereum, Plume Mainnet) |
| 12 | Hyperithm | Risk Curators | $221.638.535 | −4,38% | 543 | 10 (Monad, Ethereum, Arbitrum…) |
| 13 | Lightning Network | Payments | $217.862.346 | −10,14% | — | 1 (Bitcoin) |
| 14 | Plume Vaults | RWA | $211.537.977 | −3,08% | 749 | 5 (Ethereum, Plume Mainnet, Solana…) |
| 15 | K3 Capital | Risk Curators | $207.711.162 | −8,90% | 543 | 9 (Monad, Ethereum, Optimism…) |
| 16 | Hive Protocol | Chain | $198.776.765 | −10,18% | 925 | 1 (BSquared) |
| 17 | R25 | RWA | $198.206.607 | +0,30% | 199 | 2 (Pharos, Sui) |
| 18 | b14g | Restaking | $173.941.404 | −28,53% | 694 | 3 (Bitcoin, CORE, Babylon Genesis) |
| 19 | Clearstar | Risk Curators | $161.773.491 | −10,09% | 543 | 11 (Flare, Base, Ethereum…) |
| 20 | Saturn | Stablecoin Wrapper | $154.313.682 | −0,75% | 219 | 3 (Ethereum, Monad, Binance) |
| 21 | Lagoon | Onchain Capital Allocator | $151.263.522 | −3,30% | 691 | 23 (Ethereum, Arbitrum, Base…) |
| 22 | Curvance | Lending | $136.345.059 | +0,68% | 352 | 1 (Monad) |
| 23 | Galaxy Curation | Risk Curators | $129.994.276 | +11,23% | 177 | 3 (Arc, Ethereum, Base) |
| 24 | Tydro | Lending | $111.314.194 | −4,89% | 394 | 1 (Ink) |
| 25 | Valos | RWA | $106.328.133 | +0,15% | 113 | 1 (Monad) |
| 26 | Armitage by Wintermute | Risk Curators | $103.480.212 | +5,77% | 178 | 1 (Ethereum) |
| 27 | Lofty | RWA | $101.135.900 | +0,03% | 1.563 | 1 (Algorand) |
| 28 | Doppler Finance | CeDeFi | $93.316.487 | −14,49% | 638 | 2 (Ripple, Ethereum) |
| 29 | Ember | RWA | $90.012.351 | −5,96% | 423 | 6 (Ethereum, Sui, Base…) |
| 30 | Keyrock | Risk Curators | $83.070.632 | −0,60% | 73 | 2 (Arc, Ethereum) |
| 31 | Noble | Chain | $83.040.073 | −5,23% | — | 1 (Noble) |
| 32 | Tori Finance | Basis Trading | $77.392.441 | +4,64% | 143 | 1 (Ethereum) |
| 33 | infiniFi | Yield | $70.716.524 | −3,28% | 535 | 3 (Ethereum, Monad, Base) |
| 34 | Axis | Basis Trading | $70.145.354 | +2,33% | 86 | 1 (Ethereum) |
| 35 | Reti Pooling | Staking Pool | $65.254.391 | −10,69% | 659 | 1 (Algorand) |
| 36 | Gami Labs | Risk Curators | $63.109.489 | +9,03% | 169 | 7 (Stellar, Ethereum, Base…) |
| 37 | Yuzu Money | Yield | $57.346.091 | −9,05% | 365 | 3 (Plasma, Monad, Ethereum) |
| 38 | Mezo Earn | Governance Incentives | $53.638.061 | −12,22% | 186 | 1 (Mezo) |
| 39 | Tulipa Capital | Risk Curators | $52.404.471 | −9,35% | 543 | 8 (Ethereum, Base, Berachain…) |
| 40 | Firelight | Insurance | $51.272.081 | −14,41% | 340 | 1 (Flare) |

---

## 9. Checklist implementasi untuk builder

1. Baca `watchlist` dari snapshot apa adanya; jangan menghitung ulang dari
   10 field (field `parentProtocol` tidak ada di snapshot).
2. Board = 198 baris dari §2, rank 1–198, `implied_value_usd` =
   `impliedValue` dari §4 (bilangan bulat, semua berbeda — sudah
   diverifikasi), `farm_steps` dari §7 (3–12 langkah, 20–600 karakter).
3. Panel pembanding terpisah: hanya 144 protokol bermarket-cap, tampilkan
   `mcap_usd` asli, tanpa rank, tanpa implied value. Jangan masukkan
   272 protokol bertoken tanpa market cap ke panel harga.
4. Tampilkan di dashboard: multiple kategori + n kalibrasi per baris,
   skor risiko + pita (§6.1), confidence (§6.2), dan label "kalibrasi
   tipis" untuk kategori dengan n kalibrasi ≤ 3 (terutama Risk Curators,
   Onchain Capital Allocator, Prediction Market yang terjepit).
5. Tampilkan pernyataan kejujuran §7.1 di atas setiap farm plan, dan
   label **[Spekulatif]** pada langkah spekulatif. Jangan pernah menulis
   nama pool, nama program poin, atau angka reward.
6. Verifikasi: jalankan contoh hitung §5 dan samakan angkanya persis;
   periksa semua 40 watchlist ada di board; periksa tidak ada baris
   board yang berkategori CEX/Bridge/Canonical Bridge/Liquid Staking/
   Liquid Restaking/Restaked BTC.

---

*Dokumen ini adalah spesifikasi, bukan kode. Semua angka berasal dari
`snapshot.json` per 2026-11-14. Tidak ada API key, secret, atau data
di luar snapshot di dokumen ini.*
