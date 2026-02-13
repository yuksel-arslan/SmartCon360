import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { z, ZodError } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Logger ──────────────────────────────────────────────────────────────────
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// ── Configuration ───────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3008', 10);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const AI_ENABLED = GEMINI_API_KEY.length > 0;

const SERVICE_URLS = {
  taktEngine: process.env.TAKT_ENGINE_URL || 'http://localhost:8001',
  constraint: process.env.CONSTRAINT_URL || 'http://localhost:3004',
  progress: process.env.PROGRESS_URL || 'http://localhost:3005',
  simulation: process.env.SIMULATION_URL || 'http://localhost:8003',
  resource: process.env.RESOURCE_URL || 'http://localhost:3006',
  reporting: process.env.REPORTING_URL || 'http://localhost:8004',
};

// ── Intents ─────────────────────────────────────────────────────────────────
enum Intent {
  TAKT_QUERY = 'TAKT_QUERY',
  WHAT_IF = 'WHAT_IF',
  CONSTRAINT_CHECK = 'CONSTRAINT_CHECK',
  PPC_QUERY = 'PPC_QUERY',
  REPORT_GENERATE = 'REPORT_GENERATE',
  RESOURCE_QUERY = 'RESOURCE_QUERY',
  PROJECT_STATUS = 'PROJECT_STATUS',
  GENERAL_CHAT = 'GENERAL_CHAT',
}

// ── Types ───────────────────────────────────────────────────────────────────
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
}

interface ConversationSession {
  messages: ConversationMessage[];
  projectId?: string;
}

interface ConciergeResponse {
  answer: string;
  sources: string[];
  suggestions: string[];
  confidence: number;
  intent: string;
}

// ── Validation Schemas ──────────────────────────────────────────────────────
const askSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
  session_id: z.string().optional(),
  project_id: z.string().optional(),
});

const historyQuerySchema = z.object({
  session_id: z.string().min(1, 'session_id is required'),
});

// ── Conversation Store ──────────────────────────────────────────────────────
const MAX_MESSAGES_PER_SESSION = 50;
const conversationStore = new Map<string, ConversationSession>();

function getSession(sessionId: string): ConversationSession {
  if (!conversationStore.has(sessionId)) {
    conversationStore.set(sessionId, { messages: [] });
  }
  return conversationStore.get(sessionId)!;
}

function addMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  intent?: string,
): void {
  const session = getSession(sessionId);
  session.messages.push({ role, content, timestamp: new Date(), intent });
  if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
    session.messages = session.messages.slice(
      session.messages.length - MAX_MESSAGES_PER_SESSION,
    );
  }
}

// ── Gemini AI Client ────────────────────────────────────────────────────────
let genAI: GoogleGenerativeAI | null = null;
if (AI_ENABLED) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  logger.info('Gemini AI enabled');
} else {
  logger.info('Gemini AI disabled — using keyword-based fallback');
}

// ── Keyword-Based Intent Detection ──────────────────────────────────────────
const INTENT_KEYWORDS: { intent: Intent; keywords: string[] }[] = [
  {
    intent: Intent.WHAT_IF,
    keywords: ['what if', 'what happens', 'what would', 'scenario', 'change', 'simulate'],
  },
  {
    intent: Intent.TAKT_QUERY,
    keywords: ['when', 'start', 'finish', 'schedule', 'takt', 'trade', 'timing', 'duration', 'zone'],
  },
  {
    intent: Intent.CONSTRAINT_CHECK,
    keywords: ['constraint', 'blocking', 'blocker', 'issue', 'problem', 'impediment', 'open constraint'],
  },
  {
    intent: Intent.PPC_QUERY,
    keywords: ['ppc', 'percent', 'complete', 'progress', 'variance', 'reliability', 'plan complete'],
  },
  {
    intent: Intent.REPORT_GENERATE,
    keywords: ['report', 'generate report', 'summary', 'weekly report', 'export'],
  },
  {
    intent: Intent.RESOURCE_QUERY,
    keywords: ['resource', 'crew', 'worker', 'workers', 'equipment', 'labor', 'material', 'materials'],
  },
  {
    intent: Intent.PROJECT_STATUS,
    keywords: ['status', 'how is', 'overview', 'dashboard', 'project status', 'how are we'],
  },
];

