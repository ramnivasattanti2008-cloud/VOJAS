'use client';

import { useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, AlertTriangle, MapPin, X } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ExportButton } from '@/components/ui/ExportButton';
import { useVendors } from '@/hooks/useVendors';
import { formatCurrency } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ACTIVE: 'success',
  BLACKLISTED: 'danger',
  INACTIVE: 'neutral',
  UNDER_REVIEW: 'warning',
};

export default function VendorsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading, error } = useVendors({
    search: search || undefined,
    state: state || undefined,
    status: status || undefined,
    limit: 50,
  });

  const vendors = data?.data ?? [];
  const total = data?.total ?? 0;

  const hasFilters = !!(state || status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? 'Loading…' : `${total} vendors found`}
          </p>
        </div>
        <ExportButton
          csvEndpoint={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/export/vendors`}
          csvParams={{ state: state || undefined, status: status || undefined }}
          filenameHint="vojas-vendors"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search vendors..."
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            aria-label="Search vendors"
          />
        </div>
        <Input
          label="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="e.g. Maharashtra"
          className="max-w-[180px]"
        />
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Status</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="BLACKLISTED">Blacklisted</option>
            <option value="INACTIVE">Inactive</option>
            <option value="UNDER_REVIEW">Under Review</option>
          </select>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setState('');
              setStatus('');
            }}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load vendors'}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="space-y-2">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-1/3" />
                <div className="h-3 bg-slate-50 rounded animate-pulse w-1/2" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <Building2 className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No vendors found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {vendors.map((v) => (
            <Card
              key={v.id}
              className="cursor-pointer hover:border-vojas-300 transition-colors"
              onClick={() => router.push(`/vendors/${v.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/vendors/${v.id}`);
                }
              }}
            >
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{v.name}</h3>
                      <Badge variant={STATUS_VARIANT[v.status] ?? 'neutral'}>
                        {v.status}
                      </Badge>
                      {v.flagged && (
                        <Badge variant="danger">
                          <AlertTriangle className="h-3 w-3 mr-0.5" />
                          Flagged
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      {v.district && v.state && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {v.district}, {v.state}
                        </span>
                      )}
                      {v.udyamRegNo && <span>Udyam: {v.udyamRegNo}</span>}
                      {v.pan && <span>PAN: {v.pan}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(v.totalValue)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {v.totalContracts} contracts
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
