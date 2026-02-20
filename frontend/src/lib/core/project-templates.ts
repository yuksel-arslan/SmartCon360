/**
 * Construction project templates with deep domain knowledge.
 * 44 years of construction engineering experience encoded.
 *
 * Each template provides:
 * - Default LBS (Location Breakdown Structure) based on project scope
 * - Standard trades with typical sequences
 * - Takt time recommendations
 * - Buffer recommendations
 */

// ── Types ──

export interface LocationTemplate {
  name: string;
  type: 'site' | 'building' | 'floor' | 'zone' | 'room' | 'area';
  phase?: 'structural' | 'finishing'; // construction phase — structural (Kaba İnşaat) or finishing (İnce İş)
  repeat?: number; // e.g. repeat: 20 for 20 typical floors
  repeatLabel?: string; // e.g. "Floor {n}" — {n} replaced with number
  areaSqm?: number;
  children?: LocationTemplate[];
}

export interface TradeTemplate {
  name: string;
  code: string;
  color: string;
  defaultCrewSize: number;
  durationMultiplier: number; // relative to takt time (1.0 = 1 takt)
  predecessors: string[]; // trade codes that must finish before this starts
  category: 'structural' | 'mep' | 'architectural' | 'finishing' | 'specialty';
}

export interface ProjectTemplate {
  type: string;
  label: string;
  description: string;
  icon: string;
  defaultTaktTime: number;
  defaultBufferSize: number;
  recommendedTaktRange: [number, number];
  locations: LocationTemplate[];
  trades: TradeTemplate[];
  tips: string[];
}

// ── Trade Libraries ──

