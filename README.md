# Web KUD Bantarangin

Aplikasi web untuk database koperasi `kudbantarangin`. Web ini memakai
**stored procedure yang sudah ada**, jadi aplikasi desktop tetap bisa dipakai
berdampingan.

```
 Browser ──HTTPS──▶ VPS APLIKASI (wg 10.10.0.2)         VPS DATABASE (wg 10.10.0.1)
                    ┌──────────────────────────┐        ┌───────────────────────┐
                    │ Nginx                    │        │ MariaDB               │
                    │  ├─ /    → frontend/dist │  Wire  │  kudbantarangin       │
                    │  └─ /api → Node.js :3000 ┼─Guard─▶│  + stored procedure   │
                    └──────────────────────────┘  3306  └───────────────────────┘
```

| Folder      | Isi                                                                 |
|-------------|---------------------------------------------------------------------|
| `backend/`  | API Node.js (Express). Memanggil stored procedure dan mengembalikan JSON |
| `frontend/` | Web React + Tailwind. Hasil build berupa file statis di `frontend/dist` |
| `deploy/`   | Contoh konfigurasi Nginx dan PM2                                      |

## Fitur & hak akses

| Menu                    | Staf | Pengurus | Admin | Sumber data                                   |
|-------------------------|:----:|:--------:|:-----:|-----------------------------------------------|
| Login                   | ✓    | ✓        | ✓     | `CariUser`                                    |
| Dashboard ringkasan     | ✓    | ✓        | ✓     | tabel nasabah, penabung, deposan, debitur     |
| Nasabah (cari & detail) | ✓    | ✓        | ✓     | `NasabahNama` + rekening per CIF              |
| Tabungan + mutasi       | ✓    | ✓        | ✓     | `PenabungNama`, `Penabung`, tabel jurnal      |
| Deposito + mutasi       | ✓    | ✓        | ✓     | `DeposanNama`, tabel jurnald                  |
| Kredit + angsuran       | ✓    | ✓        | ✓     | `DebiturNama`, tabel angsur & target          |
| Transaksi teller        | milik sendiri | semua user | semua user | `TransaksiTeller`                  |
| Laporan: saldo perkiraan, jurnal umum, rekap angsuran, mutasi kas | – | ✓ | ✓ | `Neraca`, `LaporanNeraca`, `Angsur3`, `TransaksiTellerRekap` |
| Pengguna (lihat & ubah status hidup) | – | – | ✓ | `User`, `UPass01`                  |
| Pilih cabang            | cabang sendiri | semua | semua | `Cabang`                         |

Versi ini **hanya membaca data** (kecuali ubah status user). Transaksi yang
mengubah saldo, seperti setoran, penarikan, angsuran, realisasi kredit, dan
posting bunga, masih dilakukan dari aplikasi desktop.

### Peran user

Tabel `pass` tidak punya kolom peran, jadi peran diatur di `backend/.env`:

```
ROLE_ADMIN=admin,budi
ROLE_PENGURUS=ketua,bendahara
```

User yang tidak disebut di sana otomatis menjadi **staf**. User dan password
untuk login sama dengan yang dipakai di aplikasi desktop.

---

## Instalasi

### 1. Hubungkan kedua VPS lewat WireGuard

VPS database sudah memakai WireGuard dengan IP `10.10.0.1`. VPS aplikasi
dijadikan *peer* dengan IP baru, misalnya `10.10.0.2`. Pastikan IP itu belum
dipakai peer lain (cek dengan `sudo wg show` di VPS database).

**Di VPS APLIKASI**, pasang WireGuard dan buat kunci:

```bash
sudo apt install -y wireguard
wg genkey | sudo tee /etc/wireguard/private.key | wg pubkey | sudo tee /etc/wireguard/public.key
sudo chmod 600 /etc/wireguard/private.key
```

Buat `/etc/wireguard/wg0.conf`:

```ini
[Interface]
PrivateKey = <isi private.key VPS aplikasi>
Address = 10.10.0.2/24

[Peer]
# VPS database
PublicKey = <public key WireGuard VPS database>
Endpoint = <IP_PUBLIK_VPS_DATABASE>:51820
AllowedIPs = 10.10.0.1/32
PersistentKeepalive = 25
```

**Di VPS DATABASE**, tambahkan peer baru di `/etc/wireguard/wg0.conf`:

```ini
[Peer]
# VPS aplikasi
PublicKey = <isi public.key VPS aplikasi>
AllowedIPs = 10.10.0.2/32
```

Aktifkan di kedua VPS, lalu uji dari VPS aplikasi:

```bash
sudo systemctl enable --now wg-quick@wg0      # di VPS aplikasi
sudo systemctl restart wg-quick@wg0           # di VPS database
ping -c 3 10.10.0.1                           # dari VPS aplikasi
```

### 2. Di VPS DATABASE: izinkan MariaDB diakses lewat WireGuard

1. Buat user khusus untuk web. Hak aksesnya hanya **SELECT** dan **EXECUTE**,
   jadi tidak bisa menghapus atau mengubah tabel secara langsung. User ini
   hanya bisa login dari IP WireGuard VPS aplikasi:

   ```sql
   CREATE USER 'koperasi_api'@'10.10.0.2' IDENTIFIED BY 'password_kuat_di_sini';
   GRANT SELECT, EXECUTE ON kudbantarangin.* TO 'koperasi_api'@'10.10.0.2';
   FLUSH PRIVILEGES;
   ```

2. Buat MariaDB mendengarkan di jaringan. Di `/etc/mysql/mariadb.conf.d/50-server.cnf`
   (atau `my.cnf`), bagian `[mysqld]`, isi `bind-address = 0.0.0.0`, lalu
   `sudo systemctl restart mariadb`.
   Jangan isi `10.10.0.1`: kalau MariaDB menyala lebih dulu dari WireGuard
   saat reboot, MariaDB akan gagal start.
