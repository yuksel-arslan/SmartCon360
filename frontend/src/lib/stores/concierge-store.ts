/* In-memory concierge conversation store — Phase 2 */

import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: string;
  sources?: string[];
  suggestions?: string[];
  confidence?: number;
}

export interface ConciergeResponse {
  answer: string;
  sources: string[];
  suggestions: string[];
  confidence: number;
  intent: string;
}

const conversations: Map<string, ChatMessage[]> = new Map();

const INTENTS = {
  TAKT_QUERY: 'TAKT_QUERY',
  WHAT_IF: 'WHAT_IF',
  CONSTRAINT_CHECK: 'CONSTRAINT_CHECK',
  PPC_QUERY: 'PPC_QUERY',
  REPORT_GENERATE: 'REPORT_GENERATE',
  RESOURCE_QUERY: 'RESOURCE_QUERY',
  PROJECT_STATUS: 'PROJECT_STATUS',
  GENERAL_CHAT: 'GENERAL_CHAT',
} as const;

function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  if (/when|start|finish|schedule|takt|period|zone.*trade|trade.*zone/.test(lower)) return INTENTS.TAKT_QUERY;
  if (/what.?if|scenario|change.*to|move.*trade|add.*crew|what happens/.test(lower)) return INTENTS.WHAT_IF;
  if (/constraint|block|issue|problem|open.*issue|unresolved/.test(lower)) return INTENTS.CONSTRAINT_CHECK;
  if (/ppc|percent.*complete|progress|behind|ahead|performance/.test(lower)) return INTENTS.PPC_QUERY;
  if (/report|generate.*report|summary|weekly.*report/.test(lower)) return INTENTS.REPORT_GENERATE;
  if (/resource|crew|worker|equipment|labor|material/.test(lower)) return INTENTS.RESOURCE_QUERY;
  if (/status|overview|how.*project|dashboard|health/.test(lower)) return INTENTS.PROJECT_STATUS;
  return INTENTS.GENERAL_CHAT;
}

