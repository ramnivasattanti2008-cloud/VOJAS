'use client';

import { useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, Building2, Flag, X } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ExportButton } from '@/components/ui/ExportButton';
import { useMPs } from '@/hooks/useMPs';

const HOUSE_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  LOK_SABHA: 'info',
  RAJYA_SABHA: 'warning',
  STATE_ASSEMBLY: 'success',
};

const HOUSE_LABEL: Record<string, string> = {
  LOK_SABHA: 'Lok Sabha',
  RAJYA_SABHA: 'Rajya Sabha',
  STATE_ASSEMBLY: 'State Assembly',
};

export default function MPsClient() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [house, setHouse] = useState('');

  const { data, isLoading, error } = useMPs({
    search: search || undefined,
    state: state || undefined,
    house: house || undefined,
    limit: 50,
  });

  const mps = data?.data ?? [];
  const total = data?.total ?? 0;

  const hasFilters = !!(state || house);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Members of Parliament</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? 'Loading…' : `${total} MPs found`}
          </p>
        </div>
        <ExportButton
          csvEndpoint={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/export/mps`}
          csvParams={{ state: state || undefined, house: house || undefined }}
          filenameHint="vojas-mps"
        />
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search by name or constituency..."
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            aria-label="Search MPs"
          />
        </div>
        <Input
          label="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="e.g. Karnataka"
          className="max-w-[200px]"
        />
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">House</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            value={house}
            onChange={(e) => setHouse(e.target.value)}
          >
            <option value="">All houses</option>
            <option value="LOK_SABHA">Lok Sabha</option>
            <option value="RAJYA_SABHA">Rajya Sabha</option>
            <option value="STATE_ASSEMBLY">State Assembly</option>
          </select>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setState('');
              setHouse('');
            }}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load MPs'}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="space-y-2">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
                <div className="h-3 bg-slate-50 rounded animate-pulse w-1/2" />
                <div className="h-3 bg-slate-50 rounded animate-pulse w-1/3" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : mps.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <Users className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No MPs found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mps
            .filter((m) =>
              search
                ? m.name.toLowerCase().includes(search.toLowerCase()) ||
                  m.constituency.toLowerCase().includes(search.toLowerCase())
                : true
            )
            .map((mp) => (
              <Card
                key={mp.id}
                className="cursor-pointer hover:border-vojas-300 transition-colors"
                onClick={() => router.push(`/mps/${mp.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/mps/${mp.id}`);
                  }
                }}
              >
                <CardBody>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 line-clamp-1">{mp.name}</h3>
                    <Badge variant={HOUSE_VARIANT[mp.house] ?? 'neutral'}>
                      {HOUSE_LABEL[mp.house] ?? mp.house}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-sm text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      <span className="line-clamp-1">{mp.constituency}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Flag className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      {mp.state}
                    </p>
                    {mp.party && (
                      <p className="text-xs text-slate-500">Party: {mp.party}</p>
                    )}
                  </div>
                  {mp._count && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs">
                      <span className="text-slate-500">Projects</span>
                      <span className="font-semibold text-slate-900">
                        {mp._count.projects}
                      </span>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
