# DeveloperFollowMe

> Bu doküman otomatik üretilir. Manuel düzenlemeler bir sonraki üretimde üzerine yazılır.

- **Son Üretim:** 2026-03-01T01:07:28.130Z
- **Üretici Sürümü:** 1.0.0
- **Profil Dosyası:** `docs/_generated/devfollowme.repo-profile.json`

## 1) Hızlı Genel Bakış

- **Paket yöneticisi:** bun (bun@1.2.14)
- **Monorepo aracı:** turbo
- **Node sürüm kaynağı:** package.json#engines.node
- **Node sürüm değeri:** >=24.0.0
- **Workspace paket sayısı:** 11
- **CI workflow sayısı:** 3

## 2) Repo Mimarisi ve Modül Haritası

### Uygulamalar
- `api-gateway` → `apps/api-gateway/package.json`
- `web-app` → `apps/web-app/package.json`
- `web` → `apps/web/package.json`
- `worker-jobs` → `apps/worker-jobs/package.json`

### Paketler
- `@ai-chat/chat-orchestrator` → `packages/chat-orchestrator/package.json`
- `@ai-chat/config` → `packages/config/package.json`
- `@ai-chat/core-types` → `packages/core-types/package.json`
- `@ai-chat/db` → `packages/db/package.json`
- `@ai-chat/ollama-client` → `packages/ollama-client/package.json`
- `@ai-chat/telemetry` → `packages/telemetry/package.json`
- `@ai-chat/tools-engine` → `packages/tools-engine/package.json`

## 3) Çalıştırma, Build, Test ve Lint Akışları

### Kök scriptler
- `audit:deps`: `bash ./scripts/security-checks.sh`
- `build`: `turbo run build`
- `ci`: `turbo run lint typecheck test build --continue`
- `clean`: `turbo run clean`
- `db:generate`: `bun run --filter=@ai-chat/db prisma:generate`
- `db:migrate:deploy`: `bun run --filter=@ai-chat/db prisma:migrate:deploy`
- `db:migrate:dev`: `bun run --filter=@ai-chat/db prisma:migrate:dev`
- `db:seed`: `bun run --filter=@ai-chat/db src/seed.ts`
- `db:studio`: `bun run --filter=@ai-chat/db prisma:studio`
- `dev`: `turbo run dev --parallel`
- `dev:api`: `turbo run dev --filter=api-gateway`
- `dev:web`: `turbo run dev --filter=web-app`
- `dev:worker`: `turbo run dev --filter=worker-jobs`
- `docs:devfollowme`: `node ./scripts/devfollowme/generate.mjs`
- `docs:devfollowme:check`: `bun run docs:devfollowme && git diff --exit-code -I '^\s*"generatedAt":' -I '^- \*\*Son Üretim:\*\*' -- DeveloperFollowMe.md docs/_generated/devfollowme.repo-profile.json`
- `format`: `turbo run format`
- `format:check`: `prettier --check . --cache`
- `format:write`: `prettier --write . --cache`
- `lint`: `turbo run lint -- --max-warnings=0`
- `quality`: `bash ./scripts/quality-gates.sh`
- `repair:ai`: `bash ./scripts/ai-repair-loop.sh`
- `security`: `bun run audit:deps`
- `test`: `turbo run test`
- `typecheck`: `turbo run typecheck`

