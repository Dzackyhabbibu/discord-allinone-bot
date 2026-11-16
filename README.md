<div align="center">

# 🚀 Discord All-in-One Bot (No-AI)

  <p><b>Bot Discord Serba Ada Tanpa AI — Moderasi, Ekonomi, Musik, Utilitas, Analitik & Web Dashboard!</b></p>

  [![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
  [![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
  [![Express](https://img.shields.io/badge/Express-Dashboard-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
  [![License](https://img.shields.io/badge/License-MIT-blue.style=for-the-badge)](LICENSE)

</div>

---

## 📌 Ringkasan Proyek

**Discord All-in-One Bot** adalah solusi manajemen server Discord buatan sendiri yang **ringan, cepat, dan 100% bebas ketergantungan API AI external**. Seluruh logika dijalankan secara lokal menggunakan Node.js 18+, discord.js v14, dan database SQLite zero-config via `better-sqlite3`.

Bot ini mencakup **7 modul utama** yang sudah siap dipakai untuk mengelola komunitas kecil hingga server besar secara efisien.

---

## 🔥 Keunggulan Utama

- ⚡ **Tanpa AI & Ketergantungan Eksternal Mahal**: Berjalan 100% lokal, cepat, efisien tanpa kuota API pihak ketiga.
- 📂 **Zero-Config Database**: Menggunakan SQLite (`better-sqlite3`) dengan layer abstraksi terpisah (`src/core/database.js`).
- 🛡️ **Anti-Nuke & Rollback Otomatis**: Melindungi server dari perusakan massal (penghapusan channel/role/ban).
- 🎨 **Kartu Profil & Rank Dinamis**: Rendering gambar dinamis menggunakan `@napi-rs/canvas`.
- 🌐 **Web Dashboard Modern**: Panel kontrol berbasis Express + EJS + Discord OAuth2 yang responsif di PC & Smartphone.
- 🔌 **Sistem Plugin Modular**: Bebas mengaktifkan atau mematikan modul per server melalui perintah `/plugin` atau dashboard.

---

## 🎮 Fitur Lengkap per Modul

### 1. 🛡️ Moderasi & Auto-Mod
- **Auto-Moderation**: Anti-spam, anti-raid, filter kata kotor & link berbahaya, anti-mass-mention, dan anti-capslock.
- **Perintah Moderasi**: `/warn`, `/mute`, `/unmute`, `/kick`, `/ban`, `/unban`, `/timeout`, `/purge`.
- **Sistem Pelanggaran**: Akumulasi poin pelanggaran (`warn_points`) dengan eksekusi hukuman otomatis (timeout/mute/kick/ban).
- **Log Pelanggaran & Case ID**: Setiap tindakan memiliki ID unik (`case_id`) & riwayat lengkap per pengguna.
- **Audit Logging**: Mencatat pesan dihapus/diedit, member join/leave, perubahan role, dan channel.
- **Keamanan Server**: Fitur Verifikasi Member (tombol/captcha), Slowmode otomatis, dan Lockdown channel.

### 2. 💰 Leveling & Ekonomi
- **Sistem XP Dinamis**: XP didapatkan otomatis dari aktivitas obrolan teks (dengan cooldown anti-spam) dan voice channel.
- **Kartu Profil & Rank Canvas**: Menampilkan gambar profil & progres XP yang digambar menggunakan `@napi-rs/canvas`.
- **Papan Peringkat (Leaderboard)**: Top member berdasarkan XP dan koin server (`/leaderboard`).
- **Role Reward**: Pemberian role otomatis saat mencapai level tertentu.
- **Ekonomi Kompleks**: Hadiah harian (`/daily`), mingguan (`/weekly`), kerja (`/work`), dan transfer koin.
- **Mini Game Kasino**: Kasino mini-games interaktif (`/minigames coinflip`, `/minigames slots`).

### 3. 🎵 Pemutar Musik
- **Manajemen Lagu**: Perintah `/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`, `/nowplaying`, `/volume`.
- **Dukungan Platform**: Integrasi `discord-player` dengan extractor YouTube & Spotify.
- **Filter Audio**: Mode Bassboost, Nightcore, 8D, dan equalizer.
- **Kontrol Tombol UI**: Kontrol pemutar musik langsung lewat tombol interaktif di chat Discord.

### 4. 🧰 Utilitas & Komunitas
- **Pengingat & Timer**: Perintah `/reminder` dan `/timer` dengan scheduler persisten.
- **Polling & Giveaway**: Pembuatan polling interaktif dan giveaway dengan tombol pendaftaran otomatis.
- **Sistem Tiket Support**: Pembuatan channel tiket bantuan lewat dropdown menu select dengan opsi claim/close.
- **Informasi Server**: Perintah lengkap `/server`, `/user`, dan `/avatar`.
- **Fitur Fun**: Perintah `/fun dadjoke` dan `/fun 8ball`.

### 5. 🎨 Kustomisasi Server
- **Pesan Sambutan**: Kustomisasi welcome & goodbye message dengan format Embed + gambar.
- **Reaction Roles**: Penetapan role otomatis lewat Tombol / Dropdown Menu Select.
- **Auto-Responder & Custom Commands**: Balasan otomatis untuk kata kunci tertentu & pembuatan perintah kustom.
- **Autorole & Sticky Message**: Pemberian role otomatis ke member baru & pesan tertempel di channel.

### 6. 🏆 Fitur Pembeda (Advanced)
- 🚨 **Anti-Nuke System**: Mendeteksi tindakan jahat massal (hapus channel/role, mass ban) lalu memulihkan struktur server & menghukum pelaku.
- 📦 **Backup & Restore**: Pencadangan data server (channel, role, permission) dan pemulihan kapan saja via `/backup` & `/restore`.
- 📊 **Analitik Server**: Menampilkan tren pertumbuhan member, jam teraktif, dan statistik channel (`/analytics`).
- 🔌 **Plugin Manager**: Aktifkan atau nonaktifkan modul per-server lewat `/plugin` atau Web Dashboard.

### 7. 🌐 Web Dashboard
- **Discord OAuth2 Login**: Login aman menggunakan akun Discord.
- **Multi-Server Selector**: Kelola semua server yang kamu atur dalam satu layar.
- **Pengaturan Lengkap**: Ubah prefix, pesan welcome, filter kata, dan plugin langsung dari browser.
- **Visual Log & Analytics**: Lihat riwayat kasus moderasi dan statistik server.
- **Mobile Responsive**: Tampilan modern yang nyaman dibuka di smartphone maupun PC.

---

## 📁 Struktur Direktori

```
discord-allinone-bot/
├── src/
│   ├── index.js                     # Entry point utama bot
│   ├── deploy-commands.js           # Script pendaftaran Slash Commands
│   ├── dashboard.js                 # Entry point Web Dashboard
│   ├── core/                        # Core bot engine
│   │   ├── config.js                # Konfigurasi dari environment variables
│   │   ├── database.js              # SQLite Database Layer (better-sqlite3)
│   │   └── logger.js                # Custom Logger dengan warna konsol
│   ├── modules/                     # Modul fitur bot
│   │   ├── moderation/              # Modul Moderasi & Auto-Mod
│   │   ├── leveling/                # Modul XP, Level & Ekonomi
│   │   ├── music/                   # Modul Pemutar Musik
│   │   ├── utility/                 # Modul Tiket, Giveaway & Pengingat
│   │   ├── customization/           # Modul Welcome, Auto-Responder & Roles
│   │   ├── distinction/             # Modul Anti-Nuke, Backup & Analytics
│   │   └── dashboard/               # Express Web Dashboard (Routes, Views, Assets)
├── data/                            # File SQLite (.sqlite) & aset lokal
├── .env.example                     # Template konfigurasi rahasia
├── package.json                     # Dependency & NPM Scripts
└── README.md                        # Dokumentasi lengkap proyek
```

---

## 🛠️ Persyaratan Sistem

- **Node.js**: `v18.0.0` atau yang lebih baru
- **NPM**: `v9.0.0` atau yang lebih baru
- **Git**: Terinstal di perangkat

---

## 🚀 Panduan Instalasi & Penggunaan

### 1. Clone Repository
```bash
git clone https://github.com/Dzackyhabbibu/discord-allinone-bot.git
cd discord-allinone-bot
```

### 2. Install Dependency
```bash
npm install
```

### 3. Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Buka file `.env` dan lengkapi datanya:
```env
# ── BOT DISCORD ──────────────────────────────────────
DISCORD_TOKEN=token_bot_kamu_di_sini
CLIENT_ID=application_id_bot_kamu
GUILD_ID=id_server_kamu                  # Opsional: Kosongkan jika ingin deploy global
BOT_PREFIX=!

# ── WEB DASHBOARD ────────────────────────────────────
DASHBOARD_URL=http://localhost:3000
SESSION_SECRET=string_acak_rahasia_kamu
CLIENT_SECRET=oauth2_client_secret_kamu

# ── DATABASE & LOG ───────────────────────────────────
LOG_LEVEL=info
DB_PATH=data/bot.sqlite
```

---

## ⚙️ Pengaturan di Discord Developer Portal

1. Buka **[Discord Developer Portal](https://discord.com/developers/applications)**.
2. Buat **New Application** → Masuk ke menu **Bot**:
   - Aktifkan **Server Members Intent** (Privileged Intent).
   - Aktifkan **Message Content Intent** (Privileged Intent).
3. Salin **Token** ke `DISCORD_TOKEN` di file `.env`.
4. Masuk ke **OAuth2** → **URL Generator**:
   - Pilih Scopes: `bot`, `applications.commands`, `identify`, `guilds`.
   - Pilih Permissions: `Administrator` (atau pilih spesifik sesuai kebutuhan).
5. Undang bot ke server Discord kamu menggunakan URL hasil generator.

---

## 🏃 Cara Menjalankan Bot & Dashboard

### A. Deploy Slash Commands
Jalankan perintah ini pertama kali untuk mendaftarkan Slash Commands ke Discord:
```bash
npm run deploy
```

### B. Menjalankan Bot Discord
```bash
npm start
```

### C. Menjalankan Web Dashboard
Buka terminal baru dan jalankan:
```bash
node src/dashboard.js
```
Akses Dashboard di browser: **`http://localhost:3000`**

---

## 🤝 Kontribusi

Kontribusi selalu terbuka! Jika kamu ingin menambahkan fitur baru atau memperbaiki bug:
1. Fork repository ini.
2. Buat branch fitur baru (`git checkout -b feature/FiturBaru`).
3. Commit perubahan kamu (`git commit -m 'Add: FiturBaru'`).
4. Push ke branch (`git push origin feature/FiturBaru`).
5. Buat **Pull Request**.

---

## 📝 Lisensi

Proyek ini dilindungi di bawah lisensi [MIT License](LICENSE). Bebas digunakan, dimodifikasi, dan dikembangkan kembali.
