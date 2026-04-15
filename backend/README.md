# AYU ColorizeX - Backend

FastAPI tabanli AI goruntu renklendirme ve restorasyon API servisi. DDColor, DeOldify, CodeFormer, Real-ESRGAN ve LaMa gibi ileri duzey yapay zeka modellerini kullanarak goruntu/video isleme yapar.

---

## Teknoloji Yigini

| Teknoloji | Surum | Amac |
|---|---|---|
| Python | 3.10 | Ana dil |
| FastAPI | latest | Async REST API framework |
| SQLAlchemy | 2.x (async) | ORM - veritabani erisimi |
| SQLite | - | Gelistirme veritabani |
| PostgreSQL | 15 | Prod veritabani |
| PyTorch | latest | AI model calistirma motoru |
| Celery | latest | Arkaplan is kuyrugu |
| Redis | 7 | Message broker & cache |
| Pydantic | 2.x | Veri dogrulama |
| Stripe | latest | Odeme altyapisi |
| JWT (PyJWT) | latest | Token tabanli kimlik dogrulama |
| Uvicorn | latest | ASGI sunucu |

---

## Dosya Yapisi

```
backend/
├── main.py                     # FastAPI uygulama giris noktasi
│                               #   - CORS middleware
│                               #   - Bakim modu middleware
│                               #   - Router baglantilari
│                               #   - Lifespan (startup/shutdown)
│                               #   - Statik dosya servisi (/media)
│
├── config.py                   # Yapilandirma (Pydantic Settings)
│                               #   - DATABASE_URL, SECRET_KEY, CORS_ORIGINS
│                               #   - Stripe, Redis, Admin ayarlari
│                               #   - Otomatik SECRET_KEY olusturma (dev)
│
├── database.py                 # SQLAlchemy async engine & session
│                               #   - SQLite (dev) / PostgreSQL (prod) destegi
│                               #   - AsyncSession factory
│
├── app_state.py                # Paylasimli uygulama durumu
│                               #   - maintenance_mode (bool)
│                               #   - announcement (str)
│                               #   - max_concurrent_jobs (int)
│
├── init_db.py                  # Veritabani ilk kurulum scripti
│                               #   - Tablolari olusturur
│                               #   - .env'den admin hesabi olusturur
│
├── patch_fastai.py             # FastAI/DeOldify uyumluluk yamalari
│                               #   - PyTorch surumu uyumu
│                               #   - GPU/CPU fallback
│
├── promote_user.py             # Kullaniciyi admin'e yukseltme CLI araci
├── download_ms_models.py       # MS Old Photo modellerini indirme araci
│
├── models/                     # SQLAlchemy ORM modelleri
│   ├── __init__.py             #   Tum model export'lari
│   ├── user.py                 #   User modeli
│   │                           #     - id (UUID), email, password_hash
│   │                           #     - role (USER/STUDENT/PRO/ADMIN)
│   │                           #     - credits (int), is_active (bool)
│   │                           #     - api_key (acx_...), api_key_created_at
│   │                           #     - email_notifications, theme
│   │                           #     - generate_api_key() metodu
│   ├── job.py                  #   Job modeli
│   │                           #     - id (UUID), user_id (FK)
│   │                           #     - type (COLORIZE/VIDEO_COLORIZE/RESTORE/UPSCALE)
│   │                           #     - status (PENDING/PROCESSING/COMPLETED/FAILED)
│   │                           #     - input_path, output_path
│   │                           #     - processing_time, progress (0-100)
│   │                           #     - device (cpu/cuda), render_factor
│   │                           #     - is_favorite, collection
│   ├── plan.py                 #   Plan modeli (abonelik planlari)
│   │                           #     - name, price, credits, gpu_access
│   └── audit_log.py            #   AuditLog modeli
│                               #     - admin_id, action, target_user_id
│                               #     - details (JSON), created_at
│
├── routers/                    # API endpoint tanimlari
│   ├── __init__.py
│   ├── auth.py                 #   /api/auth/* - Kimlik dogrulama
│   │                           #     POST /register - Kayit
│   │                           #     POST /login    - Giris (JWT)
│   │                           #     GET  /me       - Profil
│   │                           #     PUT  /settings  - Ayar guncelle
│   │                           #     POST /api-key   - API key olustur
│   │                           #     DELETE /api-key  - API key sil
│   │                           #     GET  /system-info - Sistem bilgisi
│   │                           #     Rate limiting (IP basina 10 istek/dk)
│   │
│   ├── jobs.py                 #   /api/jobs/* - Is yonetimi
│   │                           #     POST /upload   - Dosya yukle
│   │                           #     POST /         - Is olustur + isle
│   │                           #     GET  /         - Isleri listele
│   │                           #     GET  /{id}     - Is detayi
│   │                           #     GET  /{id}/download - Sonuc indir
│   │                           #     DELETE /{id}   - Is sil
│   │                           #     POST /{id}/favorite - Favori toggle
│   │                           #     PUT  /{id}/collection - Koleksiyon ata
│   │                           #     GET  /collections/list - Koleksiyonlar
│   │                           #     Rol bazli sinirlamalar:
│   │                           #       - Dosya boyutu limiti
│   │                           #       - Video erisimi (STUDENT+)
│   │                           #       - GPU erisimi (PRO+)
│   │                           #       - Render factor kontrolu
│   │
│   ├── admin.py                #   /api/admin/* - Admin paneli
│   │                           #     GET  /stats    - Istatistikler
│   │                           #     GET  /users    - Kullanici listesi
│   │                           #     PUT  /users/{id} - Kullanici duzenle
│   │                           #     DELETE /users/{id} - Kullanici sil
│   │                           #     POST /users/create - Kullanici olustur
│   │                           #     POST /users/bulk-action - Toplu islem
│   │                           #     GET  /jobs     - Tum isler
│   │                           #     GET  /system/resources - GPU/CPU/RAM
│   │                           #     PUT  /system/settings  - Bakim/duyuru
│   │                           #     GET  /system/public-settings
│   │                           #     GET  /audit-log - Islem kayitlari
│   │
│   ├── payments.py             #   /api/payments/* - Stripe odeme
│   │                           #     POST /create-checkout - Checkout olustur
│   │                           #     POST /webhook  - Stripe webhook
│   │                           #     Plan kredileri: starter=50, pro=200, enterprise=1000
│   │
│   └── websocket.py            #   /ws/jobs - Gercek zamanli bildirimler
│                               #     JWT ile baglanti kimlik dogrulama
│                               #     ConnectionManager (broadcast/unicast)
│                               #     Mesajlar: job_progress, job_completed, job_failed
│                               #     Ping/pong keepalive (25sn)
│
├── services/                   # Is mantigi katmani
│   ├── __init__.py             #   Export'lar + lazy import (AI modulleri)
│   ├── ai_engine.py            #   Goruntu/video renklendirme motoru
│   │                           #     - colorize_image() - DDColor ile foto renklendirme
│   │                           #     - colorize_video() - DeOldify ile video renklendirme
│   │                           #     - upscale_image()  - Real-ESRGAN ile buyutme
│   │                           #     - Otomatik filigran ekleme
│   │                           #     - CPU/CUDA otomatik secim
│   │                           #     - Model cache ile hizli yukleme
│   │
│   ├── restoration_engine.py   #   Fotograf restorasyon motoru
│   │                           #     - restore_photo() - CodeFormer + Real-ESRGAN
│   │                           #     - Yuz algilama ve iyilestirme
│   │                           #     - Arka plan iyilestirme
│   │                           #     - Cizik/hasar onarimi
│   │
│   ├── model_cache.py          #   AI model onbellek yoneticisi
│   │                           #     - Singleton pattern
│   │                           #     - Thread-safe model yukleme
│   │                           #     - DDColor, DeOldify, Real-ESRGAN cache
│   │                           #     - Bellek yonetimi
│   │
│   ├── lama_inpainting.py      #   LaMa inpainting servisi
│   │                           #     - Cizik ve hasar algilama
│   │                           #     - Eksik alan doldurma
│   │                           #     - Maske tabanli inpainting
│   │
│   ├── auth_service.py         #   Kimlik dogrulama servisi
│   │                           #     - verify_password() - bcrypt dogrulama
│   │                           #     - get_password_hash() - bcrypt hashleme
│   │                           #     - create_access_token() - JWT olusturma
│   │                           #     - decode_access_token() - JWT cozumleme
│   │                           #     - is_student_email() - Ogrenci email kontrolu
│   │                           #       (@ayu.edu.kz, @yesevi.edu.tr)
│   │
│   └── storage.py              #   Dosya yonetim servisi
│                               #     - save_upload_file() - Guvenli dosya kaydetme
│                               #     - get_output_path() - Cikti yolu olusturma
│                               #     - delete_file() - Dosya silme
│                               #     - Path traversal korumasi
│                               #     - Dosya tipi/boyut dogrulama
│
├── workers/                    # Celery arkaplan islemleri
│   ├── __init__.py
│   ├── celery_app.py           #   Celery uygulama yapilandirmasi
│   │                           #     - Redis broker baglantisi
│   │                           #     - Task serialization ayarlari
│   └── tasks.py                #   Async islem gorevleri
│                               #     - process_image_task - Foto isleme
│                               #     - process_video_task - Video isleme
│                               #     - Progress callback destegi
│
├── CodeFormer/                 # 3rd party: Yuz restorasyon modeli
├── ddcolor_repo/               # 3rd party: DDColor renklendirme
├── DeOldify/                   # 3rd party: Video renklendirme
├── Bringing-Old-Photos-Back-to-Life/  # 3rd party: MS restorasyon
│
├── media/                      # Kullanici dosyalari (gitignore)
│   ├── uploads/                #   Yuklenen orijinal dosyalar
│   └── outputs/                #   Islenmis cikti dosyalari
│
├── .env                        # Ortam degiskenleri (gitignore)
├── .env.example                # Ornek ortam degiskenleri
├── Dockerfile                  # Docker container tanimlari
└── requirements.txt            # Python bagimliliklari
```