const COMMON_TRADES: Record<string, TradeTemplate> = {
  structure: {
    name: 'Structure / Concrete',
    code: 'STR',
    color: '#6366F1',
    defaultCrewSize: 8,
    durationMultiplier: 1.0,
    predecessors: [],
    category: 'structural',
  },
  steelwork: {
    name: 'Steel Structure',
    code: 'STL',
    color: '#4F46E5',
    defaultCrewSize: 6,
    durationMultiplier: 1.0,
    predecessors: [],
    category: 'structural',
  },
  mepRough: {
    name: 'MEP Rough-in',
    code: 'MEP-R',
    color: '#8B5CF6',
    defaultCrewSize: 6,
    durationMultiplier: 1.0,
    predecessors: ['STR'],
    category: 'mep',
  },
  electricalRough: {
    name: 'Electrical Rough-in',
    code: 'ELC-R',
    color: '#F59E0B',
    defaultCrewSize: 4,
    durationMultiplier: 0.8,
    predecessors: ['STR'],
    category: 'mep',
  },
  plumbingRough: {
    name: 'Plumbing Rough-in',
    code: 'PLB-R',
    color: '#3B82F6',
    defaultCrewSize: 4,
    durationMultiplier: 0.8,
    predecessors: ['STR'],
    category: 'mep',
  },
  hvac: {
    name: 'HVAC Ductwork',
    code: 'HVAC',
    color: '#06B6D4',
    defaultCrewSize: 5,
    durationMultiplier: 1.0,
    predecessors: ['MEP-R'],
    category: 'mep',
  },
  fireProtection: {
    name: 'Fire Protection',
    code: 'FP',
    color: '#EF4444',
    defaultCrewSize: 3,
    durationMultiplier: 0.6,
    predecessors: ['HVAC'],
    category: 'mep',
  },
  drywall: {
    name: 'Drywall / Partitions',
    code: 'DRW',
    color: '#A78BFA',
    defaultCrewSize: 6,
    durationMultiplier: 1.0,
    predecessors: ['MEP-R'],
    category: 'architectural',
  },
  masonry: {
    name: 'Masonry / Blockwork',
    code: 'MSN',
    color: '#D97706',
    defaultCrewSize: 6,
    durationMultiplier: 1.0,
    predecessors: ['STR'],
    category: 'architectural',
  },
  plastering: {
    name: 'Plastering',
    code: 'PLS',
    color: '#FBBF24',
    defaultCrewSize: 5,
    durationMultiplier: 0.8,
    predecessors: ['MSN'],
    category: 'architectural',
  },
  tiling: {
    name: 'Tiling',
    code: 'TIL',
    color: '#10B981',
    defaultCrewSize: 4,
    durationMultiplier: 1.0,
    predecessors: ['PLS', 'PLB-R'],
    category: 'finishing',
  },
  flooring: {
    name: 'Flooring',
    code: 'FLR',
    color: '#059669',
    defaultCrewSize: 4,
    durationMultiplier: 0.8,
    predecessors: ['DRW'],
    category: 'finishing',
  },
  mepFinish: {
    name: 'MEP Finish',
    code: 'MEP-F',
    color: '#7C3AED',
    defaultCrewSize: 5,
    durationMultiplier: 1.0,
    predecessors: ['DRW', 'PLS'],
    category: 'mep',
  },
  ceiling: {
    name: 'Suspended Ceiling',
    code: 'CLG',
    color: '#64748B',
    defaultCrewSize: 4,
    durationMultiplier: 0.8,
    predecessors: ['MEP-F'],
    category: 'architectural',
  },
  painting: {
    name: 'Painting',
    code: 'PNT',
    color: '#EC4899',
    defaultCrewSize: 5,
    durationMultiplier: 0.8,
    predecessors: ['DRW', 'CLG'],
    category: 'finishing',
  },
  doors: {
    name: 'Doors & Hardware',
    code: 'DOR',
    color: '#78716C',
    defaultCrewSize: 3,
    durationMultiplier: 0.6,
    predecessors: ['PNT'],
    category: 'finishing',
  },
  cabinetry: {
    name: 'Cabinetry & Millwork',
    code: 'CAB',
    color: '#92400E',
    defaultCrewSize: 4,
    durationMultiplier: 0.8,
    predecessors: ['PNT'],
    category: 'finishing',
  },
  ffe: {
    name: 'FF&E (Furniture)',
    code: 'FFE',
    color: '#F97316',
    defaultCrewSize: 4,
    durationMultiplier: 0.6,
    predecessors: ['FLR', 'PNT'],
    category: 'finishing',
  },
  cleanRoom: {
    name: 'Clean Room Finish',
    code: 'CLN',
    color: '#22D3EE',
    defaultCrewSize: 4,
    durationMultiplier: 1.0,
    predecessors: ['MEP-F'],
    category: 'specialty',
  },
  medGas: {
    name: 'Medical Gas',
    code: 'MED',
    color: '#14B8A6',
    defaultCrewSize: 3,
    durationMultiplier: 0.8,
    predecessors: ['STR'],
    category: 'specialty',
  },
  curtainWall: {
    name: 'Curtain Wall / Facade',
    code: 'CWT',
    color: '#0EA5E9',
    defaultCrewSize: 6,
    durationMultiplier: 1.2,
    predecessors: ['STR'],
    category: 'architectural',
  },
  waterproofing: {
    name: 'Waterproofing',
    code: 'WPR',
    color: '#2563EB',
    defaultCrewSize: 4,
    durationMultiplier: 0.6,
    predecessors: ['STR'],
    category: 'structural',
  },
  insulation: {
    name: 'Insulation',
    code: 'INS',
    color: '#D946EF',
    defaultCrewSize: 4,
    durationMultiplier: 0.6,
    predecessors: ['WPR'],
    category: 'architectural',
  },
  landscaping: {
    name: 'Landscaping',
    code: 'LND',
    color: '#16A34A',
    defaultCrewSize: 5,
    durationMultiplier: 1.0,
    predecessors: [],
    category: 'finishing',
  },
  elevator: {
    name: 'Elevator Installation',
    code: 'ELV',
    color: '#475569',
    defaultCrewSize: 4,
    durationMultiplier: 2.0,
    predecessors: ['STR'],
    category: 'specialty',
  },
  raisedFloor: {
    name: 'Raised Access Floor',
    code: 'RAF',
    color: '#94A3B8',
    defaultCrewSize: 4,
    durationMultiplier: 0.8,
    predecessors: ['MEP-R'],
    category: 'architectural',
  },
};

