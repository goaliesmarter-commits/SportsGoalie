'use client';

import { useState, useEffect } from 'react';
import { Search, Users, UserPlus, ShieldCheck, MoreHorizontal, Trash2, AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import { AdminRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { auth } from '@/lib/firebase/config';
import { userService } from '@/lib/database/services/user.service';
import { invitationService } from '@/lib/services/invitation.service';
import { User, UserRole } from '@/types';
import { Invitation } from '@/types/invitation';
import { AdminInviteForm } from './components/AdminInviteForm';
import { AdminInviteList } from './components/AdminInviteList';
import { toast } from 'sonner';

const BLUE = '#37b5ff';
const RED = '#f87171';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  admin:   { bg: 'rgba(248,113,113,0.15)', color: RED },
  coach:   { bg: `rgba(55,181,255,0.12)`, color: BLUE },
  parent:  { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
  student: { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
};

export default function AdminUsersPage() {
  return <AdminRoute><UsersManagementContent /></AdminRoute>;
}

function UsersManagementContent() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [adminInvitations, setAdminInvitations] = useState<Invitation[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);

  const fetchAdminInvitations = async () => {
    try {
      setInvitesLoading(true);
      const data = await invitationService.getAllInvitations('admin');
      setAdminInvitations(data);
    } catch {
      toast.error('Failed to load admin invitations');
    } finally {
      setInvitesLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const result = await userService.getAllUsers({ role: roleFilter === 'all' ? undefined : roleFilter, limit: 100 });
      if (result.success && result.data) setUsers(result.data.items);
      else toast.error('Failed to load users');
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [roleFilter]);
  useEffect(() => { fetchAdminInvitations(); }, []);

  const handleDeleteUser = async (user: User) => {
    if (!currentUser?.id) return;
    setConfirmDeleteId(null);
    try {
      const result = await userService.deleteUser(user.id, currentUser.id);
      if (result.success) {
        await invitationService.deleteByAcceptedUserId(user.id);

        // Delete the Firebase Auth record so the email can be re-invited
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          await fetch('/api/admin/delete-user', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ uid: user.id }),
          });
        }

        toast.success(`${user.displayName || user.email} has been deleted`);
        setUsers(prev => prev.filter(u => u.id !== user.id));
      } else {
        toast.error(result.error?.message || 'Failed to delete user');
      }
    } catch { toast.error('Failed to delete user'); }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!currentUser?.id) return;
    setOpenMenuId(null);
    try {
      const result = await userService.changeUserRole(userId, newRole, currentUser.id);
      if (result.success) { toast.success(`Role updated to ${newRole}`); fetchUsers(); }
      else toast.error('Failed to update role');
    } catch { toast.error('Failed to update role'); }
  };

  const filteredUsers = users.filter(u => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || (u.displayName || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s);
    return matchSearch && (roleFilter === 'all' || u.role === roleFilter);
  });

  const counts = { total: users.length, student: users.filter(u => u.role === 'student').length, coach: users.filter(u => u.role === 'coach').length, parent: users.filter(u => u.role === 'parent').length, admin: users.filter(u => u.role === 'admin').length };

  return (
    <>
      <style>{`
        .au-inp { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; border-radius: 10px !important; padding: 10px 12px 10px 38px !important; width: 100% !important; font-size: 13px !important; outline: none !important; }
        .au-inp:focus { border-color: rgba(55,181,255,0.45) !important; }
        .au-inp::placeholder { color: rgba(255,255,255,0.25) !important; }
        .au-sel { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: rgba(255,255,255,0.7) !important; border-radius: 10px !important; padding: 10px 12px !important; font-size: 13px !important; outline: none !important; cursor: pointer !important; }
        .au-sel:focus { border-color: rgba(55,181,255,0.45) !important; }
        .au-row { transition: background 0.2s; }
        .au-row:hover { background: rgba(55,181,255,0.04) !important; }
        .au-menu-item:hover { background: rgba(55,181,255,0.1) !important; color: #fff !important; }
        .au-menu-delete:hover { background: rgba(248,113,113,0.12) !important; color: #f87171 !important; }
        .au-view:hover { background: rgba(55,181,255,0.12) !important; color: ${BLUE} !important; border-color: rgba(55,181,255,0.3) !important; }
        .au-view { transition: all 0.2s !important; }
        @media (max-width: 1024px) { .au-stats { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 768px) { .au-invite-layout { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) {
          .au-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .au-row-actions { flex-direction: column !important; align-items: flex-start !important; gap: '4px' !important; }
          .au-user-row { flex-wrap: wrap !important; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>User Management</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px' }}>Manage user accounts, roles, and permissions</p>
          </div>
          <button onClick={() => setShowInvitePanel(prev => !prev)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${RED} 0%, #dc2626 100%)`, color: '#fff', padding: '10px 18px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
            {showInvitePanel ? <X size={15} /> : <UserPlus size={15} />}
            {showInvitePanel ? 'Close' : 'Invite Admin'}
          </button>
        </div>

        {/* Invite Admin Panel */}
        {showInvitePanel && (
          <div className="au-invite-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'start' }}>
            <div style={{ position: 'relative', ...card, padding: '20px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${RED}, transparent)` }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <ShieldCheck size={16} color={RED} />
                <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Invite New Admin</h2>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '18px' }}>Send an email invite to create an administrator account</p>
              {currentUser && (
                <AdminInviteForm
                  invitedBy={currentUser.id}
                  invitedByName={currentUser.displayName ?? 'Admin'}
                  onInvitationCreated={inv => setAdminInvitations(prev => [inv, ...prev])}
                />
              )}
            </div>
            <div style={{ position: 'relative', ...card, padding: '20px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '14px' }}>Admin Invitations ({adminInvitations.length})</h2>
              <AdminInviteList
                invitations={adminInvitations}
                loading={invitesLoading}
                onResend={updated => setAdminInvitations(prev => prev.map(i => (i.id === updated.id ? updated : i)))}
                onRevoke={revoked => setAdminInvitations(prev => prev.map(i => (i.id === revoked.id ? { ...i, status: 'revoked' as const } : i)))}
                onDelete={deleted => setAdminInvitations(prev => prev.filter(i => i.id !== deleted.id))}
              />
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div className="au-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total Users', value: counts.total, sub: 'All accounts', icon: Users, color: BLUE },
            { label: 'Students', value: counts.student, sub: 'Athletes', icon: Users, color: '#22c55e' },
            { label: 'Coaches', value: counts.coach, sub: 'Coach accounts', icon: Users, color: BLUE },
            { label: 'Parents', value: counts.parent, sub: 'Parent accounts', icon: Users, color: '#fbbf24' },
            { label: 'Admins', value: counts.admin, sub: 'Administrators', icon: ShieldCheck, color: RED },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} style={{ position: 'relative', ...card, padding: '16px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}66, transparent)` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600 }}>{label}</p>
                <Icon size={14} color={`${color}88`} />
              </div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: '26px', lineHeight: 1, marginBottom: '4px' }}>{value}</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div style={{ ...card, padding: '18px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input className="au-inp" placeholder="Search by name or email…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select className="au-sel" value={roleFilter} onChange={e => setRoleFilter(e.target.value as UserRole | 'all')} style={{ minWidth: '160px' }}>
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="coach">Coaches</option>
            <option value="parent">Parents</option>
            <option value="admin">Administrators</option>
          </select>
        </div>

        {/* Users Table */}
        <div style={{ position: 'relative', ...card, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(55,181,255,0.08)' }}>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Users ({filteredUsers.length})</h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginTop: '2px' }}>All registered users with their roles</p>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '15px' }}>Loading users…</div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Users size={44} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>No users found</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '15px' }}>{searchTerm || roleFilter !== 'all' ? 'Try adjusting your search criteria' : 'No users have been registered yet'}</p>
            </div>
          ) : (
            <div>
              {filteredUsers.map((user, i) => {
                const initials = (user.displayName || user.email || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                const rs = ROLE_STYLES[user.role] || ROLE_STYLES.student;
                const isMenuOpen = openMenuId === user.id;
                const isConfirmingDelete = confirmDeleteId === user.id;
                const isSelf = user.id === currentUser?.id;
                return (
                  <div key={user.id} style={{ borderBottom: i < filteredUsers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div className="au-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', gap: '12px', position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        {/* Avatar */}
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${BLUE}33 0%, rgba(14,165,233,0.2) 100%)`, border: `1px solid rgba(55,181,255,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 800, color: BLUE, flexShrink: 0, overflow: 'hidden' }}>
                          {user.profileImage ? <img src={user.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                            <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>{user.displayName || user.email || 'Unknown'}</p>
                            <span style={{ background: rs.bg, color: rs.color, padding: '1px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, textTransform: 'capitalize' }}>{user.role}</span>
                          </div>
                          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>{user.email}</p>
                          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginTop: '2px' }}>
                            Joined {(user.createdAt instanceof Date ? user.createdAt : (user.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date()).toLocaleDateString()}
                            {user.lastLoginAt && ` · Last seen ${(user.lastLoginAt instanceof Date ? user.lastLoginAt : (user.lastLoginAt as { toDate?: () => Date })?.toDate?.() ?? new Date()).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <Link href={`/admin/users/${user.id}`} className="au-view" style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                          View Profile
                        </Link>
                        {/* Actions menu */}
                        <div style={{ position: 'relative' }}>
                          <button onClick={() => { setOpenMenuId(isMenuOpen ? null : user.id); setConfirmDeleteId(null); }} style={{ padding: '7px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <MoreHorizontal size={16} />
                          </button>
                          {isMenuOpen && (
                            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: 'rgba(2,18,44,0.98)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '10px', padding: '4px', zIndex: 50, minWidth: '172px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                              {(['student', 'coach', 'parent', 'admin'] as UserRole[]).filter(r => r !== user.role).map(role => (
                                <button key={role} className="au-menu-item" onClick={() => handleRoleChange(user.id, role)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', borderRadius: '7px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s', textAlign: 'left' }}>
                                  {role === 'admin' ? <ShieldCheck size={13} /> : <Users size={13} />}
                                  Make {role}
                                </button>
                              ))}
                              {!isSelf && (
                                <>
                                  <div style={{ margin: '4px 8px', borderTop: '1px solid rgba(248,113,113,0.15)' }} />
                                  <button className="au-menu-delete" onClick={() => { setOpenMenuId(null); setConfirmDeleteId(user.id); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', borderRadius: '7px', border: 'none', background: 'transparent', color: 'rgba(248,113,113,0.7)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}>
                                    <Trash2 size={13} /> Delete User
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Inline delete confirmation */}
                    {isConfirmingDelete && (
                      <div style={{ margin: '0 20px 14px', padding: '14px 16px', borderRadius: '10px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <AlertTriangle size={15} color={RED} style={{ flexShrink: 0 }} />
                          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                            Permanently delete <strong style={{ color: '#fff' }}>{user.displayName || user.email}</strong>? This cannot be undone.
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                          <button onClick={() => handleDeleteUser(user)} style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', background: `linear-gradient(135deg, ${RED} 0%, #dc2626 100%)`, color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
