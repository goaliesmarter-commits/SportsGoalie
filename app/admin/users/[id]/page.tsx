'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Shield,
  Bell,
  Trophy,
  Target,
  Clock,
  MapPin,
  Edit,
  Save,
  X,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

import { AdminRoute } from '@/components/auth/protected-route';
import { userService } from '@/lib/database/services/user.service';
import { messageService } from '@/lib/database/services/message.service';
import { User as UserType, UserRole, UserProgress, Notification, Message } from '@/types';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import { studentAnalyticsService } from '@/lib/database/services/student-analytics.service';
import type {
  StudentAnalytics,
  QuizPerformanceData,
  ProgressOverTimeData,
  SkillPerformanceData,
  CourseProgressDetail,
  QuizAttemptDetail
} from '@/lib/database/services/student-analytics.service';
import { QuizPerformanceChart } from '@/components/admin/analytics/QuizPerformanceChart';
import { ProgressOverTimeChart } from '@/components/admin/analytics/ProgressOverTimeChart';
import { SkillPerformanceTable } from '@/components/admin/analytics/SkillPerformanceTable';
import { ActivityTimeline } from '@/components/admin/analytics/ActivityTimeline';
import { EngagementMetrics } from '@/components/admin/analytics/EngagementMetrics';
import { CourseProgress } from '@/components/admin/analytics/CourseProgress';
import { QuizAttemptHistory } from '@/components/admin/analytics/QuizAttemptHistory';
import { GoalieChartingHistory } from '@/components/charting/GoalieChartingHistory';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query as fsQuery, orderBy } from 'firebase/firestore';
import { LIndexItem } from '@/types/charting';

const BLUE = '#37b5ff';
const RED = '#f87171';
const GREEN = '#22c55e';
const AMBER = '#fbbf24';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  admin:   { bg: 'rgba(248,113,113,0.15)', color: RED },
  student: { bg: 'rgba(55,181,255,0.12)',  color: BLUE },
  parent:  { bg: 'rgba(34,197,94,0.12)',   color: GREEN },
  coach:   { bg: 'rgba(251,191,36,0.12)',  color: AMBER },
};

type TabId = 'profile' | 'analytics' | 'progress' | 'charting' | 'messages' | 'notifications' | 'settings';

export default function AdminUserDetailsPage() {
  return (
    <AdminRoute>
      <UserDetailsContent />
    </AdminRoute>
  );
}

function UserDetailsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const userId = params.id as string;
  const initialTab = (searchParams?.get('tab') || 'profile') as TabId;

  const [user, setUser] = useState<UserType | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<UserType | null>(null);
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const [chartLevelSaving, setChartLevelSaving] = useState(false);
  const [growthLevelSaving, setGrowthLevelSaving] = useState(false);
  const [lIndexItems, setLIndexItems] = useState<LIndexItem[]>([]);
  const [lIndexSaving, setLIndexSaving] = useState(false);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [quizPerformance, setQuizPerformance] = useState<QuizPerformanceData[]>([]);
  const [progressOverTime, setProgressOverTime] = useState<ProgressOverTimeData[]>([]);
  const [skillPerformance, setSkillPerformance] = useState<SkillPerformanceData[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgressDetail[]>([]);
  const [quizAttemptHistory, setQuizAttemptHistory] = useState<QuizAttemptDetail[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userResult = await userService.getUser(userId);
      if (userResult.success && userResult.data) {
        setUser(userResult.data);
        setEditedUser(userResult.data);
      }
      const progressResult = await userService.getUserProgress(userId);
      if (progressResult.success && progressResult.data) setUserProgress(progressResult.data);
      const notificationsResult = await userService.getUserNotifications(userId, { limit: 10 });
      if (notificationsResult.success && notificationsResult.data) setNotifications(notificationsResult.data.items);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!currentUser) return;
    try {
      setLoadingMessages(true);
      const result = await messageService.getUserMessages(userId, { limit: 20 });
      if (result.success && result.data) setMessages(result.data.items);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const [analyticsResult, quizPerfResult, progressResult, skillPerfResult, courseProgressResult, quizHistoryResult] = await Promise.all([
        studentAnalyticsService.getStudentAnalytics(userId),
        studentAnalyticsService.getQuizPerformance(userId),
        studentAnalyticsService.getProgressOverTime(userId, 30),
        studentAnalyticsService.getSkillPerformance(userId),
        studentAnalyticsService.getCourseProgressDetails(userId),
        studentAnalyticsService.getQuizAttemptHistory(userId, 100)
      ]);
      if (analyticsResult.success && analyticsResult.data) setAnalytics(analyticsResult.data);
      if (quizPerfResult.success && quizPerfResult.data) setQuizPerformance(quizPerfResult.data);
      if (progressResult.success && progressResult.data) setProgressOverTime(progressResult.data);
      if (skillPerfResult.success && skillPerfResult.data) setSkillPerformance(skillPerfResult.data);
      if (courseProgressResult.success && courseProgressResult.data) setCourseProgress(courseProgressResult.data);
      if (quizHistoryResult.success && quizHistoryResult.data) setQuizAttemptHistory(quizHistoryResult.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => { if (userId) fetchUserData(); }, [userId]);

  useEffect(() => {
    if (lIndexItems.length > 0) return;
    (async () => {
      try {
        const snap = await getDocs(fsQuery(collection(db, 'l_index_items'), orderBy('lIndex')));
        setLIndexItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as LIndexItem)));
      } catch { /* silently fail */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLivingIndexToggle = async (itemId: string) => {
    if (lIndexSaving || !user) return;
    setLIndexSaving(true);
    const current: string[] = user.livingIndex ?? [];
    const next = current.includes(itemId)
      ? current.filter(id => id !== itemId)
      : [...current, itemId];
    try {
      const result = await userService.updateUser(userId, { livingIndex: next } as Partial<UserType>);
      if (result.success) {
        setUser(prev => prev ? { ...prev, livingIndex: next } : null);
        setEditedUser(prev => prev ? { ...prev, livingIndex: next } : null);
      } else {
        toast.error('Failed to update Living Index');
      }
    } catch {
      toast.error('Failed to update Living Index');
    } finally {
      setLIndexSaving(false);
    }
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams?.toString() || '');
    if (tab === 'profile') nextParams.delete('tab');
    else nextParams.set('tab', tab);
    const qs = nextParams.toString();
    router.replace(`/admin/users/${userId}${qs ? `?${qs}` : ''}`, { scroll: false });
    if (tab === 'analytics' || tab === 'progress') fetchAnalytics();
    if (tab === 'messages') fetchMessages();
  };

  const handleSaveChanges = async () => {
    if (!editedUser) return;
    try {
      const updates = {
        displayName: editedUser.displayName,
        role: editedUser.role,
        isActive: editedUser.isActive,
        profile: editedUser.profile,
        preferences: editedUser.preferences,
      };
      const result = await userService.updateUser(userId, updates);
      if (result.success) {
        setUser(editedUser);
        setIsEditing(false);
        toast.success('User updated successfully');
      } else {
        toast.error('Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleCancelEdit = () => {
    setEditedUser(user);
    setIsEditing(false);
  };

  const handleChartLevelChange = async (level: 'basic' | 'five_pillar') => {
    if (chartLevelSaving || user?.chartLevel === level) return;
    setChartLevelSaving(true);
    try {
      const result = await userService.updateUser(userId, { chartLevel: level } as Partial<UserType>);
      if (result.success) {
        setUser(prev => prev ? { ...prev, chartLevel: level } : null);
        setEditedUser(prev => prev ? { ...prev, chartLevel: level } : null);
        toast.success(`Chart level set to ${level === 'basic' ? 'Basic' : '5-Pillar'}`);
      } else {
        toast.error('Failed to update chart level');
      }
    } catch {
      toast.error('Failed to update chart level');
    } finally {
      setChartLevelSaving(false);
    }
  };

  const handleGrowthLevelChange = async (level: 'introduction' | 'development' | 'refinement') => {
    if (growthLevelSaving || user?.chartGrowthLevel === level || (!user?.chartGrowthLevel && level === 'introduction')) return;
    setGrowthLevelSaving(true);
    try {
      const result = await userService.updateUser(userId, { chartGrowthLevel: level } as Partial<UserType>);
      if (result.success) {
        setUser(prev => prev ? { ...prev, chartGrowthLevel: level } : null);
        setEditedUser(prev => prev ? { ...prev, chartGrowthLevel: level } : null);
        toast.success(`Growth path set to ${level.charAt(0).toUpperCase() + level.slice(1)}`);
      } else {
        toast.error('Failed to update growth path');
      }
    } catch {
      toast.error('Failed to update growth path');
    } finally {
      setGrowthLevelSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Loading user data…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
        <User size={48} color="rgba(255,255,255,0.1)" />
        <p style={{ color: '#fff', fontWeight: 600, fontSize: '17px' }}>User not found</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>The user you're looking for doesn't exist or has been deleted.</p>
        <Link href="/admin/users" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#fff', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}>
          <ArrowLeft size={15} /> Back to Users
        </Link>
      </div>
    );
  }

  const initials = (user.displayName || user.email || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const rs = ROLE_STYLES[user.role] || ROLE_STYLES.student;
  const TABS: { id: TabId; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'progress', label: 'Progress' },
    { id: 'charting', label: 'Charting' },
    { id: 'messages', label: 'Messages' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'settings', label: 'Settings' },
  ];

  const fieldLabel = (text: string) => (
    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{text}</p>
  );

  const fieldValue = (text: string | undefined | null) => (
    <p style={{ color: '#fff', fontSize: '15px' }}>{text || 'Not provided'}</p>
  );

  return (
    <>
      <style>{`
        .uid-inp { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; border-radius: 10px !important; padding: 10px 14px !important; width: 100% !important; font-size: 15px !important; outline: none !important; }
        .uid-inp:focus { border-color: rgba(55,181,255,0.45) !important; }
        .uid-inp::placeholder { color: rgba(255,255,255,0.25) !important; }
        .uid-sel { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: rgba(255,255,255,0.8) !important; border-radius: 10px !important; padding: 10px 14px !important; font-size: 15px !important; outline: none !important; cursor: pointer !important; width: 100% !important; }
        .uid-sel:focus { border-color: rgba(55,181,255,0.45) !important; }
        .uid-tab:hover { color: #fff !important; }
        .uid-btn-ghost:hover { background: rgba(55,181,255,0.1) !important; }
        .uid-msg-item:hover { background: rgba(55,181,255,0.05) !important; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/admin/users" className="uid-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '8px 14px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', transition: 'background 0.2s' }}>
              <ArrowLeft size={15} /> Back
            </Link>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>User Profile</h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px' }}>Manage {user.displayName}&apos;s account and settings</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isEditing && currentUser && (
              <button onClick={() => setShowMessageComposer(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.3)', color: BLUE, padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                <MessageSquare size={15} /> Send Message
              </button>
            )}
            {isEditing ? (
              <>
                <button onClick={handleCancelEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                  <X size={15} /> Cancel
                </button>
                <button onClick={handleSaveChanges} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, border: 'none', color: '#fff', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                  <Save size={15} /> Save Changes
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, border: 'none', color: '#fff', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                <Edit size={15} /> Edit User
              </button>
            )}
          </div>
        </div>

        {/* User Overview Card */}
        <div style={{ position: 'relative', ...card, padding: '24px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `linear-gradient(135deg, ${BLUE}33 0%, rgba(14,165,233,0.2) 100%)`, border: `2px solid rgba(55,181,255,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, color: BLUE, flexShrink: 0, overflow: 'hidden' }}>
              {user.profileImage ? <img src={user.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '22px' }}>{user.displayName}</h2>
                <span style={{ background: rs.bg, color: rs.color, padding: '2px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textTransform: 'capitalize' }}>{user.role}</span>
                {user.isActive !== false && <span style={{ background: 'rgba(34,197,94,0.12)', color: GREEN, padding: '2px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>Active</span>}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', marginBottom: '8px' }}>{user.email}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
                  <Calendar size={13} /> Joined {(user.createdAt instanceof Date ? user.createdAt : (user.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date()).toLocaleDateString()}
                </span>
                {user.lastLoginAt && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
                    <Clock size={13} /> Last seen {(user.lastLoginAt instanceof Date ? user.lastLoginAt : (user.lastLoginAt as { toDate?: () => Date })?.toDate?.() ?? new Date()).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ position: 'relative', ...card, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />

          {/* Tab Bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(55,181,255,0.1)', padding: '0 20px', overflowX: 'auto' }}>
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                className="uid-tab"
                onClick={() => handleTabChange(id)}
                style={{ padding: '16px 18px', background: 'none', border: 'none', borderBottom: activeTab === id ? `2px solid ${BLUE}` : '2px solid transparent', color: activeTab === id ? BLUE : 'rgba(255,255,255,0.45)', fontWeight: activeTab === id ? 700 : 500, fontSize: '15px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.2s', marginBottom: '-1px' }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '24px' }}>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* Basic Information */}
                <div style={{ ...card, padding: '20px' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>Basic Information</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>User's profile and contact details</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      {fieldLabel('Display Name')}
                      {isEditing ? (
                        <input className="uid-inp" value={editedUser?.displayName || ''} onChange={e => setEditedUser(prev => prev ? {...prev, displayName: e.target.value} : null)} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <User size={14} color="rgba(255,255,255,0.3)" />
                          {fieldValue(user.displayName)}
                        </div>
                      )}
                    </div>
                    <div>
                      {fieldLabel('Email Address')}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={14} color="rgba(255,255,255,0.3)" />
                        <p style={{ color: '#fff', fontSize: '15px' }}>{user.email}</p>
                        {user.emailVerified && <span style={{ background: 'rgba(34,197,94,0.12)', color: GREEN, padding: '1px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>Verified</span>}
                      </div>
                    </div>
                    <div>
                      {fieldLabel('First Name')}
                      {isEditing ? (
                        <input className="uid-inp" value={editedUser?.profile?.firstName || ''} onChange={e => setEditedUser(prev => prev ? {...prev, profile: {...prev.profile, firstName: e.target.value}} : null)} />
                      ) : fieldValue(user.profile?.firstName)}
                    </div>
                    <div>
                      {fieldLabel('Last Name')}
                      {isEditing ? (
                        <input className="uid-inp" value={editedUser?.profile?.lastName || ''} onChange={e => setEditedUser(prev => prev ? {...prev, profile: {...prev.profile, lastName: e.target.value}} : null)} />
                      ) : fieldValue(user.profile?.lastName)}
                    </div>
                  </div>
                </div>

                {/* Account Settings */}
                <div style={{ ...card, padding: '20px' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>Account Settings</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>Role, status, and configuration</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      {fieldLabel('User Role')}
                      {isEditing ? (
                        <select className="uid-sel" value={editedUser?.role} onChange={e => setEditedUser(prev => prev ? {...prev, role: e.target.value as UserRole} : null)}>
                          <option value="student">Student</option>
                          <option value="coach">Coach</option>
                          <option value="parent">Parent</option>
                          <option value="admin">Administrator</option>
                        </select>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Shield size={14} color="rgba(255,255,255,0.3)" />
                          <span style={{ background: rs.bg, color: rs.color, padding: '2px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textTransform: 'capitalize' }}>{user.role}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      {fieldLabel('Date of Birth')}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} color="rgba(255,255,255,0.3)" />
                        <p style={{ color: '#fff', fontSize: '15px' }}>{user.profile?.dateOfBirth ? new Date(user.profile.dateOfBirth).toLocaleDateString() : 'Not provided'}</p>
                      </div>
                    </div>
                    <div>
                      {fieldLabel('Country')}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={14} color="rgba(255,255,255,0.3)" />
                        {fieldValue(user.profile?.location?.country)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              loadingAnalytics ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Loading analytics…</div>
              ) : (
                /*
                  These seven panels are shadcn Cards built for a light page,
                  which is why this tab rendered as a stack of white slabs
                  inside the navy shell. `.surface-dark` repoints the design
                  tokens for everything inside it — see globals.css.
                */
                <div className="surface-dark" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {analytics && (
                    <EngagementMetrics
                      currentStreak={analytics.engagement.currentStreak}
                      longestStreak={analytics.engagement.longestStreak}
                      activeDays={analytics.overview.activeDays}
                      averageSessionDuration={analytics.engagement.averageSessionDuration}
                      studyPattern={analytics.engagement.studyPattern}
                      totalTimeSpent={analytics.overview.totalTimeSpent}
                    />
                  )}
                  <CourseProgress courses={courseProgress} loading={loadingAnalytics} />
                  <ProgressOverTimeChart data={progressOverTime} />
                  <QuizAttemptHistory attempts={quizAttemptHistory} loading={loadingAnalytics} />
                  <QuizPerformanceChart data={quizPerformance} />
                  <SkillPerformanceTable data={skillPerformance} />
                  {analytics && <ActivityTimeline activities={analytics.recentActivity} />}
                </div>
              )
            )}

            {/* Progress Tab */}
            {activeTab === 'progress' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* Overall Statistics */}
                <div style={{ ...card, padding: '20px' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>Overall Statistics</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>Learning progress and achievements</p>
                  {userProgress ? (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ textAlign: 'center', background: 'rgba(55,181,255,0.07)', borderRadius: '10px', padding: '16px' }}>
                          <p style={{ color: BLUE, fontWeight: 800, fontSize: '28px' }}>{userProgress.overallStats.skillsCompleted}</p>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Skills Attempted</p>
                        </div>
                        <div style={{ textAlign: 'center', background: 'rgba(55,181,255,0.07)', borderRadius: '10px', padding: '16px' }}>
                          <p style={{ color: BLUE, fontWeight: 800, fontSize: '28px' }}>{userProgress.overallStats.quizzesCompleted}</p>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Quiz Attempts</p>
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { label: 'Average Quiz Score', value: `${userProgress.overallStats.averageQuizScore}%` },
                          { label: 'Current Streak', value: `${userProgress.overallStats.currentStreak} days` },
                          { label: 'Total Time', value: `${Math.round(userProgress.overallStats.totalTimeSpent / 60)} hours` },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>{label}</span>
                            <span style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '32px' }}>
                      <Target size={36} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 12px' }} />
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>No progress data available</p>
                    </div>
                  )}
                </div>

                {/* Video Quiz Performance */}
                <div style={{ ...card, padding: '20px' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>Video Quiz Performance</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>Performance metrics from video quizzes</p>
                  {analytics ? (
                    <div>
                      <div style={{ textAlign: 'center', background: 'rgba(55,181,255,0.07)', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
                        <p style={{ color: BLUE, fontWeight: 800, fontSize: '36px' }}>{analytics.performance.totalQuizzesCompleted}</p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Quizzes Completed</p>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { label: 'Best Score', value: `${analytics.performance.bestQuizScore}%` },
                          { label: 'Worst Score', value: `${analytics.performance.worstQuizScore}%` },
                          { label: 'Study Pattern', value: analytics.engagement.studyPattern },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>{label}</span>
                            <span style={{ color: '#fff', fontWeight: 600, fontSize: '15px', textTransform: 'capitalize' }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '32px' }}>
                      <Trophy size={36} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 12px' }} />
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>No quiz data available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Charting Tab */}
            {activeTab === 'charting' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ ...card, padding: '20px' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>Charting History</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>Every game and practice the goalie has charted. Expand a session to see full details.</p>
                  <GoalieChartingHistory studentId={userId} onOpenSession={(sessionId) => router.push(`/charting/sessions/${sessionId}`)} />
                </div>

                {/* Living Index — T2-B */}
                <div style={{ ...card, padding: '20px' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>Living Index</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>
                    Toggle which L-index training items are <strong style={{ color: BLUE }}>active</strong> for this goalie&apos;s daily training chart. Only active items appear in their log.
                  </p>
                  {lIndexItems.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>No L-index items found. Add items in L-Index Admin first.</p>
                  ) : (
                    (() => {
                      const activeIds = user.livingIndex ?? [];
                      const grouped: Record<string, LIndexItem[]> = {};
                      lIndexItems.forEach(item => {
                        if (!grouped[item.lIndex]) grouped[item.lIndex] = [];
                        grouped[item.lIndex].push(item);
                      });
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {Object.entries(grouped).sort(([a], [b]) => {
                            const n = (s: string) => parseInt(s.replace('L', ''), 10);
                            return n(a) - n(b);
                          }).map(([lIdx, items]) => (
                            <div key={lIdx}>
                              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                                {lIdx} — {items[0]?.name ?? lIdx}
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {items.map(item => {
                                  const on = activeIds.includes(item.id);
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => handleLivingIndexToggle(item.id)}
                                      disabled={lIndexSaving}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '10px 14px', borderRadius: '10px',
                                        border: on ? `1px solid rgba(55,181,255,0.35)` : '1px solid rgba(255,255,255,0.07)',
                                        background: on ? 'rgba(55,181,255,0.08)' : 'rgba(255,255,255,0.02)',
                                        cursor: lIndexSaving ? 'wait' : 'pointer', textAlign: 'left',
                                        transition: 'all 0.18s',
                                      }}
                                    >
                                      <div style={{
                                        width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                                        border: on ? `2px solid ${BLUE}` : '2px solid rgba(255,255,255,0.15)',
                                        background: on ? 'rgba(55,181,255,0.18)' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      }}>
                                        {on && <span style={{ color: BLUE, fontSize: '11px', fontWeight: 900 }}>✓</span>}
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <p style={{ color: on ? '#fff' : 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 600 }}>{item.name}</p>
                                        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px' }}>
                                          {item.topLevelCategory === 'lifestyle_foundations' ? 'Lifestyle Foundations' : 'Land/Conditioning'} · {item.levelTag}
                                        </p>
                                      </div>
                                      <span style={{
                                        fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                                        background: on ? 'rgba(55,181,255,0.15)' : 'rgba(255,255,255,0.05)',
                                        color: on ? BLUE : 'rgba(255,255,255,0.2)',
                                      }}>
                                        {on ? 'ON' : 'OFF'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginTop: '4px' }}>
                            {activeIds.length} of {lIndexItems.length} items active
                          </p>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div style={{ ...card, padding: '20px' }}>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>Messages</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>Messages sent to this student</p>
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Loading messages…</div>
                ) : messages.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {messages.map((message) => (
                      <div key={message.id} className="uid-msg-item" style={{ padding: '16px', background: message.isRead ? 'rgba(255,255,255,0.02)' : 'rgba(55,181,255,0.04)', border: `1px solid ${message.isRead ? 'rgba(255,255,255,0.06)' : 'rgba(55,181,255,0.15)'}`, borderRadius: '10px', transition: 'background 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                              <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>{message.subject}</p>
                              <span style={{ background: 'rgba(55,181,255,0.1)', color: BLUE, padding: '1px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{message.type.replace('_', ' ')}</span>
                              {!message.isRead && <span style={{ background: 'rgba(34,197,94,0.12)', color: GREEN, padding: '1px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>Unread</span>}
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', marginBottom: '6px' }}>
                              {message.message.length > 150 ? message.message.substring(0, 150) + '…' : message.message}
                            </p>
                            {message.attachments && message.attachments.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '4px' }}>
                                <Mail size={12} /> {message.attachments.length} attachment(s)
                              </div>
                            )}
                            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>Sent {(message.createdAt?.toDate?.() ?? new Date()).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px' }}>
                    <MessageSquare size={44} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>No messages sent yet</p>
                    {currentUser && (
                      <button onClick={() => setShowMessageComposer(true)} style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.3)', color: BLUE, padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                        <MessageSquare size={15} /> Send First Message
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div style={{ ...card, padding: '20px' }}>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>Recent Notifications</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>User's recent notifications and alerts</p>
                {notifications.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {notifications.map((notification) => (
                      <div key={notification.id} style={{ padding: '16px', background: notification.isRead ? 'rgba(255,255,255,0.02)' : 'rgba(55,181,255,0.04)', border: `1px solid ${notification.isRead ? 'rgba(255,255,255,0.06)' : 'rgba(55,181,255,0.15)'}`, borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>{notification.title}</p>
                          <span style={{ background: 'rgba(55,181,255,0.1)', color: BLUE, padding: '1px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{notification.type}</span>
                          {!notification.isRead && <span style={{ background: 'rgba(34,197,94,0.12)', color: GREEN, padding: '1px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>New</span>}
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', marginBottom: '4px' }}>{notification.message}</p>
                        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>{(notification.createdAt?.toDate?.() ?? new Date()).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px' }}>
                    <Bell size={44} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>No notifications</p>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div style={{ ...card, padding: '20px' }}>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>User Preferences</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>Application preferences and settings</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {/* Chart Level — admin-controlled */}
                  <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px', marginBottom: '3px' }}>Chart Level</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                        Controls which fields appear during game charting. <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Basic</strong> = entry experience (2-3 min, simplified fields).{' '}
                        <strong style={{ color: 'rgba(255,255,255,0.65)' }}>5-Pillar</strong> = full advanced chart (5-6 min, all sections).
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(['basic', 'five_pillar'] as const).map(level => {
                        const isActive = user.chartLevel === level || (!user.chartLevel && level === 'five_pillar');
                        return (
                          <button
                            key={level}
                            onClick={() => handleChartLevelChange(level)}
                            disabled={chartLevelSaving}
                            style={{
                              padding: '9px 18px',
                              borderRadius: '10px',
                              border: isActive ? `2px solid ${BLUE}` : '1px solid rgba(255,255,255,0.12)',
                              background: isActive ? `rgba(55,181,255,0.15)` : 'rgba(255,255,255,0.04)',
                              color: isActive ? BLUE : 'rgba(255,255,255,0.45)',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: chartLevelSaving ? 'wait' : 'pointer',
                              transition: 'all 0.18s',
                              letterSpacing: '0.02em',
                            }}
                          >
                            {level === 'basic' ? 'Basic  (2-3 min)' : '5-Pillar  (5-6 min)'}
                          </button>
                        );
                      })}
                    </div>
                    {chartLevelSaving && (
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '8px' }}>Saving…</p>
                    )}
                  </div>

                  {/* Chart Growth Path — admin-controlled */}
                  <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px', marginBottom: '3px' }}>Chart Growth Path</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                        Controls the depth and complexity of charting fields as the goalie progresses.{' '}
                        <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Introduction</strong> → <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Development</strong> → <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Refinement</strong>. Admin-assigned only.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(['introduction', 'development', 'refinement'] as const).map(level => {
                        const current = user.chartGrowthLevel || 'introduction';
                        const isActive = current === level;
                        const levelColor = level === 'introduction' ? BLUE : level === 'development' ? '#a78bfa' : '#4ade80';
                        return (
                          <button
                            key={level}
                            onClick={() => handleGrowthLevelChange(level)}
                            disabled={growthLevelSaving}
                            style={{
                              padding: '9px 18px',
                              borderRadius: '10px',
                              border: isActive ? `2px solid ${levelColor}` : '1px solid rgba(255,255,255,0.12)',
                              background: isActive ? `${levelColor}1a` : 'rgba(255,255,255,0.04)',
                              color: isActive ? levelColor : 'rgba(255,255,255,0.45)',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: growthLevelSaving ? 'wait' : 'pointer',
                              transition: 'all 0.18s',
                              letterSpacing: '0.02em',
                              textTransform: 'capitalize',
                            }}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                    {growthLevelSaving && (
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '8px' }}>Saving…</p>
                    )}
                  </div>

                  {/* Email Notifications toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px', marginBottom: '3px' }}>Email Notifications</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Receive notifications via email</p>
                    </div>
                    <button
                      onClick={() => isEditing && setEditedUser(prev => prev ? {...prev, preferences: {...prev.preferences, notifications: !prev.preferences?.notifications}} : null)}
                      style={{ width: '40px', height: '22px', borderRadius: '11px', background: (isEditing ? editedUser : user)?.preferences?.notifications ? BLUE : 'rgba(255,255,255,0.15)', border: 'none', cursor: isEditing ? 'pointer' : 'default', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                    >
                      <div style={{ position: 'absolute', top: '3px', left: (isEditing ? editedUser : user)?.preferences?.notifications ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </button>
                  </div>
                  {/* Theme */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px', marginBottom: '3px' }}>Theme</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Application theme preference</p>
                    </div>
                    <span style={{ background: 'rgba(55,181,255,0.1)', color: BLUE, padding: '3px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>{user.preferences?.theme || 'Light'}</span>
                  </div>
                  {/* Language */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px', marginBottom: '3px' }}>Language</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Preferred language</p>
                    </div>
                    <span style={{ background: 'rgba(55,181,255,0.1)', color: BLUE, padding: '3px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>{user.preferences?.language || 'English'}</span>
                  </div>
                  {/* Timezone */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
                    <div>
                      <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px', marginBottom: '3px' }}>Timezone</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>User's timezone</p>
                    </div>
                    <span style={{ background: 'rgba(55,181,255,0.1)', color: BLUE, padding: '3px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>{user.preferences?.timezone || 'UTC'}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Message Composer */}
        {currentUser && (
          <MessageComposer
            isOpen={showMessageComposer}
            onClose={() => setShowMessageComposer(false)}
            studentId={userId}
            studentName={user.displayName}
            adminUserId={currentUser.id}
            onMessageSent={() => {
              fetchMessages();
              toast.success('Message sent successfully');
            }}
          />
        )}
      </div>
    </>
  );
}