---

## Kurulum

### Gereksinimler
- Python 3.10+
- pip
- (Opsiyonel) CUDA destekli NVIDIA GPU
- (Opsiyonel) Redis (Celery icin)
- (Opsiyonel) PostgreSQL (prod icin)

### Adimlar

```bash
# 1. Sanal ortam olustur ve aktif et
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# 2. Bagimliliklari yukle
pip install -r requirements.txt

# 3. Ortam degiskenlerini ayarla
cp .env.example .env
# .env dosyasini duzenle

# 4. Veritabanini baslat
python init_db.py

# 5. Sunucuyu baslat
uvicorn main:app --reload --port 8000
```

### Celery Worker (Opsiyonel)
```bash
# Redis gereklidir
celery -A workers.celery_app worker --loglevel=info
```

### Docker ile
```bash
docker build -t ayu-backend .
docker run -p 8000:8000 --env-file .env ayu-backend
```

---

## Ortam Degiskenleri

| Degisken | Varsayilan | Aciklama |
|----------|-----------|----------|
| `DATABASE_URL` | `postgresql://...` | Veritabani baglanti URL'si |
| `SECRET_KEY` | (otomatik) | JWT imzalama anahtari |
| `ALGORITHM` | `HS256` | JWT algoritma |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token gecerlilik suresi (dk) |
| `CORS_ORIGINS` | `localhost:3000,5173` | Izin verilen originler |
| `STRIPE_SECRET_KEY` | - | Stripe gizli anahtar |
| `STRIPE_PUBLISHABLE_KEY` | - | Stripe acik anahtar |
| `STRIPE_WEBHOOK_SECRET` | - | Stripe webhook dogrulama |
| `ADMIN_EMAIL` | - | Ilk admin email |
| `ADMIN_PASSWORD` | - | Ilk admin sifre |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis baglanti URL'si |

