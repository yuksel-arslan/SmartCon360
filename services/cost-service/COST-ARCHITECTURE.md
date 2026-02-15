# CostPilot Architecture — Cost Data Model

## Conceptual Hierarchy

SmartCon360's cost management follows a clear hierarchical structure that separates reference data from project data from actual costs:

```
┌─────────────────────────────────────────────────────────────────┐
│  REFERENCE DATA (Price Catalogs)                                │
│  Turkish Standards: Bayındırlık, İller Bankası                  │
│  International: MasterFormat, UNIFORMAT II, Uniclass, RSMeans   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Copy to Project
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PROJECT DATA (Work Items / Pozlar)                             │
│  BOQ line items specific to this project                        │
│  Example: "Tavan Alçı Sıva Yapılması" (Ceiling Plaster Work)   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Detailed Analysis
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  COST BREAKDOWN (Unit Price Analysis)                           │
│  Version-controlled analysis with resource breakdown            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Component Resources
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  COST ITEMS (Unit Price Resources)                              │
│  • Malzeme / Materials                                          │
│  • İşçilik / Labor                                              │
│  • Makine / Equipment                                           │
│  • Diğer / Other                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### 1. PriceCatalogItem (Reference Library)

**Purpose:** Reference pricing data from various standards
**Scope:** Global (shared across projects) or project-specific
**Source:** Turkish standards, international standards, supplier catalogs

```typescript
{
  id: string;
  catalogId: string;
  code: string;           // "04.001/2A", "03-30-00", "B2010.10"
  name: string;           // Full description
  unit: string;           // m², m³, kg, ton, SF, CY
  unitPrice: number;      // Total unit price

  // Optional cost breakdown (if available in source)
  laborCost?: number;
  materialCost?: number;
  equipmentCost?: number;

  // International classification
  csiCode?: string;       // MasterFormat
  divisionCode?: string;  // MasterFormat Division
  uniformatCode?: string; // UNIFORMAT II
  uniclassCode?: string;  // Uniclass 2015

  // RSMeans specific
  locationFactor?: number;
  crewCode?: string;
  productivity?: number;
}
```

### 2. WorkItem (BOQ / Poz)

**Purpose:** Project-specific work items
**Scope:** Project-bound
**Example:** "Tavan Alçı Sıva Yapılması" (Ceiling plaster work)

```typescript
{
  id: string;
  projectId: string;
  code: string;           // Project-specific code
  name: string;           // Work description
  unit: string;           // Measurement unit
  category: string;       // Grouping category
  subcategory?: string;

  source: string;         // Where it came from: "bayindirlik" | "custom" | "catalog"
  sourceYear?: number;
}
```

**Relations:**
- `unitPriceAnalyses[]` — Cost breakdowns (versioned)
- `quantityTakeoffs[]` — Quantity measurements
- `estimateItems[]` — Used in estimates
- `budgetItems[]` — Used in budgets
- `paymentItems[]` — Used in payment certificates

### 3. UnitPriceAnalysis (Birim Fiyat Analizi)

**Purpose:** Detailed cost analysis for a work item
**Scope:** Work item specific, versioned
**Versioning:** Each update creates a new version

```typescript
{
  id: string;
  workItemId: string;
  version: number;        // 1, 2, 3... (increments on update)
  analysisDate: Date;

  // Aggregated costs (calculated from resources)
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  subtotal: number;

  // Markup
  overheadPct: number;    // Genel giderler %
  profitPct: number;      // Kar %
  overheadAmount: number;
  profitAmount: number;

  // Final price
  unitPrice: number;

  source: string;         // "manual" | "bayindirlik" | "catalog"
  isActive: boolean;      // Only latest version is active
}
```

**Relations:**
- `workItem` — Parent work item
- `resources[]` — Detailed cost breakdown

### 4. UnitPriceResource (Cost Items / Analiz Kaynakları)

**Purpose:** Individual cost components
**Scope:** Analysis-specific
**This is what the user calls "Cost Items"**

```typescript
{
  id: string;
  analysisId: string;

  resourceType: 'labor' | 'material' | 'equipment' | 'other';

  code?: string;          // Resource code (optional)
  name: string;           // Resource description
  unit: string;           // Resource unit

  quantity: number;       // Amount needed per work item unit
  unitRate: number;       // Rate per resource unit
  total: number;          // quantity × unitRate

  rateSource?: string;    // Where the rate came from
  rateDate?: Date;        // When the rate was valid

  sortOrder: number;      // Display order
}
```

## Example: Complete Cost Breakdown

### Scenario: Ceiling Plaster Work

**Work Item:**
```json
{
  "code": "15.052",
  "name": "Tavan Alçı Sıva Yapılması",
  "unit": "m²",
  "category": "İç Cephe İşleri"
}
```

**Unit Price Analysis (Version 1):**
```json
{
  "version": 1,
  "analysisDate": "2025-01-15",
  "laborCost": 45.00,
  "materialCost": 35.00,
  "equipmentCost": 15.00,
  "subtotal": 95.00,
  "overheadPct": 10,
  "profitPct": 10,
  "overheadAmount": 9.50,
  "profitAmount": 9.50,
  "unitPrice": 114.00,
  "source": "bayindirlik"
}
```

**Cost Items (UnitPriceResource entries):**
```json
[
  {
    "resourceType": "material",
    "code": "M-100",
    "name": "Hazır Alçı Sıva",
    "unit": "kg",
    "quantity": 5.0,
    "unitRate": 7.00,
    "total": 35.00,
    "sortOrder": 0
  },
  {
    "resourceType": "labor",
    "code": "L-205",
    "name": "Alçı Sıva Taşeronu",
    "unit": "m²",
    "quantity": 1.0,
    "unitRate": 45.00,
    "total": 45.00,
    "sortOrder": 1
  },
  {
    "resourceType": "equipment",
    "code": "E-150",
    "name": "Tavan Sıva İskelesi",
    "unit": "gün",
    "quantity": 0.15,
    "unitRate": 100.00,
    "total": 15.00,
    "sortOrder": 2
  },
  {
    "resourceType": "other",
    "code": "T-050",
    "name": "Mala, Spatula, El Aletleri",
    "unit": "takım",
    "quantity": 0.05,
    "unitRate": 0.00,
    "total": 0.00,
    "sortOrder": 3
  }
]
```

**Totals:**
- Material: 35.00 TL/m²
- Labor: 45.00 TL/m²
- Equipment: 15.00 TL/m²
- **Subtotal: 95.00 TL/m²**
- Overhead (10%): 9.50 TL/m²
- Profit (10%): 9.50 TL/m²
- **Unit Price: 114.00 TL/m²**

## Data Flow: Catalog to Work Item

### Step 1: User selects items from Price Catalog

```typescript
// Frontend: User selects catalog items
const selectedItems = ['catalog-item-id-1', 'catalog-item-id-2'];

