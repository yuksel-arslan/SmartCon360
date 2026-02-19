# Claude Code Talimatı — Servis Birleştirme (27 → 6 Servis)

## Genel Bakış

SmartCon360'ın 27 mikroservisi 6 servise indirilecek.
Bu işlem dikkatli yapılmalı — mevcut çalışan kod korunacak, sadece yeniden organize edilecek.

**Hedef mimari:**
```
api-gateway        → değişmez, tek başına kalır
core-service       ← auth + project + constraint + progress
ops-service        ← quality + safety + cost + claims + risk + supply-chain + stakeholder + sustainability + comm
platform-service   ← hub + notification(stub) + resource(stub) + reporting
takt-service       ← takt-engine + flowline + simulation
ai-service         ← ai-planner + ai-concierge + analytics(stub) + bim(stub) + vision + drl(stub)
```

**Önemli notlar:**
- analytics, bim, drl, notification, resource → sadece .md dosyası var, kod yok → stub olarak eklenecek
- auth, cost, progress, project-service → Prisma schema var → bunlar birleştirilecek
- Diğer servisler → Prisma yok, direkt taşınacak

---

## ADIM 1 — Yeni Klasör Yapısını Oluştur

Mevcut `services/` altında 5 yeni klasör oluştur:

```bash
mkdir -p services/core-service
mkdir -p services/ops-service
mkdir -p services/platform-service
mkdir -p services/takt-service
mkdir -p services/ai-service
```

`api-gateway` olduğu yerde kalıyor, dokunma.

---

## ADIM 2 — CORE-SERVICE Kurulumu

### 2a. Klasör yapısı oluştur

```
services/core-service/
├── prisma/
│   └── schema.prisma          ← 4 schema birleşecek
├── src/
│   ├── modules/
│   │   ├── auth/              ← auth-service/src içeriği
│   │   ├── project/           ← project-service/src içeriği
│   │   ├── constraint/        ← constraint-service/src içeriği
│   │   └── progress/          ← progress-service/src içeriği
│   ├── middleware/            ← ortak middleware'ler
│   ├── errors/
│   │   └── app-error.ts
│   ├── utils/
│   │   └── logger.ts
│   └── app.ts                 ← tüm modülleri bağlayan ana dosya
├── package.json
├── tsconfig.json
└── Dockerfile
```

### 2b. Prisma schema birleştir

`services/core-service/prisma/schema.prisma` oluştur.

Header:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Ardından şu schema dosyalarının modellerini sırayla kopyala yapıştır:
1. `services/auth-service/prisma/schema.prisma` — tüm modeller
2. `services/project-service/prisma/schema.prisma` — tüm modeller (generator ve datasource bloklarını ALMA, sadece modeller)
3. `services/cost-service/prisma/schema.prisma` — sadece modeller
4. `services/progress-service/prisma/schema.prisma` — sadece modeller

