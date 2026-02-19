# Claude Code Talimatı — Project Setup Modülü Genişletme

## Bağlam

SmartCon360 projesinin `project-service` mikroservisi genişletilecek.
Mevcut schema'ya 4 yeni model eklenecek, ardından service ve route katmanları yerleştirilecek.

Proje dili: **TypeScript strict**, ORM: **Prisma**, Framework: **Express.js**
Kod standartları: no `any`, Zod validation, AppError class, pino logger, `{ data, meta, error }` response envelope.

---

## ADIM 1 — Prisma Schema Güncelleme

### 1a. Yeni modelleri ekle

`services/project-service/prisma/schema.prisma` dosyasının **sonuna** ekle:

`schema-additions.prisma` dosyasının tüm içeriğini kopyala yapıştır.

### 1b. Mevcut modellere relation ekle

**Project modeli** — mevcut relations listesine şunları ekle:
```prisma
obsNodes         ObsNode[]
boqItems         BoqItem[]
projectDocuments ProjectDocument[]
cashFlowPeriods  CashFlowPeriod[]
```

**WbsNode modeli** — relations'a ekle:
```prisma
boqItems BoqItem[]
```

**CbsNode modeli** — relations'a ekle:
```prisma
boqItems BoqItem[]
```

**Location modeli** — relations'a ekle:
```prisma
boqItems BoqItem[]
```

**ProjectSetup modeli** — mevcut alanların sonuna şunları ekle:
```prisma
obsGenerated        Boolean   @default(false) @map("obs_generated")
obsNodeCount        Int       @default(0)     @map("obs_node_count")
documentCount       Int       @default(0)     @map("document_count")
cashFlowGenerated   Boolean   @default(false) @map("cash_flow_generated")
cashFlowPeriodCount Int       @default(0)     @map("cash_flow_period_count")
setupCompleted      Boolean   @default(false) @map("setup_completed")
setupCompletedAt    DateTime?                 @map("setup_completed_at")
```

### 1c. Migration çalıştır

```bash
cd services/project-service
npx prisma migrate dev --name add_obs_boq_documents_cashflow
npx prisma generate
```

Migration hatasız tamamlanmalı. Hata olursa düzelt, devam etme.

---

## ADIM 2 — Service Dosyasını Yerleştir

`project-setup.service.ts` dosyasını şuraya kopyala:
```
services/project-service/src/services/project-setup.service.ts
```

Dosyada kullanılan import'ları kontrol et:
- `AppError` → `src/errors/app-error.ts` — eğer bu dosya yoksa oluştur:

```typescript
// src/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}
```

- `logger` → `src/utils/logger.ts` — eğer yoksa oluştur:

```typescript
// src/utils/logger.ts
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
})

export default logger
```

---

## ADIM 3 — Route Dosyasını Yerleştir

`project-setup.routes.ts` dosyasını şuraya kopyala:
```
services/project-service/src/routes/project-setup.routes.ts
```

---

## ADIM 4 — Ana Router'a Bağla

`services/project-service/src/app.ts` veya ana routes dosyasını bul.
Mevcut proje route'larının yanına şunu ekle:

```typescript
import projectSetupRoutes from './routes/project-setup.routes'

// Mevcut proje route'larından SONRA ekle
app.use('/api/v1/projects/:projectId', projectSetupRoutes)
```

`mergeParams: true` route dosyasında zaten tanımlı — `projectId` otomatik gelecek.

---

## ADIM 5 — Middleware Kontrolü

Route dosyası şu iki middleware'i kullanıyor:
- `authenticate` → `src/middleware/auth.middleware.ts`
- `requireProjectAccess` → `src/middleware/project-access.middleware.ts`

Bu dosyalar mevcut mu kontrol et. Eğer `requireProjectAccess` yoksa geçici olarak şunu oluştur:

```typescript
// src/middleware/project-access.middleware.ts
import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { AppError } from '../errors/app-error'

const prisma = new PrismaClient()

export async function requireProjectAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { projectId } = req.params
    const userId = (req as Request & { user?: { id: string } }).user?.id

    if (!userId) throw new AppError('Unauthorized', 401, 'AUTH_REQUIRED')
    if (!projectId) throw new AppError('Project ID required', 400, 'PROJECT_ID_REQUIRED')

    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId, status: 'active' },
    })

    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    })

    if (!member && !project) {
      throw new AppError('Project access denied', 403, 'PROJECT_ACCESS_DENIED')
    }

    next()
  } catch (err) {
    next(err)
  }
}
```

---

## ADIM 6 — TypeScript Derleme Kontrolü

```bash
cd services/project-service
npx tsc --noEmit
```

Tüm type hataları düzeltilmeli. `any` kullanma.

---

## ADIM 7 — Smoke Test

Servis ayaktaysa şu endpoint'leri test et:

```bash
# OBS tree
GET /api/v1/projects/:projectId/obs

# BOQ listesi
GET /api/v1/projects/:projectId/boq

# Doküman listesi
GET /api/v1/projects/:projectId/documents

# Cash flow listesi
GET /api/v1/projects/:projectId/cashflow
```

Her biri `{ data: [], meta: { projectId } }` formatında 200 dönmeli.

---

## Önemli Notlar

- `any` tipi **kesinlikle** kullanma — TypeScript strict mod aktif
- Tüm response'lar `{ data, meta, error }` envelope formatında olacak
- Prisma Decimal alanlarına `new Prisma.Decimal(value)` ile değer ata, direkt number atama
- Log'larda `pino` kullan, `console.log` kullanma
- Hata fırlat: `throw new AppError('mesaj', statusCode, 'ERROR_CODE')`
- Migration başarısız olursa duraksama, hatayı analiz edip düzelt

---

## Sıradaki Adım (bu tamamlanınca)

Bu adımlar tamamlandıktan sonra bildir.
Sıradaki görev: **BOQ Excel/CSV import parser** — kullanıcının kendi BOQ dosyasını sisteme aktarması için kolon eşleştirme mantığı yazılacak.
