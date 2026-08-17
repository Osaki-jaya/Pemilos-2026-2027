# PRD: Website Pemilihan Ketua & Wakil Ketua OSIS

## 1. Overview
Website untuk pemilihan Ketua dan Wakil Ketua OSIS secara digital, diakses siswa melalui device yang disediakan sekolah (bergiliran) maupun HP pribadi. Sistem terdiri dari sisi siswa (voting) dan sisi admin (kontrol & rekap hasil).

## 2. Goals
- Memudahkan siswa memilih paslon secara cepat dan jelas
- Mencegah kecurangan (vote ganda, manipulasi hasil)
- Memberi admin kontrol penuh atas buka/tutup voting dan visibilitas hasil real-time
- Tahan terhadap trafik padat (ratusan submission dalam waktu berdekatan)

## 3. Target Pengguna
- **Siswa (voter)**: mengakses via device sekolah bergiliran atau HP pribadi, mayoritas mobile
- **Admin (panitia OSIS)**: mengelola status voting dan melihat hasil

## 4. Tech Stack
- Frontend: HTML/CSS/JS (vanilla), hosting di Vercel
- Backend: Google Apps Script (GAS) sebagai proxy
- Database: Google Sheets

## 5. Fitur & User Flow

### 5.1 Sisi Siswa
| Halaman | Fungsi |
|---|---|
| Landing page | Judul pemilihan, periode voting, tombol "Mulai Voting" |
| Daftar kandidat | Kartu tiap paslon: foto, nomor urut, nama ketua & wakil |
| Detail visi-misi | Isi lengkap visi-misi per paslon |
| Form vote | Input NIS/nama + pilih paslon (radio/kartu), tombol submit |
| Konfirmasi | Notifikasi vote berhasil tersimpan |
| Form ditutup | Ditampilkan jika voting belum dibuka / sudah berakhir |

**Validasi:**
- Cegah submit ganda dari device/sesi yang sama (localStorage/sessionStorage)
- Cegah submit jika NIS sudah pernah vote (dicek di Sheets via GAS)
- Cek status form (buka/tutup) sebelum render form vote

### 5.2 Sisi Admin
| Halaman | Fungsi |
|---|---|
| Login admin | Autentikasi sederhana, password dicek server-side di GAS (bukan hardcode di client) |
| Dashboard hasil | Total suara per paslon (angka + chart bar/pie), total siswa sudah vote vs belum |
| Kontrol form | Tombol buka/tutup voting (update status ke Sheets, dibaca script siswa) |
| Log aktivitas | List NIS yang sudah vote + waktu submit (tanpa menampilkan pilihannya, demi kerahasiaan) |
| Export data | Unduh hasil rekap sebagai CSV (opsional) |

## 6. Kebutuhan Non-Fungsional
- **Performa**: sanggup menangani ±700-1000 submission per jam tanpa error
- **Reliabilitas**: retry logic otomatis (maks 3x) di sisi client jika submit gagal/timeout
- **Keamanan**: pilihan vote tidak boleh terekspos ke publik/siswa lain; endpoint GAS tidak boleh expose data mentah tanpa autentikasi admin
- **Responsif**: mobile-first, tetap rapi di desktop
- **Concurrency**: gunakan `LockService` di GAS agar tidak ada race condition saat banyak submission bersamaan ke Sheets

## 7. Struktur Data (Google Sheets)
**Sheet "Votes"**: Timestamp | NIS | Paslon Dipilih | Device/Session ID

**Sheet "Config"**: Status Form (Buka/Tutup) | Waktu Mulai | Waktu Selesai

**Sheet "Kandidat"**: Nomor Urut | Nama Ketua | Nama Wakil | Foto (URL) | Visi Misi

## 8. Struktur File
```
/index.html      → landing + daftar kandidat
/style.css
/script.js        → logic voting, fetch ke GAS
/admin.html
/admin.css
/admin.js         → logic login, dashboard, kontrol form
```

## 9. API Endpoint (GAS)
- `doPost` → terima submission vote (NIS, pilihan, session ID)
- `doGet?action=status` → ambil status form (buka/tutup) + data kandidat
- `doGet?action=results` (dengan token admin) → ambil rekap hasil untuk dashboard

## 10. Out of Scope
- Sistem autentikasi kompleks (SSO, OAuth) — cukup password sederhana untuk admin
- Notifikasi email/WA otomatis
- Multi-jenjang voting (misal per angkatan terpisah) — kecuali diminta terpisah

## 11. Success Metrics
- 100% siswa yang vote berhasil submit tanpa gagal permanen
- Tidak ada vote ganda dari NIS yang sama
- Admin bisa memantau hasil real-time tanpa refresh manual berulang