**Dikkat:** Model isimlerinde çakışma varsa (aynı isimli model iki schema'da varsa) beni uyar, birleştirme stratejisi belirleyelim.

### 2c. Kodları taşı

```bash
# Her servisin src içeriğini ilgili modül klasörüne kopyala
cp -r services/auth-service/src/* services/core-service/src/modules/auth/
cp -r services/project-service/src/* services/core-service/src/modules/project/
cp -r services/constraint-service/src/* services/core-service/src/modules/constraint/
cp -r services/progress-service/src/* services/core-service/src/modules/progress/
```

### 2d. package.json oluştur

```json
{
  "name": "@smartcon360/core-service",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "test": "jest",
    "prisma:migrate": "prisma migrate dev",
    "prisma:generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.x",
    "express": "^4.x",
    "typescript": "^5.x",
    "zod": "^3.x",
    "pino": "^8.x",
    "jsonwebtoken": "^9.x",
    "bcryptjs": "^2.x",
    "passport": "^0.x"
  },
  "devDependencies": {
    "prisma": "^5.x",
    "@types/express": "^4.x",
    "@types/node": "^20.x",
    "ts-node-dev": "^2.x",
    "jest": "^29.x",
    "@types/jest": "^29.x"
  }
}
```

Mevcut auth-service ve project-service package.json'larındaki bağımlılıkları da buraya ekle, duplicate'leri temizle.

### 2e. Ana app.ts oluştur

```typescript
// services/core-service/src/app.ts
import express from 'express'
import { json } from 'express'

// Modül router'larını import et
// (her modülün kendi routes dosyasını bul ve buraya ekle)
import authRoutes from './modules/auth/routes'
import projectRoutes from './modules/project/routes'
import constraintRoutes from './modules/constraint/routes'
import progressRoutes from './modules/progress/routes'

const app = express()
app.use(json())

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'core-service' }))

// Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/projects', projectRoutes)
app.use('/api/v1/projects/:projectId/constraints', constraintRoutes)
app.use('/api/v1/projects/:projectId/progress', progressRoutes)

// Error handler — AppError'ı yakala
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const appErr = err as { statusCode?: number; code?: string; message: string }
  res.status(appErr.statusCode ?? 500).json({
    error: appErr.message,
    code: appErr.code ?? 'INTERNAL_ERROR',
  })
})

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`core-service running on port ${PORT}`))

export default app
```

### 2f. Import path'lerini güncelle

Her modül klasöründe Prisma import'larını güncelle:
```typescript
// ESKİ (her serviste farklıydı)
import { PrismaClient } from '@prisma/client'

// YENİ — aynı kalır, ama artık tek shared Prisma client kullanacak
// src/lib/prisma.ts oluştur:
```

```typescript
// services/core-service/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

Tüm modüllerde `new PrismaClient()` yerine `import prisma from '../../lib/prisma'` kullan.

---

## ADIM 3 — OPS-SERVICE Kurulumu

### 3a. Klasör yapısı

```
services/ops-service/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── modules/
│   │   ├── quality/           ← quality-service/src
│   │   ├── safety/            ← safety-service/src
│   │   ├── cost/              ← cost-service/src (Prisma modelleri core'a taşındı)
│   │   ├── claims/            ← claims-service/src
│   │   ├── risk/              ← risk-service/src
│   │   ├── supply-chain/      ← supply-chain-service/src
│   │   ├── stakeholder/       ← stakeholder-service/src
│   │   ├── sustainability/    ← sustainability-service/src
│   │   └── comm/              ← comm-service/src
│   ├── lib/
│   │   └── prisma.ts
│   ├── middleware/
│   ├── errors/
│   └── app.ts
├── package.json
├── tsconfig.json
└── Dockerfile
```

### 3b. Prisma schema

Bu servislerin Prisma schema'sı yok — ama quality, safety, claims, risk, supply-chain, stakeholder, sustainability, comm servislerinin **veritabanı modelleri** olmalı.

Her servisin src klasörüne bak, eğer model tanımları varsa (TypeScript interface veya inline Prisma query'leri) bunları toplayıp `ops-service/prisma/schema.prisma` dosyasına Prisma modeli olarak yaz.

Eğer bu servisler şu an core-service'in DB'sine bağlanıyorsa (project-service DATABASE_URL'ini kullanıyorlarsa) schema'larını buraya taşı.

### 3c. Kodları taşı ve app.ts oluştur

```bash
cp -r services/quality-service/src/* services/ops-service/src/modules/quality/
cp -r services/safety-service/src/* services/ops-service/src/modules/safety/
cp -r services/cost-service/src/* services/ops-service/src/modules/cost/
cp -r services/claims-service/src/* services/ops-service/src/modules/claims/
cp -r services/risk-service/src/* services/ops-service/src/modules/risk/
cp -r services/supply-chain-service/src/* services/ops-service/src/modules/supply-chain/
cp -r services/stakeholder-service/src/* services/ops-service/src/modules/stakeholder/
cp -r services/sustainability-service/src/* services/ops-service/src/modules/sustainability/
cp -r services/comm-service/src/* services/ops-service/src/modules/comm/
```

Port: **3002**

---

## ADIM 4 — PLATFORM-SERVICE Kurulumu

```
services/platform-service/
├── src/
│   ├── modules/
│   │   ├── hub/               ← hub-service/src
│   │   ├── reporting/         ← reporting-service/src
│   │   ├── notification/      ← STUB (sadece router + placeholder)
│   │   └── resource/          ← STUB (sadece router + placeholder)
│   ├── lib/
│   └── app.ts
```

**notification ve resource için stub router:**
```typescript
// src/modules/notification/routes.ts
import { Router } from 'express'
const router = Router()
router.get('/health', (_, res) => res.json({ status: 'stub', module: 'notification' }))
export default router
```

Port: **3003**

---

## ADIM 5 — TAKT-SERVICE Kurulumu

```
services/takt-service/
├── src/
│   ├── modules/
│   │   ├── takt/              ← takt-engine/src (Python → burada FastAPI app)
│   │   ├── flowline/          ← flowline-service/src
│   │   └── simulation/        ← simulation-service/src
│   └── main.py                ← FastAPI ana uygulama
├── requirements.txt
└── Dockerfile
```

**FastAPI ana uygulama:**
```python
# services/takt-service/src/main.py
from fastapi import FastAPI
from .modules.takt.router import router as takt_router
from .modules.flowline.router import router as flowline_router
from .modules.simulation.router import router as simulation_router

app = FastAPI(title="SmartCon360 Takt Service")

app.include_router(takt_router, prefix="/api/v1/takt", tags=["takt"])
app.include_router(flowline_router, prefix="/api/v1/flowline", tags=["flowline"])
app.include_router(simulation_router, prefix="/api/v1/simulation", tags=["simulation"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "takt-service"}
```

```bash
# Mevcut Python servislerinin içeriğini taşı
cp -r services/takt-engine/src/* services/takt-service/src/modules/takt/
cp -r services/flowline-service/src/* services/takt-service/src/modules/flowline/
cp -r services/simulation-service/src/* services/takt-service/src/modules/simulation/
```

Port: **8001**

---

## ADIM 6 — AI-SERVICE Kurulumu

```
services/ai-service/
├── src/
│   ├── modules/
│   │   ├── planner/           ← ai-planner/src
│   │   ├── concierge/         ← ai-concierge/src
│   │   ├── vision/            ← vision-service/src
│   │   ├── analytics/         ← STUB
│   │   ├── bim/               ← STUB
│   │   └── drl/               ← STUB
│   └── main.py
├── requirements.txt
└── Dockerfile
```

Port: **8002**

---

## ADIM 7 — API Gateway Port Güncellemesi

`services/api-gateway/src/` içinde servis URL'lerini güncelle:

```typescript
// ESKİ
const AUTH_SERVICE = 'http://auth-service:3001'
const PROJECT_SERVICE = 'http://project-service:3002'
const QUALITY_SERVICE = 'http://quality-service:3009'
// ... 27 ayrı URL

// YENİ
const CORE_SERVICE = process.env.CORE_SERVICE_URL ?? 'http://core-service:3001'
const OPS_SERVICE = process.env.OPS_SERVICE_URL ?? 'http://ops-service:3002'
const PLATFORM_SERVICE = process.env.PLATFORM_SERVICE_URL ?? 'http://platform-service:3003'
const TAKT_SERVICE = process.env.TAKT_SERVICE_URL ?? 'http://takt-service:8001'
const AI_SERVICE = process.env.AI_SERVICE_URL ?? 'http://ai-service:8002'
```

Route mapping güncelle — hangi path hangi servise gidecek:
```
/api/v1/auth/*          → CORE_SERVICE
/api/v1/projects/*      → CORE_SERVICE
/api/v1/takt/*          → TAKT_SERVICE
/api/v1/flowline/*      → TAKT_SERVICE
/api/v1/simulation/*    → TAKT_SERVICE
/api/v1/quality/*       → OPS_SERVICE
/api/v1/safety/*        → OPS_SERVICE
/api/v1/cost/*          → OPS_SERVICE
/api/v1/claims/*        → OPS_SERVICE
/api/v1/risk/*          → OPS_SERVICE
/api/v1/supply/*        → OPS_SERVICE
/api/v1/stakeholders/*  → OPS_SERVICE
/api/v1/sustainability/* → OPS_SERVICE
/api/v1/comm/*          → OPS_SERVICE
/api/v1/hub/*           → PLATFORM_SERVICE
/api/v1/reports/*       → PLATFORM_SERVICE
/api/v1/ai/*            → AI_SERVICE
```

---

## ADIM 8 — Docker Compose Güncelle

`docker-compose.yml` dosyasını güncelle. 27 servis yerine 6 servis:

```yaml
version: '3.8'

services:
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "3000:3000"
    environment:
      - CORE_SERVICE_URL=http://core-service:3001
      - OPS_SERVICE_URL=http://ops-service:3002
      - PLATFORM_SERVICE_URL=http://platform-service:3003
      - TAKT_SERVICE_URL=http://takt-service:8001
      - AI_SERVICE_URL=http://ai-service:8002
    depends_on:
      - core-service
      - ops-service
      - platform-service
      - takt-service
      - ai-service

  core-service:
    build: ./services/core-service
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=${REDIS_URL}

  ops-service:
    build: ./services/ops-service
    ports:
      - "3002:3002"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - CORE_SERVICE_URL=http://core-service:3001

  platform-service:
    build: ./services/platform-service
    ports:
      - "3003:3003"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - CORE_SERVICE_URL=http://core-service:3001
      - OPS_SERVICE_URL=http://ops-service:3002

  takt-service:
    build: ./services/takt-service
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - CORE_SERVICE_URL=http://core-service:3001

  ai-service:
    build: ./services/ai-service
    ports:
      - "8002:8002"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - CORE_SERVICE_URL=http://core-service:3001

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_DB=smartcon360
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## ADIM 9 — TypeScript Derleme Kontrolü

Her Node.js servis için:
```bash
cd services/core-service && npx tsc --noEmit
cd services/ops-service && npx tsc --noEmit
cd services/platform-service && npx tsc --noEmit
```

---

## ADIM 10 — Smoke Test

```bash
docker-compose up -d
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:8001/health
curl http://localhost:8002/health
```

Hepsi `{ "status": "ok" }` dönmeli.

---

## Önemli Notlar

- Eski servis klasörlerini (`auth-service`, `project-service` vs.) hemen silme. Önce yeni yapı çalışsın, sonra sil.
- Her adımda TypeScript hatası çıkarsa düzelt, bir sonraki adıma geçme.
- Import path çakışması olursa beni uyar.
- Prisma schema birleştirmede model ismi çakışması olursa hemen dur, belirt.
- `any` tipi kullanma — TypeScript strict mod aktif.
- Tüm response'lar `{ data, meta, error }` formatında.

---

## Bu Tamamlanınca

Eski 27 servis klasörünü `services/_deprecated/` altına taşı, silme.
Ardından bildir — sıradaki görev: **BOQ Excel/CSV import parser** yazılacak.
