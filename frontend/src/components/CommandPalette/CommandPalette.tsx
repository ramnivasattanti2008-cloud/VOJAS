import { useState, useEffect, useRef, useCallback, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FileText,
  MapPin,
  ShieldAlert,
  Bell,
  BarChart2,
  Settings,
  LayoutDashboard,
  AlertTriangle,
  ArrowRight,
  Command,
  X,
} from "lucide-react";
import { api } from "@/services/api";
import type { Project } from "@/types";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "project" | "route" | "location" | "anomaly";
  title: string;
  subtitle?: string;
  path: string;
  icon: React.ElementType;
  accent?: string;
}

const QUICK_ACTIONS: SearchResult[] = [
  { id: "route-dashboard",  type: "route", title: "Go to Command Center", subtitle: "Overview & intelligence", path: "/",          icon: LayoutDashboard, accent: "text-electric-400" },
  { id: "route-projects",  type: "route", title: "Go to Projects",       subtitle: "Project registry",      path: "/projects",      icon: FileText,        accent: "text-electric-400" },
  { id: "route-map",       type: "route", title: "Go to Map View",      subtitle: "Geographic analysis",    path: "/map",           icon: MapPin,          accent: "text-electric-400" },
  { id: "route-risk",      type: "route", title: "Go to Risk Dashboard", subtitle: "Risk intelligence",     path: "/risk",           icon: ShieldAlert,     accent: "text-electric-400" },
  { id: "route-anomalies", type: "route", title: "Go to Anomalies",     subtitle: "Detection alerts",       path: "/anomalies",      icon: AlertTriangle,    accent: "text-saffron-400" },
  { id: "route-reports",   type: "route", title: "Go to Reports",       subtitle: "Citizen submissions",    path: "/reports",        icon: Bell,            accent: "text-blue-400" },
  { id: "route-analytics", type: "route", title: "Go to Analytics",     subtitle: "Statistical insights",   path: "/analytics",      icon: BarChart2,       accent: "text-purple-400" },
  { id: "route-settings",  type: "route", title: "Go to Settings",     subtitle: "App configuration",     path: "/settings",       icon: Settings,        accent: "text-slate-400" },
];

const TYPE_COLORS: Record<string, string> = {
  project:  "text-electric-400",
  route:    "text-slate-400",
  location: "text-blue-400",
  anomaly:  "text-saffron-400",
};

const TYPE_BG: Record<string, string> = {
  project:  "bg-electric-500/10",
  route:    "bg-slate-500/10",
  location: "bg-blue-500/10",
  anomaly:  "bg-saffron-500/10",
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search projects when query changes
  const searchProjects = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await api.get<{ items: Project[]; total: number }>(`/projects?search=${encodeURIComponent(q)}&limit=6`);
      const projectResults: SearchResult[] = data.items.map((p) => ({
        id: p.id,
        type: "project" as const,
        title: p.name,
        subtitle: `${p.district}, ${p.state} · ${p.status}`,
        path: `/projects/${p.id}`,
        icon: FileText,
      }));
      setResults(projectResults);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchProjects(query), 250);
    return () => clearTimeout(timer);
  }, [query, searchProjects]);

  // Combined results (quick actions + project matches)
  const allResults: SearchResult[] = query.trim()
    ? results.length > 0 ? results : []
    : QUICK_ACTIONS;

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allResults[selected]) {
        navigate(allResults[selected].path);
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  }, [allResults, selected, navigate, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selected] as HTMLElement;
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="command-palette-backdrop"
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            className="command-palette-panel"
            id="command-palette-panel"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={handleKeyDown}
            aria-labelledby="command-palette-title"
          >
            {/* Screen-reader title */}
            <span id="command-palette-title" className="sr-only">Command Palette — search projects and navigate</span>

            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
              <Search className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                placeholder="Search projects, locations, or type a command…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
                aria-label="Search commands"
                aria-expanded={open}
                aria-autocomplete="list"
                aria-controls="command-listbox"
              />
              {loading && (
                <div className="w-4 h-4 border-2 border-electric-500/30 border-t-electric-400 rounded-full animate-spin shrink-0" />
              )}
              <button
                onClick={onClose}
                className="shrink-0 text-slate-500 hover:text-white transition-colors"
                aria-label="Close command palette"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div ref={listRef} id="command-listbox" className="max-h-[360px] overflow-y-auto py-2" role="listbox" aria-label="Available commands">
              {allResults.length === 0 && query.trim() && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Search className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500">No results for &ldquo;{query}&rdquo;</p>
                  <p className="text-xs text-slate-600 mt-1">Try a different search term</p>
                </div>
              )}

              {!query.trim() && (
                <div>
                  <p className="px-5 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                    Quick Actions
                  </p>
                  {allResults.map((result, i) => (
                    <ResultItem
                      key={result.id}
                      result={result}
                      selected={selected === i}
                      onHover={() => setSelected(i)}
                      onSelect={() => handleSelect(result)}
                    />
                  ))}
                </div>
              )}

              {query.trim() && allResults.length > 0 && (
                <div>
                  {allResults.map((result, i) => (
                    <ResultItem
                      key={result.id}
                      result={result}
                      selected={selected === i}
                      onHover={() => setSelected(i)}
                      onSelect={() => handleSelect(result)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 px-5 py-3 border-t border-white/5 text-[10px] text-slate-600">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 font-mono">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 font-mono">↵</kbd>
                Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 font-mono">Esc</kbd>
                Close
              </span>
              <span className="ml-auto flex items-center gap-1 text-slate-700">
                <Command className="w-3 h-3" />
                K to toggle
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ResultItem({
  result,
  selected,
  onHover,
  onSelect,
}: {
  result: SearchResult;
  selected: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const Icon = result.icon as ComponentType<{ className?: string }>;
  const iconClass: string = cn("w-4 h-4", TYPE_COLORS[result.type]);
  return (
    <button
      role="option"
      aria-selected={selected}
      onMouseEnter={onHover}
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 px-5 py-3 text-left transition-colors group",
        selected
          ? "bg-electric-500/10"
          : "hover:bg-white/5"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
          TYPE_BG[result.type],
          selected ? "bg-electric-500/15" : ""
        )}
      >
        <Icon className={iconClass} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate transition-colors",
          selected ? "text-white" : "text-slate-300 group-hover:text-white"
        )}>
          {result.title}
        </p>
        {result.subtitle && (
          <p className="text-[11px] text-slate-600 truncate mt-0.5">{result.subtitle}</p>
        )}
      </div>
      <ArrowRight className={cn(
        "w-3.5 h-3.5 shrink-0 transition-all",
        selected ? "text-electric-400 translate-x-1" : "text-slate-700"
      )} aria-hidden="true" />
    </button>
  );
}