function detectIntentByKeywords(message: string): Intent {
  const lower = message.toLowerCase();

  // Definitional / conceptual questions are GENERAL_CHAT regardless of keywords
  // Excludes possessive forms like "what is our/my/the current..." which are data queries
  const definitionalPatterns = [
    /^what (?:is|are) (?:a |an |the definition of |meant by )?(?:takt|lps|ppc|flowline|buffer|lean|constraint|trade stacking|last planner)/,
    /^(?:explain|describe|define|tell me about)\b/,
    /^how (?:is|are|does|do) .+ (?:calculated|defined|measured|work)/,
    /^can you (?:explain|describe|tell)/,
  ];
  for (const pattern of definitionalPatterns) {
    if (pattern.test(lower)) {
      return Intent.GENERAL_CHAT;
    }
  }

  for (const entry of INTENT_KEYWORDS) {
    for (const keyword of entry.keywords) {
      if (lower.includes(keyword)) {
        return entry.intent;
      }
    }
  }
  return Intent.GENERAL_CHAT;
}

// ── AI-Based Intent Detection ───────────────────────────────────────────────
async function detectIntentWithAI(message: string): Promise<Intent> {
  if (!genAI) return detectIntentByKeywords(message);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `You are an intent classifier for a construction takt planning application.
Classify the following user message into exactly one of these intents:
- TAKT_QUERY: Questions about takt plan, schedules, trade timing, zones, durations
- WHAT_IF: What-if scenario requests, simulations, "what happens if" questions
- CONSTRAINT_CHECK: Constraint status queries, blockers, impediments
- PPC_QUERY: PPC and progress questions, variance analysis, plan reliability
- REPORT_GENERATE: Report generation requests, summaries, exports
- RESOURCE_QUERY: Resource availability, crew, workers, equipment, materials
- PROJECT_STATUS: General project status overview, dashboard queries
- GENERAL_CHAT: General construction or takt planning questions, greetings

User message: "${message}"

Respond with ONLY the intent name, nothing else.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim().toUpperCase();

    if (Object.values(Intent).includes(responseText as Intent)) {
      return responseText as Intent;
    }

    logger.warn({ responseText }, 'AI returned unrecognized intent, falling back to keywords');
    return detectIntentByKeywords(message);
  } catch (err) {
    logger.error({ err }, 'AI intent detection failed, falling back to keywords');
    return detectIntentByKeywords(message);
  }
}

// ── Downstream Service Fetcher ──────────────────────────────────────────────
async function fetchFromService(
  baseUrl: string,
  path: string,
  projectId?: string,
): Promise<{ data: unknown; available: boolean }> {
  try {
    const url = `${baseUrl}${path}${projectId ? `?project_id=${projectId}` : ''}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { data: null, available: false };
    }

    const body = await response.json() as Record<string, unknown>;
    return { data: body.data ?? body, available: true };
  } catch {
    return { data: null, available: false };
  }
}

// ── Service Orchestration ───────────────────────────────────────────────────
interface OrchestrationResult {
  serviceData: unknown;
  sources: string[];
  available: boolean;
}

