'use client';

import { Badge } from '@/components/ui/Badge';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import {
    AlertTriangle,
    ArrowRight,
    Building2,
    CheckCircle2,
    Database,
    FileCheck2,
    Info,
    Loader2,
    Mic,
    MicOff,
    Scale,
    Send,
    ShieldCheck,
    Sparkles,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { RTIDraftModal } from './RTIDraftModal';

export interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contextProjectId?: string;
  contextProjectName?: string;
}

const DEFAULT_SUGGESTIONS = [
  'Show projects delayed past target date',
  'Explain GFR 2017 Rule 139 fund absorption',
  'How do I file an evidence-backed citizen report?',
  'Which sectors have the highest utilization?',
];

const PROJECT_SUGGESTIONS = [
  'Verify sanctioned amount vs recorded expenditure',
  'Has Sentinel-2 observed surface construction change?',
  'Are any citizen grievances or anomalies logged?',
  'What are the recommended verification steps?',
];

export function AICopilotDrawer({
  isOpen,
  onClose,
  contextProjectId,
  contextProjectName,
}: AICopilotDrawerProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [showRtiModal, setShowRtiModal] = useState(false);

  const { messages, isLoading, sendMessage, clearMessages } = useAIAssistant(contextProjectId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Clean up speech recognition on unmount or drawer close
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  if (!isOpen) return null;

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Voice input not supported in this browser. Please use Chrome or Edge.');
      setTimeout(() => setSpeechError(null), 3500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Works for Indian English and Hindi transliteration

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setSpeechError(`Voice recognition: ${event.error}`);
          setTimeout(() => setSpeechError(null), 3000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }

    const q = textToSend || input;
    if (!q.trim() || isLoading) return;
    setInput('');
    await sendMessage(q, contextProjectId);
  };

  const suggestions = contextProjectId ? PROJECT_SUGGESTIONS : DEFAULT_SUGGESTIONS;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">VOJAS Civic AI Copilot</h2>
                  <Badge variant="neutral" className="text-[10px] uppercase tracking-wider font-semibold">
                    v4.2 Grounded
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evidence-grounded intelligence · Zero data fabrication
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Context Banner */}
          {contextProjectId && (
            <div className="bg-purple-50/80 border-b border-purple-100/90 px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-purple-900">
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="font-medium">Active Project:</span>
                <span className="font-semibold truncate">{contextProjectName || contextProjectId}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRtiModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all cursor-pointer"
                  title="Generate official Right to Information application"
                >
                  <Scale className="w-3 h-3" />
                  <span>Draft RTI (Sec 6)</span>
                </button>
                <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                  Attached
                </span>
              </div>
            </div>
          )}

          {/* Chat Transcript Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="py-6 space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100/80 text-purple-700 flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    How can VOJAS assist your civic inquiry?
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Ask questions about public works expenditure, Sentinel-2 spectral verification, project delays, or statutory GFR guidelines.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                    Suggested Inquiries
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(s)}
                        className="text-left p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 text-xs font-medium text-slate-700 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <span>{s}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-colors shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {/* Message Bubble */}
                  <div
                    className={`max-w-[92%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-purple-600 text-white rounded-br-xs shadow-xs'
                        : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-bl-xs shadow-2xs space-y-3'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>

                    {/* Structured Assistant Breakdown */}
                    {m.role === 'assistant' && m.responsePayload && (
                      <div className="space-y-2.5 pt-2.5 border-t border-slate-200/70 text-xs">
                        {/* Facts */}
                        {m.responsePayload.facts && m.responsePayload.facts.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ground Truth Facts
                            </span>
                            <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px]">
                              {m.responsePayload.facts.map((f, i) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Analysis */}
                        {m.responsePayload.analysis && m.responsePayload.analysis.length > 0 && (
                          <div className="space-y-1 bg-amber-50/60 p-2 rounded-lg border border-amber-100/70">
                            <span className="font-bold text-amber-800 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Analytical Findings
                            </span>
                            <ul className="list-disc pl-4 space-y-0.5 text-amber-900/90 text-[11px]">
                              {m.responsePayload.analysis.map((a, i) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Missing Data Disclaimers */}
                        {m.responsePayload.missingData && m.responsePayload.missingData.length > 0 && (
                          <div className="space-y-1 bg-slate-100/80 p-2 rounded-lg text-slate-600">
                            <span className="font-bold text-slate-700 flex items-center gap-1 text-[10px] uppercase tracking-wider">
                              <Info className="w-3 h-3 text-slate-500" /> Data Limitations
                            </span>
                            <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                              {m.responsePayload.missingData.map((d, i) => (
                                <li key={i}>{d}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommended Actions */}
                        {m.responsePayload.recommendedActions && m.responsePayload.recommendedActions.length > 0 && (
                          <div className="space-y-1.5 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100/70">
                            <span className="font-bold text-blue-800 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                              <FileCheck2 className="w-3 h-3 text-blue-600" /> Recommended Actions
                            </span>
                            <ul className="list-disc pl-4 space-y-0.5 text-blue-900 text-[11px]">
                              {m.responsePayload.recommendedActions.map((act, i) => (
                                <li key={i}>{act}</li>
                              ))}
                            </ul>

                            {contextProjectId && (
                              <div className="pt-1.5">
                                <button
                                  type="button"
                                  onClick={() => setShowRtiModal(true)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all cursor-pointer"
                                >
                                  <Scale className="w-3 h-3" />
                                  <span>Draft RTI Application for this Project</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Telemetry Footer */}
                        <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
                          <span className="flex items-center gap-1 font-mono">
                            <Database className="w-3 h-3" /> {m.responsePayload.modelUsed}
                          </span>
                          <span>Role: {m.responsePayload.roleContext}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 p-3 rounded-xl max-w-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span>Consulting official records & telemetry...</span>
              </div>
            )}
          </div>

          {/* Voice status banner */}
          {isListening && (
            <div className="bg-red-50 border-t border-red-200 px-4 py-1.5 flex items-center justify-between text-xs text-red-700 animate-pulse">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
                Listening to speech... Speak in Hindi or English
              </span>
              <button
                type="button"
                onClick={toggleListening}
                className="text-[11px] font-semibold underline text-red-800 hover:text-red-950"
              >
                Stop
              </button>
            </div>
          )}

          {speechError && (
            <div className="bg-amber-50 border-t border-amber-200 px-4 py-1.5 text-xs text-amber-800">
              {speechError}
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 sm:p-4 border-t border-slate-200 bg-white space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isListening
                    ? 'Listening... speak now'
                    : contextProjectId
                    ? 'Ask about this project (funds, satellite, risk)...'
                    : 'Ask about public works, delays, or sectors...'
                }
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs sm:text-sm placeholder:text-slate-400 disabled:opacity-60"
              />

              {/* Voice Microphone Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isListening
                    ? 'bg-red-500 text-white border-red-600 shadow-md ring-2 ring-red-300 animate-pulse'
                    : 'bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-600 border-slate-200 shadow-2xs'
                }`}
                title={isListening ? 'Stop listening' : 'Voice Input (Hindi/English)'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs sm:text-sm flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-2xs"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-slate-400">
                Grounded in official records · Zero AI hallucination
              </span>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearMessages}
                  className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Clear History
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 1-Click RTI Draft Modal */}
      {showRtiModal && (
        <RTIDraftModal
          isOpen={showRtiModal}
          onClose={() => setShowRtiModal(false)}
          projectDetails={{
            id: contextProjectId || 'VOJAS-PROJECT',
            name: contextProjectName || 'Public Infrastructure Work',
          }}
        />
      )}
    </div>
  );
}
