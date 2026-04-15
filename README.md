# AYU ColorizeX

AI destekli goruntu renklendirme ve restorasyon platformu. Siyah-beyaz fotograflari ve videolari yapay zeka ile otomatik olarak renklendirir, eski fotograflari restore eder.

**Ahmet Yesevi Universitesi - Diploma Projesi**

---

## Ozellikler

### AI Islem Ozellikleri
- **Fotograf Renklendirme** - DDColor ve DeOldify modelleri ile siyah-beyaz fotograflari renklendirme
- **Video Renklendirme** - Kare kare video renklendirme, temporal tutarlilik destegi
- **Fotograf Restorasyon** - CodeFormer + Real-ESRGAN ile eski foto onarimi (yuz iyilestirme, cizik giderme)
- **Goruntu Buyutme** - Real-ESRGAN ile super-resolution (2x/4x)
- **Filigran Ekleme** - Islenen ciktilara otomatik watermark

### Kullanici Ozellikleri
- **Kullanici Rolleri** - USER, STUDENT, PRO, ADMIN (4 seviyeli yetkilendirme)
- **Kredi Sistemi** - Her is icin kredi harcanir, planla yenilenir
- **Favori & Koleksiyon** - Isleri favorilere ekle, koleksiyonlarda duzenle
- **Is Gecmisi** - Tum islem gecmisini goruntule, filtrele, indir
- **API Key** - PRO kullanicilar icin API erisimi (`acx_` prefixli)
- **Ogrenci Avantaji** - `@ayu.edu.kz` / `@yesevi.edu.tr` email ile otomatik STUDENT rolu ve bonus kredi

### Sistem Ozellikleri
- **Gercek Zamanli Bildirimler** - WebSocket ile anlik is ilerlemesi
- **Admin Paneli** - Kullanici, is yonetimi, sistem izleme, GPU/RAM/CPU takibi
- **Bakim Modu** - Admin tarafindan acilip kapatilabilir
- **Duyuru Sistemi** - Tum kullanicilara banner ile bildirim
- **Stripe Odeme** - Pro/Enterprise plan satin alma
- **Coklu Dil** - Turkce, Ingilizce, Rusca, Kazakca
- **Tema Destegi** - Dark, Light, System, Kazakhstan (4 tema)
- **Rate Limiting** - IP basina istek sinirlamasi
- **CORS Guvenlik** - Yapilandirilabilir origin listesi

---

## Teknoloji Yigini

### Backend
| Teknoloji | Amac |
|---|---|
| **Python 3.10** | Ana programlama dili |
| **FastAPI** | REST API framework |
| **SQLAlchemy** (async) | ORM / veritabani |
| **SQLite / PostgreSQL** | Veritabani (gelistirme / prod) |
| **PyTorch** | AI model calistirma |
| **DDColor** | Goruntu renklendirme modeli |
| **DeOldify** | Video renklendirme modeli |
| **CodeFormer** | Yuz restorasyon modeli |
| **Real-ESRGAN** | Super-resolution modeli |
| **LaMa** | Inpainting (cizik giderme) |
| **Celery + Redis** | Arkaplan is kuyrugu |
| **Stripe** | Odeme altyapisi |
| **JWT (HS256)** | Kimlik dogrulama |
| **Pydantic** | Veri validasyon |

### Frontend
| Teknoloji | Amac |
|---|---|
| **React 19** | UI framework |
| **Vite 7** | Build tool & dev server |
| **Tailwind CSS 3** | Stil kutuphanesi |
| **React Router 7** | Sayfa yonlendirme |
| **Zustand 5** | State yonetimi |
| **Framer Motion 12** | Animasyonlar |
| **Axios** | HTTP istemci |
| **Lucide React** | Ikon kutuphanesi |
| **Stripe.js** | Odeme entegrasyonu |

### Altyapi
| Teknoloji | Amac |
|---|---|
| **Docker Compose** | Container orkestrasyonu |
| **Nginx** | Reverse proxy, SSL, gzip |
| **PostgreSQL 15** | Prod veritabani |
| **Redis 7** | Cache ve mesaj kuyrugu |

