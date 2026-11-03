import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Users, MessageSquare, Zap, Activity, RefreshCw } from 'lucide-react';
import { getAdminOverview } from '../services/api.ts';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs'>('overview');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getAdminOverview();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">NovaMind Platform Administration</h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                  SYSTEM ROOT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live AI model telemetry, tenant isolation, and cluster health
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Refresh metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 px-6 pt-2 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'overview'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            System Telemetry & Models
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'users'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Tenants & Users ({data?.users?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'logs'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Audit Logs ({data?.auditLogs?.length || 0})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && data && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <div className="text-xs text-slate-400">Total Users</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {data.metrics.totalUsers}
                  </div>
                </div>
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <div className="text-xs text-slate-400">Conversations</div>
                  <div className="text-2xl font-bold text-indigo-400 mt-1">
                    {data.metrics.totalConversations}
                  </div>
                </div>
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <div className="text-xs text-slate-400">Total Tokens</div>
                  <div className="text-2xl font-bold text-purple-400 mt-1 font-mono">
                    {data.metrics.totalTokens.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <div className="text-xs text-slate-400">Est. API Cost</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                    ${data.metrics.totalCostUsd.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Models Orchestration Table */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  Active Model Adapters
                </div>
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                      <tr>
                        <th className="p-3">Model Engine</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Average Latency</th>
                        <th className="p-3">Supported Modes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {data.activeModels?.map((m: any) => (
                        <tr key={m.id} className="hover:bg-slate-900/30">
                          <td className="p-3 font-mono font-medium text-white">{m.name}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {m.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-300">{m.latencyMs}ms</td>
                          <td className="p-3 text-slate-400">Thinking, Search, Tools, Multimodal</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && data && (
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {data.users?.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-900/30">
                      <td className="p-3 font-medium text-white">{u.name}</td>
                      <td className="p-3 text-slate-400 font-mono">{u.email}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {u.plan}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-[11px] font-semibold text-slate-300 capitalize">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'logs' && data && (
            <div className="space-y-2">
              {data.auditLogs?.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono text-rose-400 font-semibold">
                      [{log.action}]
                    </span>
                    <p className="text-slate-300">{log.details}</p>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono shrink-0 ml-4">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