function t(...keys: (keyof typeof COMMON_TRADES)[]): TradeTemplate[] {
  return keys.map((k) => COMMON_TRADES[k]);
}

// ── Project Templates ──

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  // ─── HOTEL ───
  {
    type: 'hotel',
    label: 'Hotel / Resort',
    description: 'Guest rooms, lobbies, restaurants, back-of-house',
    icon: '🏨',
    defaultTaktTime: 5,
    defaultBufferSize: 1,
    recommendedTaktRange: [3, 5],
    locations: [
      {
        name: 'Main Building', type: 'building', children: [
          { name: 'Basement — BOH/Parking', type: 'floor', areaSqm: 2000, children: [
            { name: 'Parking Zone', type: 'zone', areaSqm: 1500 },
            { name: 'MEP Plant Room', type: 'zone', areaSqm: 500 },
          ]},
          { name: 'Ground Floor', type: 'floor', areaSqm: 2500, children: [
            { name: 'Lobby & Reception', type: 'zone', areaSqm: 800 },
            { name: 'Restaurant & Kitchen', type: 'zone', areaSqm: 700 },
            { name: 'Conference Area', type: 'zone', areaSqm: 500 },
            { name: 'Back of House', type: 'zone', areaSqm: 500 },
          ]},
          {
            name: 'Typical Guest Floor', type: 'floor', repeat: 10, repeatLabel: 'Floor {n}',
            areaSqm: 1200, children: [
              { name: 'Wing A — Rooms', type: 'zone', areaSqm: 500 },
              { name: 'Wing B — Rooms', type: 'zone', areaSqm: 500 },
              { name: 'Corridor & Services', type: 'zone', areaSqm: 200 },
            ],
          },
          { name: 'Roof / Pool Deck', type: 'floor', areaSqm: 800, children: [
            { name: 'Pool Area', type: 'zone', areaSqm: 400 },
            { name: 'Mechanical Penthouse', type: 'zone', areaSqm: 400 },
          ]},
        ],
      },
    ],
    trades: t(
      'structure', 'waterproofing', 'mepRough', 'hvac', 'fireProtection',
      'masonry', 'plastering', 'drywall', 'mepFinish', 'tiling',
      'ceiling', 'painting', 'doors', 'cabinetry', 'ffe'
    ),
    tips: [
      'Guest room floors are ideal for repetitive takt — identical work in each zone',
      'Lobby/restaurant require longer takt due to complex finishes',
      'Consider separate takt trains for BOH and guest areas',
    ],
  },

  // ─── HOSPITAL ───
  {
    type: 'hospital',
    label: 'Hospital / Healthcare',
    description: 'Patient rooms, OR suites, emergency, diagnostics',
    icon: '🏥',
    defaultTaktTime: 5,
    defaultBufferSize: 2,
    recommendedTaktRange: [5, 7],
    locations: [
      {
        name: 'Hospital Building', type: 'building', children: [
          { name: 'Basement — Services', type: 'floor', areaSqm: 3000, children: [
            { name: 'Central Plant', type: 'zone', areaSqm: 1000 },
            { name: 'Morgue & Pathology', type: 'zone', areaSqm: 500 },
            { name: 'Loading & Stores', type: 'zone', areaSqm: 1500 },
          ]},
          { name: 'Ground Floor', type: 'floor', areaSqm: 4000, children: [
            { name: 'Emergency Department', type: 'zone', areaSqm: 1200 },
            { name: 'Radiology / Imaging', type: 'zone', areaSqm: 800 },
            { name: 'Outpatient Clinics', type: 'zone', areaSqm: 1000 },
            { name: 'Main Lobby & Admin', type: 'zone', areaSqm: 1000 },
          ]},
          { name: '1st Floor — Surgical', type: 'floor', areaSqm: 3000, children: [
            { name: 'Operating Suites', type: 'zone', areaSqm: 1200 },
            { name: 'ICU', type: 'zone', areaSqm: 800 },
            { name: 'Recovery & PACU', type: 'zone', areaSqm: 1000 },
          ]},
          {
            name: 'Typical Ward Floor', type: 'floor', repeat: 4, repeatLabel: 'Ward Floor {n}',
            areaSqm: 2500, children: [
              { name: 'Ward A — Patient Rooms', type: 'zone', areaSqm: 800 },
              { name: 'Ward B — Patient Rooms', type: 'zone', areaSqm: 800 },
              { name: 'Nurse Station & Support', type: 'zone', areaSqm: 500 },
              { name: 'Corridor & Services', type: 'zone', areaSqm: 400 },
            ],
          },
          { name: 'Roof — Helipad & Mechanical', type: 'floor', areaSqm: 1000 },
        ],
      },
    ],
    trades: t(
      'structure', 'waterproofing', 'mepRough', 'medGas', 'hvac',
      'fireProtection', 'masonry', 'drywall', 'mepFinish', 'cleanRoom',
      'ceiling', 'flooring', 'painting', 'doors', 'ffe'
    ),
    tips: [
      'OR suites and clean rooms need additional MEP coordination time',
      'Medical gas is a critical-path trade — plan early',
      'Ward floors are repetitive — ideal for takt planning',
      'Larger buffers recommended due to strict commissioning requirements',
    ],
  },

  // ─── RESIDENTIAL ───
  {
    type: 'residential',
    label: 'Residential Tower',
    description: 'Apartment buildings, condos, residential complexes',
    icon: '🏢',
    defaultTaktTime: 5,
    defaultBufferSize: 1,
    recommendedTaktRange: [3, 5],
    locations: [
      {
        name: 'Tower A', type: 'building', children: [
          { name: 'Basement Parking', type: 'floor', areaSqm: 2000, children: [
            { name: 'Parking Level', type: 'zone', areaSqm: 1500 },
            { name: 'Storage & MEP', type: 'zone', areaSqm: 500 },
          ]},
          { name: 'Ground Floor', type: 'floor', areaSqm: 1500, children: [
            { name: 'Entrance Lobby', type: 'zone', areaSqm: 400 },
            { name: 'Management Office', type: 'zone', areaSqm: 200 },
            { name: 'Amenity Area', type: 'zone', areaSqm: 500 },
            { name: 'Retail / Commercial', type: 'zone', areaSqm: 400 },
          ]},
          {
            name: 'Typical Apartment Floor', type: 'floor', repeat: 20, repeatLabel: 'Floor {n}',
            areaSqm: 1000, children: [
              { name: 'Unit A Side', type: 'zone', areaSqm: 400 },
              { name: 'Unit B Side', type: 'zone', areaSqm: 400 },
              { name: 'Corridor & Core', type: 'zone', areaSqm: 200 },
            ],
          },
          { name: 'Roof', type: 'floor', areaSqm: 500, children: [
            { name: 'Mechanical Penthouse', type: 'zone', areaSqm: 300 },
            { name: 'Roof Terrace', type: 'zone', areaSqm: 200 },
          ]},
        ],
      },
    ],
    trades: t(
      'structure', 'waterproofing', 'mepRough', 'hvac', 'fireProtection',
      'masonry', 'plastering', 'mepFinish', 'tiling', 'flooring',
      'ceiling', 'painting', 'doors', 'cabinetry', 'ffe'
    ),
    tips: [
      'Highly repetitive floors — perfect for takt time planning',
      'Wet areas (kitchens/bathrooms) drive the takt time',
      'Consider splitting units into wet/dry zones for better flow',
    ],
  },

  // ─── COMMERCIAL ───
  {
    type: 'commercial',
    label: 'Commercial Office',
    description: 'Office towers, business parks, co-working spaces',
    icon: '🏛️',
    defaultTaktTime: 5,
    defaultBufferSize: 1,
    recommendedTaktRange: [3, 5],
    locations: [
      {
        name: 'Office Tower', type: 'building', children: [
          { name: 'Basement', type: 'floor', areaSqm: 2500, children: [
            { name: 'Parking', type: 'zone', areaSqm: 2000 },
            { name: 'Building Services', type: 'zone', areaSqm: 500 },
          ]},
          { name: 'Ground Floor', type: 'floor', areaSqm: 2000, children: [
            { name: 'Main Lobby', type: 'zone', areaSqm: 800 },
            { name: 'Retail Spaces', type: 'zone', areaSqm: 600 },
            { name: 'Building Management', type: 'zone', areaSqm: 600 },
          ]},
          {
            name: 'Typical Office Floor', type: 'floor', repeat: 15, repeatLabel: 'Floor {n}',
            areaSqm: 1500, children: [
              { name: 'Open Plan Zone A', type: 'zone', areaSqm: 500 },
              { name: 'Open Plan Zone B', type: 'zone', areaSqm: 500 },
              { name: 'Core (Lifts/WC/Services)', type: 'zone', areaSqm: 300 },
              { name: 'Perimeter / Facade', type: 'zone', areaSqm: 200 },
            ],
          },
          { name: 'Roof / Mechanical', type: 'floor', areaSqm: 800 },
        ],
      },
    ],
    trades: t(
      'structure', 'curtainWall', 'waterproofing', 'mepRough', 'hvac',
      'fireProtection', 'raisedFloor', 'drywall', 'mepFinish',
      'ceiling', 'painting', 'doors', 'ffe'
    ),
    tips: [
      'Curtain wall/facade is often on the critical path',
      'Raised floor systems enable faster MEP coordination',
      'Core areas may need a separate takt train from open plan',
    ],
  },

  // ─── INDUSTRIAL ───
  {
    type: 'industrial',
    label: 'Industrial / Factory',
    description: 'Factories, warehouses, logistics centers, data centers',
    icon: '🏭',
    defaultTaktTime: 7,
    defaultBufferSize: 1,
    recommendedTaktRange: [5, 10],
    locations: [
      {
        name: 'Industrial Facility', type: 'building', children: [
          { name: 'Main Production Hall', type: 'floor', areaSqm: 5000, children: [
            { name: 'Bay 1', type: 'zone', areaSqm: 1250 },
            { name: 'Bay 2', type: 'zone', areaSqm: 1250 },
            { name: 'Bay 3', type: 'zone', areaSqm: 1250 },
            { name: 'Bay 4', type: 'zone', areaSqm: 1250 },
          ]},
          { name: 'Office / Admin Block', type: 'floor', areaSqm: 1000, children: [
            { name: 'Ground Floor Office', type: 'zone', areaSqm: 500 },
            { name: 'First Floor Office', type: 'zone', areaSqm: 500 },
          ]},
          { name: 'Loading / Dispatch', type: 'area', areaSqm: 800, children: [
            { name: 'Loading Dock', type: 'zone', areaSqm: 400 },
            { name: 'Staging Area', type: 'zone', areaSqm: 400 },
          ]},
          { name: 'Utilities Yard', type: 'area', areaSqm: 600, children: [
            { name: 'Transformer / Electrical', type: 'zone', areaSqm: 300 },
            { name: 'Water Treatment', type: 'zone', areaSqm: 300 },
          ]},
        ],
      },
    ],
    trades: t(
      'steelwork', 'structure', 'waterproofing', 'mepRough', 'hvac',
      'fireProtection', 'insulation', 'electricalRough', 'mepFinish',
      'flooring', 'painting'
    ),
    tips: [
      'Steel structure drives the schedule — coordinate with fabrication lead times',
      'Large open bays allow parallel work if trades are spaced correctly',
      'Equipment installation often dictates the MEP rough-in layout',
    ],
  },

  // ─── INFRASTRUCTURE ───
  {
    type: 'infrastructure',
    label: 'Infrastructure',
    description: 'Roads, bridges, tunnels, utilities',
    icon: '🌉',
    defaultTaktTime: 7,
    defaultBufferSize: 2,
    recommendedTaktRange: [5, 10],
    locations: [
      {
        name: 'Project Corridor', type: 'site', children: [
          { name: 'Section 1 (Km 0-1)', type: 'area', children: [
            { name: 'Earthworks Zone', type: 'zone' },
            { name: 'Structures Zone', type: 'zone' },
            { name: 'Pavement Zone', type: 'zone' },
          ]},
          { name: 'Section 2 (Km 1-2)', type: 'area', children: [
            { name: 'Earthworks Zone', type: 'zone' },
            { name: 'Structures Zone', type: 'zone' },
            { name: 'Pavement Zone', type: 'zone' },
          ]},
          { name: 'Section 3 (Km 2-3)', type: 'area', children: [
            { name: 'Earthworks Zone', type: 'zone' },
            { name: 'Structures Zone', type: 'zone' },
            { name: 'Pavement Zone', type: 'zone' },
          ]},
          { name: 'Interchange / Junction', type: 'area', children: [
            { name: 'Bridge Structure', type: 'zone' },
            { name: 'Approach Slabs', type: 'zone' },
            { name: 'Finishing Works', type: 'zone' },
          ]},
        ],
      },
    ],
    trades: [
      { name: 'Earthworks', code: 'EW', color: '#92400E', defaultCrewSize: 10, durationMultiplier: 1.0, predecessors: [], category: 'structural' },
      { name: 'Drainage & Utilities', code: 'DRN', color: '#2563EB', defaultCrewSize: 6, durationMultiplier: 0.8, predecessors: ['EW'], category: 'mep' },
      { name: 'Subbase', code: 'SUB', color: '#D97706', defaultCrewSize: 8, durationMultiplier: 0.6, predecessors: ['DRN'], category: 'structural' },
      { name: 'Base Course', code: 'BASE', color: '#B45309', defaultCrewSize: 8, durationMultiplier: 0.6, predecessors: ['SUB'], category: 'structural' },
      { name: 'Asphalt / Concrete Paving', code: 'PAV', color: '#1F2937', defaultCrewSize: 10, durationMultiplier: 1.0, predecessors: ['BASE'], category: 'structural' },
      { name: 'Kerbs & Barriers', code: 'KRB', color: '#6B7280', defaultCrewSize: 5, durationMultiplier: 0.6, predecessors: ['PAV'], category: 'finishing' },
      { name: 'Signage & Markings', code: 'SGN', color: '#F59E0B', defaultCrewSize: 4, durationMultiplier: 0.4, predecessors: ['PAV'], category: 'finishing' },
      { name: 'Lighting & ITS', code: 'LIT', color: '#FBBF24', defaultCrewSize: 4, durationMultiplier: 0.6, predecessors: ['PAV'], category: 'mep' },
      { name: 'Landscaping', code: 'LND', color: '#16A34A', defaultCrewSize: 6, durationMultiplier: 0.8, predecessors: ['KRB'], category: 'finishing' },
    ],
    tips: [
      'Linear infrastructure is naturally suited to takt — sections flow sequentially',
      'Weather windows are critical — plan earthworks in dry season',
      'Bridge/structure work needs its own takt train',
    ],
  },
];