const TEMPLATE_RESPONSES: Record<string, ConciergeResponse> = {
  TAKT_QUERY: {
    answer: `**Schedule Overview:**\n\n- **Takt Time:** 5 business days per zone\n- **Current Period:** T7 (Week of March 23)\n- **Active Trades:** MEP Rough-in in Zones 3-4, Drywall in Zones 1-2\n- **Next Milestone:** MEP Finish starts Zone 1 on March 30\n\n**Key Points:**\n- Structure is complete through Zone 6\n- MEP Rough-in is on track (2 zones completed this week)\n- Buffer between Structure and MEP: 85% healthy\n\nWould you like details on a specific trade or zone?`,
    sources: ['takt-engine', 'flowline-service'],
    suggestions: ['Show flowline chart', 'Check MEP schedule', 'View zone status'],
    confidence: 0.91,
    intent: 'TAKT_QUERY',
  },
  WHAT_IF: {
    answer: `**Simulation Results:**\n\nI can run these scenarios for you:\n\n1. **Add 2 crew to MEP** → Estimated 4-day recovery, +$8,500 cost\n2. **Extend takt to 6 days** → Adds 6 days total, reduces stacking risk by 40%\n3. **Add weekend shift** → Recovers 3 days, +$12,000 overtime cost\n\n**Recommendation:** Option 1 (Add crew) provides the best cost-to-recovery ratio.\n\nShall I run a detailed simulation on any of these?`,
    sources: ['simulation-service'],
    suggestions: ['Run detailed simulation', 'Compare all scenarios', 'Show cost breakdown'],
    confidence: 0.87,
    intent: 'WHAT_IF',
  },
  CONSTRAINT_CHECK: {
    answer: `**Open Constraints: 5**\n\n🔴 **Critical (2):**\n1. Steel delivery for Zone 8 — no confirmed date (Material)\n2. MEP shop drawings revision — pending architect response (Design)\n\n🟡 **Medium (2):**\n3. Inspection approval for Zone 5 MEP — submitted, awaiting (Permit)\n4. Crane schedule conflict Tuesday AM (Equipment)\n\n🟢 **Low (1):**\n5. Staging area cleanup for Zone 3 (Space)\n\n**Constraint Removal Rate:** 78% (target: 85%)\n\n**Recommendation:** Escalate steel delivery — it impacts 3 downstream trades.`,
    sources: ['constraint-service'],
    suggestions: ['View constraint details', 'Assign constraint owner', 'Check schedule impact'],
    confidence: 0.94,
    intent: 'CONSTRAINT_CHECK',
  },
  PPC_QUERY: {
    answer: `**PPC Analysis — Week 12:**\n\n📊 **Current PPC: 93%** (target: 85%) ✅\n- Committed: 28 tasks\n- Completed: 26 tasks\n- Failed: 2 tasks\n\n**Trend:** Improving — up from 62% in Week 1\n\n**Failed Tasks:**\n1. Paint Zone-4: Material not on site (Material)\n2. Drywall Zone-6: Crew shortage, 2 of 6 absent (Labor)\n\n**Top Variance Reason:** Material (40% of all failures)\n\n**Trade Performance:**\n- Best: Structure (100% PPC)\n- Worst: Painting (75% PPC)\n\n**Recommendation:** Pre-order paint materials 2 weeks ahead to prevent recurrence.`,
    sources: ['progress-service'],
    suggestions: ['View PPC trend chart', 'Analyze variance by trade', 'Generate weekly report'],
    confidence: 0.95,
    intent: 'PPC_QUERY',
  },
  REPORT_GENERATE: {
    answer: `**Report Generation**\n\nI can generate the following reports:\n\n1. 📋 **Weekly Progress Report** — PPC, trade status, constraints, lookahead\n2. 📊 **Executive Summary** — High-level project overview for stakeholders\n3. 📉 **Variance Analysis** — Root cause breakdown of plan deviations\n4. 📝 **Custom Report** — Select your own sections\n\nEach report is generated as a professional PDF/HTML document with AI-written narrative sections.\n\nWhich report would you like me to generate?`,
    sources: ['reporting-service'],
    suggestions: ['Generate weekly report', 'Generate executive summary', 'View past reports'],
    confidence: 0.90,
    intent: 'REPORT_GENERATE',
  },
  RESOURCE_QUERY: {
    answer: `**Resource Overview — Next Week:**\n\n👷 **Crew Allocation:**\n- Structure: 8 workers (Zone 5-6)\n- MEP Rough-in: 12 workers (Zone 3-4)\n- Drywall: 6 workers (Zone 1-2)\n- Total on site: 26 workers\n\n🏗️ **Equipment:**\n- Tower crane: Fully allocated Mon-Fri\n- Boom lift: Available Wed-Fri\n- Concrete pump: Not needed this week\n\n📦 **Materials:**\n- Drywall sheets: Delivered, on site\n- MEP conduits: Delivery confirmed Thursday\n- Paint: ⚠️ Pending order confirmation\n\n**Alert:** Paint materials need to be ordered today for next week's schedule.`,
    sources: ['resource-service'],
    suggestions: ['View crew schedule', 'Check material deliveries', 'Equipment availability'],
    confidence: 0.85,
    intent: 'RESOURCE_QUERY',
  },
  PROJECT_STATUS: {
    answer: `**Hotel Sapphire Istanbul — Project Status**\n\n🏗️ **Overall Health Score: 87/100** ✅\n\n**Key Metrics:**\n- Schedule: 92% on track (2 zones slightly behind)\n- PPC: 93% (12-week trend: improving)\n- Constraints: 5 open (2 critical)\n- Budget: 96% within plan\n\n**Progress:**\n- Phase 1 (Structure): 100% complete ✅\n- Phase 2 (MEP Rough-in): 67% complete 🔄\n- Phase 3 (Finishing): 15% complete 🔄\n\n**Risks:**\n- Steel delivery delay could impact Zones 7-8\n- MEP subcontractor capacity concern for April\n\n**Next Milestone:** MEP Rough-in complete (April 10)`,
    sources: ['project-service', 'progress-service', 'constraint-service'],
    suggestions: ['View detailed schedule', 'Check risks', 'Generate status report'],
    confidence: 0.92,
    intent: 'PROJECT_STATUS',
  },
  GENERAL_CHAT: {
    answer: `I'm the TaktFlow AI Concierge — your intelligent construction project assistant.\n\n**I can help you with:**\n\n📅 **Schedule Questions** — "When does MEP start in Zone C?"\n🔮 **What-If Scenarios** — "What happens if we add 2 crew to drywall?"\n⚠️ **Constraint Management** — "What constraints are blocking next week?"\n📊 **Progress Analysis** — "Why did PPC drop this week?"\n📋 **Report Generation** — "Generate a weekly progress report"\n👷 **Resource Planning** — "How many workers do we need next week?"\n\n**Tip:** Ask me anything about your project in plain language. I'll query the relevant services and give you a comprehensive answer.\n\nWhat would you like to know?`,
    sources: [],
    suggestions: ['Project status overview', 'Check open constraints', 'View PPC trend', 'What-if analysis'],
    confidence: 1.0,
    intent: 'GENERAL_CHAT',
  },
};

export function getConversation(sessionId: string): ChatMessage[] {
  return conversations.get(sessionId) || [];
}

export function clearConversation(sessionId: string): void {
  conversations.delete(sessionId);
}

export function askConcierge(sessionId: string, message: string): ConciergeResponse {
  const intent = detectIntent(message);
  const response = TEMPLATE_RESPONSES[intent] || TEMPLATE_RESPONSES.GENERAL_CHAT;

  // Store messages
  const history = conversations.get(sessionId) || [];

  history.push({
    id: uuidv4(),
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
    intent,
  });

  history.push({
    id: uuidv4(),
    role: 'assistant',
    content: response.answer,
    timestamp: new Date().toISOString(),
    intent,
    sources: response.sources,
    suggestions: response.suggestions,
    confidence: response.confidence,
  });

  // Keep last 50 messages
  if (history.length > 50) {
    history.splice(0, history.length - 50);
  }

  conversations.set(sessionId, history);
  return response;
}