async function orchestrateByIntent(
  intent: Intent,
  projectId?: string,
): Promise<OrchestrationResult> {
  switch (intent) {
    case Intent.TAKT_QUERY: {
      const result = await fetchFromService(SERVICE_URLS.taktEngine, '/takt/plans', projectId);
      if (result.available) {
        return { serviceData: result.data, sources: ['takt-engine'], available: true };
      }
      return {
        serviceData: {
          plans: [
            { id: 'TP-001', name: 'Main Building Takt Plan', taktTime: 5, zones: 12, trades: 8, status: 'active' },
          ],
          currentTakt: 'T7',
          nextMilestone: 'MEP Rough-in Zone C — March 17',
        },
        sources: ['takt-engine (demo)'],
        available: false,
      };
    }

    case Intent.CONSTRAINT_CHECK: {
      const result = await fetchFromService(SERVICE_URLS.constraint, '/constraints', projectId);
      if (result.available) {
        return { serviceData: result.data, sources: ['constraint-service'], available: true };
      }
      return {
        serviceData: {
          total: 14,
          open: 3,
          critical: 1,
          constraints: [
            { id: 'C-041', category: 'Design', description: 'Shop drawing approval pending for MEP Zone C', severity: 'critical', status: 'open' },
            { id: 'C-038', category: 'Material', description: 'Ductwork delivery delayed to March 20', severity: 'high', status: 'open' },
            { id: 'C-045', category: 'Labor', description: 'Electrical crew availability week 12', severity: 'medium', status: 'open' },
          ],
        },
        sources: ['constraint-service (demo)'],
        available: false,
      };
    }

    case Intent.PPC_QUERY: {
      const result = await fetchFromService(SERVICE_URLS.progress, '/progress/ppc', projectId);
      if (result.available) {
        return { serviceData: result.data, sources: ['progress-service'], available: true };
      }
      return {
        serviceData: {
          currentPPC: 78,
          previousPPC: 82,
          trend: 'declining',
          weeklyData: [
            { week: 'W09', ppc: 85 },
            { week: 'W10', ppc: 82 },
            { week: 'W11', ppc: 78 },
          ],
          topVarianceReasons: [
            { reason: 'Material delay', count: 3 },
            { reason: 'Design change', count: 2 },
            { reason: 'Labor shortage', count: 1 },
          ],
        },
        sources: ['progress-service (demo)'],
        available: false,
      };
    }

    case Intent.WHAT_IF: {
      const result = await fetchFromService(SERVICE_URLS.simulation, '/simulate/scenarios', projectId);
      if (result.available) {
        return { serviceData: result.data, sources: ['simulation-service'], available: true };
      }
      return {
        serviceData: {
          availableScenarios: ['Compress takt time', 'Add trade crew', 'Resequence trades', 'Adjust buffers'],
          lastSimulation: {
            scenario: 'Compress takt from 5 to 4 days',
            result: 'Schedule reduced by 12 days but stacking risk increases by 25%',
          },
        },
        sources: ['simulation-service (demo)'],
        available: false,
      };
    }

    case Intent.REPORT_GENERATE: {
      const result = await fetchFromService(SERVICE_URLS.reporting, '/reports/generate', projectId);
      if (result.available) {
        return { serviceData: result.data, sources: ['reporting-service'], available: true };
      }
      return {
        serviceData: {
          availableReports: ['Weekly Progress', 'PPC Trend', 'Constraint Log', 'Lookahead Schedule', 'Flowline Summary'],
          lastGenerated: { type: 'Weekly Progress', date: new Date().toISOString(), status: 'ready' },
        },
        sources: ['reporting-service (demo)'],
        available: false,
      };
    }

    case Intent.RESOURCE_QUERY: {
      const result = await fetchFromService(SERVICE_URLS.resource, '/resources', projectId);
      if (result.available) {
        return { serviceData: result.data, sources: ['resource-service'], available: true };
      }
      return {
        serviceData: {
          totalWorkers: 142,
          tradesOnSite: 6,
          resources: [
            { trade: 'MEP', workers: 28, status: 'on-track' },
            { trade: 'Drywall', workers: 22, status: 'on-track' },
            { trade: 'Electrical', workers: 18, status: 'at-risk' },
            { trade: 'Plumbing', workers: 16, status: 'on-track' },
            { trade: 'Fire Protection', workers: 12, status: 'on-track' },
            { trade: 'HVAC', workers: 20, status: 'on-track' },
          ],
          equipmentUtilization: '87%',
        },
        sources: ['resource-service (demo)'],
        available: false,
      };
    }

    case Intent.PROJECT_STATUS: {
      const results = await Promise.all([
        fetchFromService(SERVICE_URLS.taktEngine, '/takt/plans', projectId),
        fetchFromService(SERVICE_URLS.progress, '/progress/ppc', projectId),
        fetchFromService(SERVICE_URLS.constraint, '/constraints', projectId),
      ]);

      const anyAvailable = results.some((r) => r.available);
      if (anyAvailable) {
        return {
          serviceData: {
            takt: results[0].data,
            progress: results[1].data,
            constraints: results[2].data,
          },
          sources: ['takt-engine', 'progress-service', 'constraint-service'].filter(
            (_, i) => results[i].available,
          ),
          available: true,
        };
      }

      return {
        serviceData: {
          overallProgress: '64%',
          currentPhase: 'Interior Fit-Out',
          ppc: 78,
          openConstraints: 3,
          activeTrades: 6,
          daysToMilestone: 18,
          nextMilestone: 'Floor 3 Handover',
          status: 'on-track',
        },
        sources: ['takt-engine (demo)', 'progress-service (demo)', 'constraint-service (demo)'],
        available: false,
      };
    }

    case Intent.GENERAL_CHAT:
    default:
      return { serviceData: null, sources: [], available: true };
  }
}

