'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SetupStepProps } from '../types';
import { ChevronRight, ChevronDown, Loader2, Check, RefreshCw, FolderTree, Link2, AlertTriangle } from 'lucide-react';

interface CbsNode {
  id: string;
  code: string;
  name: string;
  level: number;
  wbsNode?: { id: string; code: string; name: string } | null;
  children: CbsNode[];
}

export default function StepCbs({ projectId, state, onStateChange, authFetch }: SetupStepProps) {
  const [cbsTree, setCbsTree] = useState<CbsNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchCbs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`/api/v1/projects/${projectId}/cbs`);
      if (res.ok) {
        const json = await res.json();
        const tree: CbsNode[] = json.data || [];
        setCbsTree(tree);
        const firstLevel = new Set<string>();
        tree.forEach((n) => firstLevel.add(n.id));
        setExpanded(firstLevel);
        // Sync state if server has CBS but local state doesn't know
        if (tree.length > 0 && !state.cbsGenerated) {
          onStateChange({ cbsGenerated: true, cbsNodeCount: countCbsNodes(tree) });
        }
      }
    } catch {
      setError('Failed to load CBS data');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, authFetch]);

  // Always load existing CBS on mount
  useEffect(() => {
    fetchCbs();
  }, [fetchCbs]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');

    try {
      const res = await authFetch(`/api/v1/projects/${projectId}/cbs/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = json?.error?.message || `CBS generation failed (HTTP ${res.status})`;
        throw new Error(msg);
      }

      onStateChange({
        cbsGenerated: true,
        cbsNodeCount: json?.meta?.count || json?.data?.length || 0,
      });
      await fetchCbs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'CBS generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Cost Breakdown Structure (CBS)
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
        CBS is automatically linked to the WBS structure. It provides cost categorization for CostPilot
        budget management using{' '}
        <strong>
          {state.classificationStandard === 'omniclass'
            ? 'OmniClass Table 33 (Disciplines)'
            : 'Uniclass 2015 Ss (Systems)'}
        </strong>{' '}
        classification.
      </p>

      {/* Pre-requisite check */}
      {!state.wbsGenerated && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-[12px]"
          style={{ background: 'rgba(245,158,11,0.08)', color: 'var(--color-warning)' }}
        >
          <AlertTriangle size={14} className="flex-shrink-0" />
          Generate the WBS first — CBS nodes will be automatically linked to WBS elements.
        </div>
      )}

      {/* Generate button */}
      <div className="mb-6">
        <button
          onClick={handleGenerate}
          disabled={generating || !state.wbsGenerated}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            background: state.cbsGenerated
              ? 'var(--color-text-muted)'
              : state.wbsGenerated
                ? 'linear-gradient(135deg, var(--color-accent), var(--color-purple))'
                : 'var(--color-bg-input)',
          }}
        >
          {generating ? (
            <><Loader2 size={14} className="animate-spin" /> Generating...</>
          ) : state.cbsGenerated ? (
            <><RefreshCw size={14} /> Regenerate CBS ({state.cbsNodeCount} nodes)</>
          ) : (
            <><FolderTree size={14} /> Generate CBS (linked to WBS)</>
          )}
        </button>
        {state.cbsGenerated && (
          <p className="mt-2 text-[11px]" style={{ color: 'var(--color-warning)' }}>
            Regenerating will replace existing CBS nodes.
          </p>
        )}
      </div>

      {error && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px]"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}
        >
          <AlertTriangle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* CBS Tree */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        </div>
      ) : cbsTree.length > 0 ? (
        <div
          className="rounded-lg border p-3 max-h-[500px] overflow-auto"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
        >
          {cbsTree.map((node) => (
            <CbsTreeNode key={node.id} node={node} expanded={expanded} onToggle={toggleExpand} depth={0} />
          ))}
        </div>
      ) : null}

      {/* Summary */}
      {state.cbsGenerated && cbsTree.length > 0 && (
        <div
          className="mt-4 rounded-lg px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(16,185,129,0.06)', borderLeft: '3px solid var(--color-success)' }}
        >
          <Check size={16} style={{ color: 'var(--color-success)' }} />
          <span className="text-[12px]" style={{ color: 'var(--color-text)' }}>
            CBS generated with <strong>{state.cbsNodeCount}</strong> cost categories linked to WBS
          </span>
        </div>
      )}
    </div>
  );
}

function countCbsNodes(tree: CbsNode[]): number {
  let count = 0;
  for (const node of tree) {
    count++;
    if (node.children) count += countCbsNodes(node.children);
  }
  return count;
}

function CbsTreeNode({
  node,
  expanded,
  onToggle,
  depth,
}: {
  node: CbsNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  depth: number;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);

  return (
    <div>
      <button
        onClick={() => hasChildren && onToggle(node.id)}
        className="flex items-center gap-1.5 w-full text-left py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        style={{ paddingLeft: depth * 20 + 4 }}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown size={12} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />
        ) : (
          <span className="w-3" />
        )}
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--color-purple)' }}
        >
          {node.code}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--color-text)' }}>{node.name}</span>
        {node.wbsNode && (
          <span className="flex items-center gap-1 ml-2 text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)' }}>
            <Link2 size={8} />
            {node.wbsNode.code}
          </span>
        )}
      </button>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <CbsTreeNode key={child.id} node={child} expanded={expanded} onToggle={onToggle} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