---

## Proje Yapisi

```
AYU-ColorizeX-Diplom/
├── backend/                    # Python FastAPI backend
│   ├── main.py                 # Uygulama giris noktasi
│   ├── config.py               # Yapilandirma (env vars)
│   ├── database.py             # SQLAlchemy async engine
│   ├── app_state.py            # Paylasimli uygulama durumu
│   ├── init_db.py              # DB baslatma & admin olusturma
│   ├── models/                 # Veritabani modelleri
│   │   ├── user.py             #   Kullanici (roller, kredi, API key)
│   │   ├── job.py              #   Is (renklendirme, restorasyon)
│   │   ├── plan.py             #   Abonelik planlari
│   │   └── audit_log.py        #   Admin islem kaydi
│   ├── routers/                # API endpoint'leri
│   │   ├── auth.py             #   Kimlik dogrulama (register/login)
│   │   ├── jobs.py             #   Is yonetimi (upload/process/download)
│   │   ├── admin.py            #   Admin paneli API
│   │   ├── payments.py         #   Stripe odeme
│   │   └── websocket.py        #   Gercek zamanli bildirimler
│   ├── services/               # Is mantigi
│   │   ├── ai_engine.py        #   DDColor/DeOldify renklendirme
│   │   ├── restoration_engine.py #  CodeFormer/Real-ESRGAN restorasyon
│   │   ├── model_cache.py      #   AI model onbellegi (singleton)
│   │   ├── lama_inpainting.py  #   LaMa cizik giderme
│   │   ├── auth_service.py     #   Sifre/token islemleri
│   │   └── storage.py          #   Dosya yukl./indirme
│   ├── workers/                # Arkaplan islemler
│   │   ├── celery_app.py       #   Celery yapilandirmasi
│   │   └── tasks.py            #   Async islem gorevleri
│   ├── CodeFormer/             # Yuz restorasyon modeli (3rd party)
│   ├── ddcolor_repo/           # DDColor renklendirme (3rd party)
│   ├── DeOldify/               # Video renklendirme (3rd party)
│   ├── Bringing-Old-Photos-Back-to-Life/  # MS restorasyon (3rd party)
│   ├── Dockerfile
│   ├── .env.example
│   └── requirements.txt
├── frontend/                   # React SPA frontend
│   ├── src/
│   │   ├── App.jsx             # Ana routing ve layout
│   │   ├── main.jsx            # React giris noktasi
│   │   ├── index.css           # Tema sistemi ve global stiller
│   │   ├── translations.js    # Coklu dil cevirileri (en/tr/ru/kz)
│   │   ├── components/         # Yeniden kullanilabilir bilesenler
│   │   │   ├── Sidebar.jsx     #   Navigasyon sidebar
│   │   │   ├── BeforeAfterSlider.jsx  # Once/sonra karsilastirma
│   │   │   ├── VideoBeforeAfterSlider.jsx
│   │   │   └── PaymentModal.jsx #  Odeme modali
│   │   ├── pages/              # Sayfa bilesenleri
│   │   │   ├── Home.jsx        #   Ana sayfa (hero, ozellikler)
│   │   │   ├── PhotoEditor.jsx #   Fotograf renklendirme
│   │   │   ├── VideoEditor.jsx #   Video renklendirme
│   │   │   ├── RestorePage.jsx #   Fotograf restorasyon
│   │   │   ├── History.jsx     #   Is gecmisi
│   │   │   ├── Plans.jsx       #   Fiyatlandirma
│   │   │   ├── Settings.jsx    #   Kullanici ayarlari
│   │   │   ├── Login.jsx       #   Giris
│   │   │   ├── Register.jsx    #   Kayit
│   │   │   ├── Presentation.jsx    # Sunum sayfasi
│   │   │   ├── PresentationKz.jsx  # Kazakca sunum
│   │   │   └── Admin/          #   Admin panel sayfalari
│   │   │       ├── Dashboard.jsx  # Sistem istatistikleri
│   │   │       ├── Users.jsx      # Kullanici yonetimi
│   │   │       ├── Jobs.jsx       # Is yonetimi
│   │   │       └── Settings.jsx   # Sistem ayarlari
│   │   ├── context/            # React context'ler
│   │   │   ├── AuthContext.jsx #   Kimlik dogrulama durumu
│   │   │   ├── LanguageContext.jsx # Dil secimi
│   │   │   └── ThemeContext.jsx    # Tema secimi
│   │   ├── store/
│   │   │   └── editorStore.js  #   Zustand editor state
│   │   └── lib/
│   │       ├── axios.js        #   HTTP istemci yapilandirmasi
│   │       └── websocket.js    #   WebSocket yoneticisi
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
├── nginx/
│   └── default.conf            # Nginx reverse proxy yapilandirmasi
├── docker-compose.yml          # Tum servislerin orkestrasyonu
└── .gitignore
```

