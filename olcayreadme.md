# AI Chat Platform - Teknik Dokümantasyon ve Geliştirici Kılavuzu

Bu belge, **AI Chat Platform** projesi için derinlemesine teknik bilgiler ve kurulum talimatları içerir. Proje, modern bir yapay zeka sohbet platformu olup, çok kiracılı (multi-tenant) yapı, RAG (Retrieval-Augmented Generation), ince ayar (fine-tuning) ve kapsamlı bir yönetim paneli sunar.

## 1. Genel Bakış

**AI Chat Platform**, kurumsal kullanım için tasarlanmış, ölçeklenebilir ve modüler bir monorepo projesidir. Kullanıcıların farklı yapay zeka modelleri (Ollama, vb.) ile sohbet etmesine, kendi bilgi tabanlarını (RAG) oluşturmasına ve modelleri kendi verileriyle eğitmesine (Fine-tuning) olanak tanır.

### Temel Özellikler
*   **Çok Kiracılı (Multi-tenancy):** Organizasyonlar, çalışma alanları ve rol tabanlı erişim kontrolü (RBAC).
*   **Sohbet ve Prompt Yönetimi:** Gelişmiş sohbet arayüzü, prompt şablonları, versiyonlama.
*   **RAG (Bilgi Tabanları):** Dosya yükleme, metin parçalama (chunking), vektör gömme (embedding) ve semantik arama.
*   **Entegrasyonlar:** Slack, Webhook ve harici araç desteği.
*   **Eğitim (Training):** SFT, DPO gibi tekniklerle model ince ayarı ve veri seti yönetimi.
*   **İzleme ve Telemetri:** Kullanım metrikleri, maliyet takibi ve denetim logları.
*   **Güvenlik:** SSO (SAML/OIDC), SCIM, API anahtarları ve içerik moderasyonu.

## 2. Teknoloji Yığını

Proje, performans ve geliştirici deneyimi odaklı modern teknolojiler kullanılarak geliştirilmiştir:

*   **Runtime & Paket Yöneticisi:** [Bun](https://bun.sh/)
*   **Monorepo Yönetimi:** [Turborepo](https://turbo.build/)
*   **Backend Framework:** [Fastify](https://fastify.dev/) (API Gateway)
*   **Frontend Framework:**
    *   **Dashboard (SPA):** React + Vite + Material UI
    *   **Web App:** Next.js (React 19)
*   **Veritabanı:** PostgreSQL (pgvector eklentisi ile)
*   **ORM:** [Prisma](https://www.prisma.io/)
*   **Önbellek & Kuyruk:** Redis (doğrudan kullanım veya DB tabanlı işler)
*   **AI/LLM:** [Ollama](https://ollama.com/) (Yerel LLM çıkarımı için)

## 3. Proje Yapısı

Proje, Turborepo ile yönetilen bir monorepo yapısındadır.

### Uygulamalar (`apps/`)

| Dizin | Açıklama | Teknoloji | Port (Dev) |
| :--- | :--- | :--- | :--- |
| `apps/api-gateway` | Ana backend servisi. API isteklerini karşılar, kimlik doğrulama ve iş mantığını yönetir. | Fastify, Zod | 4000 / 8080 |
| `apps/web` | Ana kullanıcı arayüzü (Dashboard). | React, Vite, MUI | 5173 (Vite default) |
| `apps/web-app` | Alternatif web arayüzü veya public facing uygulama. | Next.js | 3001 |
| `apps/worker-jobs` | Arka plan işlerini (webhook gönderimi, veri temizliği, export) işleyen servis. | TypeScript, Custom Loop | - |

### Paketler (`packages/`)

Paylaşılan kütüphaneler ve mantıksal katmanlar burada bulunur:

| Paket | Açıklama |
| :--- | :--- |
| `@ai-chat/db` | Prisma şeması ve veritabanı istemcisi. Tüm veri erişimi buradan yapılır. |
| `@ai-chat/chat-orchestrator` | Sohbet iş akışlarını yöneten ana mantık katmanı. |
| `@ai-chat/ollama-client` | Ollama API ile iletişim kuran istemci. |
| `@ai-chat/config` | Merkezi konfigürasyon ve ortam değişkeni yönetimi (Zod ile doğrulama). |
| `@ai-chat/core-types` | Paylaşılan TypeScript tip tanımları. |
| `@ai-chat/tools-engine` | Yapay zeka ajanlarının araç kullanımı (function calling) mantığı. |
| `@ai-chat/telemetry` | Loglama ve izleme altyapısı. |

## 4. Veritabanı Modeli

Veritabanı şeması (`packages/db/prisma/schema.prisma`) oldukça kapsamlıdır ve aşağıdaki ana alanları kapsar:

1.  **Identity & Access:** `User`, `Organization`, `OrgMember`, `ApiKey` tabloları ile çok kiracılı yapı ve yetkilendirme sağlanır.
2.  **Chat:** `Conversation` ve `Message` tabloları sohbet geçmişini tutar. `PromptTemplate` ve `ChatProfile` ile özelleştirmeler yapılır.
3.  **RAG (Knowledge):** `KnowledgeBase`, `File`, `KnowledgeChunk` tabloları. `KnowledgeChunk` tablosunda `vector` tipinde `embedding` sütunu bulunur (pgvector gerektirir).
4.  **Training:** `TrainingRun`, `Dataset`, `Experiment` tabloları ile model eğitimi ve deney süreçleri yönetilir.
5.  **Billing:** `OrgSubscription`, `PaymentTransaction` tabloları abonelik ve ödeme işlemlerini takip eder.

## 5. Kurulum ve Çalıştırma

### Gereksinimler

*   **Bun:** v1.1.0 veya üzeri
*   **Docker & Docker Compose:** Veritabanı (PostgreSQL + pgvector) ve Redis için.
*   **Node.js:** (Bazı araçlar için gerekebilir, ancak runtime olarak Bun kullanılır).

### Adım 1: Bağımlılıkları Yükleme

Proje kök dizininde:

```bash
bun install
```

### Adım 2: Ortam Değişkenlerini Ayarlama

`.env.example` dosyasını kopyalayarak `.env` oluşturun:

```bash
cp .env.example .env
```

`.env` dosyasındaki değerleri düzenleyin. Özellikle veritabanı bağlantı bilgilerinin Docker yapılandırmanızla eşleştiğinden emin olun.

### Adım 3: Altyapıyı Başlatma (Docker)

Projede `docker-compose.yml` dosyası kök dizinde veya görünür bir yerde olmayabilir. Eğer yoksa, aşağıdaki içeriğe sahip bir `docker-compose.yml` oluşturarak gerekli servisleri ayağa kaldırabilirsiniz:

```yaml
version: '3.8'

services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: ai_chat_user
      POSTGRES_PASSWORD: ai_chat_password
      POSTGRES_DB: ai_chat_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  postgres_data:
  ollama_data:
```

Servisleri başlatın:

```bash
docker-compose up -d
```

### Adım 4: Veritabanı Hazırlığı

Prisma ile veritabanı şemasını oluşturun ve başlangıç verilerini yükleyin:

```bash
# Migration'ları uygula
bun run db:migrate:dev

# İstemciyi oluştur
bun run db:generate

# Başlangıç verilerini (Seed) yükle
bun run db:seed
```

### Adım 5: Uygulamayı Çalıştırma (Geliştirme Modu)

Tüm servisleri (API, Web, Worker) paralel olarak başlatmak için:

```bash
turbo run dev
# veya
bun run dev
```

Bu komut şunları başlatacaktır:
*   **API Gateway:** `http://localhost:4000` (veya 8080)
*   **Web App (Next.js):** `http://localhost:3001`
*   **Web (Vite):** `http://localhost:5173`
*   **Worker:** Arka planda çalışır.

### Tekil Uygulamaları Çalıştırma

Sadece belirli bir uygulamayı çalıştırmak isterseniz:

```bash
# Sadece API Gateway
bun run dev:api

# Sadece Web App
bun run dev:web

# Sadece Worker
bun run dev:worker
```

## 6. Geliştirici İpuçları

### Superadmin Oluşturma

Sisteme tam erişim sağlamak için bir Superadmin kullanıcısına ihtiyacınız olabilir. Bunun için kök dizinde bulunan script'i kullanabilirsiniz:

```bash
bun run create-superadmin-direct.js
```

Bu script, `admin@aitrainer.com` e-posta adresi ve `Admin123!` şifresi ile bir kullanıcı oluşturur (veya mevcut kullanıcıyı yükseltir).

### Veritabanı Yönetimi (Prisma Studio)

Veritabanı kayıtlarını görsel arayüzle yönetmek için:

```bash
bun run db:studio
```

### Prodüksiyon Dağıtımı (PM2)

Prodüksiyon ortamında uygulamaları yönetmek için `ecosystem.config.js` dosyası hazırlanmıştır. PM2 kullanarak tüm sistemi başlatabilirsiniz:

```bash
# Uygulamaları build et
bun run build

# PM2 ile başlat
pm2 start ecosystem.config.js --env production
```

## 7. Sorun Giderme

*   **Veritabanı Bağlantı Hatası:** `.env` dosyasındaki `DATABASE_URL`'in ve Docker konteynerinin çalıştığından emin olun.
*   **pgvector Hatası:** PostgreSQL imajınızın `pgvector` eklentisini desteklediğinden emin olun (`pgvector/pgvector` imajını kullanın).
*   **Ollama Bağlantısı:** Ollama servisinin çalıştığını ve `OLLAMA_BASE_URL`'in doğru olduğunu kontrol edin. Varsayılan olarak `http://localhost:11434` adresinde çalışır.

---
*Bu doküman Olcay için özel olarak hazırlanmıştır.*
