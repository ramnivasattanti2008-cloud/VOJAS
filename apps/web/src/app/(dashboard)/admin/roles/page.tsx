'use client';

/**
 * M14 Admin: Role Management
 * Role permissions, permission matrix, audit trail
 */

import { useMemo, useState } from 'react';
import {
  Lock, Shield, Users, Clock, RefreshCw, CheckCircle,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/utils';
import { useAdminRoles, useRoleAuditTrail, useRolePermissionsMatrix } from '@/hooks/useAdmin';

export default function AdminRolesPage() {
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const { data: roles, isLoading, refetch } = useAdminRoles();
  const { data: permissionsMatrix } = useRolePermissionsMatrix();
  const { data: auditTrail } = useRoleAuditTrail(selectedRole?.id ?? '');

  // Every permission that appears on any role — real values from the
  // matrix actually enforced by requirePermission(), not an invented
  // taxonomy. Grouped by the segment before the first '.' (e.g.
  // "project.read.public" -> "project"), a real property of the string,
  // not a fabricated category.
  const allPermissions = useMemo(() => {
    const set = new Set<string>();
    Object.values(permissionsMatrix ?? {}).forEach((perms) => perms.forEach((p) => set.add(p)));
    return [...set].sort();
  }, [permissionsMatrix]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, string[]>();
    allPermissions.forEach((p) => {
      const category = p.split('.')[0];
      groups.set(category, [...(groups.get(category) ?? []), p]);
    });
    return [...groups.entries()];
  }, [allPermissions]);

  const handleViewPermissions = (role: any) => {
    setSelectedRole(role);
    setShowPermissionsModal(true);
  };

  const handleViewAudit = (role: any) => {
    setSelectedRole(role);
    setShowAuditModal(true);
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
                    <span>{role.permissions.length} permissions</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewPermissions(role)}
                    leftIcon={<Lock className="h-3 w-3" />}
                  >
                    View Permissions
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
              {groupedPermissions.map(([category, perms]) => (
                <>
                  <tr key={`header-${category}`} className="bg-slate-100">
                    <td colSpan={(roles?.length ?? 0) + 1} className="px-4 py-1 font-semibold text-slate-700 sticky left-0 bg-slate-100 capitalize">
                      {category}
                    </td>
                  </tr>
                  {perms.map((perm) => (
                    <tr key={perm} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-600 font-medium sticky left-0 bg-white">
                        {perm}
                      </td>
                      {roles?.map((role) => {
                        const hasPermission = role.permissions.includes(perm);
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
        }}
        title={`Permissions: ${selectedRole?.name}`}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setShowPermissionsModal(false)}>
            Close
          </Button>
        }
      >
        <p className="text-xs text-slate-500 mb-4">
          Role permissions are defined in code and enforced on every request.
          They cannot be changed from this screen.
        </p>
        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {groupedPermissions.map(([category, perms]) => {
            const rolePerms = selectedRole?.permissions ?? [];
            const granted = perms.filter((p) => rolePerms.includes(p));
            if (granted.length === 0) return null;
            return (
              <div key={category}>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 capitalize">{category}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {granted.map((perm) => (
                    <div
                      key={perm}
                      className="p-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {selectedRole && selectedRole.permissions.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">This role has no permissions.</p>
          )}
        </div>
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
