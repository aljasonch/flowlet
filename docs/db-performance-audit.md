# Database Performance Audit

Dokumen ini berisi hasil audit database Supabase PostgreSQL untuk Personal Money Manager (Flowlet) per Oktober 2026.
Audit ini disusun berdasarkan schema migrasi `0001_init.sql`, `0002_portfolio.sql`, `0003_debts.sql`, dan `0004_dashboard_month_start_day.sql`.

---

## 1. Audit Kebijakan Row Level Security (RLS)

### Evaluasi `auth.uid()` vs `(select auth.uid())`
Dalam PostgreSQL dengan Supabase RLS, pemanggilan fungsi `auth.uid()` secara langsung tanpa subquery:
```sql
-- KURANG OPTIMAL: dievaluasi berulang untuk setiap baris yang diperiksa (per-row function call)
using (user_id = auth.uid())
```
dapat menyebabkan PostgreSQL memperlakukan ekspresi tersebut sebagai *volatile* pada tataran eksekusi baris, sehingga perencana query (query planner) memanggil fungsi `auth.uid()` sebanyak $N$ baris yang dipindai.

Sebaliknya, membungkusnya dalam subquery skalar:
```sql
-- OPTIMAL: dievaluasi satu kali untuk seluruh statement query (init-plan subquery)
using (user_id = (select auth.uid()))
```
memungkinkan perencana query memperlakukan hasilnya sebagai konstanta per-statement, sehingga pemindaian indeks menjadi jauh lebih efisien.

### Temuan pada Proyek Ini
Setelah memeriksa seluruh definisi tabel dan migrasi:
- `public.profiles` (`profiles_own`): **SUDAH** memakai `(select auth.uid())`.
- `public.categories` (`categories_own`): **SUDAH** memakai `(select auth.uid())`.
- `public.income_sources` (`income_sources_own`): **SUDAH** memakai `(select auth.uid())`.
- `public.transactions` (`transactions_own`): **SUDAH** memakai `(select auth.uid())`.
- `public.holdings` (`holdings_own`): **SUDAH** memakai `(select auth.uid())`.
- `public.price_quotes` (`price_quotes_own`): **SUDAH** memakai `(select auth.uid())`.
- `public.debts` (`debts_own`): **SUDAH** memakai `(select auth.uid())`.
- `public.debt_payments` (`debt_payments_own`): **SUDAH** memakai `(select auth.uid())`.

**Status**: Semua kebijakan RLS pada tabel produksi telah mengikuti kaidah `(select auth.uid())`. Tidak ada perubahan RLS yang diperlukan saat ini.

---

## 2. Audit Indeks Kolom (Indexing Audit)

### Indeks yang Sudah Ada
1. `transactions`: `transactions_user_date_idx` pada `(user_id, date desc)`
2. `categories`: `unique (user_id, name)` (implisit unique index)
3. `income_sources`: `unique (user_id, name)` (implisit unique index)
4. `holdings`: `holdings_user_idx` pada `(user_id)`
5. `price_quotes`: `primary key (user_id, source, ref, currency)`
6. `debts`: `debts_user_date_idx` pada `(user_id, date desc)`
7. `debt_payments`: `debt_payments_debt_idx` pada `(debt_id)` dan `debt_payments_user_idx` pada `(user_id)`

### Indeks yang Direkomendasikan Ditambahkan
Meskipun beban kerja saat ini masih ringan, terdapat beberapa pola query dan foreign key yang belum terindeks secara optimal:

1. **Foreign Key `transactions.category_id` dan `transactions.source_id`**:
   - PostgreSQL tidak secara otomatis mengindeks foreign key kolom anak.
   - Pada query agregasi pengeluaran per kategori (`spending_by_category`) dan query filter transaksi berdasarkan kategori/sumber, join dilakukan pada `transactions.category_id`.
   - **Rekomendasi**:
     ```sql
     create index transactions_user_category_idx on public.transactions (user_id, category_id);
     create index transactions_user_source_idx on public.transactions (user_id, source_id);
     ```

2. **Filter Transaksi berdasarkan Tipe (`income` vs `expense`)**:
   - Query `transactions` sering difilter berdasarkan `type` (misal di tab atau dropdown filter) bersamaan dengan rentang tanggal.
   - **Rekomendasi**:
     ```sql
     create index transactions_user_type_date_idx on public.transactions (user_id, type, date desc);
     ```

3. **Status Arsip Kategori dan Sumber Pemasukan**:
   - Dropdown transaksi selalu memfilter `where user_id = auth.uid() and is_archived = false`.
   - **Rekomendasi**:
     ```sql
     create index categories_user_active_idx on public.categories (user_id) where is_archived = false;
     create index income_sources_user_active_idx on public.income_sources (user_id) where is_archived = false;
     ```

