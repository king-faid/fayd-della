# SOP Sayang — Faid & Della

Aplikasi web laporan SOP hubungan: saling menjaga, bertumbuh bersama, menuju pernikahan.

Dibangun dengan **Next.js 14**, **Supabase** (database + login), dan dideploy di **Vercel**.

## Fitur

| Tab | Isi |
| --- | --- |
| Hari Ini | Checklist sholat 5 waktu dan komunikasi harian. Centang berdua terlihat beserta jamnya; yang lebih dulu dapat mahkota. Update langsung (realtime). |
| Mingguan | Kencan, ngobrol serius, kegiatan bersama. |
| Bulanan | Evaluasi masing-masing, bisa saling dibaca. |
| Target | Tabungan nikah (nominal, target, progres, per orang, riwayat) dan roadmap 4 langkah. |
| Rekap | Papan skor lomba per bulan. |
| Mode LDR | Tombol di kanan atas, berlaku untuk berdua. |

### Aturan poin lomba

| Poin | Syarat |
| --- | --- |
| +1 | Setiap item harian yang dicentang |
| +1 | Duluan: kalian berdua mencentang item yang sama, yang lebih dulu |
| +1 | Tepat waktu: dicentang sebelum batas jam item |
| +1 | Setiap kegiatan mingguan yang dicentang |

Jam centang dicatat oleh server Supabase, jadi tidak bisa diakali dari jam HP.

## Pemasangan

### 1. Supabase

1. Buat proyek baru di [supabase.com](https://supabase.com), misalnya `sop-sayang`. Region terdekat: **Southeast Asia (Singapore)**.
2. Buka **SQL Editor > New query**, tempel isi `supabase/schema.sql`, lalu **Run**.
3. Login aplikasi = pilih **Faid / Della** + **PIN 6 angka**. Buka **Authentication > Users > Add user > Create new user** dan buat 2 akun (centang **Auto Confirm User**):

   | Untuk | Email (alamat login internal) | Password |
   | --- | --- | --- |
   | Faid | `faid@sopsayang.app` | PIN 6 angka Faid |
   | Della | `della@sopsayang.app` | PIN 6 angka Della |

   Email ini tidak perlu email asli; daftarnya ada di `AKUN` pada `lib/config.js`.
4. Kembali ke **SQL Editor** dan jalankan:

   ```sql
   insert into public.profiles (id, username, nama)
     select id, 'faid', 'Faid' from auth.users where email = 'faid@sopsayang.app';
   insert into public.profiles (id, username, nama)
     select id, 'della', 'Della' from auth.users where email = 'della@sopsayang.app';
   ```

5. Supaya orang lain tidak bisa daftar: **Authentication > Sign In / Providers > Email**, matikan **Allow new users to sign up**.
6. Catat **Project URL** dan **anon / publishable key** dari **Project Settings > API**.

### 2. Vercel

1. Masuk ke [vercel.com](https://vercel.com) dengan akun GitHub `king-faid`.
2. **Add New > Project**, pilih repo `fayd-della`, klik **Import**.
3. Di **Environment Variables**, isi:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon / publishable key
4. Klik **Deploy**. Setelah selesai, buka URL `*.vercel.app` dari HP, lalu **Add to Home Screen**.

Setiap push ke branch `main` otomatis dideploy ulang oleh Vercel.

### 3. Menjalankan di komputer (opsional)

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya
npm run dev
```

## Mengubah isi SOP

Item harian, mingguan, dan batas jam tepat waktu ada di `lib/config.js`. Ubah, commit, push; Vercel deploy otomatis.

## Struktur

```
app/            halaman utama (Next.js App Router)
components/     Login, Modal, isi tiap tab
lib/            koneksi Supabase, isi SOP, fungsi bantu & rekap
supabase/       skema database + keamanan (RLS)
```

## Keamanan

- Semua tabel memakai Row Level Security: hanya akun yang terdaftar di `profiles` yang bisa membaca.
- Masing-masing hanya bisa menambah, mengubah, dan menghapus data miliknya sendiri.
- Roadmap, target tabungan, dan mode diubah berdua.