> **Not**: `SECRET_KEY` bos birakilirsa her baslangicta rastgele uretilir. Bu durumda tokenlar restart'ta gecersiz olur. Produksiyonda mutlaka `.env`'de tanimlayin.

---

## API Endpoint Detaylari

### Kimlik Dogrulama

#### `POST /api/auth/register`
Yeni kullanici kaydi olusturur.
```json
// Request
{ "email": "user@example.com", "password": "123456" }

// Response 200
{
  "access_token": "eyJhbG...",
  "token_type": "bearer",
  "user": { "id": "uuid", "email": "user@example.com", "role": "USER", "credits": 10 }
}
```
- Sifre min 6 karakter
- `@ayu.edu.kz` / `@yesevi.edu.tr` -> otomatik STUDENT rolu, 50 kredi
- Rate limit: 10 istek/dk (IP basina)

#### `POST /api/auth/login`
JWT token ile giris.
```json
// Request (form-data)
username=user@example.com&password=123456

// Response 200
{ "access_token": "eyJhbG...", "token_type": "bearer", "user": {...} }
```

#### `GET /api/auth/me`
Mevcut kullanici bilgisi. Header: `Authorization: Bearer <token>`

#### `PUT /api/auth/settings`
Kullanici ayarlarini gunceller.
```json
{ "email_notifications": true, "theme": "dark" }
```