// API Call
POST /api/v1/cost/catalogs/:catalogId/copy-to-project
{
  "itemIds": selectedItems,
  "projectId": "project-123"
}
```

### Step 2: Backend creates Work Item + Analysis + Resources

```typescript
// catalog.service.ts - copyToWorkItems()

for (const catalogItem of selectedItems) {
  // 1. Create Work Item
  const workItem = await prisma.workItem.create({
    data: {
      projectId,
      code: catalogItem.code,
      name: catalogItem.name,
      unit: catalogItem.unit,
      category: catalogItem.category,
      source: catalogItem.catalog.source,
    }
  });

  // 2. Create Unit Price Analysis
  const analysis = await prisma.unitPriceAnalysis.create({
    data: {
      workItemId: workItem.id,
      version: 1,
      laborCost: catalogItem.laborCost || 0,
      materialCost: catalogItem.materialCost || 0,
      equipmentCost: catalogItem.equipmentCost || 0,
      subtotal: catalogItem.unitPrice,
      unitPrice: catalogItem.unitPrice,
    }
  });

  // 3. Create detailed resources (COST ITEMS)
  const resources = [];

  if (catalogItem.materialCost > 0) {
    resources.push({
      analysisId: analysis.id,
      resourceType: 'material',
      name: 'Malzeme / Material',
      unit: catalogItem.unit,
      quantity: 1.0,
      unitRate: catalogItem.materialCost,
      total: catalogItem.materialCost,
    });
  }

  if (catalogItem.laborCost > 0) {
    resources.push({
      analysisId: analysis.id,
      resourceType: 'labor',
      name: 'İşçilik / Labor',
      unit: catalogItem.unit,
      quantity: 1.0,
      unitRate: catalogItem.laborCost,
      total: catalogItem.laborCost,
    });
  }

  if (catalogItem.equipmentCost > 0) {
    resources.push({
      analysisId: analysis.id,
      resourceType: 'equipment',
      name: 'Makine ve Ekipman / Equipment',
      unit: catalogItem.unit,
      quantity: 1.0,
      unitRate: catalogItem.equipmentCost,
      total: catalogItem.equipmentCost,
    });
  }

  await prisma.unitPriceResource.createMany({ data: resources });
}
```

### Step 3: Frontend displays full breakdown

```typescript
// Get work item detail with full breakdown
GET /api/v1/cost/work-items/:id

