# hacktiv8-wave-32

Chatbot multimodal sederhana bertenaga **Google Gemini**. Satu endpoint menerima
**teks + gambar + audio + dokumen** sekaligus, lalu mengembalikan balasan teks.

Dibangun dengan:

- [Express 5](https://expressjs.com/) — web server & routing
- [Multer](https://github.com/expressjs/multer) — upload file (in-memory)
- [@google/genai](https://github.com/googleapis/js-genai) — SDK resmi Gemini
- [dotenv](https://github.com/motdotla/dotenv) — konfigurasi dari `.env`
- [cors](https://github.com/expressjs/cors) — izin akses lintas origin

## Fitur

- Satu endpoint terpadu `POST /api/chat` untuk teks dan/atau file.
- Mendukung teks, gambar, audio, dan dokumen (PDF/teks) sebagai input.
- Validasi tipe file & batas ukuran.
- Pesan error yang jelas (status HTTP sesuai penyebabnya).

## Prasyarat

- **Node.js 20 atau lebih baru** (SDK `@google/genai` mensyaratkan Node >= 20).
- **API key Google Gemini** — buat di <https://aistudio.google.com/app/apikey>.

## Instalasi

```bash
npm install
```

## Konfigurasi

Salin contoh file environment, lalu isi API key Anda:

```bash
cp .env.example .env
```

Isi `.env`:

| Variabel | Wajib | Default | Keterangan |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | — | API key Gemini (diawali `AIza`). Server gagal start jika kosong. |
| `PORT` | ❌ | `3000` | Port server. |
| `GEMINI_MODEL` | ❌ | `gemini-3.1-flash-lite` | Model Gemini yang dipakai. |
| `DEFAULT_PROMPT` | — | (tidak digunakan) | Prompt lampiran ditetapkan di kode agar tetap dalam cakupan ARAKAS. |
| `MAX_FILE_SIZE_MB` | ❌ | `5` | Batas ukuran tiap file (dalam MB). |
| `MAX_FILES` | ❌ | `5` | Maksimal jumlah file per request. |
| `SYSTEM_INSTRUCTION` | — | (tidak digunakan) | Instruksi wajib ditetapkan di kode; environment tidak mengganti batasan ARAKAS. |

> `.env` sudah di-`.gitignore` — jangan pernah commit API key Anda.

## Knowledge customer support ARAKAS

Backend membaca `ARAKAS_SERVICES.md` saat startup dan memasukkannya ke instruksi sistem pada setiap request Gemini. File ini berisi layanan demo berdasarkan CV yang telah disetujui pemilik serta kontak WhatsApp **085117170042** / <https://wa.me/6285117170042> dan email **mail@apriyanto.com**.

Asisten diarahkan hanya menjawab tentang ARAKAS, menolak pertanyaan di luar cakupan dengan sopan, dan mengarahkan informasi yang belum tersedia ke kontak resmi. Harga, jadwal, SLA, dan kebijakan yang belum diberikan tidak boleh dikarang. Lampiran pengguna tidak boleh mengubah aturan atau menjadi fakta resmi perusahaan.

Pesan dibatasi 4.000 karakter dan harus berupa string. Konteks percakapan menggunakan `previous_interaction_id` Gemini. Restart server setelah mengubah knowledge. File knowledge berada di luar folder `static`, sehingga tidak disajikan sebagai aset publik.

Batasan berbasis instruksi model bukan jaminan keamanan mutlak. Pengujian respons Gemini asli dan rate limit diperlukan sebelum penggunaan publik; belum ada autentikasi atau akses data pelanggan.

Jalankan `npm test` untuk pengujian lokal dengan Gemini mock (tanpa jaringan/biaya). Pengujian ini memeriksa penyertaan knowledge, validasi input, dan aturan lampiran, bukan kepatuhan model nyata.

## Menjalankan

```bash
npm run dev     # mode watch (auto-restart saat file berubah)
# atau
npm start       # mode biasa
```

Server berjalan di `http://localhost:3000` (atau sesuai `PORT`).
Buka alamat tersebut di browser untuk menggunakan UI chatbot teks dari folder `static`.
UI menampilkan status loading dan error, serta mengirim pesan ke `POST /api/chat`.
Upload lampiran saat ini tersedia melalui API/Postman, belum melalui UI.

## API

### `GET /health`

Cek status server.

```bash
curl http://localhost:3000/health
```

```json
{ "status": true, "model": "gemini-3.1-flash-lite" }
```

### `POST /api/chat`

Kirim percakapan ke Gemini. Menerima **dua bentuk** request:

**1. Teks saja — `application/json`**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Halo, perkenalkan dirimu singkat saja."}'
```

**2. Dengan lampiran — `multipart/form-data`**

Field:
- `message` — teks (opsional jika ada file);
- `files` — satu atau lebih file (opsional);
- `previous_interaction_id` — ID respons sebelumnya untuk melanjutkan percakapan (opsional; string tidak kosong tanpa whitespace, maksimal 512 karakter).

```bash
curl -X POST http://localhost:3000/api/chat \
  -F "message=Ringkas isi dokumen ini" \
  -F "files=@laporan.pdf" \
  -F "files=@foto.jpg"
```

**Respons** (kedua bentuk):

```json
{ "status": true, "text": "...", "interaction_id": "ID_DARI_GEMINI" }
```

Untuk pesan lanjutan, kirim `interaction_id` respons sebelumnya sebagai `previous_interaction_id` dalam JSON atau form-data. Pesan pertama tidak perlu menyertakannya. UI melakukan ini otomatis dan hanya memperbarui ID setelah request berhasil.

## Tipe file & batasan

| Kategori | MIME yang didukung |
|---|---|
| Gambar | `image/png`, `image/jpeg`, `image/webp`, `image/heic`, `image/heif` |
| Audio | `audio/wav`, `audio/mp3`, `audio/mpeg`, `audio/aiff`, `audio/aac`, `audio/ogg`, `audio/flac` |
| Dokumen | `application/pdf`, `text/plain`, `text/markdown`, `text/csv` |

- Maksimal jumlah file per request: `MAX_FILES` (default **5**).
- Maksimal ukuran tiap file: `MAX_FILE_SIZE_MB` (default **5 MB**).
- Total maksimal per request = `MAX_FILES` × `MAX_FILE_SIZE_MB` (default 5 × 5 = **25 MB**).
- File dikirim ke Gemini sebagai objek content bertipe (`image`/`audio`/`document`) berisi data base64.
- Permintaan dikirim lewat Interactions API: `ai.interactions.create({ model, input })`, hasil diambil dari `output_text`.

## Pesan error

| Status | Penyebab |
|---|---|
| `400` | Tidak ada `message` dan file; tipe file tidak didukung; file terlalu besar; terlalu banyak file. |
| `404` | Route tidak ditemukan. |
| `4xx/5xx` | Diteruskan apa adanya dari API Gemini (mis. `401` key salah, `429` kuota habis). |

## Struktur proyek

```
.
├── index.js          # Entry point: server, route, konfigurasi Multer & Gemini
├── .env              # Variabel environment (tidak di-commit)
├── .env.example      # Template variabel environment
├── .gitignore
└── package.json
```

## Skrip npm

| Skrip | Perintah | Keterangan |
|---|---|---|
| `npm start` | `node index.js` | Menjalankan server. |
| `npm run dev` | `nodemon index.js` | Menjalankan server dengan auto-restart (nodemon). |

## Catatan

Versi ini menggunakan Gemini Interactions API dengan `store: true` dan `previous_interaction_id` untuk konteks percakapan. Instruksi sistem dan knowledge dikirim ulang setiap request agar batasan ARAKAS tetap berlaku.

UI menyimpan ID terakhir hanya di memori halaman, tanpa localStorage, database, atau daftar sesi. Refresh memulai percakapan baru di UI; tidak menghapus request/respons yang disimpan di Gemini. Jika ID tidak berlaku lagi, error ditampilkan dan pengguna dapat refresh untuk memulai ulang. Tidak ada streaming.

Interaksi tersimpan di layanan Gemini dan tunduk pada kebijakan penyedia. Jangan kirim rahasia atau data sensitif. ID percakapan jangan dibagikan: demo belum memiliki autentikasi atau pemeriksaan kepemilikan ID antar-pengguna. Tambahkan kontrol tersebut sebelum penggunaan publik.