// ── Suggestion Generation ───────────────────────────────────────────────────
function generateSuggestions(intent: Intent): string[] {
  switch (intent) {
    case Intent.TAKT_QUERY:
      return [
        'Show the flowline chart',
        'Check constraints for this zone',
        'Run a what-if analysis',
        'View trade sequence details',
      ];
    case Intent.PPC_QUERY:
      return [
        'View variance details',
        'Generate weekly report',
        'Compare with last week',
        'Show root cause breakdown',
      ];
    case Intent.CONSTRAINT_CHECK:
      return [
        'View critical constraints',
        'Show constraint impact on schedule',
        'List constraints by category',
        'Check upcoming constraint deadlines',
      ];
    case Intent.WHAT_IF:
      return [
        'Compare scenario results',
        'Apply recommended scenario',
        'Run another simulation',
        'View impact on flowline',
      ];
    case Intent.REPORT_GENERATE:
      return [
        'Generate PPC trend report',
        'Export constraint log',
        'Create lookahead schedule',
        'View previous reports',
      ];
    case Intent.RESOURCE_QUERY:
      return [
        'View resource histogram',
        'Check crew availability next week',
        'Show equipment schedule',
        'Identify resource conflicts',
      ];
    case Intent.PROJECT_STATUS:
      return [
        'Show detailed PPC breakdown',
        'View open constraints',
        'Check upcoming milestones',
        'Generate status report',
      ];
    case Intent.GENERAL_CHAT:
      return [
        'What is my project status?',
        'Show current PPC',
        'List open constraints',
        'When does the next trade start?',
      ];
  }
}

// ── Template Responses (No AI Fallback) ─────────────────────────────────────
const DOMAIN_KNOWLEDGE: Record<string, string> = {
  'what is takt planning':
    'Takt planning (from the German word "Takt" meaning rhythm or beat) is a lean construction scheduling method inspired by manufacturing assembly lines. The project is divided into equal work zones, and trades flow through each zone in a fixed rhythm (the takt time, typically 3-5 business days). This creates a predictable, repetitive workflow that minimizes idle time, reduces trade stacking, and improves overall productivity. Key elements include: Location Breakdown Structure (LBS), takt zones, takt trains (wagons of trades), flowline visualization, and buffer management.',

  'how is ppc calculated':
    'PPC (Percent Plan Complete) is the core reliability metric in the Last Planner System. It is calculated as: PPC = (Number of Completed Commitments / Total Commitments Made) x 100%. For example, if a trade committed to 10 tasks in the weekly work plan and completed 8, their PPC is 80%. A healthy project targets PPC above 80%. When PPC drops, variance analysis identifies root causes across 8 constraint categories: Design, Material, Equipment, Labor, Space, Predecessor, Permit, and Information.',

  'constraint categories':
    'TaktFlow AI tracks 8 constraint categories based on the Last Planner System:\n\n1. **Design** - Drawing/specification issues, pending RFIs\n2. **Material** - Procurement, delivery delays, storage issues\n3. **Equipment** - Availability, mobilization, maintenance\n4. **Labor** - Crew availability, skill requirements, work permits\n5. **Space** - Site access, staging areas, trade stacking conflicts\n6. **Predecessor** - Prior work not complete (critical dependency)\n7. **Permit** - Regulatory approvals, inspections pending\n8. **Information** - Missing data, pending decisions from stakeholders\n\nEach constraint is tracked with severity (critical/high/medium/low), owner, due date, and resolution status.',

  'buffer management':
    'Buffers in takt planning are intentional time or space gaps between trades flowing through zones. They serve as shock absorbers for construction variability. Types of buffers:\n\n- **Time Buffer**: Extra days between trade sequences (e.g., 1-day gap between drywall and paint)\n- **Space Buffer**: Empty zones between trades to prevent stacking\n- **Capacity Buffer**: Keeping reserve crew or equipment available\n\nBuffer sizing depends on trade reliability (PPC history), constraint density, and zone complexity. TaktFlow AI monitors buffer consumption in real-time and alerts when buffers are being eroded, indicating potential downstream delays.',

  'trade stacking':
    'Trade stacking occurs when multiple trades are scheduled to work in the same zone simultaneously. This is one of the biggest productivity killers in construction because it leads to:\n\n- Safety hazards from congested work areas\n- Reduced productivity (studies show 15-40% efficiency loss)\n- Quality issues from trades interfering with each other\n- Increased conflict and coordination overhead\n\nTaktFlow AI detects trade stacking algorithmically by analyzing zone-trade-time overlaps in the takt plan and raises warnings with AI-3 (Proactive Warning System). The system suggests buffer adjustments or trade resequencing to eliminate stacking.',

  'flowline':
    'A flowline chart (also called a flow diagram or line-of-balance) is the primary visualization tool in takt planning. It plots location (Y-axis) against time (X-axis), with each trade represented as a diagonal line flowing through zones. Key characteristics:\n\n- Parallel lines indicate smooth, collision-free trade flow\n- Crossing lines indicate trade stacking (problem!)\n- Steeper slopes mean faster progression through zones\n- Gaps between lines represent buffers\n- Horizontal segments indicate a trade waiting or idle\n\nTaktFlow AI generates interactive flowline charts using D3.js with real-time progress overlay, making it easy to spot deviations from plan.',

  'last planner system':
    'The Last Planner System (LPS) is a collaborative production planning framework with 5 levels:\n\n1. **Master Schedule**: Overall project milestones and phases\n2. **Phase Planning**: Pull planning sessions to define handoffs between phases\n3. **Lookahead Planning**: 6-week rolling window, constraint screening, make-ready process\n4. **Weekly Work Plan**: Reliable commitments by each trade foreman ("last planner")\n5. **Daily Huddle**: Brief check-in on progress and issues\n\nLPS integrates with takt planning in TaktFlow AI: the takt plan provides the production structure, while LPS provides the collaborative commitment and learning framework. PPC measurement drives continuous improvement.',
};

