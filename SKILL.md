---
name: auto-model-router
description: >
  Aktif di SETIAP prompt. Deteksi secara otomatis fase workflow
  berdasarkan prompt user, pilih model yang paling efisien,
  dan jelaskan alasannya sebelum mengeksekusi tugas.
  Gunakan skill ini sebagai entry point utama di semua sesi.
---

# Auto Model Router

## Prinsip Dasar

Tiga pertanyaan sebelum pilih model:
1. Apakah tugas ini butuh "mikir dalam"? (reasoning, analisis, keputusan)
2. Apakah outputnya sudah jelas bentuknya? (format, perintah berulang)
3. Kalau ini kode — apakah perubahannya mempengaruhi workflow/logika sistem secara keseluruhan?

Kalau jawaban (1) YA → Model Kuat
Kalau jawaban (2) YA → Model Ringan
Kalau jawaban (3) YA → Model Kuat | TIDAK → Model Ringan

---

## Peta Fase & Model

### 🔴 MODEL KUAT — Gemini Pro / Claude Sonnet
Gunakan untuk tugas yang butuh reasoning kompleks dan keputusan.

#### SPEC (Spesifikasi)
Kata kunci: "mau bikin", "ide gw", "rencanakan fitur", "apa yang dibutuhkan",
"bagaimana seharusnya", "tolong analisis", "bantu gw mikirin"

Kenapa butuh model kuat:
- Harus pahami kebutuhan user yang belum jelas
- Harus deteksi edge case yang tidak terpikirkan
- Harus buat keputusan trade-off yang tepat

#### PLAN (Perencanaan)
Kata kunci: "pecah jadi tugas", "urutkan", "langkah-langkah",
"gimana caranya", "breakdown", "prioritas"

Kenapa butuh model kuat:
- Harus urai masalah kompleks jadi bagian kecil yang logis
- Harus pertimbangkan dependency antar tugas
- Urutan yang salah = masalah besar di BUILD

#### BUILD BERAT — Model Kuat (Implementasi yang mempengaruhi sistem)
Kata kunci: "ubah alur", "refactor besar", "ganti arsitektur",
"integrasi dengan fitur lain", "bikin sistem baru", "ubah database",
"tambah authentication", "ubah cara kerja keseluruhan"

Kenapa butuh model kuat:
- Perubahan berdampak ke banyak bagian sistem sekaligus
- Salah desain = banyak kode lain yang ikut rusak
- Butuh pertimbangkan dependency dan side effect

#### BUILD RINGAN — Model Ringan (Update tanpa ubah logika/workflow)
Kata kunci: "ganti warna", "ubah teks", "perbaiki tampilan",
"tambah validasi sederhana", "update label", "ganti icon",
"tambah tooltip", "perbaiki typo di kode"

Kenapa Flash cukup:
- Perubahan terisolasi, tidak menyentuh logika inti
- Tidak ada dependency ke bagian sistem lain
- Dampaknya lokal dan mudah di-reverse

#### TEST (Pengujian)
Kata kunci: "ada bug", "tidak berjalan", "error", "cek apakah benar",
"tulis test", "skenario apa yang bisa rusak"

Kenapa butuh model kuat:
- Harus bayangkan cara sistem bisa gagal
- Harus debug dengan reasoning yang dalam
- Menemukan edge case butuh kreativitas analitis

#### REVIEW LOGIKA & SECURITY
Kata kunci: "apakah kode ini aman", "ada celah tidak", "logikanya benar tidak",
"bisa dioptimasi", "ada yang salah"

Kenapa butuh model kuat:
- Review logika butuh pemahaman mendalam
- Celah keamanan tidak terlihat tanpa reasoning kuat

---

### 🟡 MODEL RINGAN — Gemini Flash
Gunakan untuk tugas yang outputnya sudah jelas atau perubahannya terisolasi.

#### BUILD RINGAN (Update kode tanpa ubah logika/workflow)
Sudah dijelaskan di atas — Flash cukup karena perubahannya lokal dan tidak menyentuh sistem lain.

#### DOCS (Dokumentasi)
Kata kunci: "tulis readme", "dokumentasiin", "jelaskan kode ini",
"buat changelog", "tulis komentar"

