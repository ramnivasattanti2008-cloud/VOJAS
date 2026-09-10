'use client';

/**
 * M14 Admin: Role Management
 * Role permissions, permission matrix, audit trail
 */

import { useState } from 'react';
import {
  Lock, Shield, Users, Clock, ChevronRight, RefreshCw,
  AlertCircle, X, Eye, Save, CheckCircle,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn, formatDateTime } from '@/lib/utils';
import { useAdminRoles, useUpdateRole, useRoleAuditTrail, useRolePermissionsMatrix } from '@/hooks/useAdmin';

// Permission categories for display
const PERMISSION_CATEGORIES = [
  { key: 'projects', label: 'Projects', permissions: ['read', 'create', 'update', 'delete', 'verify'] },
  { key: 'anomalies', label: 'Anomalies', permissions: ['read', 'create', 'update', 'resolve', 'escalate'] },
  { key: 'reports', label: 'Reports', permissions: ['read', 'create', 'update', 'moderate', 'delete'] },
  { key: 'users', label: 'Users', permissions: ['read', 'create', 'update', 'delete', 'assign_role'] },
  { key: 'roles', label: 'Roles', permissions: ['read', 'create', 'update', 'delete'] },
  { key: 'data_sources', label: 'Data Sources', permissions: ['read', 'sync', 'create', 'update', 'delete'] },
  { key: 'rules', label: 'Rules', permissions: ['read', 'create', 'update', 'delete', 'toggle'] },
  { key: 'satellites', label: 'Satellites', permissions: ['read', 'analyze', 'retry'] },
  { key: 'health', label: 'Health', permissions: ['read', 'configure'] },
  { key: 'audit', label: 'Audit', permissions: ['read', 'export'] },
  { key: 'security', label: 'Security', permissions: ['read', 'manage'] },
];

// Default role permissions
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => `${c.key}:${p}`)),
  SUPER_ADMIN: PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => `${c.key}:${p}`)),
  OFFICER: [
    'projects:read', 'projects:create', 'projects:update', 'projects:verify',
    'anomalies:read', 'anomalies:create', 'anomalies:update', 'anomalies:resolve',
    'reports:read', 'reports:create', 'reports:update', 'reports:moderate',
    'satellites:read', 'satellites:analyze',
  ],
  ANALYST: [
    'projects:read',
    'anomalies:read', 'anomalies:create',
    'reports:read',
    'satellites:read', 'satellites:analyze',
  ],
  REVIEWER: [
    'projects:read',
    'anomalies:read', 'anomalies:update', 'anomalies:resolve',
    'reports:read', 'reports:moderate',
  ],
  MP: ['projects:read', 'anomalies:read', 'reports:read'],
  VIEWER: ['projects:read', 'anomalies:read', 'reports:read'],
};