### Workspace script özetleri
- `@ai-chat/chat-orchestrator` (packages/chat-orchestrator/package.json): `build` → `tsc -p tsconfig.json` | `lint` → `eslint src --ext .ts` | `test` → `echo "no tests yet"` | `typecheck` → `tsc --noEmit`
- `@ai-chat/config` (packages/config/package.json): `build` → `tsc -p tsconfig.json` | `lint` → `eslint src --ext .ts` | `test` → `echo "no tests yet"` | `typecheck` → `tsc --noEmit`
- `@ai-chat/core-types` (packages/core-types/package.json): `build` → `tsc -p tsconfig.json` | `lint` → `eslint src --ext .ts` | `test` → `echo "no tests yet"` | `typecheck` → `tsc --noEmit`
- `@ai-chat/db` (packages/db/package.json): `build` → `tsc -p tsconfig.json` | `lint` → `eslint src --ext .ts` | `test` → `echo "no tests yet"` | `typecheck` → `tsc --noEmit`
- `@ai-chat/ollama-client` (packages/ollama-client/package.json): `build` → `tsc -p tsconfig.json` | `lint` → `eslint src --ext .ts` | `test` → `echo "no tests yet"` | `typecheck` → `tsc --noEmit`
- `@ai-chat/telemetry` (packages/telemetry/package.json): `build` → `tsc -p tsconfig.json` | `lint` → `eslint src --ext .ts` | `test` → `echo "no tests yet"` | `typecheck` → `tsc --noEmit`
- `@ai-chat/tools-engine` (packages/tools-engine/package.json): `build` → `tsc -p tsconfig.json` | `lint` → `eslint src --ext .ts` | `test` → `echo "no tests yet"` | `typecheck` → `tsc --noEmit`
- `api-gateway` (apps/api-gateway/package.json): `build` → `tsc -p tsconfig.json` | `dev` → `node --watch --import tsx/esm src/main.ts` | `lint` → `eslint src --ext .ts` | `start` → `bun run dist/main.js` | `test` → `bun test ./src` | `typecheck` → `tsc --noEmit`
- `web-app` (apps/web-app/package.json): `build` → `bun --bun next build` | `dev` → `bun --bun next dev` | `lint` → `eslint . --ext .js,.jsx,.ts,.tsx --ignore-pattern next-env.d.ts` | `start` → `bun --bun next start` | `test` → `echo "no tests yet"` | `typecheck` → `tsc --noEmit`
- `web` (apps/web/package.json): `build` → `vite build` | `dev` → `vite` | `lint` → `eslint src --ext .ts,.tsx` | `test` → `bun test ./src` | `typecheck` → `tsc --noEmit`
- `worker-jobs` (apps/worker-jobs/package.json): `build` → `tsc -p tsconfig.json` | `dev` → `node --watch --import tsx/esm src/main.ts` | `lint` → `eslint src --ext .ts` | `start` → `bun run dist/main.js` | `test` → `bun test ./test` | `typecheck` → `tsc --noEmit`

## 4) Altyapı ve Operasyonel Entegrasyonlar

### PM2
- `apps/api-gateway/ecosystem.config.js`
- `apps/worker-jobs/ecosystem.config.js`
- `ecosystem.config.js`

### Docker
- Dockerfile veya docker-compose dosyası tespit edilmedi.

### Mobil sinyaller
- ios/ klasörü: yok
- android/ klasörü: yok
- app.json: yok
- react-native.config.js: yok
- expo bağımlılığı: tespit edilmedi

## 5) Ortam Değişkenleri ve Konfigürasyon Prensipleri

### Güvenli okunan env dosyaları
- `.env.example`

### Bilinçli olarak okunmayan env dosyaları
- `.env.backup` (gizli değer riski nedeniyle içerik okunmadı)
- `.env.development` (gizli değer riski nedeniyle içerik okunmadı)
- `apps/api-gateway/.env.test` (gizli değer riski nedeniyle içerik okunmadı)

## 6) CI/CD ve Dokümantasyon Tutarlılığı

### CI workflow dosyaları
- `.github/workflows/ci.yml`
- `.github/workflows/docs-devfollowme.yml`
- `.github/workflows/security.yml`

### Dokümantasyon kaynakları
- `docs/_generated/devfollowme.repo-profile.json`
- `docs/ai/DEVFOLLOWME_WORKFLOW.md`
- `docs/ai/RELEASE.md`
- `docs/ai/REPAIR_LOOP.md`
- `docs/ai/SECURITY.md`
- `docs/ai/WORKFLOWS.md`
- `PM2_GUIDE.md`
- `README.md`
- `security.md`

- Bu doküman `docs:devfollowme:check` adımıyla drift kontrolüne tabidir.

## 7) Bilinmeyenler / Tespit Edilemeyenler

- Konteyner dağıtımı için Docker tanımı bulunamadı; ihtiyaç varsa Dockerfile eklenmeli.
- Mobil uygulama iskeleti tespit edilmedi; mobil hedef varsa klasör yapısı netleştirilmeli.

## 8) Geliştiriciye Eylem Planı (Follow-Me)

1. `bun run docs:devfollowme` komutunu çalıştırarak dokümanı güncelle.
2. Üretilen içerikte “Bilinmeyenler” bölümünü insan gözüyle doğrula ve gerekirse kaynak dosya ekle.
3. CI öncesi `bun run docs:devfollowme:check` ile drift kontrolü yap.
4. Yeni app/package eklendiğinde `package.json` scriptlerini tanımla; üretici bunları otomatik listeleyecektir.
5. `.env` gerçek dosyalarına sır veya anahtar koyulsa dahi bu üretici içerik okumaz; yalnızca dosya adlarını raporlar.
