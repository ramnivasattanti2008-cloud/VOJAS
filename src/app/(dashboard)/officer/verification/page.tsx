'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Search,
  Filter,
  X,
  ChevronRight,
  SortAsc,
  SortDesc,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  User,
  MapPin,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useOfficerCases } from '@/hooks/useOfficer';

// Priority bucket colors
const PRIORITY_BUCKETS = [
  { key: 'CRITICAL', label: 'Critical', color: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' },
  { key: 'HIGH', label: 'High', color: 'bg-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
  { key: 'MEDIUM', label: 'Medium', color: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  { key: 'LOW', label: 'Low', color: 'bg-slate-500', bgColor: 'bg-slate-50', textColor: 'text-slate-700' },
];

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  ASSIGNED: 'bg-purple-100 text-purple-700',
  UNDER_REVIEW: 'bg-indigo-100 text-indigo-700',
  VERIFICATION_REQUIRED: 'bg-orange-100 text-orange-700',
  RESOLVED: 'bg-green-100 text-green-700',
  DISMISSED: 'bg-slate-100 text-slate-700',
  ESCALATED: 'bg-red-100 text-red-700',
};

export default function VerificationQueuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get('priority') ?? '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') ?? '');
  const [assignedFilter, setAssignedFilter] = useState<string>('');
  const [sectorFilter, setSectorFilter] = useState<string>('');
  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [maxAge, setMaxAge] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'age' | 'priority' | 'confidence'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Build query params
  const queryParams = useMemo(() => ({
    priority: priorityFilter || undefined,
    status: statusFilter || undefined,
    assigned: assignedFilter || undefined,
    sector: sectorFilter || undefined,
    district: districtFilter || undefined,
    age: maxAge,
    sortBy,
    sortOrder,
    limit: 100,
  }), [priorityFilter, statusFilter, assignedFilter, sectorFilter, districtFilter, maxAge, sortBy, sortOrder]);

  const { data, isLoading, error } = useOfficerCases(queryParams);
  const cases = data?.data ?? [];

  // Filter by search
  const filteredCases = useMemo(() => {
    if (!search) return cases;
    const q = search.toLowerCase();
    return cases.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      c.reference?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.project?.name.toLowerCase().includes(q)
    );
  }, [cases, search]);

  // Group by priority buckets
  const groupedCases = useMemo(() => {
    const buckets: Record<string, typeof filteredCases> = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: [],
    };
    filteredCases.forEach((c) => {
      if (buckets[c.priority]) {
        buckets[c.priority].push(c);
      }
    });
    return buckets;
  }, [filteredCases]);

  const hasFilters = !!(priorityFilter || statusFilter || assignedFilter || sectorFilter || districtFilter || maxAge || search);

  const clearFilters = () => {
    setSearch('');
    setPriorityFilter('');
    setStatusFilter('');
    setAssignedFilter('');
    setSectorFilter('');
    setDistrictFilter('');
    setMaxAge(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-vojas-600" />
            Verification Command Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Review and act on cases requiring government oversight
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/officer">
            <Button variant="secondary" size="sm">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {PRIORITY_BUCKETS.map(({ key, label, color, bgColor, textColor }) => {
          const count = groupedCases[key]?.length ?? 0;
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-all ${priorityFilter === key ? 'ring-2 ring-vojas-500' : 'hover:border-vojas-300'}`}
              onClick={() => setPriorityFilter(priorityFilter === key ? '' : key)}
            >
              <CardBody className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <div>
                  <p className="text-xl font-bold text-slate-900">{isLoading ? '—' : count}</p>
                  <p className={`text-xs ${textColor}`}>{label}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
            />
          </div>

          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters((s) => !s)}
          >
            Filters
          </Button>

          <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => { setSortBy('age'); setSortOrder('asc'); }}
              className={`px-3 py-2 text-sm flex items-center gap-1 transition-colors ${sortBy === 'age' ? 'bg-vojas-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <Clock className="h-3 w-3" />
              Age
            </button>
            <button
              onClick={() => { setSortBy('priority'); setSortOrder('asc'); }}
              className={`px-3 py-2 text-sm flex items-center gap-1 border-l border-slate-200 transition-colors ${sortBy === 'priority' ? 'bg-vojas-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <AlertTriangle className="h-3 w-3" />
              Priority
            </button>
            <button
              onClick={() => { setSortBy('confidence'); setSortOrder('desc'); }}
              className={`px-3 py-2 text-sm flex items-center gap-1 border-l border-slate-200 transition-colors ${sortBy === 'confidence' ? 'bg-vojas-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <CheckCircle2 className="h-3 w-3" />
              Confidence
            </button>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              leftIcon={<X className="h-3 w-3" />}
            >
              Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <Card>
            <CardBody className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="NEW">New</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="VERIFICATION_REQUIRED">Verification Required</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="DISMISSED">Dismissed</option>
                  <option value="ESCALATED">Escalated</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Assigned Officer</label>
                <input
                  type="text"
                  placeholder="Filter by officer..."
                  value={assignedFilter}
                  onChange={(e) => setAssignedFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Sector</label>
                <input
                  type="text"
                  placeholder="Filter by sector..."
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Max Age (days)</label>
                <input
                  type="number"
                  placeholder="Any age"
                  value={maxAge ?? ''}
                  onChange={(e) => setMaxAge(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
                />
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load cases'}
        </div>
      )}

      {/* Case Queue by Priority */}
      <div className="space-y-6">
        {PRIORITY_BUCKETS.map(({ key, label, bgColor, textColor }) => {
          const bucketCases = groupedCases[key] ?? [];
          if (bucketCases.length === 0 && priorityFilter && priorityFilter !== key) return null;

          return (
            <Card key={key}>
              <CardHeader className="flex items-center justify-between bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${key === 'CRITICAL' ? 'bg-red-500' : key === 'HIGH' ? 'bg-orange-500' : key === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-500'}`} />
                  <h2 className="text-sm font-semibold text-slate-900">{label} Priority</h2>
                  <Badge variant="neutral">{bucketCases.length}</Badge>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-16 bg-slate-50 rounded animate-pulse" />
                    ))}
                  </div>
                ) : bucketCases.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    No cases in this priority bucket
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {bucketCases.map((c) => (
                      <Link
                        key={c.id}
                        href={`/officer/cases/${c.id}`}
                        className={`block px-4 py-3 hover:bg-slate-50 transition-colors ${selectedCaseId === c.id ? 'bg-vojas-50 border-l-2 border-vojas-500' : ''}`}
                        onClick={() => setSelectedCaseId(c.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-medium text-slate-900 truncate">{c.title}</span>
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-slate-100 text-slate-700'}`}>
                                {c.status.replace(/_/g, ' ')}
                              </span>
                              {c.confidence && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                  {c.confidence} confidence
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="font-mono flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {c.reference}
                              </span>
                              {c.project && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {c.project.name}
                                </span>
                              )}
                              {c.assignedTo && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {c.assignedTo.name}
                                </span>
                              )}
                              {c.age !== undefined && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {c.age} days
                                </span>
                              )}
                              {c.type && (
                                <Badge variant="neutral" className="text-xs">{c.type}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {c.evidenceCount !== undefined && (
                              <Badge variant="neutral" className="text-xs">
                                {c.evidenceCount} evidence
                              </Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {!isLoading && filteredCases.length === 0 && (
        <Card>
          <CardBody className="py-12 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-3 text-green-400" />
            <p className="text-sm font-semibold text-slate-600">No cases found</p>
            <p className="text-xs text-slate-400 mt-1">
              {hasFilters ? 'Try adjusting your filters' : 'All cases are up to date'}
            </p>
            {hasFilters && (
              <Button variant="secondary" size="sm" className="mt-3" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
