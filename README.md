# 🕵️ UNDERCOVER — Realtime Multiplayer

Game Undercover/Mr. White realtime berbasis web dengan Socket.io.

---

## 🚀 CARA DEPLOY KE RAILWAY (GRATIS) — Step by Step

### 1. Buat akun Railway
Buka https://railway.app → klik **"Login"** → pilih **"Login with GitHub"**

### 2. Upload code ke GitHub
```bash
# Di folder undercover-game:
git init
git add .
git commit -m "first commit"
```
Buka GitHub.com → New Repository → nama: `undercover-game` → Create
```bash
git remote add origin https://github.com/USERNAMEKAMU/undercover-game.git
git branch -M main
git push -u origin main
```

### 3. Deploy di Railway
1. Buka https://railway.app/new
2. Klik **"Deploy from GitHub repo"**
3. Pilih repo `undercover-game`
4. Railway otomatis detect Node.js dan deploy ✅
5. Tunggu ~1-2 menit sampai status **"Active"**

### 4. Dapetin link publik
1. Klik project kamu di Railway
2. Klik tab **"Settings"**
3. Scroll ke **"Domains"**
4. Klik **"Generate Domain"**
5. Kamu dapat link seperti: `https://undercover-game-xxxx.up.railway.app`

### 5. Bagikan ke teman!
Kirim link itu ke teman-teman → langsung bisa main bareng! 🎉

---

## 🔧 Jalankan Lokal
```bash
npm install
npm start
# Buka http://localhost:3000
```

---

## 🎮 Cara Main
1. Buka link → ketik nama
2. Jalan ke **GAME ROOM** (kanan bawah) pakai WASD/Arrow
3. Tekan **E** untuk masuk
4. **Buat Room** atau **Join** room yang ada di list
5. Host atur settings → **MULAI GAME**
6. Dapat kata → kasih clue bergantian
7. Tekan **⚑ Vote Sekarang** kalau sudah cukup
8. Vote → eliminasi → reveal!

---

## 🔊 Sound Effects
- 🎵 Notif giliran kamu
- ⚑ Vote dimulai
- 💀 Eliminasi
- 🏆 Menang/Kalah
- ⌨️ Click & submit clue
- ⏰ Timer warning

## 📝 Word Bank
110+ pasang kata Bahasa Indonesia — Hewan, Makanan, Tempat, Profesi, Benda, Alam, Olahraga, dll.
