'use client';

import {
  ChevronRight, ChevronDown, Loader2, Database, RefreshCw, Search, Globe,
  ArrowRight, Layers, FolderTree, Info, Sparkles, CheckCircle2,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useCostStore } from '@/stores/costStore';

const UNICLASS_TABLES = [
  { code: 'Ac', name: 'Activities', nametr: 'Aktiviteler' },
  { code: 'Co', name: 'Complexes', nametr: 'Yerleşkeler' },
  { code: 'En', name: 'Entities', nametr: 'Yapı Türleri' },
  { code: 'Pr', name: 'Products', nametr: 'Ürünler' },
  { code: 'SL', name: 'Spaces/Locations', nametr: 'Mekanlar' },
  { code: 'EF', name: 'Elements/Functions', nametr: 'Elemanlar' },
  { code: 'Ss', name: 'Systems', nametr: 'Sistemler' },
  { code: 'FI', name: 'Forms of Information', nametr: 'Bilgi Türleri' },
  { code: 'Zz', name: 'CAD', nametr: 'CAD' },
];

interface UniclassBrowserProps {
  onSelect?: (code: string, title: string) => void;
}

export function UniclassBrowser({ onSelect }: UniclassBrowserProps) {
  const {
    uniclassBrowseRoots, uniclassBrowseChildren, uniclassBrowseLoading,
    uniclassCacheStats,
    fetchUniclassTableRoots, fetchUniclassChildren, fetchUniclassCacheStats, syncUniclassTable,
    searchUniclass, uniclassResults, uniclassLoading,
    // Mapping
    classificationMappings, lookupMapping, seedMappings, classificationMappingsGrouped,
  } = useCostStore();

  const [activeTable, setActiveTable] = useState('Ss');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [showMappings, setShowMappings] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ created: number; skipped: number } | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load table roots
  useEffect(() => {
    fetchUniclassTableRoots(activeTable);
  }, [activeTable, fetchUniclassTableRoots]);

  // Load cache stats
  useEffect(() => {
    fetchUniclassCacheStats();
  }, [fetchUniclassCacheStats]);

  // Debounced search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.length >= 2) {
      searchTimerRef.current = setTimeout(() => {
        searchUniclass(query, activeTable);
      }, 400);
    }
  }, [searchUniclass, activeTable]);

  const toggleNode = async (code: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
      // Fetch children if not already loaded
      if (!uniclassBrowseChildren[code]) {
        await fetchUniclassChildren(code);
      }
    }
    setExpandedNodes(newExpanded);
  };

  const handleSync = async () => {
    setSyncing(true);
    await syncUniclassTable(activeTable);
    await fetchUniclassTableRoots(activeTable);
    await fetchUniclassCacheStats();
    setSyncing(false);
  };

  const handleSeedMappings = async () => {
    setSeeding(true);
    setSeedResult(null);
    const result = await seedMappings();
    setSeedResult(result);
    setSeeding(false);
  };

  const handleNodeSelect = async (code: string, title: string) => {
    setSelectedCode(code);
    onSelect?.(code, title);
    // Look up cross-standard mappings
    await lookupMapping({ uniclass: code });
    setShowMappings(true);
  };

  const tableInfo = UNICLASS_TABLES.find(t => t.code === activeTable);
  const cachedCount = uniclassCacheStats?.byTable?.find(b => b.table === activeTable)?.count || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FolderTree size={16} style={{ color: 'rgb(236,72,153)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Uniclass 2015 Browser
          </h3>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(236,72,153,0.1)', color: 'rgb(236,72,153)' }}>
            ISO 12006-2
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            <Database size={12} />
            <span>{uniclassCacheStats?.totalCached || 0} cached</span>
          </div>
          <button
            onClick={handleSeedMappings}
            disabled={seeding}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors disabled:opacity-50"
            style={{ background: 'rgba(168,85,247,0.1)', color: 'rgb(168,85,247)' }}
            title="Seed cross-standard mappings (Uniclass, OmniClass)"
          >
            {seedResult ? (
              <><CheckCircle2 size={10} /> {seedResult.created} seeded</>
            ) : seeding ? (
              <><Loader2 size={10} className="animate-spin" /> Seeding...</>
            ) : (
              <><Sparkles size={10} /> Seed Mappings</>
            )}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}
          >
            <RefreshCw size={10} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : `Sync ${activeTable}`}
          </button>
        </div>
      </div>

      {/* Table Selector */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border p-1"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
        {UNICLASS_TABLES.map(table => (
          <button
            key={table.code}
            onClick={() => {
              setActiveTable(table.code);
              setExpandedNodes(new Set());
              setSearchQuery('');
            }}
            className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium whitespace-nowrap transition-colors"
            style={{
              background: activeTable === table.code ? 'rgb(236,72,153)' : 'transparent',
              color: activeTable === table.code ? 'white' : 'var(--color-text-muted)',
            }}
          >
            <span className="font-mono font-bold">{table.code}</span>
            <span className="hidden sm:inline">{table.name}</span>
          </button>
        ))}
      </div>

      {/* Table Info */}
      <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
        <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
          {tableInfo?.name} / {tableInfo?.nametr}
        </span>
        <span>{cachedCount} items cached</span>
        <span>{uniclassBrowseRoots.length} root nodes</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-text-muted)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          placeholder={`Search ${tableInfo?.name || 'classifications'}...`}
          className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
        />
        {uniclassLoading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
            style={{ color: 'rgb(236,72,153)' }} />
        )}
      </div>

      {/* Search Results */}
      {searchQuery.length >= 2 && uniclassResults.length > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <div className="px-3 py-2 text-[10px] font-semibold"
            style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)' }}>
            Search Results ({uniclassResults.length})
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {uniclassResults.map((item, i) => (
              <button
                key={`${item.code}-${i}`}
                onClick={() => handleNodeSelect(item.code, item.title)}
                className="w-full px-3 py-2 border-t flex items-center gap-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span className="font-mono text-[10px] font-bold whitespace-nowrap"
                  style={{ color: 'rgb(236,72,153)' }}>{item.code}</span>
                <span className="text-xs" style={{ color: 'var(--color-text)' }}>{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hierarchical Tree */}
      {searchQuery.length < 2 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          {uniclassBrowseLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin" style={{ color: 'rgb(236,72,153)' }} />
            </div>
          ) : uniclassBrowseRoots.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              {uniclassBrowseRoots.map(node => (
                <TreeNode
                  key={node.code}
                  node={node}
                  level={0}
                  expandedNodes={expandedNodes}
                  children={uniclassBrowseChildren}
                  selectedCode={selectedCode}
                  onToggle={toggleNode}
                  onSelect={handleNodeSelect}
                  onLoadChildren={fetchUniclassChildren}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              <Globe size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs">No cached data for {tableInfo?.name}</p>
              <p className="text-[10px] mt-1">Click "Sync {activeTable}" to download from NBS API</p>
            </div>
          )}
        </div>
      )}

      {/* Cross-Standard Mapping Panel */}
      {showMappings && selectedCode && classificationMappings.length > 0 && (
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Layers size={14} style={{ color: 'var(--color-accent)' }} />
            <h4 className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
              Cross-Standard Mapping / Standart Eşleme
            </h4>
          </div>
          <div className="space-y-2">
            {classificationMappings.map((m, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 text-[10px] px-3 py-2 rounded-lg"
                style={{ background: 'var(--color-bg-main)' }}>
                <div>
                  <div className="font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Uniclass</div>
                  <span className="font-mono font-bold" style={{ color: 'rgb(236,72,153)' }}>
                    {m.uniclassCode || '—'}
                  </span>
                </div>
                <div>
                  <div className="font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Category</div>
                  <span style={{ color: 'var(--color-text)' }}>{m.category}</span>
                  <div className="mt-0.5 opacity-60">{(m.confidence * 100).toFixed(0)}% confidence</div>
                </div>
                <div>
                  <div className="font-semibold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>OmniClass</div>
                  <span className="font-mono font-bold" style={{ color: 'rgb(168,85,247)' }}>
                    {m.omniclassCode || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showMappings && selectedCode && classificationMappings.length === 0 && (
        <div className="rounded-lg px-3 py-2 flex items-center gap-2 text-[10px]"
          style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>
          <Info size={12} />
          No cross-standard mappings found for {selectedCode}. Seed mappings to populate common ones.
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Tree Node Component (recursive)
// ──────────────────────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: { code: string; title: string; description?: string | null; tableName: string; parentCode?: string | null; level: number };
  level: number;
  expandedNodes: Set<string>;
  children: Record<string, Array<{ code: string; title: string; description?: string | null; tableName: string; parentCode?: string | null; level: number }>>;
  selectedCode: string | null;
  onToggle: (code: string) => void;
  onSelect: (code: string, title: string) => void;
  onLoadChildren: (code: string) => Promise<void>;
}

function TreeNode({ node, level, expandedNodes, children, selectedCode, onToggle, onSelect, onLoadChildren }: TreeNodeProps) {
  const isExpanded = expandedNodes.has(node.code);
  const childNodes = children[node.code];
  const hasChildren = childNodes === undefined || childNodes.length > 0; // Assume has children until proven otherwise
  const isSelected = selectedCode === node.code;

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1.5 border-b transition-colors cursor-pointer"
        style={{
          paddingLeft: `${12 + level * 20}px`,
          borderColor: 'var(--color-border)',
          background: isSelected ? 'var(--color-accent-muted)' : 'transparent',
        }}
      >
        {/* Expand/Collapse Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.code);
          }}
          className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          style={{ minWidth: '20px' }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
            ) : (
              <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
            )
          ) : (
            <span style={{ width: 14 }} />
          )}
        </button>

        {/* Node Content */}
        <button
          onClick={() => onSelect(node.code, node.title)}
          className="flex-1 flex items-center gap-2 text-left py-0.5 min-w-0"
        >
          <span className="font-mono text-[10px] font-bold whitespace-nowrap"
            style={{ color: 'rgb(236,72,153)' }}>
            {node.code}
          </span>
          <span className="text-xs truncate" style={{ color: 'var(--color-text)' }}>
            {node.title}
          </span>
        </button>
      </div>

      {/* Children (recursive) */}
      {isExpanded && childNodes && childNodes.length > 0 && (
        <div>
          {childNodes.map(child => (
            <TreeNode
              key={child.code}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              children={children}
              selectedCode={selectedCode}
              onToggle={onToggle}
              onSelect={onSelect}
              onLoadChildren={onLoadChildren}
            />
          ))}
        </div>
      )}

      {/* Loading children */}
      {isExpanded && !childNodes && (
        <div className="flex items-center gap-2 py-2" style={{ paddingLeft: `${32 + level * 20}px` }}>
          <Loader2 size={12} className="animate-spin" style={{ color: 'rgb(236,72,153)' }} />
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Loading...</span>
        </div>
      )}

      {/* No children */}
      {isExpanded && childNodes && childNodes.length === 0 && (
        <div className="py-1.5 text-[10px]" style={{ paddingLeft: `${32 + level * 20}px`, color: 'var(--color-text-muted)' }}>
          No sub-classifications
        </div>
      )}
    </div>
  );
}
