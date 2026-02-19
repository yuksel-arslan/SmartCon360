import { DocumentStore, type Document } from './document-store.js';

// ── Context Builder ──────────────────────────────────────────────────────────

export interface RetrievalResult {
  context: string;
  sources: string[];
  documentCount: number;
}

/**
 * Retrieve relevant documents and build a context string for the LLM prompt.
 * Truncates to maxTokens approximate token count to stay within context limits.
 */
export async function retrieveContext(
  store: DocumentStore,
  query: string,
  options?: {
    projectId?: string;
    category?: string;
    topK?: number;
    maxChars?: number;
  },
): Promise<RetrievalResult> {
  const topK = options?.topK ?? 5;
  const maxChars = options?.maxChars ?? 4000;

  const results = await store.retrieve(query, topK, {
    projectId: options?.projectId,
    category: options?.category,
  });

  if (results.length === 0) {
    return { context: '', sources: [], documentCount: 0 };
  }

  const sources = new Set<string>();
  const contextParts: string[] = [];
  let totalChars = 0;

  for (const result of results) {
    const docText = `[${result.document.metadata.category}] ${result.document.content}`;
    if (totalChars + docText.length > maxChars) {
      // Add truncated version if there's space for at least 200 chars
      const remaining = maxChars - totalChars;
      if (remaining > 200) {
        contextParts.push(docText.slice(0, remaining) + '...');
        sources.add(result.document.metadata.source);
      }
      break;
    }
    contextParts.push(docText);
    totalChars += docText.length;
    sources.add(result.document.metadata.source);
  }

  return {
    context: contextParts.join('\n\n'),
    sources: Array.from(sources),
    documentCount: results.length,
  };
}

// ── Project Knowledge Seeder ─────────────────────────────────────────────────