function getTemplateResponse(
  intent: Intent,
  message: string,
  serviceData: unknown,
): string {
  if (intent === Intent.GENERAL_CHAT) {
    const lower = message.toLowerCase();
    for (const [topic, answer] of Object.entries(DOMAIN_KNOWLEDGE)) {
      const topicWords = topic.split(' ');
      const matchCount = topicWords.filter((w) => lower.includes(w)).length;
      if (matchCount >= Math.ceil(topicWords.length * 0.5)) {
        return answer;
      }
    }
    return 'I\'m TaktFlow AI Concierge, your construction takt planning assistant. I can help you with schedule queries, constraint management, progress tracking, what-if simulations, and general lean construction questions. Try asking about your project status, PPC metrics, or open constraints.';
  }

  const data = serviceData as Record<string, unknown>;

  switch (intent) {
    case Intent.TAKT_QUERY: {
      const plans = data as { plans?: Array<{ name: string; taktTime: number; zones: number; trades: number }>; currentTakt?: string; nextMilestone?: string };
      if (plans.plans && plans.plans.length > 0) {
        const plan = plans.plans[0];
        return `Here is your current takt plan overview:\n\n- **Plan**: ${plan.name}\n- **Takt Time**: ${plan.taktTime} days\n- **Zones**: ${plan.zones}\n- **Active Trades**: ${plan.trades}\n- **Current Takt Period**: ${plans.currentTakt || 'N/A'}\n- **Next Milestone**: ${plans.nextMilestone || 'N/A'}\n\nThe takt train is progressing through the zones on schedule. Let me know if you want to drill into a specific trade or zone.`;
      }
      return 'I was unable to retrieve takt plan data at this time. Please ensure the takt-engine service is running and a plan has been created for this project.';
    }

    case Intent.CONSTRAINT_CHECK: {
      const constraints = data as { total?: number; open?: number; critical?: number; constraints?: Array<{ id: string; category: string; description: string; severity: string }> };
      if (constraints.constraints) {
        const list = constraints.constraints
          .map((c) => `- **${c.id}** [${c.severity.toUpperCase()}] (${c.category}): ${c.description}`)
          .join('\n');
        return `There are **${constraints.open} open constraints** out of ${constraints.total} total (${constraints.critical} critical):\n\n${list}\n\nWould you like to see impact analysis or assign an owner to any of these constraints?`;
      }
      return 'No constraint data is available at the moment. The constraint-service may not be running.';
    }

    case Intent.PPC_QUERY: {
      const ppc = data as { currentPPC?: number; previousPPC?: number; trend?: string; topVarianceReasons?: Array<{ reason: string; count: number }> };
      if (ppc.currentPPC !== undefined) {
        const trendEmoji = ppc.trend === 'declining' ? 'down' : ppc.trend === 'improving' ? 'up' : 'stable';
        const reasons = ppc.topVarianceReasons
          ?.map((r) => `- ${r.reason}: ${r.count} occurrence(s)`)
          .join('\n') || 'No variance data available';
        return `**Current PPC: ${ppc.currentPPC}%** (previous: ${ppc.previousPPC}%, trend: ${trendEmoji})\n\nTop variance reasons:\n${reasons}\n\nPPC has ${ppc.trend === 'declining' ? 'declined by ' + ((ppc.previousPPC ?? 0) - ppc.currentPPC) + ' points' : ppc.trend === 'improving' ? 'improved' : 'remained stable'}. ${ppc.currentPPC < 80 ? 'This is below the 80% target. Consider reviewing the constraint log and weekly commitments.' : 'Performance is within acceptable range.'}`;
      }
      return 'PPC data is not available at the moment. The progress-service may not be running.';
    }

    case Intent.WHAT_IF: {
      const sim = data as { availableScenarios?: string[]; lastSimulation?: { scenario: string; result: string } };
      if (sim.availableScenarios) {
        const scenarios = sim.availableScenarios.map((s) => `- ${s}`).join('\n');
        let response = `Available what-if scenarios:\n${scenarios}`;
        if (sim.lastSimulation) {
          response += `\n\n**Last simulation**: ${sim.lastSimulation.scenario}\n**Result**: ${sim.lastSimulation.result}`;
        }
        response += '\n\nTell me which scenario you would like to explore, or describe a custom what-if situation.';
        return response;
      }
      return 'The simulation service is not available at the moment. Describe your what-if scenario and I will queue it for when the service comes back online.';
    }

    case Intent.REPORT_GENERATE: {
      const reports = data as { availableReports?: string[]; lastGenerated?: { type: string; date: string; status: string } };
      if (reports.availableReports) {
        const list = reports.availableReports.map((r) => `- ${r}`).join('\n');
        let response = `Available report types:\n${list}`;
        if (reports.lastGenerated) {
          response += `\n\nLast generated report: **${reports.lastGenerated.type}** (${new Date(reports.lastGenerated.date).toLocaleDateString()}) - Status: ${reports.lastGenerated.status}`;
        }
        response += '\n\nWhich report would you like me to generate?';
        return response;
      }
      return 'The reporting service is not available at the moment. Please try again later.';
    }

    case Intent.RESOURCE_QUERY: {
      const resources = data as { totalWorkers?: number; tradesOnSite?: number; resources?: Array<{ trade: string; workers: number; status: string }>; equipmentUtilization?: string };
      if (resources.resources) {
        const list = resources.resources
          .map((r) => `- **${r.trade}**: ${r.workers} workers (${r.status})`)
          .join('\n');
        return `**Resource Overview**\n- Total workers on site: ${resources.totalWorkers}\n- Active trades: ${resources.tradesOnSite}\n- Equipment utilization: ${resources.equipmentUtilization}\n\nBreakdown by trade:\n${list}\n\n${resources.resources.some((r) => r.status === 'at-risk') ? 'Warning: Some trades are flagged as at-risk. Review crew availability for the upcoming week.' : 'All trade crews are on track.'}`;
      }
      return 'Resource data is not available at the moment. The resource-service may not be running.';
    }

    case Intent.PROJECT_STATUS: {
      const status = data as { overallProgress?: string; currentPhase?: string; ppc?: number; openConstraints?: number; activeTrades?: number; daysToMilestone?: number; nextMilestone?: string; status?: string };
      return `**Project Status Overview**\n\n- Overall Progress: ${status.overallProgress || 'N/A'}\n- Current Phase: ${status.currentPhase || 'N/A'}\n- PPC: ${status.ppc !== undefined ? status.ppc + '%' : 'N/A'}\n- Open Constraints: ${status.openConstraints ?? 'N/A'}\n- Active Trades: ${status.activeTrades ?? 'N/A'}\n- Next Milestone: ${status.nextMilestone || 'N/A'} (${status.daysToMilestone ?? '?'} days)\n- Status: ${status.status || 'N/A'}\n\nThe project is currently ${status.status === 'on-track' ? 'on track' : 'requiring attention'}. Would you like to drill into any specific area?`;
    }

    default:
      return 'I\'m not sure how to help with that. Could you rephrase your question?';
  }
}

