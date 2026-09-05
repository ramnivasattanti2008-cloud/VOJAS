'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, AlertTriangle, MapPin, Mail, Phone, FileCheck } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useVendor } from '@/hooks/useVendors';
import { formatCurrency } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ACTIVE: 'success',
  BLACKLISTED: 'danger',
  INACTIVE: 'neutral',
  UNDER_REVIEW: 'warning',
};

const PROJECT_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  COMPLETED: 'success',
  IN_PROGRESS: 'info',
  CANCELLED: 'danger',
  PROPOSED: 'neutral',
  APPROVED: 'info',
  VERIFIED: 'success',
};

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: vendor, isLoading, error } = useVendor(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-100 rounded animate-pulse w-32" />
        <div className="h-8 bg-slate-100 rounded animate-pulse w-64" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="space-y-4">
        <Link href="/vendors">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Vendors
          </Button>
        </Link>
        <div className="px-4 py-8 text-center text-red-600">
          {error instanceof Error ? error.message : 'Failed to load vendor details'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/vendors">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to Vendors
        </Button>
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900">{vendor.name}</h1>
          <Badge variant={STATUS_VARIANT[vendor.status] ?? 'neutral'}>
            {vendor.status}
          </Badge>
          {vendor.flagged && (
            <Badge variant="danger">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              Flagged
            </Badge>
          )}
        </div>
        {(vendor.district || vendor.state) && (
          <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
            {[vendor.district, vendor.state].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-vojas-50 text-vojas-600">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {vendor.totalContracts}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">Total Contracts</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600">
              <span className="text-base font-bold">₹</span>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">
                {formatCurrency(vendor.totalValue)}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">Total Value</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              vendor.riskScore >= 70 ? 'bg-red-50 text-red-600' :
              vendor.riskScore >= 40 ? 'bg-amber-50 text-amber-600' :
              'bg-green-50 text-green-600'
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {vendor.riskScore ?? 0}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">Risk Score</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Vendor Details</h2>
        </div>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {vendor.udyamRegNo && (
            <div>
              <p className="text-slate-500 text-xs">Udyam Registration</p>
              <p className="font-medium text-slate-900">{vendor.udyamRegNo}</p>
            </div>
          )}
          {vendor.pan && (
            <div>
              <p className="text-slate-500 text-xs">PAN</p>
              <p className="font-medium text-slate-900">{vendor.pan}</p>
            </div>
          )}
          {vendor.gstin && (
            <div>
              <p className="text-slate-500 text-xs">GSTIN</p>
              <p className="font-medium text-slate-900">{vendor.gstin}</p>
            </div>
          )}
          {vendor.contactEmail && (
            <div>
              <p className="text-slate-500 text-xs">Email</p>
              <p className="font-medium text-slate-900 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <a href={`mailto:${vendor.contactEmail}`} className="hover:text-vojas-600">
                  {vendor.contactEmail}
                </a>
              </p>
            </div>
          )}
          {vendor.contactPhone && (
            <div>
              <p className="text-slate-500 text-xs">Phone</p>
              <p className="font-medium text-slate-900 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <a href={`tel:${vendor.contactPhone}`} className="hover:text-vojas-600">
                  {vendor.contactPhone}
                </a>
              </p>
            </div>
          )}
          <div>
            <p className="text-slate-500 text-xs">Registered</p>
            <p className="font-medium text-slate-900">
              {new Date(vendor.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Projects */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Recent Projects</h2>
        {vendor.projects && vendor.projects.length > 0 ? (
          <div className="space-y-3">
            {vendor.projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="hover:border-vojas-300 transition-colors cursor-pointer">
                  <CardBody className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.district ? `${p.district}, ` : ''}{p.state ?? ''}
                      </p>
                    </div>
                    <Badge variant={PROJECT_STATUS_VARIANT[p.status] ?? 'neutral'}>
                      {p.status}
                    </Badge>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardBody className="py-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <Building2 className="h-6 w-6" />
              No projects found for this vendor
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
