'use client';

import { useEffect, useState } from 'react';
import {
  Settings, Save, RefreshCw, Globe, Shield, Mail, Bell,
  Database, Server, Key, Clock, Users,
} from 'lucide-react';
import { AdminRoute } from '@/components/auth/protected-route';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth/context';
import {
  normalizePlatformSettings,
  platformSettingsService,
} from '@/lib/database/services/platform-settings.service';
import type { PlatformSettings } from '@/types/platform-settings';

const BLUE = '#37b5ff';
const RED = '#f87171';
const GREEN = '#22c55e';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

const TABS = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'content', label: 'Content', icon: Database },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'performance', label: 'Performance', icon: Server },
];

export default function AdminSettingsPage() {
  return <AdminRoute><SettingsContent /></AdminRoute>;
}

function SettingsContent() {
  const { user } = useAuth();
  // normalizePlatformSettings(null) hands back a fresh copy of the defaults, so the
  // shared constant behind it is never edited in place.
  const [settings, setSettings] = useState<PlatformSettings>(() => normalizePlatformSettings(null));
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Load whatever was saved last. Until this resolves the form is still showing
  // defaults, so it stays behind a spinner rather than inviting an edit to a value
  // that is about to be replaced by the stored one.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await platformSettingsService.getSettings();
      if (cancelled) return;
      if (result.success && result.data) {
        setSettings(result.data);
      } else {
        toast.error('Failed to load settings');
      }
      setInitialLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!user?.id) { toast.error('Failed to save settings'); return; }
    try {
      setLoading(true);
      const result = await platformSettingsService.saveSettings(settings, user.id);
      if (!result.success || !result.data) { throw new Error(result.error?.message); }
      // Show what was stored rather than what was typed: a number outside its allowed
      // range is clamped on the way in, and the form should not keep claiming the
      // value that was rejected.
      setSettings(result.data);
      setHasChanges(false);
      toast.success('Settings saved successfully');
    } catch { toast.error('Failed to save settings'); }
    finally { setLoading(false); }
  };

  const updateSetting = (section: keyof PlatformSettings, key: string, value: unknown) => {
    setSettings(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
    setHasChanges(true);
  };

  const updateArraySetting = (section: keyof PlatformSettings, key: string, value: string) => {
    updateSetting(section, key, value.split(',').map(v => v.trim()).filter(v => v));
  };

  return (
    <>
      <style>{`
        .st-inp { background: rgba(2,18,44,0.6) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; border-radius: 8px !important; padding: 9px 12px !important; width: 100% !important; font-size: 13px !important; outline: none !important; }
        .st-inp:focus { border-color: rgba(55,181,255,0.45) !important; }
        .st-inp::placeholder { color: rgba(255,255,255,0.2) !important; }
        .st-ta { background: rgba(2,18,44,0.6) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; border-radius: 8px !important; padding: 9px 12px !important; width: 100% !important; font-size: 13px !important; outline: none !important; resize: vertical !important; min-height: 80px !important; }
        .st-ta:focus { border-color: rgba(55,181,255,0.45) !important; }
        .st-sel { background: rgba(2,18,44,0.6) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: rgba(255,255,255,0.7) !important; border-radius: 8px !important; padding: 9px 12px !important; width: 100% !important; font-size: 13px !important; outline: none !important; }
        .st-sel:focus { border-color: rgba(55,181,255,0.45) !important; }
        .st-tab { transition: all 0.2s !important; }
        .st-tab:hover { background: rgba(55,181,255,0.06) !important; }
        .st-save { display: flex; align-items: center; gap: 6px; padding: 9px 18px; background: linear-gradient(135deg, ${RED} 0%, #dc2626 100%); color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
        .st-save:disabled { opacity: 0.5 !important; cursor: not-allowed !important; }
        .st-reset { display: flex; align-items: center; gap: 6px; padding: 9px 14px; background: transparent; color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .st-reset:hover:not(:disabled) { background: rgba(255,255,255,0.06) !important; color: #fff !important; }
        .st-reset:disabled { opacity: 0.5 !important; cursor: not-allowed !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .st-2col { grid-template-columns: 1fr !important; } }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>System Settings</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px' }}>Configure platform settings and preferences</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {hasChanges && (
              <span style={{ background: 'rgba(248,113,113,0.12)', color: RED, border: '1px solid rgba(248,113,113,0.25)', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>Unsaved Changes</span>
            )}
            {/* Puts the defaults back in the form. Saving them is still a separate, deliberate step. */}
            <button className="st-reset" disabled={loading || initialLoading}
              onClick={() => { setSettings(normalizePlatformSettings(null)); setHasChanges(true); toast.info('Settings reset to defaults'); }}>
              <RefreshCw size={13} /> Reset
            </button>
            <button className="st-save" onClick={handleSave} disabled={loading || initialLoading || !hasChanges}>
              <Save size={13} /> {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Tabs + Content */}
        <div style={{ ...card, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />

          <div style={{ display: 'flex', borderBottom: '1px solid rgba(55,181,255,0.1)', overflowX: 'auto' }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button key={tab.id} className={!active ? 'st-tab' : ''} onClick={() => setActiveTab(tab.id)}
                  style={{ flex: 1, minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '14px 8px', background: active ? 'rgba(55,181,255,0.08)' : 'transparent', border: 'none', borderBottom: active ? `2px solid ${BLUE}` : '2px solid transparent', color: active ? BLUE : 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <Icon size={13} /> {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ padding: '24px' }}>

            {initialLoading && (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid rgba(55,181,255,0.2)', borderTopColor: BLUE, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '15px' }}>Loading settings…</p>
              </div>
            )}

            {/* General */}
            {!initialLoading && activeTab === 'general' && (
              <div className="st-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Globe size={15} color={BLUE} />
                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Site Information</h3>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '16px' }}>Basic information about your platform</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { label: 'Site Name', field: 'siteName', type: 'text' },
                      { label: 'Contact Email', field: 'contactEmail', type: 'email' },
                      { label: 'Support Email', field: 'supportEmail', type: 'email' },
                    ].map(({ label, field, type }) => (
                      <div key={field}>
                        <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>{label.toUpperCase()}</label>
                        <input className="st-inp" type={type} value={(settings.general as Record<string, unknown>)[field] as string} onChange={e => updateSetting('general', field, e.target.value)} />
                      </div>
                    ))}
                    <div>
                      <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>SITE DESCRIPTION</label>
                      <textarea className="st-ta" value={settings.general.siteDescription} onChange={e => updateSetting('general', 'siteDescription', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Settings size={15} color={BLUE} />
                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Platform Configuration</h3>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '16px' }}>Default settings and platform behavior</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>DEFAULT LANGUAGE</label>
                      <select className="st-sel" value={settings.general.defaultLanguage} onChange={e => updateSetting('general', 'defaultLanguage', e.target.value)}>
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>DEFAULT TIMEZONE</label>
                      <select className="st-sel" value={settings.general.defaultTimezone} onChange={e => updateSetting('general', 'defaultTimezone', e.target.value)}>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                      </select>
                    </div>
                    {[
                      { label: 'Maintenance Mode', key: 'maintenanceMode', sub: 'Temporarily disable public access' },
                      { label: 'User Registration', key: 'registrationEnabled', sub: 'Allow new user registrations' },
                    ].map(({ label, key, sub }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>{label}</p>
                          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{sub}</p>
                        </div>
                        <button onClick={() => updateSetting('general', key, !(settings.general as Record<string, unknown>)[key])}
                          style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', background: (settings.general as Record<string, unknown>)[key] ? BLUE : 'rgba(255,255,255,0.1)', transition: 'background 0.2s', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '3px', left: (settings.general as Record<string, unknown>)[key] ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            {!initialLoading && activeTab === 'content' && (
              <div className="st-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Database size={15} color={BLUE} />
                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Content Management</h3>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '16px' }}>Settings for content creation and approval</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                      <div>
                        <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>Auto-approve Content</p>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>Automatically approve new submissions</p>
                      </div>
                      <button onClick={() => updateSetting('content', 'autoApproval', !settings.content.autoApproval)}
                        style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', background: settings.content.autoApproval ? BLUE : 'rgba(255,255,255,0.1)', transition: 'background 0.2s', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '3px', left: settings.content.autoApproval ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                      </button>
                    </div>
                    {[
                      { label: 'Max Quiz Questions', field: 'maxQuizQuestions', min: '1', max: '100' },
                      { label: 'Max File Size (MB)', field: 'maxFileSize', min: '1', max: '100' },
                    ].map(({ label, field, min, max }) => (
                      <div key={field}>
                        <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>{label.toUpperCase()}</label>
                        <input className="st-inp" type="number" min={min} max={max} value={(settings.content as Record<string, unknown>)[field] as number} onChange={e => updateSetting('content', field, parseInt(e.target.value))} />
                      </div>
                    ))}
                    <div>
                      <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>ALLOWED FILE TYPES</label>
                      <input className="st-inp" placeholder="jpg, png, pdf, mp4" value={settings.content.allowedFileTypes.join(', ')} onChange={e => updateArraySetting('content', 'allowedFileTypes', e.target.value)} />
                      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginTop: '4px' }}>Comma-separated list of file extensions</p>
                    </div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Clock size={15} color={BLUE} />
                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Data Retention</h3>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '16px' }}>Settings for data storage and cleanup</p>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>CONTENT RETENTION (DAYS)</label>
                    <input className="st-inp" type="number" min="30" max="3650" value={settings.content.contentRetentionDays} onChange={e => updateSetting('content', 'contentRetentionDays', parseInt(e.target.value))} />
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginTop: '6px' }}>How long to keep deleted content before permanent removal</p>
                  </div>
                </div>
              </div>
            )}

            {/* Security */}
            {!initialLoading && activeTab === 'security' && (
              <div className="st-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Shield size={15} color={BLUE} />
                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Authentication Security</h3>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '16px' }}>User authentication and session settings</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { label: 'Session Timeout (Hours)', field: 'sessionTimeout', min: '1', max: '168' },
                      { label: 'Max Login Attempts', field: 'maxLoginAttempts', min: '3', max: '10' },
                    ].map(({ label, field, min, max }) => (
                      <div key={field}>
                        <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>{label.toUpperCase()}</label>
                        <input className="st-inp" type="number" min={min} max={max} value={(settings.security as Record<string, unknown>)[field] as number} onChange={e => updateSetting('security', field, parseInt(e.target.value))} />
                      </div>
                    ))}
                    {[
                      { label: 'Email Verification', key: 'requireEmailVerification', sub: 'Require email verification for new accounts' },
                      { label: 'Strong Passwords', key: 'enforceStrongPasswords', sub: 'Enforce strong password requirements' },
                    ].map(({ label, key, sub }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>{label}</p>
                          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{sub}</p>
                        </div>
                        <button onClick={() => updateSetting('security', key, !(settings.security as Record<string, unknown>)[key])}
                          style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', background: (settings.security as Record<string, unknown>)[key] ? BLUE : 'rgba(255,255,255,0.1)', transition: 'background 0.2s', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '3px', left: (settings.security as Record<string, unknown>)[key] ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Key size={15} color={BLUE} />
                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Advanced Security</h3>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '16px' }}>Additional security features and controls</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>Two-Factor Authentication</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>Enable 2FA for admin accounts</p>
                    </div>
                    <button onClick={() => updateSetting('security', 'enableTwoFactor', !settings.security.enableTwoFactor)}
                      style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', background: settings.security.enableTwoFactor ? BLUE : 'rgba(255,255,255,0.1)', transition: 'background 0.2s', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '3px', left: settings.security.enableTwoFactor ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </button>
                  </div>
                  <div style={{ background: 'rgba(55,181,255,0.04)', border: '1px solid rgba(55,181,255,0.12)', borderRadius: '10px', padding: '14px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>SECURITY STATUS</p>
                    {[
                      { label: 'SSL Certificate', status: 'Active', good: true },
                      { label: 'Firewall', status: 'Enabled', good: true },
                      { label: 'Intrusion Detection', status: 'Monitoring', good: false },
                    ].map(({ label, status, good }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{label}</span>
                        <span style={{ background: good ? 'rgba(34,197,94,0.12)' : `rgba(55,181,255,0.12)`, color: good ? GREEN : BLUE, padding: '2px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>{status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {!initialLoading && activeTab === 'notifications' && (
              <div className="st-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {[
                  {
                    icon: Bell, title: 'System Notifications', sub: 'Configure when and how to send notifications',
                    switches: [
                      { label: 'Email Notifications', key: 'emailNotifications', sub: 'Send notifications via email', section: 'notifications' as const },
                      { label: 'Push Notifications', key: 'pushNotifications', sub: 'Send browser push notifications', section: 'notifications' as const },
                      { label: 'Admin Alerts', key: 'adminAlerts', sub: 'Critical system alerts for admins', section: 'notifications' as const },
                    ],
                  },
                  {
                    icon: Mail, title: 'Alert Types', sub: 'Specific events that trigger notifications',
                    switches: [
                      { label: 'New User Registration', key: 'userRegistrationAlert', sub: 'When new users register', section: 'notifications' as const },
                      { label: 'Content Moderation', key: 'contentModerationAlert', sub: 'When content needs review', section: 'notifications' as const },
                      { label: 'System Health', key: 'systemHealthAlert', sub: 'System performance issues', section: 'notifications' as const },
                    ],
                  },
                ].map(({ icon: Icon, title, sub, switches }) => (
                  <div key={title} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Icon size={15} color={BLUE} />
                      <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{title}</h3>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '16px' }}>{sub}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {switches.map(({ label, key, sub: itemSub, section }) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>{label}</p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{itemSub}</p>
                          </div>
                          <button onClick={() => updateSetting(section, key, !(settings[section] as Record<string, unknown>)[key])}
                            style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', background: (settings[section] as Record<string, unknown>)[key] ? BLUE : 'rgba(255,255,255,0.1)', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                            <div style={{ position: 'absolute', top: '3px', left: (settings[section] as Record<string, unknown>)[key] ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Performance */}
            {!initialLoading && activeTab === 'performance' && (
              <div className="st-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Server size={15} color={BLUE} />
                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Caching & Storage</h3>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '16px' }}>Performance optimization settings</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>CACHE DURATION (SECONDS)</label>
                      <input className="st-inp" type="number" min="60" max="3600" value={settings.performance.cacheDuration} onChange={e => updateSetting('performance', 'cacheDuration', parseInt(e.target.value))} />
                    </div>
                    {[
                      { label: 'Data Compression', key: 'enableCompression', sub: 'Enable gzip compression' },
                      { label: 'Content Delivery Network', key: 'enableCDN', sub: 'Use CDN for static assets' },
                    ].map(({ label, key, sub }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>{label}</p>
                          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{sub}</p>
                        </div>
                        <button onClick={() => updateSetting('performance', key, !(settings.performance as Record<string, unknown>)[key])}
                          style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', background: (settings.performance as Record<string, unknown>)[key] ? BLUE : 'rgba(255,255,255,0.1)', transition: 'background 0.2s', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '3px', left: (settings.performance as Record<string, unknown>)[key] ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Users size={15} color={BLUE} />
                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Rate Limiting</h3>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '16px' }}>API usage limits and throttling</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { label: 'Requests per Window', field: 'rateLimitRequests', min: '10', max: '1000' },
                      { label: 'Window Duration (Seconds)', field: 'rateLimitWindow', min: '60', max: '3600' },
                    ].map(({ label, field, min, max }) => (
                      <div key={field}>
                        <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>{label.toUpperCase()}</label>
                        <input className="st-inp" type="number" min={min} max={max} value={(settings.performance as Record<string, unknown>)[field] as number} onChange={e => updateSetting('performance', field, parseInt(e.target.value))} />
                      </div>
                    ))}
                    <div style={{ background: 'rgba(55,181,255,0.04)', border: '1px solid rgba(55,181,255,0.12)', borderRadius: '10px', padding: '14px', marginTop: '4px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>CURRENT PERFORMANCE</p>
                      {[
                        { label: 'Avg Response Time', value: '120ms' },
                        { label: 'Cache Hit Rate', value: '85%' },
                        { label: 'Current Load', value: 'Low' },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{label}</span>
                          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