3. **Buka port 3306 hanya di antarmuka WireGuard**, supaya tidak bisa
   diakses dari internet:

   ```bash
   sudo ufw allow OpenSSH                         # WAJIB dulu supaya SSH tidak terkunci
   sudo ufw allow 51820/udp                       # port WireGuard
   sudo ufw allow in on wg0 to any port 3306 proto tcp
   sudo ufw enable
   sudo ufw status
   ```

4. Biarkan `lower_case_table_names=1` tetap aktif. Stored procedure menulis
   nama tabel dengan huruf besar-kecil campur (misalnya `Pass`, `Nasabah`).

Uji dari VPS aplikasi:

```bash
sudo apt install -y mariadb-client
mysql -h 10.10.0.1 -u koperasi_api -p kudbantarangin -e "CALL Cabang()"
```

### 3. Di VPS APLIKASI: pasang API dan web

Butuh Node.js 18 atau lebih baru, dan Nginx.

```bash
sudo mkdir -p /var/www && cd /var/www
sudo git clone https://github.com/digitalfuturesolutions69/koperasife.git
sudo chown -R $USER koperasife && cd koperasife

# Backend
cd backend
npm ci --omit=dev
cp .env.example .env
nano .env            # DB_HOST=10.10.0.1, isi DB_PASSWORD, JWT_SECRET, ROLE_ADMIN, ROLE_PENGURUS
                     # JWT_SECRET bisa dibuat dengan: openssl rand -hex 32
                     # STATIC_DIR boleh dikosongkan karena web disajikan oleh Nginx

# Frontend
cd ../frontend
npm ci
npm run build        # hasil di frontend/dist

# Jalankan API dengan PM2 (otomatis hidup lagi setelah reboot)
cd ..
sudo npm i -g pm2
pm2 start deploy/ecosystem.config.cjs
pm2 save && pm2 startup   # jalankan perintah yang ditampilkan

# Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/koperasi
sudo nano /etc/nginx/sites-available/koperasi   # ganti server_name
sudo ln -s /etc/nginx/sites-available/koperasi /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# HTTPS (wajib, karena ada login)
sudo certbot --nginx -d koperasi.domainanda.com
```

Cek koneksi API ke database: buka `https://koperasi.domainanda.com/api/health`.
Hasilnya harus `{"status":"ok","database":"terhubung"}`.

> **Tanpa Nginx?** Isi `STATIC_DIR=../frontend/dist` di `backend/.env`. Node.js
> akan menyajikan web dan API sekaligus di port `PORT`.

### Update aplikasi

```bash
cd /var/www/koperasife && git pull
cd backend && npm ci --omit=dev && cd ../frontend && npm ci && npm run build
pm2 restart koperasi-api
```

---

## Development lokal

```bash
# Terminal 1: API
cd backend && cp .env.example .env   # arahkan DB_HOST ke database uji
npm install && npm run dev           # http://localhost:3000

# Terminal 2: web
cd frontend && npm install && npm run dev   # http://localhost:5173 (request /api diteruskan ke port 3000)
```

## Daftar endpoint API

Semua endpoint (kecuali `login` dan `health`) membutuhkan header
`Authorization: Bearer <token>`. Pengurus dan admin bisa menambah `?nokk=002`
untuk melihat cabang lain.

| Method | Endpoint                          | Keterangan                                   |
|--------|-----------------------------------|----------------------------------------------|
| GET    | `/api/health`                     | Status koneksi database                      |
| POST   | `/api/auth/login`                 | `{ username, password }` → token             |
| GET    | `/api/auth/me`                    | Data user yang sedang login                  |
| GET    | `/api/cabang`                     | Daftar cabang                                |
| GET    | `/api/dashboard`                  | Ringkasan saldo & kolektibilitas             |
| GET    | `/api/nasabah?q=nama`             | Cari nasabah                                 |
| GET    | `/api/nasabah/:cif`               | Detail nasabah + rekening                    |
| GET    | `/api/tabungan?q=nama/nomor`      | Cari rekening tabungan                       |
| GET    | `/api/tabungan/:nomor`            | Detail + 200 mutasi terakhir                 |
| GET    | `/api/deposito?q=nama/nomor`      | Cari deposito                                |
| GET    | `/api/deposito/:nomor`            | Detail + mutasi                              |
| GET    | `/api/kredit?q=nama/nomor`        | Cari debitur                                 |
| GET    | `/api/kredit/:nomor`              | Detail + riwayat & jadwal angsuran           |
| GET    | `/api/laporan/teller?tgl=&semua=1`| Transaksi tunai teller                       |
| GET    | `/api/laporan/neraca`             | Saldo perkiraan (pengurus/admin)             |
| GET    | `/api/laporan/jurnal?tgl1=&tgl2=&nomor=` | Jurnal umum (pengurus/admin)          |
| GET    | `/api/laporan/angsuran?tgl1=&tgl2=` | Rekap angsuran per AO (pengurus/admin)     |
| GET    | `/api/laporan/kas?tgl=`           | Mutasi kas harian (pengurus/admin)           |
| GET    | `/api/users`                      | Daftar user (admin)                          |
| PATCH  | `/api/users/:user/status`         | `{ hidup: "0" \| "1" }` (admin)              |

## Catatan keamanan

- Password di tabel `pass` tersimpan **tanpa enkripsi** (bawaan aplikasi
  desktop). Web ini tidak pernah menampilkan password, tetapi sebaiknya akses
  ke database dijaga ketat: firewall, user khusus, dan jaringan privat/VPN.
- Login dibatasi 20 percobaan per 15 menit per IP.
- Selalu gunakan HTTPS di server produksi.
