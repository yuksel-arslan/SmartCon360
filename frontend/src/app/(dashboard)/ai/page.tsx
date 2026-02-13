'use client';

import TopBar from '@/components/layout/TopBar';
import { useState } from 'react';
import { Zap, Send, Sparkles } from 'lucide-react';

const sampleMessages = [
  { role: 'assistant' as const, content: 'Welcome to TaktFlow AI Concierge. I can help you with project insights, schedule analysis, and recommendations. What would you like to know?' },
  { role: 'user' as const, content: 'What is the current PPC trend?' },
  { role: 'assistant' as const, content: 'Your PPC has been trending upward over the last 8 weeks:\n\nW1: 78% → W8: 93% (+15%)\n\nThis is above the industry benchmark of 80%. The improvement is driven by better constraint management (CRR: 78%) and proactive scheduling by the Structure and MEP Rough trades.\n\nKey insight: Structure trade is consistently completing 2 days ahead, creating usable buffer for downstream trades.' },
];

const suggestions = [
  'Show me flowline conflicts',
  'What constraints are blocking Zone E?',
  'Compare planned vs actual progress',
  'Predict completion date',
];

export default function AIConciergePage() {
  const [messages] = useState(sampleMessages);
  const [input, setInput] = useState('');

  return (
    <>
      <TopBar title="AI Concierge" />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat messages */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${msg.role === 'user' ? '' : 'flex gap-3'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}>
                    <Zap size={13} className="text-white" />
                  </div>
                )}
                <div className="rounded-xl px-4 py-3" style={{
                  background: msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-bg-card)',
                  border: msg.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
                }}>
                  <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{
                    color: msg.role === 'user' ? 'white' : 'var(--color-text-secondary)',
                  }}>{msg.content}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Suggestions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {suggestions.map((s) => (
              <button key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-card)' }}>
                <Sparkles size={11} style={{ color: 'var(--color-purple)' }} />
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your project..."
              className="bg-transparent border-none outline-none text-sm flex-1"
              style={{ color: 'var(--color-text)' }}
            />
            <button className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}>
              <Send size={14} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
