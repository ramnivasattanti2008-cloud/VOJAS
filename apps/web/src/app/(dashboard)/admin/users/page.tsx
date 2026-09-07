'use client';

/**
 * M14 Admin: User Management
 * User list, role assignment, access history
 */

import { useState } from 'react';
import {
  Users, Search, Plus, Eye, Shield, UserX, Key, Clock,
  AlertCircle, X, ChevronRight, RefreshCw, MoreVertical,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn, formatDateTime } from '@/lib/utils';
import { useAdminUsers, useCreateUser, useUpdateUser, useDeleteUser, useUserAccessHistory } from '@/hooks/useAdmin';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-50 text-red-700 border-red-200',
  SUPER_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  OFFICER: 'bg-blue-50 text-blue-700 border-blue-200',
  ANALYST: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  REVIEWER: 'bg-teal-50 text-teal-700 border-teal-200',
  MP: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  CONTRACTOR: 'bg-amber-50 text-amber-700 border-amber-200',
  CITIZEN: 'bg-green-50 text-green-700 border-green-200',
  FIELD_OFFICER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VIEWER: 'bg-slate-50 text-slate-700 border-slate-200',
};

const ROLES = ['ADMIN', 'SUPER_ADMIN', 'OFFICER', 'ANALYST', 'REVIEWER', 'MP', 'CONTRACTOR', 'CITIZEN', 'FIELD_OFFICER', 'VIEWER'];

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', email: '', role: 'VIEWER', password: '' });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useAdminUsers({
    page: 1,
    limit: 50,
    search: search || undefined,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
  });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const users = data?.users ?? [];
  const pagination = data?.pagination;

  const handleCreateUser = async () => {
    if (!createForm.name || !createForm.email) {
      setError('Name and email are required');
      return;
    }
    try {
      await createMutation.mutateAsync(createForm);
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', role: 'VIEWER', password: '' });
      setError(null);
    } catch {
      setError('Failed to create user');
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;
    try {
      await updateMutation.mutateAsync({ id: selectedUser.id, data: { role: newRole } });
      setShowRoleModal(false);
      setSelectedUser(null);
      setNewRole('');
    } catch {
      setError('Failed to update role');
    }
  };

  const handleToggleActive = async (user: any) => {
    try {
      await updateMutation.mutateAsync({ id: user.id, data: { isActive: !user.isActive } });
    } catch {
      setError('Failed to update user status');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync(id);
      setShowDetailModal(false);
      setSelectedUser(null);
    } catch {
      setError('Failed to delete user');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Users className="h-4 w-4" />
            <span>System Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage user accounts, roles, and access permissions
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
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Create User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {pagination && (
          <span className="text-xs text-slate-500 ml-auto">
            {pagination.total} users
          </span>
        )}
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

      {/* Users Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No users found</p>
              <p className="text-slate-400 text-sm mt-1">
                {search || roleFilter || statusFilter
                  ? 'Try adjusting your filters'
                  : 'Create your first user to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Last Active</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Created</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium border', ROLE_COLORS[user.role] ?? ROLE_COLORS.VIEWER)}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.isActive ? 'success' : 'neutral'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDateTime(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDetailModal(true);
                            }}
                            leftIcon={<Eye className="h-3 w-3" />}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewRole(user.role);
                              setShowRoleModal(true);
                            }}
                            leftIcon={<Shield className="h-3 w-3" />}
                          >
                            Role
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(user)}
                            leftIcon={<UserX className="h-3 w-3" />}
                          >
                            {user.isActive ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              isLoading={createMutation.isPending}
            >
              Create User
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Enter full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              placeholder="Leave empty for auto-generated"
            />
            <p className="text-xs text-slate-500 mt-1">
              Leave empty to receive an invitation email
            </p>
          </div>
        </div>
      </Modal>

      {/* User Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedUser(null);
        }}
        title="User Details"
        size="lg"
        footer={
          <div className="flex justify-between">
            <Button
              variant="danger"
              onClick={() => selectedUser && handleDeleteUser(selectedUser.id)}
              isLoading={deleteMutation.isPending}
            >
              Delete User
            </Button>
            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-medium text-slate-600">
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedUser.name}</h3>
                <p className="text-sm text-slate-500">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium border', ROLE_COLORS[selectedUser.role] ?? ROLE_COLORS.VIEWER)}>
                    {selectedUser.role}
                  </span>
                  <Badge variant={selectedUser.isActive ? 'success' : 'neutral'}>
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">User ID</p>
                <p className="font-mono text-xs text-slate-700">{selectedUser.id}</p>
              </div>
              <div>
                <p className="text-slate-500">Created</p>
                <p className="font-medium text-slate-700">{formatDateTime(selectedUser.createdAt)}</p>
              </div>
              <div>
                <p className="text-slate-500">Last Active</p>
                <p className="font-medium text-slate-700">
                  {selectedUser.lastLoginAt ? formatDateTime(selectedUser.lastLoginAt) : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <p className="font-medium text-slate-700">
                  {selectedUser.isActive ? 'Active' : 'Deactivated'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Role Assignment Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setSelectedUser(null);
          setNewRole('');
        }}
        title={`Assign Role: ${selectedUser?.name}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowRoleModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              isLoading={updateMutation.isPending}
              disabled={newRole === selectedUser?.role}
            >
              Update Role
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Select a new role for <strong>{selectedUser?.name}</strong>. This action will be logged in the audit trail.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setNewRole(role)}
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  newRole === role
                    ? 'border-vojas-500 bg-vojas-50 ring-2 ring-vojas-200'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium border', ROLE_COLORS[role] ?? ROLE_COLORS.VIEWER)}>
                  {role}
                </span>
                {newRole === role && <span className="ml-2 text-xs text-vojas-600">Selected</span>}
              </button>
            ))}
          </div>
          {newRole !== selectedUser?.role && selectedUser && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                Changing role from <strong>{selectedUser.role}</strong> to <strong>{newRole}</strong>
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