/** Seed the document store with project-specific knowledge for RAG retrieval */
export function seedProjectKnowledge(store: DocumentStore): Promise<void> {
  const projectId = 'hotel-sapphire';
  const now = new Date().toISOString();

  const documents: Document[] = [
    // Takt plan context
    {
      id: 'plan-overview',
      content: 'Hotel Sapphire takt plan has 12 zones across 6 floors, 8 trades in the takt train, with a 5-day takt time. The project started on January 6, 2026. Current takt period is T7 of 17 total periods. The plan uses a linear flow pattern with 1-day buffers between trades.',
      metadata: { source: 'takt-engine', projectId, category: 'plan', timestamp: now },
    },
    {
      id: 'plan-trades',
      content: 'The takt train sequence is: 1) Structure, 2) MEP Rough-In, 3) Drywall, 4) MEP Finish, 5) Flooring, 6) Paint, 7) Final Finishes, 8) Punch List. Structure trade is the lead wagon with the longest duration of 5 days per zone. MEP trades have critical dependencies between rough-in and finish phases.',
      metadata: { source: 'takt-engine', projectId, category: 'plan', timestamp: now },
    },
    {
      id: 'plan-zones',
      content: 'The 12 takt zones are divided across 6 floors: Ground Floor (Zone A, B), 1st Floor (Zone C, D), 2nd Floor (Zone E, F), 3rd Floor (Zone G, H), 4th Floor (Zone I, J), 5th Floor (Zone K, L). Each floor has 2 zones of approximately equal work content. Zone sizes range from 450-550 sq meters.',
      metadata: { source: 'takt-engine', projectId, category: 'plan', timestamp: now },
    },

    // Progress context
    {
      id: 'progress-current',
      content: 'Hotel Sapphire overall progress is 45% complete as of February 2026. Structure trade is 85% complete and 2 days ahead of schedule. MEP Rough-In is 60% complete but 1.5 days behind in Zone D due to material delivery delays. Drywall is 45% complete and 0.5 days behind. All other trades are on or ahead of schedule.',
      metadata: { source: 'progress-service', projectId, category: 'progress', timestamp: now },
    },
    {
      id: 'progress-ppc',
      content: 'PPC (Percent Plan Complete) has improved from 65% in Week 1 to 93% in the current week (Week 8). The 8-week trend shows consistent improvement: W1:65%, W2:68.5%, W3:72%, W4:78%, W5:82.5%, W6:87%, W7:91%, W8:93%. The target PPC is 80%. Current PPC of 93% exceeds the industry benchmark. Top performing trades: Structure (98% PPC), Flooring (95% PPC). Trade needing attention: MEP Rough-In (87% PPC).',
      metadata: { source: 'progress-service', projectId, category: 'progress', timestamp: now },
    },
    {
      id: 'progress-variance',
      content: 'Top variance reasons for plan failures: 1) Material delivery delayed (3 occurrences, material category), 2) Design change pending RFI (2 occurrences, design category), 3) Crew not available (1 occurrence, labor category). The Constraint Resolution Rate (CRR) is 78% and trending upward. Most variances are concentrated in the MEP Rough-In trade.',
      metadata: { source: 'progress-service', projectId, category: 'progress', timestamp: now },
    },

    // Constraint context
    {
      id: 'constraint-critical',
      content: 'Critical constraint C-041: Shop drawing approval pending for MEP Zone C. This is a Design category constraint, severity critical, status open. Impact: Could delay MEP Rough-In start in Zone E by 2-3 days if not resolved by February 18. Owner: Design Team Lead. Resolution requires architect sign-off on revised shop drawings.',
      metadata: { source: 'constraint-service', projectId, category: 'constraint', timestamp: now },
    },
    {
      id: 'constraint-high',
      content: 'High priority constraint C-038: Ductwork delivery delayed to March 20. Material category, severity high, status open. The MEP subcontractor reports supply chain issues with the duct manufacturer. Impact: Will cause MEP Rough-In delay in Zone D-E corridor. Mitigation: Exploring alternate supplier, potential 5-day expedite available at $8,200 premium.',
      metadata: { source: 'constraint-service', projectId, category: 'constraint', timestamp: now },
    },
    {
      id: 'constraint-medium',
      content: 'Medium priority constraint C-045: Electrical crew availability for week 12. Labor category, severity medium, status open. The electrical subcontractor has a scheduling conflict with another project. Impact: Minor, affects Zone C electrical finish only. Mitigation: Subcontractor confirmed backup crew available, may need 1 additional day.',
      metadata: { source: 'constraint-service', projectId, category: 'constraint', timestamp: now },
    },
    {
      id: 'constraint-stats',
      content: 'Hotel Sapphire constraint statistics: 14 total constraints tracked. 3 currently open (1 critical, 1 high, 1 medium). 11 resolved. Constraint Resolution Rate: 78.6%. Breakdown by category: Design 3, Material 4, Equipment 1, Labor 2, Space 1, Predecessor 2, Permit 1. Average resolution time: 4.2 days.',
      metadata: { source: 'constraint-service', projectId, category: 'constraint', timestamp: now },
    },

    // Resource context
    {
      id: 'resource-overview',
      content: 'Hotel Sapphire currently has 142 workers on site across 6 active trades. Structure: 28 workers (on-track), MEP: 28 workers combining rough-in and finish (rough-in at-risk), Drywall: 22 workers (on-track), Electrical: 18 workers (on-track), Plumbing: 16 workers (on-track), HVAC: 20 workers (on-track). Equipment utilization is at 87%. Peak workforce expected in week 10 with 165 workers.',
      metadata: { source: 'resource-service', projectId, category: 'resource', timestamp: now },
    },
    {
      id: 'resource-cost',
      content: 'Project budget utilization: 42% spent of total contract value. Labor cost tracking at 3% under budget due to Structure trade efficiency. Material costs 2% over budget due to ductwork price escalation. Weekly burn rate: $285,000. Cost of delay estimated at $12,000 per working day for the overall project. Adding 2 crew members to MEP would cost $4,200/week but could recover 1.5 days of delay.',
      metadata: { source: 'resource-service', projectId, category: 'resource', timestamp: now },
    },

    // Simulation context
    {
      id: 'simulation-results',
      content: 'Latest what-if simulation results for Hotel Sapphire: Scenario "Compress takt from 5 to 4 days" reduces schedule by 12 days but increases stacking risk by 25%. Scenario "Add 2 crew to MEP" costs $4,200/week but eliminates current MEP delay and reduces stacking risk from 78% to 12%. Monte Carlo analysis (1000 iterations) shows P50 completion at July 15, P80 at July 28, P95 at August 8. On-time probability: 62%.',
      metadata: { source: 'simulation-service', projectId, category: 'plan', timestamp: now },
    },

    // Domain knowledge
    {
      id: 'knowledge-takt',
      content: 'Takt planning (from German "Takt" = rhythm) is a lean construction scheduling method. The project is divided into equal work zones, trades flow through zones in a fixed rhythm (takt time, typically 3-5 days). Key metrics: takt time, number of zones, number of wagons (trades), buffer days. Total duration = (zones + wagons - 1 + buffers) x takt time. Trade stacking occurs when multiple trades occupy the same zone simultaneously.',
      metadata: { source: 'manual', category: 'knowledge', timestamp: now },
    },
    {
      id: 'knowledge-lps',
      content: 'Last Planner System (LPS) has 5 levels: Master Schedule, Phase Planning, Lookahead Planning (6-week rolling), Weekly Work Plan, Daily Huddle. PPC (Percent Plan Complete) = completed commitments / total commitments x 100%. Target PPC > 80%. Variance categories: Design, Material, Equipment, Labor, Space, Predecessor, Permit, Information. CRR (Constraint Resolution Rate) measures lookahead effectiveness.',
      metadata: { source: 'manual', category: 'knowledge', timestamp: now },
    },
    {
      id: 'knowledge-flowline',
      content: 'A flowline chart plots location (Y-axis) vs time (X-axis), each trade as a diagonal line. Parallel lines = smooth flow. Crossing lines = trade stacking (bad). Steeper slopes = faster progression. Gaps = buffers. Horizontal segments = trade waiting/idle. Flowline enables visual detection of schedule conflicts, stacking risks, and buffer consumption. It is the primary visualization in takt planning.',
      metadata: { source: 'manual', category: 'knowledge', timestamp: now },
    },
  ];

  return store.addDocuments(documents);
}