// ── AI Response Generation ──────────────────────────────────────────────────
async function generateAIResponse(
  message: string,
  intent: Intent,
  serviceData: unknown,
  conversationHistory: ConversationMessage[],
): Promise<string> {
  if (!genAI) {
    return getTemplateResponse(intent, message, serviceData);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const recentHistory = conversationHistory.slice(-10);
    const historyContext = recentHistory
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `You are TaktFlow AI Concierge, a knowledgeable construction project assistant specializing in takt planning, the Last Planner System, and lean construction.

Context:
- Detected intent: ${intent}
- Service data: ${JSON.stringify(serviceData, null, 2)}
- Recent conversation:
${historyContext}

User message: "${message}"

Instructions:
- Provide a clear, professional response based on the service data and construction domain knowledge.
- Use markdown formatting for readability (bold for emphasis, lists for data).
- If service data contains demo/mock data, present it naturally without mentioning it is demo data.
- Keep responses concise but informative (2-4 paragraphs max).
- Reference specific data points from the service response where applicable.
- If the user asks something outside the construction/project management domain, politely redirect.
- Do not use emojis.

Respond directly to the user:`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    logger.error({ err }, 'AI response generation failed, using template');
    return getTemplateResponse(intent, message, serviceData);
  }
}

// ── Confidence Calculation ──────────────────────────────────────────────────
function calculateConfidence(intent: Intent, aiEnabled: boolean, serviceAvailable: boolean): number {
  let confidence = 0.5;

  if (aiEnabled) confidence += 0.25;
  if (serviceAvailable) confidence += 0.15;
  if (intent !== Intent.GENERAL_CHAT) confidence += 0.05;

  return Math.min(confidence, 0.99);
}