---

## Kurulum

### Gereksinimler
- Python 3.10+
- Node.js 18+
- Git
- (Opsiyonel) CUDA destekli GPU (AI modelleri icin)
- (Opsiyonel) Docker & Docker Compose

### 1. Depoyu Klonla
```bash
git clone <repo-url>
cd AYU-ColorizeX-Diplom
```

### 2. Backend Kurulumu
```bash
cd backend

# Sanal ortam olustur
python -m venv .venv

# Aktif et
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Bagimliliklari yukle
pip install -r requirements.txt

# .env dosyasini olustur
cp .env.example .env
# .env icerigini duzenle (SECRET_KEY, DB ayarlari vb.)

# Veritabanini baslat
python init_db.py

# Sunucuyu baslat
uvicorn main:app --reload --port 8000
```

### 3. Frontend Kurulumu
```bash
cd frontend

# Bagimliliklari yukle
npm install

# Gelistirme sunucusunu baslat
npm run dev
```

### 4. Docker ile Kurulum (Alternatif)
```bash
# Tum servisleri baslat
docker-compose up -d

# Servisleri durdur
docker-compose down
```

Servisler:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Dokumantasyonu**: http://localhost:8000/docs
- **Nginx Proxy**: http://localhost:80

---

## Ortam Degiskenleri

### Backend (.env)
```env
# Veritabani
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ayu_db

# Guvenlik (ZORUNLU - guclu bir anahtar olusturun)
# python -c "import secrets; print(secrets.token_urlsafe(64))"
SECRET_KEY=
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Stripe Odeme (opsiyonel)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Admin Hesabi (init_db.py icin)
ADMIN_EMAIL=admin@ayu.kz
ADMIN_PASSWORD=

# Redis (Celery icin)
REDIS_URL=redis://localhost:6379/0
```

### Frontend (.env)
```env
VITE_API_URL=http://127.0.0.1:8000
```

---

## API Endpoint'leri

### Kimlik Dogrulama (`/api/auth`)
| Metot | Endpoint | Aciklama |
|-------|----------|----------|
| POST | `/api/auth/register` | Yeni kullanici kaydi |
| POST | `/api/auth/login` | Giris yap (JWT token) |
| GET | `/api/auth/me` | Mevcut kullanici bilgisi |
| PUT | `/api/auth/settings` | Kullanici ayarlarini guncelle |
| POST | `/api/auth/api-key` | API key olustur (PRO) |
| DELETE | `/api/auth/api-key` | API key sil |
| GET | `/api/auth/system-info` | Sistem bilgisi (public) |

### Is Yonetimi (`/api/jobs`)
| Metot | Endpoint | Aciklama |
|-------|----------|----------|
| POST | `/api/jobs/upload` | Dosya yukle |
| POST | `/api/jobs/` | Is olustur ve isle |
| GET | `/api/jobs/` | Kullanicinin islerini listele |
| GET | `/api/jobs/{id}` | Is detayi |
| GET | `/api/jobs/{id}/download` | Sonuc dosyasini indir |
| DELETE | `/api/jobs/{id}` | Is sil |
| POST | `/api/jobs/{id}/favorite` | Favoriye ekle/cikar |
| PUT | `/api/jobs/{id}/collection` | Koleksiyona tasi |
| GET | `/api/jobs/collections/list` | Koleksiyonlari listele |

