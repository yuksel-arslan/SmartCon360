'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SetupStepProps } from '../types';
import { ChevronRight, ChevronDown, Loader2, Check, RefreshCw, FolderTree, AlertTriangle } from 'lucide-react';

interface WbsNode {
  id: string;
  code: string;
  name: string;
  level: number;
  children: WbsNode[];
}

export default function StepWbs({ projectId, state, onStateChange, authHeaders }: SetupStepProps) {
  const [wbsTree, setWbsTree] = useState<WbsNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchWbs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/wbs`, {
        headers: { ...authHeaders },
      });
      if (res.ok) {
        const json = await res.json();
        const tree: WbsNode[] = json.data || [];
        setWbsTree(tree);
        // Auto-expand first level
        const firstLevel = new Set<string>();
        tree.forEach((n) => firstLevel.add(n.id));
        setExpanded(firstLevel);
        // Sync state if server says WBS exists but local state doesn't know
        if (tree.length > 0 && !state.wbsGenerated) {
          onStateChange({ wbsGenerated: true, wbsNodeCount: countNodes(tree) });
        }
      }
    } catch {
      setError('Failed to load WBS data');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, authHeaders]);

  // Always load existing WBS on mount
  useEffect(() => {
    fetchWbs();
  }, [fetchWbs]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/wbs/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          standard: state.classificationStandard,
          projectType: state.projectType || undefined,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = json?.error?.message || `Generation failed (HTTP ${res.status})`;
        throw new Error(msg);
      }

      onStateChange({
        wbsGenerated: true,
        wbsNodeCount: json?.meta?.count || json?.data?.length || 0,
      });
      await fetchWbs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'WBS generation failed');
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

  const standardLabel: Record<string, string> = {
    uniclass: 'Uniclass 2015 (EF)',
    masterformat: 'MasterFormat 2018',
    uniformat: 'UniFormat II',
    custom: 'Custom',
  };

  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Work Breakdown Structure (WBS)
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
        {state.classificationStandard === 'custom'
          ? 'Create your WBS structure manually.'
          : `Generate WBS from ${standardLabel[state.classificationStandard] || state.classificationStandard} template${state.projectType ? ` for your ${state.projectType} project` : ''}.`}
      </p>

      {/* Generate / Regenerate button */}
      {state.classificationStandard !== 'custom' && (
        <div className="mb-6">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: state.wbsGenerated ? 'var(--color-text-muted)' : 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}
          >
            {generating ? (
              <><Loader2 size={14} className="animate-spin" /> Generating...</>
            ) : state.wbsGenerated ? (
              <><RefreshCw size={14} /> Regenerate WBS ({state.wbsNodeCount} nodes)</>
            ) : (
              <><FolderTree size={14} /> Generate WBS from {standardLabel[state.classificationStandard]}</>
            )}
          </button>
          {state.wbsGenerated && (
            <p className="mt-2 text-[11px]" style={{ color: 'var(--color-warning)' }}>
              Regenerating will replace existing WBS nodes.
            </p>
          )}
        </div>
      )}

      {error && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px]"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}
        >
          <AlertTriangle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* WBS Tree */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        </div>
      ) : wbsTree.length > 0 ? (
        <div
          className="rounded-lg border p-3 max-h-[500px] overflow-auto"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
        >
          {wbsTree.map((node) => (
            <WbsTreeNode key={node.id} node={node} expanded={expanded} onToggle={toggleExpand} depth={0} />
          ))}
        </div>
      ) : state.wbsGenerated ? (
        <div className="text-[12px] py-4" style={{ color: 'var(--color-text-muted)' }}>
          WBS is empty. Click Generate to create nodes.
        </div>
      ) : null}

      {/* Summary */}
      {state.wbsGenerated && wbsTree.length > 0 && (
        <div
          className="mt-4 rounded-lg px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(16,185,129,0.06)', borderLeft: '3px solid var(--color-success)' }}
        >
          <Check size={16} style={{ color: 'var(--color-success)' }} />
          <span className="text-[12px]" style={{ color: 'var(--color-text)' }}>
            WBS generated with <strong>{state.wbsNodeCount}</strong> nodes using{' '}
            <strong>{standardLabel[state.classificationStandard]}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

function countNodes(tree: WbsNode[]): number {
  let count = 0;
  for (const node of tree) {
    count++;
    if (node.children) count += countNodes(node.children);
  }
  return count;
}

function WbsTreeNode({
  node,
  expanded,
  onToggle,
  depth,
}: {
  node: WbsNode;
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
          style={{ background: 'var(--color-bg-input)', color: 'var(--color-accent)' }}
        >
          {node.code}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--color-text)' }}>{node.name}</span>
      </button>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <WbsTreeNode key={child.id} node={child} expanded={expanded} onToggle={onToggle} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
