'use client';

import TopBar from '@/components/layout/TopBar';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Send, Sparkles, User, Bot, PanelRightOpen, PanelRightClose,
  Mic, Clock, Database, Brain, ChevronRight, Activity, AlertTriangle,
  TrendingUp, FileText, Play, Info, Copy, Check,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  confidence?: number;
  sources?: string[];
}

// ── Mock AI Responses ───────────────────────────────────
const MOCK_AI_RESPONSES: Record<string, { content: string; intent: string; confidence: number; sources: string[] }> = {
  'constraints': {
    content: `There are currently **3 open constraints** on the project:\n\n1. **MEP duct delivery delayed** (Critical)\n   - Trade: MEP Rough | Zone: Zone E\n   - Due: 2026-02-18\n   - Impact: Could delay T8 start by 2 days\n\n2. **Drywall crew shortage** (High)\n   - Trade: Drywall | Zone: Zone D\n   - Due: 2026-02-20\n   - Impact: May affect PPC for next week\n\n3. **RFI #042 -- ceiling detail revision** (Medium)\n   - Trade: Finishes | Zone: Zone C\n   - Due: 2026-02-25\n   - Impact: Low, does not affect current takt period\n\n**Recommendation:** Prioritize the MEP duct delivery -- contact supplier for expedited shipping. The drywall shortage can be mitigated by reallocating 2 crew members from the Structure trade, which is currently 2 days ahead.`,
    intent: 'CONSTRAINT_QUERY',
    confidence: 0.96,
    sources: ['constraint-service', 'takt-engine', 'resource-service'],
  },
  'ppc': {
    content: `**PPC Trend Analysis (Last 8 Weeks)**\n\n\`\`\`\nW1: 78% | ========\nW2: 80% | ========\nW3: 82% | ========\nW4: 79% | =======\nW5: 85% | ========\nW6: 88% | =========\nW7: 91% | =========\nW8: 93% | =========\n\`\`\`\n\n**Key findings:**\n- Overall trend: **+15% improvement** over 8 weeks\n- Current PPC (93%) is **above the 80% industry benchmark**\n- Week 4 dip was caused by material delivery delays affecting MEP Rough\n- Strongest performers: Structure (98% PPC), Flooring (95% PPC)\n- Needs attention: MEP Rough (87% PPC) -- constraint-related\n\n**Constraint Removal Rate:** 78% (trending upward)\n\nThe improvement is driven by proactive constraint management and the Structure trade consistently completing 2 days ahead, creating buffer for downstream trades.`,
    intent: 'PPC_QUERY',
    confidence: 0.98,
    sources: ['progress-service', 'analytics-service', 'takt-engine'],
  },
  'behind': {
    content: `**Trades Behind Schedule Analysis**\n\nBased on current flowline data and takt plan comparison:\n\n**1. MEP Rough** -- 1.5 days behind in Zone D\n   - Root cause: Material delivery delay (Constraint C1)\n   - Impact: Risk of stacking with Drywall in Zone E\n   - Mitigation: Expedite delivery + add overtime crew\n\n**2. Drywall** -- 0.5 days behind in Zone C\n   - Root cause: Crew shortage (Constraint C2)\n   - Impact: Minor -- buffer absorbs the delay\n   - Mitigation: Reallocate from Structure (ahead of schedule)\n\n**Trades On or Ahead:**\n- Structure: **+2 days ahead** (excellent)\n- MEP Finish: On schedule\n- Flooring: On schedule\n- Paint: On schedule\n- Finishes: On schedule\n\n**Recommendation:** Focus on the MEP Rough delay. If not resolved by T7, it will cause trade stacking with Drywall in Zone E, reducing productivity by an estimated 15-20%.`,
    intent: 'SCHEDULE_QUERY',
    confidence: 0.94,
    sources: ['takt-engine', 'flowline-service', 'constraint-service', 'analytics-service'],
  },
  'what-if': {
    content: `**What-If Simulation: Add 2 Crew to MEP**\n\nRunning simulation with parameters:\n- Current MEP crew size: 8 workers\n- Proposed: 10 workers (+25%)\n- Duration reduction factor: ~20%\n\n**Results:**\n\n| Metric | Current | With +2 Crew |\n|--------|---------|-------------|\n| MEP takt time | 5 days | 4 days |\n| Zone E completion | T9 | T8 |\n| Stacking risk | High (78%) | Low (12%) |\n| Cost impact | -- | +$4,200/week |\n| Schedule impact | -1.5 days | On schedule |\n\n**Analysis:**\n- Adding 2 crew members eliminates the current delay\n- Stacking risk with Drywall drops from 78% to 12%\n- ROI is positive: cost of delay ($12K) > crew cost ($4.2K)\n\n**Recommendation:** Approve the additional crew. Net savings of approximately $7,800 when accounting for avoided delay costs.`,
    intent: 'SIMULATION_QUERY',
    confidence: 0.91,
    sources: ['simulation-service', 'resource-service', 'takt-engine'],
  },
  'report': {
    content: `**Weekly Report Generation**\n\nI have queued a Weekly Progress Report for generation. Here is a preview of the key sections:\n\n**1. Executive Summary**\nHotel Sapphire project is 45% complete. PPC improved to 93% this week, up from 91%. All critical path activities are on track except MEP Rough (1.5 days behind).\n\n**2. Takt Progress**\n- Completed: Takt Periods T1-T4\n- In Progress: T5 (3 trades active)\n- Remaining: T6-T11\n\n**3. Constraint Status**\n- Open: 3 (1 critical, 1 high, 1 medium)\n- Resolved this week: 2\n- CRR: 78%\n\n**4. Recommendations**\n- Expedite MEP duct delivery\n- Reallocate drywall crew\n- Consider pulling MEP Finish forward\n\nThe full report will be available in the Reports section within 2 minutes. Would you like me to include any additional sections?`,
    intent: 'REPORT_GENERATION',
    confidence: 0.95,
    sources: ['reporting-service', 'progress-service', 'analytics-service'],
  },
  'default': {
    content: `I can help you with that. Based on the current project data for **Hotel Sapphire**:\n\n- **Overall Progress:** 45% complete\n- **Current Takt Period:** T5 of 11\n- **PPC:** 93% (above benchmark)\n- **Open Constraints:** 3 (1 critical)\n- **AI Health Score:** 87/100\n\nWould you like me to dive deeper into any specific area? I can analyze:\n- Schedule performance by trade\n- Constraint resolution priorities\n- Resource utilization\n- What-if scenarios\n\nJust ask, and I will provide detailed analysis with actionable recommendations.`,
    intent: 'GENERAL_QUERY',
    confidence: 0.89,
    sources: ['project-service', 'analytics-service'],
  },
};

