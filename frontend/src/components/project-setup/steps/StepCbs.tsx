'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SetupStepProps } from '../types';
import { ChevronRight, ChevronDown, Loader2, Check, RefreshCw, FolderTree, Link2 } from 'lucide-react';

interface CbsNode {
  id: string;
  code: string;
  name: string;
  level: number;
  wbsNode?: { id: string; code: string; name: string } | null;
  children: CbsNode[];
}

export default function StepCbs({ projectId, state, onStateChange }: SetupStepProps) {
  const [cbsTree, setCbsTree] = useState<CbsNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchCbs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/cbs`);
      if (res.ok) {
        const json = await res.json();
        setCbsTree(json.data || []);
        const firstLevel = new Set<string>();
        (json.data || []).forEach((n: CbsNode) => firstLevel.add(n.id));
        setExpanded(firstLevel);
      }
    } catch {
      setError('Failed to load CBS');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (state.cbsGenerated) fetchCbs();
  }, [state.cbsGenerated, fetchCbs]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/cbs/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Generation failed');
      }

      const json = await res.json();
      onStateChange({
        cbsGenerated: true,
        cbsNodeCount: json.meta?.count || 0,
      });
      await fetchCbs();
    } catch (err: any) {
      setError(err.message);
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
        budget management using <strong>Uniclass 2015 Ss (Systems)</strong> classification.
      </p>

      {/* Pre-requisite check */}
      {!state.wbsGenerated && (
        <div
          className="mb-4 rounded-lg px-4 py-3 text-[12px]"
          style={{ background: 'rgba(245,158,11,0.08)', color: 'var(--color-warning)' }}
        >
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
      </div>

      {error && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px]"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}
        >
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