### Admin (`/api/admin`)
| Metot | Endpoint | Aciklama |
|-------|----------|----------|
| GET | `/api/admin/stats` | Sistem istatistikleri |
| GET | `/api/admin/users` | Kullanici listesi |
| PUT | `/api/admin/users/{id}` | Kullanici guncelle |
| DELETE | `/api/admin/users/{id}` | Kullanici sil |
| GET | `/api/admin/jobs` | Tum isler |
| POST | `/api/admin/users/create` | Kullanici olustur |
| POST | `/api/admin/users/bulk-action` | Toplu islem |
| GET | `/api/admin/system/resources` | GPU/CPU/RAM durumu |
| PUT | `/api/admin/system/settings` | Sistem ayarlari |
| GET | `/api/admin/audit-log` | Islem kayitlari |

### Odeme (`/api/payments`)
| Metot | Endpoint | Aciklama |
|-------|----------|----------|
| POST | `/api/payments/create-checkout` | Stripe checkout olustur |
| POST | `/api/payments/webhook` | Stripe webhook |

### WebSocket (`/ws/jobs`)
- Baglanti sonrasi `{type: "auth", token: "..."}` ile kimlik dogrulama
- Mesaj tipleri: `job_progress`, `job_completed`, `job_failed`
- Ping/pong keepalive (25sn aralikla)

---

## Kullanici Rolleri ve Sinirlamalar

| Ozellik | USER | STUDENT | PRO | ADMIN |
|---------|------|---------|-----|-------|
| Baslangic Kredi | 10 | 50 | 500 | Sinirsiz |
| Foto Renklendirme | + | + | + | + |
| Video Renklendirme | - | + | + | + |
| Foto Restorasyon | + | + | + | + |
| GPU Kullanimi | - | - | + | + |
| API Erisimi | - | - | + | + |
| Max Dosya Boyutu | 10MB | 25MB | 100MB | Sinirsiz |
| Render Factor | Sabit | Sabit | Ayarlanabilir | Ayarlanabilir |
| Admin Paneli | - | - | - | + |

---

## AI Modelleri

| Model | Gorev | Kaynak |
|-------|-------|--------|
| **DDColor** | Goruntu renklendirme | [piddnad/DDColor](https://github.com/piddnad/DDColor) |
| **DeOldify** | Video renklendirme | [jantic/DeOldify](https://github.com/jantic/DeOldify) |
| **CodeFormer** | Yuz restorasyon | [sczhou/CodeFormer](https://github.com/sczhou/CodeFormer) |
| **Real-ESRGAN** | Super-resolution | [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) |
| **LaMa** | Inpainting | [advimman/lama](https://github.com/advimman/lama) |
| **MS Old Photos** | Eski foto onarimi | [microsoft/Bringing-Old-Photos-Back-to-Life](https://github.com/microsoft/Bringing-Old-Photos-Back-to-Life) |

Modeller ilk kulanimda otomatik indirilir veya `download_ms_models.py` ile manuel indirilebilir.

---

## Yardimci Scriptler

| Script | Amac | Kullanim |
|--------|------|----------|
| `init_db.py` | DB tablolarini olustur, admin ekle | `python init_db.py` |
| `promote_user.py` | Kullaniciyi admin yap | `python promote_user.py email@ornek.com` |
| `download_ms_models.py` | MS restorasyon modellerini indir | `python download_ms_models.py` |
| `patch_fastai.py` | FastAI/DeOldify uyumluluk yamalari | Otomatik (main.py tarafindan) |

---

## Gelistirme

### Backend Test
```bash
cd backend
uvicorn main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

### Frontend Test
```bash
cd frontend
npm run dev
# http://localhost:5173
```

### Lint
```bash
cd frontend
npm run lint
```

### Production Build
```bash
cd frontend
npm run build
```

---

## Lisans

Bu proje Ahmet Yesevi Universitesi diploma projesi olarak gelistirilmistir.

## Yazar

- **Proje**: AYU ColorizeX
- **Universite**: Ahmet Yesevi Universitesi
- **Tip**: Diploma Projesi (Bitirme Tezi)
