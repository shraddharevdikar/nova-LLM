import React from 'react';
import { Sparkles, Brain, Globe, Code2, Bot, ArrowRight } from 'lucide-react';
import { AssistantMode } from '../types/index.ts';

interface LandingHeroProps {
  onSelectPrompt: (prompt: string, mode: AssistantMode) => void;
}

const STARTER_PROMPTS = [
  {
    icon: Globe,
    title: 'Deep Research',
    desc: 'Live Google Search citations',
    prompt: 'Research recent breakthroughs in solid-state battery technology and synthesize key commercial milestones with cited sources.',
    mode: 'research' as AssistantMode,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  {
    icon: Brain,
    title: 'Advanced Reasoning',
    desc: 'Rigorous step-by-step logic',
    prompt: 'Provide a rigorous proof of the Monty Hall problem, contrasting unconditional probabilities with Bayesian posterior updates.',
    mode: 'thinking' as AssistantMode,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  {
    icon: Code2,
    title: 'Software Engineering',
    desc: 'Clean code & sandbox runner',
    prompt: 'Write a TypeScript function that implements an LRU (Least Recently Used) cache with O(1) get and put operations, including unit tests.',
    mode: 'coding' as AssistantMode,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  {
    icon: Bot,
    title: 'Autonomous Agent',
    desc: 'Tool chaining & visual charts',
    prompt: 'Calculate the compound growth of an initial $15,000 investment at 8.2% annual return over 20 years with monthly compounding, and generate a comparison chart.',
    mode: 'agent' as AssistantMode,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  },
];

export const LandingHero: React.FC<LandingHeroProps> = ({ onSelectPrompt }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto space-y-8 select-none">
      {/* Brand Hero */}
      <div className="space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 shadow-xl shadow-indigo-500/20 mb-2">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-['Plus_Jakarta_Sans']">
          What can NovaMind help you with today?
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          Standalone AI platform powered by modern multi-model orchestration, deep reasoning, live search citations, sandboxed code execution, and persistent memory.
        </p>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {STARTER_PROMPTS.map((starter, idx) => {
          const Icon = starter.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(starter.prompt, starter.mode)}
              className="group p-4 bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all duration-150 flex flex-col justify-between cursor-pointer hover:shadow-lg hover:shadow-indigo-500/5 text-left"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl border ${starter.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {starter.title}
                  </div>
                  <div className="text-[11px] text-slate-400">{starter.desc}</div>
                </div>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2 mt-3 pt-2 border-t border-slate-800/80">
                "{starter.prompt}"
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
