'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  X,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Shield,
  Lock,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useContractorPayments } from '@/hooks/useContractor';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { ContractorPayment } from '@vojas/api-client';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  APPROVED: 'info',
  RELEASED: 'success',
  UTILIZED: 'success',
  PENDING: 'neutral',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  RELEASED: 'Released',
  UTILIZED: 'Utilized',
};

const verificationVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  VERIFIED: 'success',
  UNDER_REVIEW: 'warning',
  REJECTED: 'danger',
  PENDING: 'neutral',
};

const verificationLabels: Record<string, string> = {
  PENDING: 'Pending Review',
  UNDER_REVIEW: 'Under Review',
  VERIFIED: 'VOJAS Verified',
  REJECTED: 'Rejected',
};

export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useContractorPayments({
    status: statusFilter || undefined,
    limit: 100,
  });

  const payments = data?.data ?? [];

  // Calculate totals
  const totalApproved = payments.reduce((sum, p) => sum + (p.approvedAmount || 0), 0);
  const totalReleased = payments.reduce((sum, p) => sum + (p.releasedAmount || 0), 0);
  const totalUtilized = payments.reduce((sum, p) => sum + (p.utilizedAmount || 0), 0);
  const verifiedCount = payments.filter((p) => p.vojasVerified).length;
  const eligibleCount = payments.filter((p) => p.paymentEligible).length;
  const authorizedCount = payments.filter((p) => p.authorizedPayment).length;

  // Group by status
  const pending = payments.filter((p) => p.status === 'PENDING');
  const approved = payments.filter((p) => p.status === 'APPROVED');
  const released = payments.filter((p) => p.status === 'RELEASED');
  const utilized = payments.filter((p) => p.status === 'UTILIZED');

  // Filter by search
  const filteredPayments = payments.filter((p) =>
    p.projectName.toLowerCase().includes(search.toLowerCase()) ||
    p.milestoneTitle?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">PAYMENT STATUS</h1>
        <p className="text-green-100 text-sm">
          Track your approved, released, and utilized payments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Approved"
          value={formatCurrency(totalApproved)}
          icon={<DollarSign className="h-5 w-5" />}
          color="blue"
        />
        <SummaryCard
          label="Total Released"
          value={formatCurrency(totalReleased)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
        <SummaryCard
          label="Total Utilized"
          value={formatCurrency(totalUtilized)}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="purple"
        />
        <SummaryCard
          label="Pending"
          value={formatCurrency(totalApproved - totalReleased)}
          icon={<Clock className="h-5 w-5" />}
          color="amber"
        />
      </div>

      {/* Verification Status */}
      <Card className="border-vojas-200">
        <CardHeader className="bg-slate-50">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-vojas-600" />
            <h3 className="font-semibold">VOJAS Verification Status</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <VerificationStatus
              label="VOJAS Verified"
              count={verifiedCount}
              total={payments.length}
              icon={<Shield className="h-4 w-4" />}
              color="green"
            />
            <VerificationStatus
              label="Payment Eligible"
              count={eligibleCount}
              total={payments.length}
              icon={<CheckCircle2 className="h-4 w-4" />}
              color="blue"
            />
            <VerificationStatus
              label="Authorized Payment"
              count={authorizedCount}
              total={payments.length}
              icon={<Lock className="h-4 w-4" />}
              color="purple"
            />
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> There is a clear distinction between <em>VOJAS VERIFICATION STATUS</em> (whether VOJAS has verified the milestone/payment) and <em>AUTHORIZED PAYMENT STATUS</em> (whether the payment has been authorized for release by the competent authority).
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search payments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="RELEASED">Released</option>
          <option value="UTILIZED">Utilized</option>
        </select>
        {statusFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter('')}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load payments'}
        </div>
      )}

      {/* Payment List */}
      {isLoading ? (
        <PaymentSkeleton />
      ) : filteredPayments.length > 0 ? (
        <div className="space-y-4">
          {/* Status Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <PaymentStatusCard status="PENDING" count={pending.length} />
            <PaymentStatusCard status="APPROVED" count={approved.length} />
            <PaymentStatusCard status="RELEASED" count={released.length} />
            <PaymentStatusCard status="UTILIZED" count={utilized.length} />
          </div>

          {/* Payment Items */}
          {filteredPayments.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No Payments Found</h3>
          <p className="text-sm">
            {search || statusFilter
              ? 'Try adjusting your search or filters.'
              : 'You have no payment records yet.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Components ─────────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'amber';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', colorClasses[color])}>{icon}</div>
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function VerificationStatus({
  label,
  count,
  total,
  icon,
  color,
}: {
  label: string;
  count: number;
  total: number;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'purple';
}) {
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
  };
  const bgClasses = {
    green: 'bg-green-50',
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
      <div className={cn('p-2 rounded-lg', bgClasses[color])}>
        {icon}
      </div>
      <div className={cn('text-2xl font-bold', colorClasses[color])}>
        {count}
        <span className="text-sm font-normal text-slate-500">/{total}</span>
      </div>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}

function PaymentStatusCard({ status, count }: { status: string; count: number }) {
  return (
    <Card className="text-center">
      <CardBody className="py-3">
        <Badge variant={statusVariant[status] ?? 'neutral'}>{count}</Badge>
        <p className="text-sm text-slate-600 mt-1">{statusLabels[status]}</p>
      </CardBody>
    </Card>
  );
}

function PaymentCard({ payment }: { payment: ContractorPayment }) {
  const isPending = payment.status === 'PENDING';
  const isEligible = payment.paymentEligible;

  return (
    <Card className={cn(isPending && 'border-l-4 border-l-amber-500')}>
      <CardBody>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Project Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900">{payment.projectName}</h3>
              <Badge variant={statusVariant[payment.status] ?? 'neutral'}>
                {statusLabels[payment.status]}
              </Badge>
            </div>
            {payment.milestoneTitle && (
              <p className="text-sm text-slate-600">{payment.milestoneTitle}</p>
            )}
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-3 gap-4 lg:gap-6">
            <div className="text-right">
              <p className="text-xs text-slate-500">Approved</p>
              <p className="font-semibold text-slate-900">
                {formatCurrency(payment.approvedAmount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Released</p>
              <p className={cn(
                'font-semibold',
                payment.releasedAmount > 0 ? 'text-green-600' : 'text-slate-400'
              )}>
                {formatCurrency(payment.releasedAmount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Utilized</p>
              <p className={cn(
                'font-semibold',
                payment.utilizedAmount > 0 ? 'text-vojas-600' : 'text-slate-400'
              )}>
                {formatCurrency(payment.utilizedAmount)}
              </p>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex flex-col gap-2 lg:items-end">
            <div className="flex gap-2">
              {/* VOJAS Verification */}
              <div className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                payment.vojasVerified
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-600'
              )}>
                <Shield className="h-3 w-3" />
                {payment.vojasVerified ? 'VOJAS Verified' : 'Not Verified'}
              </div>
              {/* Payment Eligible */}
              <div className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                isEligible
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
              )}>
                <CheckCircle2 className="h-3 w-3" />
                {isEligible ? 'Eligible' : 'Not Eligible'}
              </div>
              {/* Authorized */}
              <div className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                payment.authorizedPayment
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-slate-100 text-slate-600'
              )}>
                <Lock className="h-3 w-3" />
                {payment.authorizedPayment ? 'Authorized' : 'Not Authorized'}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {payment.dueDate && (
                <span>Due: {formatDate(payment.dueDate)}</span>
              )}
              {payment.releasedDate && (
                <span>Released: {formatDate(payment.releasedDate)}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500">Utilization Progress</span>
            <span className="text-slate-700">
              {payment.approvedAmount > 0
                ? Math.round((payment.utilizedAmount / payment.approvedAmount) * 100)
                : 0}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-vojas-500 rounded-full transition-all"
              style={{
                width: `${
                  payment.approvedAmount > 0
                    ? Math.round((payment.utilizedAmount / payment.approvedAmount) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Remarks */}
        {payment.remarks && (
          <div className="mt-3 p-2 bg-slate-50 rounded text-sm text-slate-600">
            {payment.remarks}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function PaymentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}