// ── Dynamic LBS Generation from Floor Configuration ──

/**
 * Structural zone name patterns per building type (Kaba İnşaat).
 * Structural zones are typically larger — often the entire floor is one zone.
 * For multi-zone structural work (e.g., large footprint industrial), zones
 * represent pour sections or erection sequences.
 */
const STRUCTURAL_ZONE_PATTERNS: Record<string, string[]> = {
  hotel:        ['Full Slab', 'Slab Section A', 'Slab Section B', 'Core & Shear Wall'],
  hospital:     ['Full Slab', 'Wing A Slab', 'Wing B Slab', 'Core Structure'],
  residential:  ['Full Slab', 'Tower Slab A', 'Tower Slab B', 'Core & Walls'],
  commercial:   ['Full Slab', 'Slab Section A', 'Slab Section B', 'Core Structure'],
  industrial:   ['Bay A Structure', 'Bay B Structure', 'Bay C Structure', 'Bay D Structure'],
  infrastructure: ['Section A', 'Section B', 'Section C', 'Section D'],
  educational:  ['Full Slab', 'Wing A Slab', 'Wing B Slab', 'Core & Stairs'],
  mixed_use:    ['Full Slab', 'Tower A Slab', 'Tower B Slab', 'Podium Slab'],
  data_center:  ['Hall A Slab', 'Hall B Slab', 'Service Core', 'Power Block'],
};