#### `POST /api/auth/api-key`
PRO+ kullanicilar icin API key olusturur. Format: `acx_<random>`

### Is Yonetimi

#### `POST /api/jobs/upload`
Dosya yukler. `multipart/form-data` ile `file` alani.
- Izin verilen tipler: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`
- Boyut limitleri: USER 10MB, STUDENT 25MB, PRO 100MB, ADMIN sinirsiz

#### `POST /api/jobs/`
Is olusturur ve isleme alir.
```json
{
  "input_path": "media/uploads/abc.jpg",
  "job_type": "COLORIZE",
  "device": "cpu",
  "render_factor": 35
}
```
- `job_type`: `COLORIZE` | `VIDEO_COLORIZE` | `RESTORE` | `UPSCALE`
- `device`: `cpu` | `cuda` (PRO+ icin)
- `render_factor`: 10-45 arasi (PRO+ icin degistirilebilir)
- Her is 1 kredi harcar

#### `GET /api/jobs/{id}/download`
Islenmis dosyayi indirir. Dosya tipi otomatik algilanir.

### Admin

#### `GET /api/admin/stats`
```json
{
  "total_users": 150,
  "total_jobs": 1200,
  "active_users_24h": 45,
  "jobs_today": 89,
  "success_rate": 95.2,
  "role_distribution": {"USER": 100, "STUDENT": 30, "PRO": 15, "ADMIN": 5}
}
```

#### `GET /api/admin/system/resources`
```json
{
  "cpu_percent": 45.2,
  "ram_used_gb": 6.1,
  "ram_total_gb": 16.0,
  "gpu_name": "NVIDIA RTX 3090",
  "gpu_memory_used_mb": 4096,
  "gpu_memory_total_mb": 24576,
  "gpu_utilization": 78
}
```

#### `PUT /api/admin/system/settings`
```json
{
  "maintenance_mode": false,
  "announcement": "Yeni ozellikler eklendi!",
  "max_concurrent_jobs": 3
}
```

### WebSocket

```javascript
// Baglanti
const ws = new WebSocket('ws://localhost:8000/ws/jobs');

// Kimlik dogrulama (ilk mesaj)
ws.send(JSON.stringify({ type: 'auth', token: 'jwt_token' }));

// Gelen mesaj ornekleri:
// Is ilerlemesi
{ "type": "job_progress", "job_id": "uuid", "progress": 45 }

// Is tamamlandi
{ "type": "job_completed", "job_id": "uuid", "output_path": "media/outputs/...", "processing_time": 12.5 }