// Response includes nested data:
{
  "data": {
    "id": "...",
    "code": "15.052",
    "name": "Tavan Alçı Sıva Yapılması",
    "unit": "m²",
    "unitPriceAnalyses": [
      {
        "version": 1,
        "unitPrice": 114.00,
        "laborCost": 45.00,
        "materialCost": 35.00,
        "equipmentCost": 15.00,
        "resources": [
          {
            "resourceType": "material",
            "name": "Malzeme / Material",
            "quantity": 1.0,
            "unitRate": 35.00,
            "total": 35.00
          },
          {
            "resourceType": "labor",
            "name": "İşçilik / Labor",
            "quantity": 1.0,
            "unitRate": 45.00,
            "total": 45.00
          },
          {
            "resourceType": "equipment",
            "name": "Makine ve Ekipman / Equipment",
            "quantity": 1.0,
            "unitRate": 15.00,
            "total": 15.00
          }
        ]
      }
    ]
  }
}
```

## API Endpoints

### Price Catalog Management

```bash
# List catalogs
GET /api/v1/cost/catalogs?source=bayindirlik&year=2025

# Get catalog detail with items
GET /api/v1/cost/catalogs/:catalogId

# Search catalog items
GET /api/v1/cost/catalogs/items/search?catalogId=...&search=alçı

# Copy items to project (creates WorkItems + Analysis + Resources)
POST /api/v1/cost/catalogs/:catalogId/copy-to-project
{
  "itemIds": ["id1", "id2"],
  "projectId": "project-123"
}
```

### Work Item Management

```bash
# List work items for project
GET /api/v1/cost/work-items/project/:projectId

# Get work item detail (includes latest analysis + resources)
GET /api/v1/cost/work-items/:id

# Create work item
POST /api/v1/cost/work-items
{
  "projectId": "...",
  "code": "15.052",
  "name": "Tavan Alçı Sıva Yapılması",
  "unit": "m²",
  "category": "İç Cephe"
}
```

### Unit Price Analysis

```bash
# Get all analyses for work item (versioned history)
GET /api/v1/cost/unit-prices/work-item/:workItemId

# Get latest active analysis
GET /api/v1/cost/unit-prices/work-item/:workItemId/latest

