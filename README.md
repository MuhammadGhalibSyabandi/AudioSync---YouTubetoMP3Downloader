# AudioSync - YouTube to MP3 Downloader

AudioSync adalah aplikasi web localhost bergaya **Spotify** yang digunakan untuk mengunduh audio dari video YouTube menjadi file MP3. Mendukung unduhan video tunggal maupun **seluruh playlist** sekaligus.

Aplikasi ini dirancang untuk penggunaan pribadi di laptop Windows dan tidak memerlukan koneksi server, database, atau Docker.

---

## Fitur

| Fitur | Keterangan |
|---|---|
| 🎵 Download MP3 | Unduh audio dari video YouTube sebagai file MP3 |
| 📋 Download Playlist | Tempel URL playlist → semua lagu otomatis masuk antrean |
| 📦 Batch Download | Masukkan banyak URL sekaligus (satu URL per baris) |
| ⏳ Antrean (Queue) | Semua URL diproses satu per satu secara berurutan |
| 📊 Progress Real-Time | Persentase, kecepatan (MB/s), dan sisa waktu (ETA) per lagu |
| 🎚️ Pilihan Kualitas | 128 kbps, 192 kbps, atau 320 kbps |
| 📂 Pilihan Folder | Pilih folder penyimpanan dan buka langsung dari browser |
| 🖱️ Drag & Drop | Seret tautan YouTube langsung ke kotak input |
| 📌 Tombol Paste & Clear | Tempel dari clipboard atau hapus input dengan satu klik |
| 📜 Riwayat (History) | Lihat daftar unduhan sebelumnya, unduh ulang, atau hapus |
| 🔔 Toast Notifications | Notifikasi melayang saat berhasil, gagal, atau info penting |
| 🎨 Desain Spotify-like | Tampilan gelap modern dengan sidebar dan animasi halus |

---

## Prasyarat (Requirements)

Pastikan komputer Windows Anda memiliki:

1. **Python 3.10+**
   - Jika belum punya, unduh dari [python.org](https://www.python.org/downloads/)
   - Atau jika Anda menggunakan Laragon, Python bawaan Laragon sudah cukup.

2. **FFmpeg** (Wajib — digunakan untuk mengonversi video menjadi audio MP3)
   - Aplikasi ini sudah menyertakan FFmpeg portabel di folder `ffmpeg_bin/`. Anda **tidak perlu menginstalnya secara terpisah**.

---

## Panduan Instalasi

### Langkah 1: Unduh / Clone Proyek

Pastikan seluruh file proyek berada di dalam satu folder, misalnya `D:\ConverterMP3`.

### Langkah 2: Instal Dependensi Python

Buka Terminal (Command Prompt atau PowerShell), arahkan ke folder proyek:

```powershell
cd D:\ConverterMP3
```

Lalu instal pustaka yang dibutuhkan:

```powershell
pip install flask yt-dlp
```

### Langkah 3: Jalankan Aplikasi

```powershell
python app.py
```

Anda akan melihat output seperti ini:

```
[AudioSync] FFmpeg ditemukan di: D:\ConverterMP3\ffmpeg_bin\...
 * Running on http://127.0.0.1:5000
```

> **Catatan:** Biarkan terminal ini tetap terbuka. Menutup terminal = mematikan aplikasi.

### Langkah 4: Buka di Browser

Buka browser Anda (Chrome, Edge, Firefox, dll) dan kunjungi:

**http://127.0.0.1:5000**

---

## Cara Penggunaan

### Unduh Video Tunggal
1. Salin URL video YouTube.
2. Klik tombol **Paste** atau tempel manual ke kotak input.
3. Pilih kualitas audio (128 / 192 / 320 kbps).
4. Klik **Mulai Unduh**.

### Unduh Seluruh Playlist
1. Buka halaman playlist di YouTube.
2. Klik tombol **Bagikan** → **Salin tautan** (atau salin URL dari address bar).
3. Tempel URL playlist ke kotak input.
4. Tunggu sebentar — preview akan menampilkan nama playlist dan jumlah lagu.
5. Klik **Mulai Unduh** → semua lagu dalam playlist akan masuk antrean dan diunduh satu per satu.

### Unduh Banyak Video Sekaligus (Batch)
1. Masukkan beberapa URL ke dalam kotak input, **satu URL per baris**.
2. Klik **Mulai Unduh** → semua URL akan diproses secara berurutan.

---

## Struktur File

```
D:\ConverterMP3\
├── app.py                  # Server Flask (routing & API)
├── downloader.py           # Integrasi yt-dlp, antrean, dan FFmpeg
├── history.py              # Manajemen riwayat (baca/tulis history.json)
├── history.json            # Data riwayat unduhan (dibuat otomatis)
├── README.md               # Dokumentasi ini
├── ffmpeg_bin/             # FFmpeg portabel (tidak perlu instal)
├── templates/
│   └── index.html          # Halaman utama (Tailwind CSS)
└── static/
    ├── script.js           # Logika frontend (Vanilla JS)
    └── style.css           # Animasi dan styling tambahan
```

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| File tersimpan sebagai `.webm`, bukan `.mp3` | FFmpeg tidak terdeteksi. Restart server (`Ctrl+C` lalu `python app.py`). Pastikan folder `ffmpeg_bin/` ada dan berisi file `ffmpeg.exe`. |
| `WARNING: This is a development server` | Normal. Peringatan ini bisa diabaikan untuk penggunaan lokal. |
| Unduhan gagal / error | Pastikan URL valid dan video tidak bersifat privat atau dibatasi usia. Periksa juga koneksi internet Anda. |
| Playlist gagal dimuat | Tunggu beberapa detik karena playlist membutuhkan waktu lebih lama untuk diekstrak, terutama jika berisi banyak video. |

---

## Teknologi yang Digunakan

- **Backend:** Python, Flask, yt-dlp
- **Frontend:** HTML, Tailwind CSS (CDN), Vanilla JavaScript
- **Audio Processing:** FFmpeg (portabel)
- **Database:** File JSON (`history.json`)

---
#
