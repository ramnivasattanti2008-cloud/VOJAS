'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  Sparkles,
  Search,
  Send,
  X,
  Loader2,
  ArrowRight,
  MapPin,
  Satellite,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

interface AskResponse {
  answer: string;
  projects: Array<{
    id: string;
    name: string;
    state?: string;
    district?: string;
    approvedAmount: number;
    spentAmount: number;
    status: string;
    sector: string;
    latitude?: number | null;
    longitude?: number | null;
  }>;
  totalCount?: number;
  insights?: string[];
  evidenceCitations?: string[];
  suggestedQueries?: string[];
}

const SAMPLE_QUESTIONS = [
  'Show road construction projects in Gujarat with verified coordinates',
  'What are the drinking water projects in Odisha?',
  'Which public works have satellite observations recorded?',
  'Show projects with spending higher than 50 Lakhs in Bihar',
  'Find completed healthcare projects in Tamil Nadu',
];

export function CivicAICopilot({
  contextProjectId,
  className,
}: {
  contextProjectId?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);

  const handleAsk = async (qText?: string) => {
    const textToAsk = qText ?? query;
    if (!textToAsk.trim() || loading) return;

    setLoading(true);
    if (qText) setQuery(qText);

    try {
      const res = await apiClient.post<AskResponse>('/ai/ask', {
        query: textToAsk,
        context: contextProjectId ? { projectId: contextProjectId } : undefined,
      });
      setResult(res);
    } catch (err) {
      console.error('AI ask failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 border border-blue-400/30 group',
          className
        )}
        aria-label="Ask VOJAS AI"
      >
        <div className="p-1 rounded-full bg-white/20">
          <Sparkles className="h-4 w-4 animate-pulse text-amber-300" />
        </div>
        <span className="text-sm font-bold tracking-tight">Ask VOJAS AI</span>
        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-bold uppercase tracking-wider">
          Evidence Copilot
        </span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">VOJAS Civic AI</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                      Zero Fabricated Data
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Query MPLADS financial records, Sentinel-2 spectral observations & citizen evidence
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 max-h-[60vh]">
              {/* Sample Queries (when no result yet) */}
              {!result && !loading && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Try Asking About:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {SAMPLE_QUESTIONS.map((sample, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleAsk(sample)}
                        className="text-left px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-xl transition-colors flex items-center justify-between group"
                      >
                        <span>{sample}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading Spinner */}
              {loading && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                  <p className="text-sm font-semibold text-slate-700">Synthesizing Official Records & Satellite Data…</p>
                  <p className="text-xs text-slate-400">Querying 71,906 projects and Sentinel-2 satellite passes</p>
                </div>
              )}

              {/* Result View */}
              {result && !loading && (
                <div className="space-y-4">
                  {/* Synthesis Answer */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed space-y-2 whitespace-pre-wrap">
                    {result.answer}
                  </div>

                  {/* Matched Projects Carousel / List */}
                  {result.projects && result.projects.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        CITED PROJECT DOSSIERS ({result.projects.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {result.projects.map((p) => (
                          <div
                            key={p.id}
                            className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors flex flex-col justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                  {p.status}
                                </span>
                                {p.latitude != null && (
                                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                                    <Satellite className="h-3 w-3" /> Mapped
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-900 line-clamp-2">{p.name}</p>
                              <p className="text-[11px] text-slate-500 mt-1">
                                {p.district}, {p.state} • {formatCurrency(p.approvedAmount)}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <Link
                                href={`/explore/${p.id}`}
                                onClick={() => setIsOpen(false)}
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                              >
                                View Dossier <ExternalLink className="h-3 w-3" />
                              </Link>
                              {p.latitude != null && (
                                <Link
                                  href={`/explore/map?focus=${p.id}`}
                                  onClick={() => setIsOpen(false)}
                                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
                                >
                                  View on Map
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evidence Citations */}
                  {result.evidenceCitations && result.evidenceCitations.length > 0 && (
                    <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        Verified Sources & Evidence Citations
                      </p>
                      <ul className="list-disc pl-4 space-y-0.5 text-emerald-800">
                        {result.evidenceCitations.map((cit, i) => (
                          <li key={i}>{cit}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Query Input Bar */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAsk();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask anything about projects, budgets, or satellite verification…"
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