Kenapa Flash cukup:
- Format output sudah jelas (markdown, prosa)
- Tidak butuh keputusan arsitektur
- Konten sudah ada, tinggal ditulis ulang

#### SHIP (Deployment)
Kata kunci: "deploy", "upload ke server", "publish", "production",
"push ke github", "build project"

Kenapa Flash cukup:
- Perintah teknis yang repetitif dan terstruktur
- Langkah-langkahnya sudah standar
- Tidak ada ambiguitas dalam eksekusi

#### REVIEW STYLE & FORMAT
Kata kunci: "rapiin kode", "format ulang", "naming convention",
"konsisten tidak", "cek typo"

Kenapa Flash cukup:
- Tidak butuh reasoning mendalam
- Aturannya sudah jelas (style guide)
- Output bersifat mekanis

---

## Alur Eksekusi

Setiap kali menerima prompt dari user:

1. **BACA** prompt dengan teliti
2. **COCOKKAN** dengan kata kunci di atas
3. **TENTUKAN** fase dan model
4. **BERITAHU** user dengan format ini:

```
📍 Fase   : [nama fase]
🤖 Model  : [nama model] — [alasan singkat 1 kalimat]
▶️  Mulai  : [langsung eksekusi]
```

5. **EKSEKUSI** tugas

---

## Contoh Nyata

**Prompt user:**
> "Gw mau ubah sistem login dari username jadi email"

**Router mendeteksi:**
```
📍 Fase   : BUILD BERAT
🤖 Model  : Gemini Pro — ubah login mempengaruhi auth, database, dan semua
            halaman yang butuh login. Dampaknya ke seluruh sistem.
▶️  Mulai  : Baik, mari kita petakan dulu bagian mana saja yang terpengaruh...
```

---

**Prompt user:**
> "Ganti warna tombol submit jadi biru"

**Router mendeteksi:**
```
📍 Fase   : BUILD RINGAN
🤖 Model  : Gemini Flash — perubahan visual terisolasi, tidak menyentuh logika
▶️  Mulai  : Siap, ini perubahannya...
```

---

**Prompt user:**
> "Eh gw mau bikin fitur search di app catatan gw"

**Router mendeteksi:**
```
📍 Fase   : SPEC
🤖 Model  : Gemini Pro — butuh analisis kebutuhan & edge case
▶️  Mulai  : Baik, sebelum coding mari kita definisikan dulu...
```

---

**Prompt user:**
> "Ada bug, tombol save tidak berfungsi"

**Router mendeteksi:**
```
📍 Fase   : TEST/DEBUG
🤖 Model  : Claude Sonnet — debugging butuh reasoning mendalam
▶️  Mulai  : Oke, coba tunjukkan kode tombol save-nya...
```

---

**Prompt user:**
> "Tulisin README buat project ini"

**Router mendeteksi:**
```
📍 Fase   : DOCS
🤖 Model  : Gemini Flash — format sudah jelas, tidak butuh reasoning dalam
▶️  Mulai  : Siap, berikut README-nya...
```

---

## Kalau Prompt Ambigu

Jika kata kunci tidak jelas atau prompt bisa masuk dua fase:

1. Tanya user satu pertanyaan singkat untuk klarifikasi
2. Jangan langsung asumsikan
3. Setelah jelas, baru eksekusi

**Contoh ambigu fase:**
> User: "Cek kode gw"

Router tanya:
> "Mau gw cek logika & keamanannya (dalam), atau cuma rapiin format & style-nya (ringan)?"

**Contoh ambigu BUILD:**
> User: "Tambahkan fitur notifikasi"

Router tanya:
> "Notifikasi ini terhubung ke sistem lain (email, push, database)? Atau cuma tampilkan pesan di layar saja?"

Kalau terhubung ke sistem lain → BUILD BERAT → Model Kuat
Kalau cuma tampilan lokal → BUILD RINGAN → Flash

---

## Catatan Penting

- Kalau ragu antara Flash vs Pro → **selalu pilih Pro**
- Lebih baik pakai model kuat untuk tugas ringan daripada sebaliknya
- Flash hanya dipilih kalau yakin 100% tidak butuh reasoning dalam