# Create new analysis with resources
POST /api/v1/cost/unit-prices
{
  "workItemId": "...",
  "overheadPct": 10,
  "profitPct": 10,
  "resources": [
    {
      "resourceType": "material",
      "name": "Hazır Alçı Sıva",
      "unit": "kg",
      "quantity": 5.0,
      "unitRate": 7.00
    },
    {
      "resourceType": "labor",
      "name": "Alçı Sıva Taşeronu",
      "unit": "m²",
      "quantity": 1.0,
      "unitRate": 45.00
    }
  ]
}
```

## Key Principles

1. **Separation of Concerns**
   - **PriceCatalogItem** = Reference pricing library (read-only for most users)
   - **WorkItem** = BOQ line item (project-specific, editable)
   - **UnitPriceResource** = Cost breakdown detail (editable, versioned)

2. **Version Control**
   - Unit price analyses are versioned (v1, v2, v3...)
   - Only the latest version is active
   - Historical versions preserved for audit trail

3. **Aggregation Flow**
   - Resources → sum by type → UnitPriceAnalysis aggregated costs
   - UnitPriceAnalysis → apply overhead/profit → final unit price
   - WorkItem × Quantity → Estimate/Budget line item

4. **Data Consistency**
   - Resources are auto-calculated: `total = quantity × unitRate`
   - Analysis totals are auto-calculated from resources
   - Overhead and profit applied to subtotal

5. **Turkish + International**
   - All labels bilingual (Turkish / English)
   - Support both Turkish standards (Bayındırlık, İller Bankası)
   - Support international standards (MasterFormat, UNIFORMAT, Uniclass, RSMeans)

## Frontend Display

### Work Item Card
```
┌──────────────────────────────────────────────────────────┐
│ 15.052 — Tavan Alçı Sıva Yapılması                      │
│ Category: İç Cephe İşleri                                │
│ Unit: m² | Unit Price: 114.00 TL                         │
├──────────────────────────────────────────────────────────┤
│ Cost Breakdown (Birim Fiyat Analizi v1):                │
│   Malzeme / Materials         35.00 TL   (30.7%)        │
│   İşçilik / Labor             45.00 TL   (39.5%)        │
│   Makine / Equipment          15.00 TL   (13.2%)        │
│   ─────────────────────────────────────                 │
│   Subtotal                    95.00 TL                   │
│   Genel Giderler (10%)         9.50 TL                   │
│   Kar (10%)                    9.50 TL                   │
│   ─────────────────────────────────────                 │
│   Unit Price                 114.00 TL                   │
└──────────────────────────────────────────────────────────┘
```

### Detailed Resource View
```
┌──────────────────────────────────────────────────────────┐
│ Resources (Analiz Kaynakları):                           │
├──────────────────────────────────────────────────────────┤
│ ■ MATERIAL                                               │
│   M-100  Hazır Alçı Sıva                                 │
│          5.0 kg × 7.00 TL/kg = 35.00 TL                  │
│                                                          │
│ ■ LABOR                                                  │
│   L-205  Alçı Sıva Taşeronu                              │
│          1.0 m² × 45.00 TL/m² = 45.00 TL                 │
│                                                          │
│ ■ EQUIPMENT                                              │
│   E-150  Tavan Sıva İskelesi                             │
│          0.15 gün × 100.00 TL/gün = 15.00 TL             │
│                                                          │
│ ■ OTHER                                                  │
│   T-050  Mala, Spatula, El Aletleri                      │
│          0.05 takım × 0.00 TL/takım = 0.00 TL            │
└──────────────────────────────────────────────────────────┘
```

## Migration Path

For existing projects with work items but no resource breakdown:

```typescript
// Script: backfill-resources.ts
// Create generic resources from existing analysis data

const workItems = await prisma.workItem.findMany({
  include: { unitPriceAnalyses: true }
});

for (const item of workItems) {
  for (const analysis of item.unitPriceAnalyses) {
    const existingResources = await prisma.unitPriceResource.count({
      where: { analysisId: analysis.id }
    });

    if (existingResources === 0) {
      // Create generic breakdown from aggregated costs
      const resources = [];

      if (analysis.materialCost > 0) {
        resources.push({
          analysisId: analysis.id,
          resourceType: 'material',
          name: 'Malzeme (Toplam)',
          unit: item.unit,
          quantity: 1.0,
          unitRate: analysis.materialCost,
          total: analysis.materialCost,
          sortOrder: 0
        });
      }

      // ... same for labor, equipment

      await prisma.unitPriceResource.createMany({ data: resources });
    }
  }
}
```

---

**Version:** 1.0
**Last Updated:** 2025-01-15
**Author:** SmartCon360 Team