/** Finishing zone name patterns per building type (İnce İş) */
const ZONE_PATTERNS: Record<string, string[]> = {
  hotel:        ['Wing A — Rooms', 'Wing B — Rooms', 'Corridor & Services', 'Amenity Zone', 'Back of House', 'Suite Wing', 'Service Zone', 'Pool Deck Zone'],
  hospital:     ['Ward A — Patient Rooms', 'Ward B — Patient Rooms', 'Nurse Station & Support', 'Corridor & Services', 'Diagnostics Zone', 'Treatment Zone', 'Operating Zone', 'Recovery Zone'],
  residential:  ['Unit A Side', 'Unit B Side', 'Corridor & Core', 'Amenity Zone', 'Service Area', 'Common Zone', 'Balcony Side', 'Utility Zone'],
  commercial:   ['Open Plan Zone A', 'Open Plan Zone B', 'Core (Lifts/WC/Services)', 'Perimeter / Facade', 'Meeting Rooms', 'Server Room', 'Break Area', 'Reception Zone'],
  industrial:   ['Bay A', 'Bay B', 'Bay C', 'Bay D', 'Process Zone', 'Utility Zone', 'Loading Zone', 'Storage Zone'],
  infrastructure: ['Earthworks Zone', 'Structures Zone', 'Pavement Zone', 'Utilities Zone', 'Drainage Zone', 'Finishing Zone', 'Signage Zone', 'Landscaping Zone'],
  educational:  ['Classroom Wing A', 'Classroom Wing B', 'Corridor & Common', 'Lab / Workshop', 'Admin Area', 'Library Zone', 'Auditorium Zone', 'Sports Zone'],
  mixed_use:    ['Residential Wing', 'Commercial Wing', 'Core & Services', 'Retail Zone', 'Common Area', 'Office Zone', 'Amenity Zone', 'Parking Zone'],
  data_center:  ['Server Hall A', 'Server Hall B', 'Power Room', 'Cooling Zone', 'Network Zone', 'Security Zone', 'UPS Room', 'Control Room'],
};