export default function AdminRolesPage() {
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: roles, isLoading, refetch } = useAdminRoles();
  const { data: permissionsMatrix } = useRolePermissionsMatrix();
  const { data: auditTrail } = useRoleAuditTrail(selectedRole?.id ?? '');
  const updateMutation = useUpdateRole();

  const handleEditPermissions = (role: any) => {
    setSelectedRole(role);
    setEditingPermissions(role.permissions || DEFAULT_ROLE_PERMISSIONS[role.name] || []);
    setShowPermissionsModal(true);
    setHasChanges(false);
  };

  const handleViewAudit = (role: any) => {
    setSelectedRole(role);
    setShowAuditModal(true);
  };

  const togglePermission = (permission: string) => {
    setEditingPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
    setHasChanges(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedRole.id,
        data: { permissions: editingPermissions },
      });
      setShowPermissionsModal(false);
      setSelectedRole(null);
      setEditingPermissions([]);
      setHasChanges(false);
    } catch {
      setError('Failed to update permissions');
    }
  };

  const getRolePermissionCount = (role: any) => {
    return role.permissions?.length ?? DEFAULT_ROLE_PERMISSIONS[role.name]?.length ?? 0;
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Lock className="h-4 w-4" />
            <span>System Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Role Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure role permissions and access control
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="hover:text-red-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Roles Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardBody className="p-6">
                <div className="h-6 bg-slate-100 rounded animate-pulse w-1/3 mb-4" />
                <div className="h-4 bg-slate-50 rounded animate-pulse w-2/3" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles?.map((role) => (
            <Card key={role.id}>
              <CardBody>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-slate-500" />
                      <h3 className="font-semibold text-slate-900">{role.name}</h3>
                      {role.isSystem && (
                        <Badge variant="info" className="text-xs">System</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{role.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{role.userCount} users</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Lock className="h-4 w-4" />
                    <span>{getRolePermissionCount(role)} permissions</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditPermissions(role)}
                    leftIcon={<Lock className="h-3 w-3" />}
                  >
                    Edit Permissions
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewAudit(role)}
                    leftIcon={<Clock className="h-3 w-3" />}
                  >
                    Audit
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Permission Matrix Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800">Permission Matrix</h3>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2 font-medium text-slate-500 sticky left-0 bg-slate-50">Permission</th>
                {roles?.map((role) => (
                  <th key={role.id} className="text-center px-3 py-2 font-medium text-slate-500 min-w-[80px]">
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_CATEGORIES.map((category) => (
                <>
                  <tr key={`header-${category.key}`} className="bg-slate-100">
                    <td colSpan={(roles?.length ?? 0) + 1} className="px-4 py-1 font-semibold text-slate-700 sticky left-0 bg-slate-100">
                      {category.label}
                    </td>
                  </tr>
                  {category.permissions.map((perm) => (
                    <tr key={`${category.key}-${perm}`} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-600 font-medium sticky left-0 bg-white">
                        {category.key}:{perm}
                      </td>
                      {roles?.map((role) => {
                        const rolePerms = role.permissions || DEFAULT_ROLE_PERMISSIONS[role.name] || [];
                        const hasPermission = rolePerms.includes(`${category.key}:${perm}`);
                        return (
                          <td key={role.id} className="text-center px-3 py-2">
                            {hasPermission ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Edit Permissions Modal */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false);
          setSelectedRole(null);
          setEditingPermissions([]);
          setHasChanges(false);
        }}
        title={`Edit Permissions: ${selectedRole?.name}`}
        size="lg"
        footer={
          <div className="flex justify-between">
            <div className="text-sm text-slate-500">
              {editingPermissions.length} permissions assigned
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowPermissionsModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSavePermissions}
                isLoading={updateMutation.isPending}
                disabled={!hasChanges}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Changes
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {PERMISSION_CATEGORIES.map((category) => (
            <div key={category.key}>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">{category.label}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {category.permissions.map((perm) => {
                  const fullPerm = `${category.key}:${perm}`;
                  const isSelected = editingPermissions.includes(fullPerm);
                  return (
                    <button
                      key={perm}
                      onClick={() => togglePermission(fullPerm)}
                      className={cn(
                        'p-2 rounded-lg border text-left transition-colors text-sm',
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                        )}
                        <span className="capitalize">{perm}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {hasChanges && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              Changes will be logged in the audit trail. Previous permissions will be preserved in history.
            </p>
          </div>
        )}
      </Modal>

      {/* Role Audit Trail Modal */}
      <Modal
        isOpen={showAuditModal}
        onClose={() => {
          setShowAuditModal(false);
          setSelectedRole(null);
        }}
        title={`Audit Trail: ${selectedRole?.name}`}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setShowAuditModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          {!auditTrail || auditTrail.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No audit events for this role</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditTrail.map((event) => (
                <div key={event.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={event.action === 'CREATE' ? 'success' : event.action === 'DELETE' ? 'danger' : 'info'}>
                      {event.action}
                    </Badge>
                    <span className="text-xs text-slate-500">{formatDateTime(event.timestamp)}</span>
                  </div>
                  <div className="text-sm">
                    <p className="text-slate-700">
                      by <strong>{event.actorName}</strong>
                    </p>
                    {event.previousValue && event.newValue && (
                      <div className="mt-2 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Previous</p>
                          <pre className="text-xs bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                            {JSON.stringify(event.previousValue, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">New</p>
                          <pre className="text-xs bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                            {JSON.stringify(event.newValue, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