4. **Filter Hutang Piutang berdasarkan Tipe dan Status**:
   - Pada halaman hutang piutang (`/debts`), filter sering memisahkan `debt` vs `receivable`.
   - **Rekomendasi**:
     ```sql
     create index debts_user_type_date_idx on public.debts (user_id, type, date desc);
     ```

---

## 3. Query `EXPLAIN (ANALYZE, BUFFERS)` Siap Pakai

Untuk memverifikasi eksekusi query RPC langsung di Supabase SQL Editor, gunakan template di bawah ini.
Ganti `<TARGET_USER_UUID>` dengan UUID user Anda di tabel `auth.users` agar RLS dan RPC mengenali konteks user yang benar.

```sql
-- Mulai transaksi terisolasi untuk pengujian
begin;

-- Simulasi login sebagai authenticated user
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "<TARGET_USER_UUID>", "role": "authenticated"}';

-- 1. Uji month_summary
explain (analyze, buffers)
select * from public.month_summary(extract(year from current_date)::int, extract(month from current_date)::int);

-- 2. Uji spending_by_category
explain (analyze, buffers)
select * from public.spending_by_category(extract(year from current_date)::int, extract(month from current_date)::int);

-- 3. Uji income_by_source
explain (analyze, buffers)
select * from public.income_by_source(extract(year from current_date)::int, extract(month from current_date)::int);

-- 4. Uji monthly_trend
explain (analyze, buffers)
select * from public.monthly_trend(extract(year from current_date)::int, extract(month from current_date)::int, 6);

-- 5. Uji portfolio_summary
explain (analyze, buffers)
select * from public.portfolio_summary();

-- 6. Uji debts_summary
explain (analyze, buffers)
select * from public.debts_summary();

-- Batalkan transaksi agar tidak meninggalkan efek samping
rollback;
```

### Hal yang Perlu Diperhatikan pada Output `EXPLAIN`:
- **Execution Time**: Seharusnya di bawah 5–10 ms per RPC pada volume data personal/keluarga.
- **Buffers (shared hit vs read)**: Jika `shared hit` tinggi dan `read` rendah, artinya data terlayani dari buffer cache RAM.
- **Scan Type**: Pastikan scan menggunakan `Bitmap Index Scan` atau `Index Scan` pada `transactions_user_date_idx`, bukan `Seq Scan` menyeluruh jika tabel transaksi sudah memiliki ribuan baris.

---

## 4. Monitoring Database Supabase

Lakukan pemeriksaan berkala melalui dashboard Supabase:
1. **Performance Advisor**:
   - Buka: Supabase Dashboard → Database → **Advisor**.
   - Cek apakah ada peringatan indeks hilang (*Unindexed Foreign Keys* atau *Slow Queries*).
2. **Reports → Database (CPU & RAM)**:
   - Pantau grafik **CPU Usage** dan **Memory Usage (RAM)** saat membuka halaman Dashboard atau Transaksi.
   - Perhatikan apakah ada lonjakan CPU mendekati 100% atau *CPU burst balance* yang terkuras habis.

---

## 5. Evaluasi Spesifikasi Komputasi (`t4g.nano`)

### Karakteristik `t4g.nano`
- Memiliki 2 vCPU ARM (burstable) dan RAM 512 MB.
- Memiliki alokasi kredit CPU (*CPU Credits*). Saat idle, CPU credits terakumulasi. Saat terjadi lonjakan komputasi, instance mengonsumsi kredit tersebut.

### Rekomendasi
- **JANGAN** terburu-buru melakukan upgrade komputasi (*compute add-on*) ke `Small` atau `Medium`.
- Saat ini kondisi idle tercatat: CPU 2%, RAM 54%, koneksi 6/60.
- Penyebab utama aplikasi terasa lambat **bukan kapasitas database**, melainkan:
  1. Latensi jaringan antar-region (Vercel function di `sin1` sedangkan Supabase di Seoul `ap-northeast-2`).
  2. Waterfall query serial dan duplikasi panggilan auth/RPC pada Server Component.
  3. Kurangnya streaming / Suspense pada halaman.
- Hanya pertimbangkan upgrade compute jika:
  1. `EXPLAIN (ANALYZE, BUFFERS)` menunjukkan eksekusi query SQL itu sendiri memakan waktu > 100 ms dan tidak bisa diselesaikan dengan indeks.
  2. Grafik CPU/RAM di Supabase Dashboard melonjak konsisten di atas 80% saat digunakan.