function getAIResponse(message: string): { content: string; intent: string; confidence: number; sources: string[] } {
  const lower = message.toLowerCase();
  if (lower.includes('constraint') || lower.includes('blocking') || lower.includes('open constraint'))
    return MOCK_AI_RESPONSES['constraints'];
  if (lower.includes('ppc') || lower.includes('trend') || lower.includes('percent plan'))
    return MOCK_AI_RESPONSES['ppc'];
  if (lower.includes('behind') || lower.includes('late') || lower.includes('delay') || lower.includes('schedule'))
    return MOCK_AI_RESPONSES['behind'];
  if (lower.includes('what-if') || lower.includes('what if') || lower.includes('simulation') || lower.includes('add') && lower.includes('crew'))
    return MOCK_AI_RESPONSES['what-if'];
  if (lower.includes('report') || lower.includes('generate') || lower.includes('weekly'))
    return MOCK_AI_RESPONSES['report'];
  return MOCK_AI_RESPONSES['default'];
}

// ── Markdown-like renderer ──────────────────────────────
function renderMessageContent(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="rounded-lg p-3 my-2 overflow-x-auto text-[11px] leading-relaxed"
            style={{ background: 'var(--color-bg)', fontFamily: 'var(--font-mono)', color: 'var(--color-cyan)' }}>
            {codeLines.join('\n')}
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Table rows
    if (line.includes('|') && line.trim().startsWith('|')) {
      const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) continue; // separator row
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(cells);
      // Check if next line is not a table row
      if (i + 1 >= lines.length || !lines[i + 1].trim().startsWith('|')) {
        elements.push(
          <div key={`table-${i}`} className="my-2 overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ background: 'var(--color-bg)' }}>
                  {tableRows[0]?.map((cell, ci) => (
                    <th key={ci} className="px-3 py-2 text-left font-semibold border-b" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(1).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 border-b" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        inTable = false;
        tableRows = [];
      }
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={`br-${i}`} className="h-2" />);
      continue;
    }

    // Process inline formatting
    let formatted = line;
    // Bold
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;
    while ((match = boldRegex.exec(formatted)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`t-${i}-${lastIndex}`}>{formatted.slice(lastIndex, match.index)}</span>);
      }
      parts.push(<strong key={`b-${i}-${match.index}`} style={{ color: 'var(--color-text)', fontWeight: 700 }}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < formatted.length) {
      parts.push(<span key={`t-${i}-end`}>{formatted.slice(lastIndex)}</span>);
    }

    // Inline code
    const processInlineCode = (nodes: React.ReactNode[]): React.ReactNode[] => {
      return nodes.map((node, idx) => {
        if (typeof node !== 'string' && !(node as React.ReactElement)?.props?.children) return node;
        const text = typeof node === 'string' ? node : String((node as React.ReactElement)?.props?.children || '');
        if (!text.includes('`')) return node;
        const codeParts: React.ReactNode[] = [];
        const codeRegex = /`([^`]+)`/g;
        let cLastIdx = 0;
        let cMatch;
        while ((cMatch = codeRegex.exec(text)) !== null) {
          if (cMatch.index > cLastIdx) codeParts.push(text.slice(cLastIdx, cMatch.index));
          codeParts.push(
            <code key={`ic-${idx}-${cMatch.index}`} className="px-1.5 py-0.5 rounded text-[10px]"
              style={{ background: 'var(--color-bg)', fontFamily: 'var(--font-mono)', color: 'var(--color-cyan)' }}>
              {cMatch[1]}
            </code>
          );
          cLastIdx = cMatch.index + cMatch[0].length;
        }
        if (cLastIdx < text.length) codeParts.push(text.slice(cLastIdx));
        return codeParts.length > 0 ? <span key={`icc-${idx}`}>{codeParts}</span> : node;
      });
    };

    const finalParts = processInlineCode(parts.length > 0 ? parts : [formatted]);

    // Numbered lists
    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-2 pl-1 py-0.5">
          <span className="text-[11px] font-bold flex-shrink-0" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
            {line.match(/^(\d+\.)/)?.[1]}
          </span>
          <span className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{finalParts.length > 1 ? finalParts.slice(1) : finalParts}</span>
        </div>
      );
      continue;
    }

    // Bullet points
    if (line.startsWith('- ') || line.startsWith('  - ')) {
      const indent = line.startsWith('  ') ? 'pl-4' : 'pl-1';
      elements.push(
        <div key={`ul-${i}`} className={`flex gap-2 ${indent} py-0.5`}>
          <span className="text-[10px] mt-1 flex-shrink-0" style={{ color: 'var(--color-accent)' }}>&#9679;</span>
          <span className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{finalParts}</span>
        </div>
      );
      continue;
    }

    // Default paragraph
    elements.push(
      <p key={`p-${i}`} className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{finalParts}</p>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// ── Quick Actions ───────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'What are the open constraints?', icon: AlertTriangle },
  { label: 'Show PPC trend', icon: TrendingUp },
  { label: 'Which trades are behind?', icon: Activity },
  { label: 'Run what-if: add 2 crew to MEP', icon: Play },
  { label: 'Generate weekly report', icon: FileText },
];

const SUGGESTION_CHIPS = [
  'Show me flowline conflicts',
  'What constraints are blocking Zone E?',
  'Compare planned vs actual progress',
  'Predict completion date',
  'Analyze resource utilization',
  'Show stacking risk analysis',
];

// ── Initial messages ────────────────────────────────────
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content: 'Welcome to TaktFlow AI Concierge. I am your intelligent project assistant, powered by real-time data from all project services. I can analyze schedules, predict delays, run simulations, and provide actionable recommendations.\n\nHow can I help you today?',
    timestamp: new Date(Date.now() - 600000),
    intent: 'GREETING',
    confidence: 1.0,
    sources: ['ai-concierge'],
  },
  {
    id: 'user-1',
    role: 'user',
    content: "What's the current project status?",
    timestamp: new Date(Date.now() - 540000),
  },
  {
    id: 'ai-1',
    role: 'assistant',
    content: `Here is the current status for **Hotel Sapphire**:\n\n**Overall Progress:** 45% complete (on track)\n**Current Takt Period:** T5 of 11\n**PPC:** 93% (+5% from last week)\n**AI Health Score:** 87/100\n\n**Active Trades:**\n- Structure: Zone D (2 days ahead)\n- MEP Rough: Zone C (1.5 days behind)\n- Drywall: Zone B (0.5 days behind)\n\n**Open Constraints:** 3\n- 1 Critical: MEP duct delivery delayed\n- 1 High: Drywall crew shortage\n- 1 Medium: RFI #042 pending\n\n**Key Insight:** The Structure trade is performing exceptionally well, creating buffer that partially offsets the MEP delay. If the MEP constraint is resolved by T7, the overall schedule will not be impacted.`,
    timestamp: new Date(Date.now() - 500000),
    intent: 'STATUS_QUERY',
    confidence: 0.97,
    sources: ['project-service', 'takt-engine', 'constraint-service', 'analytics-service'],
  },
  {
    id: 'user-2',
    role: 'user',
    content: 'Which trades are behind schedule?',
    timestamp: new Date(Date.now() - 400000),
  },
  {
    id: 'ai-2',
    role: 'assistant',
    content: MOCK_AI_RESPONSES['behind'].content,
    timestamp: new Date(Date.now() - 360000),
    intent: MOCK_AI_RESPONSES['behind'].intent,
    confidence: MOCK_AI_RESPONSES['behind'].confidence,
    sources: MOCK_AI_RESPONSES['behind'].sources,
  },
];

// ── Typing Indicator Component ──────────────────────────
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex justify-start"
    >
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}>
          <Bot size={14} className="text-white" />
        </div>
        <div className="rounded-xl px-4 py-3 border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--color-accent)' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--color-accent)' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
            />
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--color-accent)' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────
export default function AIConciergePage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const MAX_CHARS = 2000;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSend = useCallback(async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Try real API first, fall back to mock
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/concierge/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      });

      if (res.ok) {
        const json = await res.json();
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: json.data?.response || json.data?.content || 'I received your message but could not generate a response.',
          timestamp: new Date(),
          intent: json.data?.intent,
          confidence: json.data?.confidence,
          sources: json.data?.sources,
        };
        setIsTyping(false);
        setMessages((prev) => [...prev, aiMessage]);
        return;
      }
    } catch {
      // Backend unavailable -- use mock
    }

    // Simulate AI response with delay
    setTimeout(() => {
      const response = getAIResponse(messageText);
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        intent: response.intent,
        confidence: response.confidence,
        sources: response.sources,
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, aiMessage]);
    }, 1200 + Math.random() * 800);
  }, [input, isTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <>
      <TopBar title="AI Concierge" />
      <div className="flex-1 flex overflow-hidden">
        {/* ── Main Chat Area ─────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="h-12 flex items-center justify-between px-4 border-b flex-shrink-0"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}>
                <Bot size={14} className="text-white" />
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>TaktFlow AI</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--color-success)' }}>Online -- Layer 2 (Gemini Enhanced)</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSidePanelOpen(!sidePanelOpen)}
              className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text-secondary)' }}
              title={sidePanelOpen ? 'Close panel' : 'Open panel'}
            >
              {sidePanelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            </button>
          </div>

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-auto px-4 py-4 space-y-4"
            style={{
              background: 'var(--color-bg)',
              backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(59,130,246,0.03) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139,92,246,0.03) 0%, transparent 50%)',
            }}
          >
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="flex gap-3 max-w-[80%] group">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}>
                        <Bot size={14} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="rounded-xl rounded-tl-sm px-4 py-3 border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                          {renderMessageContent(msg.content)}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 px-1">
                          <span className="text-[9px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {formatTime(msg.timestamp)}
                          </span>
                          {msg.intent && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                              style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                              {msg.intent}
                            </span>
                          )}
                          {msg.confidence !== undefined && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                              style={{ background: msg.confidence >= 0.9 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: msg.confidence >= 0.9 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                              {Math.round(msg.confidence * 100)}% conf
                            </span>
                          )}
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--color-text-muted)' }}
                            title="Copy message"
                          >
                            {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[70%]">
                      <div className="flex items-end gap-2">
                        <div className="rounded-xl rounded-br-sm px-4 py-3"
                          style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}>
                          <p className="text-[12px] leading-relaxed text-white whitespace-pre-line">{msg.content}</p>
                        </div>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mb-0.5"
                          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
                          <User size={13} style={{ color: 'var(--color-text-secondary)' }} />
                        </div>
                      </div>
                      <div className="flex justify-end mt-1 pr-9">
                        <span className="text-[9px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {isTyping && <TypingIndicator />}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          <div className="px-4 py-2 flex flex-wrap gap-2 border-t"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                disabled={isTyping}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-card)' }}
              >
                <Sparkles size={10} style={{ color: 'var(--color-purple)' }} />
                {chip}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="px-4 py-3 border-t flex-shrink-0"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
            <div className="flex items-end gap-3 px-4 py-3 rounded-xl border transition-colors"
              style={{ background: 'var(--color-bg-card)', borderColor: isTyping ? 'var(--color-border)' : 'var(--color-border)' }}>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:opacity-80"
                style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)' }}
                title="Voice input (coming soon)"
              >
                <Mic size={14} />
              </button>
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_CHARS) setInput(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your project..."
                  rows={1}
                  className="bg-transparent border-none outline-none text-sm w-full resize-none leading-relaxed"
                  style={{ color: 'var(--color-text)', maxHeight: '120px' }}
                  disabled={isTyping}
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[9px] tabular-nums" style={{ color: input.length > MAX_CHARS * 0.9 ? 'var(--color-warning)' : 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {input.length}/{MAX_CHARS}
                </span>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105 disabled:opacity-40 disabled:scale-100"
                  style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}
                >
                  <Send size={14} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Side Panel ─────────────────────────────── */}
        <AnimatePresence>
          {sidePanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="border-l overflow-hidden flex-shrink-0 hidden lg:block"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
            >
              <div className="w-80 h-full overflow-y-auto p-4 space-y-5">

                {/* Context Panel */}
                <div className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={13} style={{ color: 'var(--color-accent)' }} />
                    <h3 className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Current Context</h3>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Project</span>
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>Hotel Sapphire</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Status</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded"
                        style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--color-success)' }}>Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Progress</span>
                      <span className="text-[11px] font-bold" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>45%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>PPC</span>
                      <span className="text-[11px] font-bold" style={{ color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>93%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Takt Period</span>
                      <span className="text-[11px] font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>T5 / T11</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>AI Score</span>
                      <span className="text-[11px] font-bold" style={{ color: 'var(--color-purple)', fontFamily: 'var(--font-mono)' }}>87</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={13} style={{ color: 'var(--color-purple)' }} />
                    <h3 className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Quick Actions</h3>
                  </div>
                  <div className="space-y-1.5">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => handleSend(action.label)}
                        disabled={isTyping}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all hover:scale-[1.01] disabled:opacity-50"
                        style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-secondary)' }}
                      >
                        <action.icon size={13} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                        <span className="text-[11px] font-medium leading-tight">{action.label}</span>
                        <ChevronRight size={11} className="ml-auto flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sources Panel */}
                <div className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Database size={13} style={{ color: 'var(--color-cyan)' }} />
                    <h3 className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Sources Queried</h3>
                  </div>
                  {(() => {
                    const lastAI = [...messages].reverse().find((m) => m.role === 'assistant' && m.sources);
                    if (!lastAI?.sources) return (
                      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>No sources yet. Ask a question to see which services are queried.</p>
                    );
                    return (
                      <div className="space-y-1.5">
                        {lastAI.sources.map((src) => (
                          <div key={src} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                            style={{ background: 'var(--color-bg-input)' }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
                            <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{src}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* AI Capabilities */}
                <div className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Brain size={13} style={{ color: 'var(--color-warning)' }} />
                    <h3 className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Capabilities</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Schedule Analysis', desc: 'Takt, flowline, trade status' },
                      { label: 'Constraint Intelligence', desc: 'Detection, prioritization, resolution' },
                      { label: 'What-If Simulation', desc: 'Scenario analysis with predictions' },
                      { label: 'Report Generation', desc: 'Weekly, executive, variance reports' },
                      { label: 'Resource Optimization', desc: 'Crew, equipment, material advice' },
                    ].map((cap) => (
                      <div key={cap.label} className="flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--color-accent)' }} />
                        <div>
                          <div className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>{cap.label}</div>
                          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{cap.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session Info */}
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Clock size={11} style={{ color: 'var(--color-text-muted)' }} />
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      Session: {messages.length} messages
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
