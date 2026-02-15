# Cost UI Integration Guide — Work Item Detail & Resource Editor

## Overview

This guide explains the new UI components for displaying and editing work item cost breakdowns with multi-currency support (TRY/USD).

## New Components

### 1. WorkItemDetailDrawer
**Location:** `/frontend/src/components/cost/WorkItemDetailDrawer.tsx`

A sliding drawer that displays complete work item details including:
- Unit price analysis summary (labor, material, equipment costs)
- Overhead and profit breakdown
- Detailed cost items (UnitPriceResource entries) grouped by type
- Multi-currency toggle (TRY ₺ / USD $)
- Add/Edit/Delete resource capabilities

**Props:**
```typescript
{
  workItem: WorkItem & { unitPriceAnalyses?: UnitPriceAnalysis[] };
  isOpen: boolean;
  onClose: () => void;
  currency: 'TRY' | 'USD';
  onCurrencyChange: (currency: 'TRY' | 'USD') => void;
}
```

**Features:**
- Grouped resources by type (Material, Labor, Equipment, Other)
- Color-coded breakdown matching resource types
- Inline edit/delete buttons (visible on hover)
- Real-time total calculations
- Bilingual labels (Turkish/English)

### 2. ResourceEditor
**Location:** `/frontend/src/components/cost/ResourceEditor.tsx`

Modal form for creating/editing individual cost items (resources).

**Props:**
```typescript
{
  analysisId: string;
  resource?: Resource | null;  // null = create, object = edit
  currency: 'TRY' | 'USD';
  onClose: () => void;
  onSave: () => void;
}
```

**Form Fields:**
- Resource Type (Material/Labor/Equipment/Other) — visual button selector
- Resource Code (optional) — e.g., M-100, L-205
- Resource Name (required)
- Unit (dropdown with common units: m², kg, gün, etc.)
- Quantity (number input)
- Unit Rate (number input in selected currency)
- **Auto-calculated Total** displayed prominently

**Validation:**
- Name is required
- Quantity and Unit Rate must be valid numbers
- Save button disabled until valid

### 3. WorkItemsTabEnhanced
**Location:** `/frontend/src/app/(dashboard)/cost/WorkItemsTabEnhanced.tsx`

Enhanced version of the WorkItemsTab with integrated detail drawer.

**Changes from original:**
- Table rows are now clickable
- Eye icon button to view details
- Fetches full work item data with resources on click
- Integrates WorkItemDetailDrawer component

## Backend API Endpoints

### Resources Management

All endpoints require authentication (`Authorization: Bearer <token>`).

#### Create Resource
```
POST /api/v1/cost/unit-prices/:analysisId/resources
Content-Type: application/json

{
  "resourceType": "material" | "labor" | "equipment" | "other",
  "code": "M-100",          // optional
  "name": "Hazır Alçı Sıva",
  "unit": "kg",
  "quantity": 5.0,
  "unitRate": 7.00,
  "rateSource": "manual",   // optional
  "rateDate": "2025-01-15"  // optional
}

Response: 201 Created
{
  "data": { /* created resource */ }
}
```

#### Update Resource
```
PUT /api/v1/cost/resources/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "quantity": 5.5,
  "unitRate": 7.50
  // ... any fields to update
}

Response: 200 OK
{
  "data": { /* updated resource */ }
}
```

#### Delete Resource
```
DELETE /api/v1/cost/resources/:id

Response: 204 No Content
```

**Important:** All resource create/update/delete operations **automatically recalculate** the parent UnitPriceAnalysis totals (laborCost, materialCost, equipmentCost, subtotal, unitPrice).

## Integration Steps

### Step 1: Import Components in Cost Page

```typescript
// In /frontend/src/app/(dashboard)/cost/page.tsx

import { WorkItemDetailDrawer } from '@/components/cost';
```

### Step 2: Replace WorkItemsTab

Option A — **Quick Integration** (recommended):
```typescript
// Replace the existing WorkItemsTab function with:
import { WorkItemsTabEnhanced as WorkItemsTab } from './WorkItemsTabEnhanced';

// Then in the render:
{activeTab === 'work-items' && <WorkItemsTab />}
```

Option B — **Manual Integration**:
Add the following state and functionality to your existing WorkItemsTab:

```typescript
function WorkItemsTab() {
  // ... existing state ...

  // ADD THESE:
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currency, setCurrency] = useState<'TRY' | 'USD'>('TRY');

  const handleRowClick = async (item: WorkItem) => {
    try {
      const res = await fetch(`/api/v1/cost/work-items/${item.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setSelectedWorkItem(json.data);
        setDrawerOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch work item:', error);
    }
  };

  return (
    <div>
      {/* ... existing JSX ... */}

      {/* Make table rows clickable: */}
      <tr onClick={() => handleRowClick(item)} className="cursor-pointer hover:bg-...">
        {/* ... existing cells ... */}
      </tr>

      {/* Add drawer at the end: */}
      {selectedWorkItem && (
        <WorkItemDetailDrawer
          workItem={selectedWorkItem}
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedWorkItem(null);
          }}
          currency={currency}
          onCurrencyChange={setCurrency}
        />
      )}
    </div>
  );
}
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. User clicks work item row in table                           │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Fetch full work item with resources                          │
│    GET /api/v1/cost/work-items/:id                              │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. WorkItemDetailDrawer opens with full data                    │
│    - Shows unit price analysis                                  │
│    - Shows grouped resources (cost items)                       │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. User actions:                                                │
│    a) Change currency (TRY ↔ USD)                               │
│    b) Click "Add Resource" → ResourceEditor modal               │
│    c) Click edit icon → ResourceEditor modal (edit mode)        │
│    d) Click delete icon → DELETE /api/v1/cost/resources/:id     │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. ResourceEditor saves:                                        │
│    - POST /api/v1/cost/unit-prices/:analysisId/resources (new)  │
│    - PUT /api/v1/cost/resources/:id (edit)                      │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. Backend auto-recalculates UnitPriceAnalysis totals           │
│    - Sums resources by type → laborCost, materialCost, etc.    │
│    - Applies overhead/profit → final unitPrice                  │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ 7. Frontend refreshes work item data                            │
│    - Drawer shows updated totals                                │
└──────────────────────────────────────────────────────────────────┘
```

## Currency Conversion

The current implementation displays amounts in the selected currency but **does not perform actual conversion**. Both TRY and USD amounts are stored and displayed using the same numeric values.

### To implement real currency conversion:

1. Add exchange rate field to UnitPriceAnalysis or global settings
2. Store base currency (e.g., TRY) in database
3. Apply conversion when currency changes:

```typescript
const displayAmount = currency === 'TRY'
  ? amount
  : amount / exchangeRate;
