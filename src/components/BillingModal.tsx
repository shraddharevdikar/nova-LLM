import React, { useState } from 'react';
import { CreditCard, X, Check, Zap, Sparkles, Shield, Rocket } from 'lucide-react';
import { BillingOverview, PlanLimits } from '../types/index.ts';

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  billingOverview: BillingOverview | null;
  onUpgradePlan: (planId: string) => Promise<void>;
}

export const BillingModal: React.FC<BillingModalProps> = ({
  isOpen,
  onClose,
  billingOverview,
  onUpgradePlan,
}) => {
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);

  if (!isOpen || !billingOverview) return null;

  const currentPlan = billingOverview.plan;

  const handleSelectPlan = async (planId: string) => {
    if (planId === currentPlan.id) return;
    setUpgradingPlanId(planId);
    try {
      await onUpgradePlan(planId);
    } finally {
      setUpgradingPlanId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
                NovaMind Subscription & Usage Quotas
              </h2>
              <p className="text-xs text-slate-400">
                Transparent AI compute with advanced reasoning, tools, and sandboxed execution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Usage Banner */}
        <div className="bg-slate-950/70 border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-400">Current Plan: </span>
              <span className="font-bold text-indigo-400 uppercase tracking-wide">
                {currentPlan.name}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400">Messages Today: </span>
              <span className="font-mono text-white font-semibold">
                {billingOverview.stats.messagesToday} / {currentPlan.messagesPerDay}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400">Total Tokens: </span>
              <span className="font-mono text-emerald-400 font-semibold">
                {billingOverview.stats.totalTokens.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Est. Cost: ${billingOverview.stats.totalCostUsd.toFixed(4)}
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {billingOverview.allPlans.map((plan) => {
            const isCurrent = plan.id === currentPlan.id;
            const isUpgrading = upgradingPlanId === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-150 ${
                  isCurrent
                    ? 'bg-indigo-950/20 border-indigo-500/60 shadow-lg shadow-indigo-600/10'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    Current Plan
                  </div>
                )}

                <div>
                  <div className="text-sm font-bold text-white">{plan.name}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-white">${plan.priceMonthly}</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>

                  <div className="my-4 border-t border-slate-800" />

                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{plan.messagesPerDay.toLocaleString()} messages/day</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{plan.maxFilesPerDay} file uploads/day</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        Modes: {plan.allowedModes.map((m) => m.toUpperCase()).join(', ')}
                      </span>
                    </li>
                    {plan.supportsArtifacts && (
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Interactive Artifacts Canvas</span>
                      </li>
                    )}
                    {plan.supportsCodeExecution && (
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Sandboxed Code Execution</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isCurrent || isUpgrading}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-800 text-slate-400 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-98'
                    }`}
                  >
                    {isCurrent ? 'Active Plan' : isUpgrading ? 'Updating...' : `Switch to ${plan.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