const BASEMENT_ZONES: Record<string, string[]> = {
  hotel:       ['Parking Zone', 'MEP Plant Room', 'Storage & BOH'],
  hospital:    ['Central Plant', 'Morgue & Pathology', 'Loading & Stores'],
  residential: ['Parking Level', 'Storage & MEP', 'Fire Pump Room'],
  commercial:  ['Parking', 'Building Services', 'Fire Pump Room'],
  educational: ['Storage', 'MEP Room', 'Archive'],
  mixed_use:   ['Parking Level', 'Building Services', 'Storage'],
  data_center: ['Cable Routing', 'UPS / Battery Room', 'Generator Room'],
};

/**
 * Generate a dynamic LBS template based on building type and floor configuration.
 * Uses user-specified floor/basement/zone counts instead of hardcoded templates.
 *
 * Creates dual-phase zones per floor:
 * - Structural zones (Kaba İnşaat): larger zones for formwork/concrete/steel work
 * - Finishing zones (İnce İş): finer subdivisions for MEP, architectural, and finishing trades
 */
export function generateLbsFromConfig(
  buildingType: string,
  floorCount: number,
  basementCount: number,
  zonesPerFloor: number,
  structuralZonesPerFloor: number = 1,
): LocationTemplate[] {
  if (buildingType === 'infrastructure') {
    // Infrastructure uses sections, not floors — keep original template
    const tpl = PROJECT_TEMPLATES.find((t) => t.type === 'infrastructure');
    return tpl?.locations || [];
  }

  const finishingZoneNames = ZONE_PATTERNS[buildingType] || ZONE_PATTERNS.commercial;
  const structuralZoneNames = STRUCTURAL_ZONE_PATTERNS[buildingType] || STRUCTURAL_ZONE_PATTERNS.commercial;
  const basementZones = BASEMENT_ZONES[buildingType] || BASEMENT_ZONES.commercial;

  const buildingLabel: Record<string, string> = {
    hotel: 'Main Building',
    hospital: 'Hospital Building',
    residential: 'Tower A',
    commercial: 'Office Tower',
    industrial: 'Industrial Facility',
    educational: 'Campus Building',
    mixed_use: 'Mixed-Use Tower',
    data_center: 'Data Center Facility',
  };

  /** Build zone children for a floor with both structural and finishing phases */
  function buildFloorZones(structCount: number, finishCount: number): LocationTemplate[] {
    const zones: LocationTemplate[] = [];

    // Structural zones (Kaba İnşaat)
    const sNames = structuralZoneNames.slice(0, structCount);
    for (const name of sNames) {
      zones.push({ name, type: 'zone', phase: 'structural' });
    }

    // Finishing zones (İnce İş)
    const fNames = finishingZoneNames.slice(0, finishCount);
    for (const name of fNames) {
      zones.push({ name, type: 'zone', phase: 'finishing' });
    }

    return zones;
  }

  const children: LocationTemplate[] = [];

  // Basements — structural zones only (no finishing in basements typically)
  if (basementCount > 0) {
    for (let b = basementCount; b >= 1; b--) {
      const basementChildren: LocationTemplate[] = basementZones
        .slice(0, Math.max(2, zonesPerFloor))
        .map((name) => ({ name, type: 'zone' as const, phase: 'finishing' as const }));
      // Add a single structural zone for basement slab
      basementChildren.unshift({ name: 'Basement Slab', type: 'zone', phase: 'structural' });
      children.push({
        name: basementCount === 1 ? 'Basement' : `Basement B${b}`,
        type: 'floor',
        children: basementChildren,
      });
    }
  }

  // Ground floor (always present if floorCount > 0)
  if (floorCount > 0) {
    children.push({
      name: 'Ground Floor',
      type: 'floor',
      children: buildFloorZones(structuralZonesPerFloor, zonesPerFloor),
    });
  }

  // Typical floors (floorCount - 1 because ground is already counted, and last is roof)
  const typicalFloors = Math.max(0, floorCount - 2);
  if (typicalFloors > 0) {
    children.push({
      name: 'Typical Floor',
      type: 'floor',
      repeat: typicalFloors,
      repeatLabel: 'Floor {n}',
      children: buildFloorZones(structuralZonesPerFloor, zonesPerFloor),
    });
  }

  // Roof / top floor
  if (floorCount >= 2) {
    children.push({
      name: 'Roof / Mechanical',
      type: 'floor',
      children: [
        { name: 'Roof Slab', type: 'zone', phase: 'structural' },
        { name: 'Mechanical Penthouse', type: 'zone', phase: 'finishing' },
        ...(buildingType === 'hotel' ? [{ name: 'Pool Deck', type: 'zone' as const, phase: 'finishing' as const }] : []),
      ],
    });
  }

  return [
    {
      name: buildingLabel[buildingType] || 'Building',
      type: 'building',
      children,
    },
  ];
}

// ── Helpers ──

export function getTemplate(type: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.type === type);
}

export function getAllTemplateTypes(): { type: string; label: string; icon: string; description: string }[] {
  return PROJECT_TEMPLATES.map((t) => ({
    type: t.type,
    label: t.label,
    icon: t.icon,
    description: t.description,
  }));
}

/**
 * Expand a location template with repeats into a flat-ish list.
 * Replaces {n} in repeatLabel with floor numbers.
 */
export function expandLocations(
  templates: LocationTemplate[],
  startFloor: number = 1
): LocationTemplate[] {
  const result: LocationTemplate[] = [];

  for (const loc of templates) {
    if (loc.repeat && loc.repeat > 1) {
      for (let i = 0; i < loc.repeat; i++) {
        const floorNum = startFloor + i;
        const name = loc.repeatLabel
          ? loc.repeatLabel.replace('{n}', String(floorNum))
          : `${loc.name} ${floorNum}`;
        result.push({
          ...loc,
          name,
          repeat: undefined,
          repeatLabel: undefined,
          children: loc.children ? [...loc.children] : undefined,
        });
      }
    } else {
      result.push({
        ...loc,
        children: loc.children ? expandLocations(loc.children, startFloor) : undefined,
      });
    }
  }

  return result;
}