```

4. Consider using a currency conversion API for live rates

## Visual Design

### Color Coding by Resource Type
```
Material (Malzeme)    → Green  #10b981
Labor (İşçilik)       → Blue   #3b82f6
Equipment (Ekipman)   → Orange #f59e0b
Other (Diğer)         → Gray   #6b7280
```

### Layout
- **Drawer:** Right-side sliding panel (600-700px wide)
- **ResourceEditor:** Centered modal (max-width 768px)
- **Currency Toggle:** Segmented button control (TRY/USD)

### Responsive Breakpoints
- Mobile (< 768px): Drawer full width
- Tablet (768px - 1023px): Drawer 600px
- Desktop (≥ 1024px): Drawer 700px

## Example Usage

### Viewing Work Item Details
1. Navigate to Cost → Work Items tab
2. Click any row in the table (or click the eye icon)
3. Drawer opens showing full breakdown
4. Toggle between TRY and USD to see formatted prices

### Adding a New Cost Item
1. Open work item detail drawer
2. Click "Add Resource" button
3. Select resource type (Material/Labor/Equipment/Other)
4. Fill in name, unit, quantity, unit rate
5. Review auto-calculated total
6. Click "Add Resource" to save
7. Drawer automatically updates with new resource

### Editing a Cost Item
1. In the work item detail drawer, hover over a resource
2. Click the edit (pencil) icon
3. Modify any fields
4. Click "Update Resource"
5. Changes reflected immediately

### Deleting a Cost Item
1. Hover over a resource in the detail drawer
2. Click the delete (trash) icon
3. Confirm deletion
4. Resource removed and totals recalculated

## Keyboard Shortcuts

- **Escape:** Close drawer or modal
- **Enter (in form):** Save resource (when form is valid)

## Accessibility

- **ARIA labels:** All buttons have proper titles
- **Keyboard navigation:** Tab through form fields
- **Focus management:** Auto-focus on first input when modal opens
- **Color contrast:** Meets WCAG AA standards
- **Screen readers:** Semantic HTML with proper heading hierarchy

## Testing Checklist

### Frontend
- [ ] Table rows are clickable
- [ ] Drawer opens on row click
- [ ] Currency toggle works (TRY ↔ USD)
- [ ] Numbers format correctly per locale (tr-TR vs en-US)
- [ ] Add Resource button opens modal
- [ ] Edit icon opens modal with pre-filled data
- [ ] Delete icon prompts confirmation
- [ ] Drawer closes on backdrop click
- [ ] Drawer closes on close button click
- [ ] Form validation prevents invalid saves
- [ ] Auto-calculated total updates on quantity/rate change

### Backend
- [ ] POST /api/v1/cost/unit-prices/:analysisId/resources creates resource
- [ ] PUT /api/v1/cost/resources/:id updates resource
- [ ] DELETE /api/v1/cost/resources/:id deletes resource
- [ ] Analysis totals recalculate automatically
- [ ] Subtotal = sum of all resources by type
- [ ] Unit price = subtotal + overhead + profit
- [ ] Resources are sorted by sortOrder
- [ ] Authentication is enforced on all endpoints

### Integration
- [ ] Work item fetch includes resources
- [ ] Save callback refreshes work item data
- [ ] Delete callback refreshes work item data
- [ ] No console errors on normal operations
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly

## Troubleshooting

### "Failed to fetch work item details"
- Check that cost-service is running on port 3011
- Verify JWT token is present in localStorage
- Check browser console for CORS errors

### "Failed to save resource"
- Verify all required fields (name, unit, quantity, unitRate)
- Check network tab for error response details
- Ensure analysisId is valid UUID

### Resources not showing
- Check that unitPriceAnalyses are included in work item response
- Verify `include: { resources: true }` in backend query
- Check that resources have proper sortOrder

### Totals not updating
- Verify recalculateAnalysisTotals is called after resource changes
- Check that resources sum correctly by type
- Ensure overhead/profit percentages are numbers not strings

## Future Enhancements

1. **Drag & Drop Reordering:** Allow users to reorder resources via drag & drop
2. **Bulk Import:** Import resources from Excel/CSV
3. **Templates:** Save resource combinations as templates
4. **History:** Track changes to resources over time
5. **Exchange Rates:** Real-time currency conversion
6. **Multi-Currency Storage:** Store prices in multiple currencies
7. **Resource Library:** Reusable resource catalog (e.g., standard labor rates)
8. **Inline Editing:** Edit resources directly in the table without modal

---

**Version:** 1.0
**Last Updated:** 2025-01-15
**Author:** SmartCon360 Team