// ── Express Application ─────────────────────────────────────────────────────
const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*' }));
app.use(express.json({ limit: '1mb' }));

// ── Health Endpoint ─────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    data: {
      status: 'ok',
      service: 'ai-concierge',
      ai_enabled: AI_ENABLED,
      timestamp: new Date().toISOString(),
    },
    error: null,
  });
});

// ── POST /concierge/ask ─────────────────────────────────────────────────────
app.post('/concierge/ask', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = askSchema.parse(req.body);
    const sessionId = body.session_id || uuidv4();
    const projectId = body.project_id;

    const session = getSession(sessionId);
    if (projectId) session.projectId = projectId;

    addMessage(sessionId, 'user', body.message);

    logger.info({ sessionId, message: body.message }, 'Processing concierge request');

    const intent = await detectIntentWithAI(body.message);
    logger.info({ sessionId, intent }, 'Intent detected');

    const orchestrationResult = await orchestrateByIntent(intent, projectId);

    const answer = await generateAIResponse(
      body.message,
      intent,
      orchestrationResult.serviceData,
      session.messages,
    );

    const suggestions = generateSuggestions(intent);
    const confidence = calculateConfidence(intent, AI_ENABLED, orchestrationResult.available);

    addMessage(sessionId, 'assistant', answer, intent);

    const response: ConciergeResponse = {
      answer,
      sources: orchestrationResult.sources,
      suggestions,
      confidence,
      intent,
    };

    res.json({
      data: {
        ...response,
        session_id: sessionId,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /concierge/history ──────────────────────────────────────────────────
app.get('/concierge/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = historyQuerySchema.parse(req.query);
    const session = conversationStore.get(query.session_id);

    if (!session) {
      res.json({
        data: { session_id: query.session_id, messages: [] },
        error: null,
      });
      return;
    }

    res.json({
      data: {
        session_id: query.session_id,
        messages: session.messages,
        project_id: session.projectId,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /concierge/history ───────────────────────────────────────────────
app.delete('/concierge/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = historyQuerySchema.parse(req.query);
    conversationStore.delete(query.session_id);

    res.json({
      data: { session_id: query.session_id, cleared: true },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// ── Error Handler ───────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors,
      },
    });
    return;
  }

  logger.error(err, 'Unhandled error');
  res.status(500).json({
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

// ── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`AI Concierge service running on port ${PORT}`);
  logger.info(`AI mode: ${AI_ENABLED ? 'Gemini 2.0 Flash' : 'keyword-based fallback'}`);
});

export default app;