// Is basarisiz
{ "type": "job_failed", "job_id": "uuid", "error": "Out of memory" }
```

---

## AI Modelleri

### DDColor (Goruntu Renklendirme)
- **Gorev**: Siyah-beyaz fotograflari renklendirme
- **Mimari**: Dual Decoder + Color Transformer
- **Girdi**: Herhangi boyutta grayscale goruntu
- **Cikti**: Ayni boyutta renkli goruntu
- **Kullanim**: `services/ai_engine.py` -> `colorize_image()`

### DeOldify (Video Renklendirme)
- **Gorev**: Siyah-beyaz videolari kare kare renklendirme
- **Mimari**: U-Net + GAN tabanli
- **Parametre**: `render_factor` (10-45) - kalite/hiz dengesi
- **Kullanim**: `services/ai_engine.py` -> `colorize_video()`
- **Not**: `patch_fastai.py` ile FastAI uyumluluk yamalari uygulanir

### CodeFormer (Yuz Restorasyon)
- **Gorev**: Bozuk/dusuk kaliteli yuzleri onarma
- **Mimari**: Transformer + VQGAN
- **Ozellik**: Yuz algilama -> kirpma -> iyilestirme -> geri yerlestirme
- **Kullanim**: `services/restoration_engine.py` -> `restore_photo()`

### Real-ESRGAN (Super Resolution)
- **Gorev**: Goruntu buyutme (2x/4x)
- **Mimari**: RRDB Network
- **Kullanim**: Restorasyon pipeline'inda arka plan iyilestirme

### LaMa (Inpainting)
- **Gorev**: Cizik ve hasar onarimi
- **Mimari**: Large Mask Inpainting
- **Kullanim**: `services/lama_inpainting.py`

---

## Model Cache Sistemi

`services/model_cache.py` tum AI modellerini bellekte tutar:

- **Singleton Pattern** - Uygulama boyunca tek instance
- **Thread-Safe** - Lock ile esanli erisim kontrolu
- **Lazy Loading** - Model ilk kulanimda yuklenir
- **Bellek Yonetimi** - Gereksiz modelleri bosaltma
- **CPU/CUDA Otomatik** - GPU varsa kullanir, yoksa CPU'ya duser

---

## Guvenlik

- **JWT Authentication** - HS256 ile imzali tokenlar
- **Bcrypt** - Sifre hashleme (passlib)
- **Rate Limiting** - IP basina 10 istek/dk (register/login)
- **Path Traversal Korumasi** - Dosya yollarinda `..` engeli
- **CORS** - Yapilandirilabilir origin listesi
- **Dosya Tipi Dogrulama** - MIME type ve uzanti kontrolu
- **Bakim Modu** - Sadece admin erisimi (middleware)
- **Audit Log** - Admin islemleri kayit altina alinir
- **Stripe Webhook Dogrulama** - Imza kontrolu

---

## Veritabani Semasi

```
users
├── id (PK, UUID)
├── email (UNIQUE, INDEX)
├── password_hash
├── role (ENUM: USER/STUDENT/PRO/ADMIN)
├── credits (INT)
├── is_active (BOOL)
├── api_key (UNIQUE, INDEX, nullable)
├── api_key_created_at (nullable)
├── email_notifications (BOOL)
├── theme (STRING)
└── created_at (DATETIME)

jobs
├── id (PK, UUID)
├── user_id (FK -> users.id)
├── type (ENUM: COLORIZE/VIDEO_COLORIZE/RESTORE/UPSCALE)
├── status (ENUM: PENDING/PROCESSING/COMPLETED/FAILED)
├── input_path
├── output_path (nullable)
├── processing_time (FLOAT, nullable)
├── error_message (nullable)
├── device (STRING)
├── render_factor (INT)
├── progress (INT, 0-100)
├── is_favorite (BOOL)
├── collection (STRING, nullable)
└── created_at (DATETIME)

audit_logs
├── id (PK, UUID)
├── admin_id (FK -> users.id)
├── action (STRING)
├── target_user_id (nullable)
├── details (STRING/JSON)
└── created_at (DATETIME)

plans
├── id (PK, UUID)
├── name (STRING)
├── price (FLOAT)
├── credits (INT)
└── gpu_access (BOOL)
```
