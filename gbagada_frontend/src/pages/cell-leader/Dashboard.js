import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UsersRound, Users, ClipboardList, CalendarClock, UserPlus2,
  LifeBuoy, LogOut, Menu as MenuIcon, Trash2, Phone, MapPin,
  PhoneCall, Settings as SettingsIcon, DollarSign, Megaphone
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const tokens = {
  ink: '#0B1030', ink2: '#141B4D', indigo: '#1E2B7A', indigoLight: '#2E3FA0',
  gold: '#C9A227', goldSoft: '#F6ECC9', canvas: '#F3F4F8', surface: '#FFFFFF',
  text: '#1C2333', muted: '#6B7280', line: '#E7E8EF', success: '#1E8E5A', danger: '#C0392B',
};

const NAV = [
  { key: 'overview', label: 'Overview', icon: UsersRound },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'meeting', label: 'Meeting Info', icon: CalendarClock },
  { key: 'activity', label: 'Weekly Activity', icon: ClipboardList },
  { key: 'mvp', label: 'Register Visitor', icon: UserPlus2 },
  { key: 'requests', label: 'Request Funds', icon: DollarSign },
  { key: 'followup', label: 'Follow-Up', icon: PhoneCall },
  { key: 'help', label: 'Ask Admin for Help', icon: LifeBuoy },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

const getErrorMessage = (err) => {
  if (!err) return 'An unknown error occurred.';
  if (err.response?.data?.detail) {
    const detail = err.response.data.detail;
    if (Array.isArray(detail)) {
      return detail.map(d => d.msg || JSON.stringify(d)).join('; ');
    }
    if (typeof detail === 'string') return detail;
    return JSON.stringify(detail);
  }
  return err.message || 'An error occurred';
};

export default function CellLeaderDashboard() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [cell, setCell] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [inactiveMembers, setInactiveMembers] = useState([]);
  const [myHelpRequests, setMyHelpRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchCell();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cell) return;
    if (activeTab === 'members') fetchMembers();
    if (activeTab === 'announcements') fetchAnnouncements();
    if (activeTab === 'activity') fetchActivities();
    if (activeTab === 'requests') fetchMyRequests();
    if (activeTab === 'followup') fetchInactiveMembers();
    if (activeTab === 'settings') fetchProfile();
    if (activeTab === 'help') fetchMyHelpRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, cell]);

  const fetchCell = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/cell-leader/my-cell', { headers });
      setCell(res.data);
      setMeetingForm({
        meeting_day: res.data.meeting_day || '',
        meeting_time: res.data.meeting_time || '',
        meeting_location: res.data.meeting_location || '',
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await axios.get('/api/cell-leader/my-cell/members', { headers });
      setMembers(res.data);
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get('/api/announcements/', { headers });
      setAnnouncements(res.data);
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const fetchActivities = async () => {
    try {
      const res = await axios.get('/api/cell-leader/my-cell/activities', { headers });
      setActivities(res.data);
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const fetchMyRequests = async () => {
    try {
      const res = await axios.get('/api/requests/', { headers });
      setMyRequests(res.data.filter(r => r.requested_by_id === user?.id));
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const fetchInactiveMembers = async () => {
    try {
      const res = await axios.get('/api/cell-leader/my-cell/inactive-members', { headers });
      setInactiveMembers(res.data);
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get('/api/users/me', { headers });
      setProfileForm({
        full_name: res.data.full_name || '',
        email: res.data.email || '',
        phone_number: res.data.phone_number || '',
      });
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const fetchMyHelpRequests = async () => {
    try {
      const res = await axios.get('/api/cell-leader/my-cell/help-requests', { headers });
      setMyHelpRequests(res.data);
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // ---- Add member (search + select) ----
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const searchMembers = async (q) => {
    setMemberQuery(q);
    if (!q) { setMemberResults([]); return; }
    try {
      const res = await axios.get(`/api/cell-leader/members/search?q=${encodeURIComponent(q)}`, { headers });
      setMemberResults(res.data);
    } catch (err) { /* silent */ }
  };
  const addMember = async (memberId) => {
    try {
      await axios.post(`/api/cell-leader/my-cell/members/${memberId}`, {}, { headers });
      showToast('Member added');
      setMemberQuery(''); setMemberResults([]);
      fetchMembers(); fetchCell();
    } catch (err) { showToast(getErrorMessage(err)); }
  };
  const removeMember = async (memberId) => {
    if (!window.confirm('Remove this member from the cell?')) return;
    try {
      await axios.delete(`/api/cell-leader/my-cell/members/${memberId}`, { headers });
      showToast('Member removed');
      fetchMembers(); fetchCell();
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  // ---- Meeting info ----
  const [meetingForm, setMeetingForm] = useState({ meeting_day: '', meeting_time: '', meeting_location: '' });
  const saveMeetingInfo = async () => {
    try {
      await axios.put('/api/cell-leader/my-cell/meeting-info', meetingForm, { headers });
      showToast('Meeting info updated');
      fetchCell();
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  // ---- Weekly activity (incl. offering) ----
  const [activityForm, setActivityForm] = useState({
    week_start_date: new Date().toISOString().split('T')[0],
    attendance: '', new_members_count: '', offering_amount: '',
    meeting_location: '', attendee_names: '', children_names: '',
    prayer_points: '', testimonies: '', challenges: '', report: '',
    agenda_items: []
  });
  const addAgendaItem = () => {
    setActivityForm({
      ...activityForm,
      agenda_items: [...activityForm.agenda_items, { segment_name: '', start_time: '', end_time: '' }]
    });
  };
  const updateAgendaItem = (index, field, value) => {
    const items = [...activityForm.agenda_items];
    items[index] = { ...items[index], [field]: value };
    setActivityForm({ ...activityForm, agenda_items: items });
  };
  const removeAgendaItem = (index) => {
    setActivityForm({
      ...activityForm,
      agenda_items: activityForm.agenda_items.filter((_, i) => i !== index)
    });
  };
  const submitActivity = async () => {
    try {
      await axios.post('/api/cell-leader/my-cell/activity', {
        ...activityForm,
        attendance: activityForm.attendance ? parseInt(activityForm.attendance) : 0,
        new_members_count: activityForm.new_members_count ? parseInt(activityForm.new_members_count) : 0,
        offering_amount: activityForm.offering_amount ? parseFloat(activityForm.offering_amount) : null,
        agenda_items: activityForm.agenda_items.filter(a => a.segment_name),
      }, { headers });
      showToast('Activity submitted');
      setActivityForm({
        week_start_date: new Date().toISOString().split('T')[0],
        attendance: '', new_members_count: '', offering_amount: '',
        meeting_location: '', attendee_names: '', children_names: '',
        prayer_points: '', testimonies: '', challenges: '', report: '',
        agenda_items: []
      });
      fetchActivities();
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  // ---- Register MVP ----
  const [mvpForm, setMvpForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    visit_date: new Date().toISOString().split('T')[0], notes: ''
  });
  const submitMvp = async () => {
    if (!mvpForm.first_name || !mvpForm.last_name) { showToast('First and last name are required'); return; }
    try {
      await axios.post('/api/cell-leader/my-cell/register-mvp', mvpForm, { headers });
      showToast(`${mvpForm.first_name} registered as a visitor for follow-up`);
      setMvpForm({ first_name: '', last_name: '', email: '', phone: '', visit_date: new Date().toISOString().split('T')[0], notes: '' });
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  // ---- Request Funds ----
  const [requestForm, setRequestForm] = useState({ amount: '', purpose: '', description: '', date_needed: '' });
  const submitRequest = async () => {
    if (!requestForm.amount || !requestForm.description) { showToast('Amount and description are required'); return; }
    try {
      await axios.post('/api/requests/', {
        amount: parseFloat(requestForm.amount),
        purpose: requestForm.purpose,
        description: requestForm.description,
        date_needed: requestForm.date_needed || null,
      }, { headers });
      showToast('Request sent for approval');
      setRequestForm({ amount: '', purpose: '', description: '', date_needed: '' });
      fetchMyRequests();
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  // ---- Help request ----
  const [helpForm, setHelpForm] = useState({ description: '' });
  const submitHelp = async () => {
    if (!helpForm.description) { showToast('Please describe what help is needed'); return; }
    try {
      await axios.post('/api/cell-leader/my-cell/help-requests', helpForm, { headers });
      showToast('Sent to admin');
      setHelpForm({ description: '' });
      fetchMyHelpRequests();
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  // ---- Follow-up form ----
  const [followUpForm, setFollowUpForm] = useState({
    member_id: '', follow_up_date: new Date().toISOString().split('T')[0],
    method: 'call', reason_for_inactivity: '', notes: '', outcome: ''
  });
  const submitFollowUp = async () => {
    if (!followUpForm.member_id) { showToast('Select a member first'); return; }
    try {
      await axios.post(
        `/api/cell-leader/my-cell/members/${followUpForm.member_id}/follow-up`,
        followUpForm, { headers }
      );
      showToast('Follow-up logged');
      setFollowUpForm({
        member_id: '', follow_up_date: new Date().toISOString().split('T')[0],
        method: 'call', reason_for_inactivity: '', notes: '', outcome: ''
      });
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  // ---- Settings: profile + password ----
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', phone_number: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await axios.put('/api/users/me', profileForm, { headers });
      showToast('Profile updated');
    } catch (err) { showToast(getErrorMessage(err)); }
    finally { setSavingProfile(false); }
  };

  const changePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) { showToast('Fill in both password fields'); return; }
    if (passwordForm.new_password !== passwordForm.confirm_password) { showToast('New passwords do not match'); return; }
    setSavingPassword(true);
    try {
      await axios.post('/api/users/me/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      }, { headers });
      showToast('Password changed');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) { showToast(getErrorMessage(err)); }
    finally { setSavingPassword(false); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
        Loading your cell...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: 24, textAlign: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>Can't load your cell</div>
        <div style={{ color: tokens.muted }}>{error}</div>
        <button onClick={handleLogout} className="cl-logout" style={{ position: 'static', width: 'auto', padding: '10px 20px' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    );
  }

  return (
    <div className="cl-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .cl-root { --ink: ${tokens.ink}; --ink2: ${tokens.ink2}; --indigo: ${tokens.indigo}; --indigo-light: ${tokens.indigoLight};
          --gold: ${tokens.gold}; --gold-soft: ${tokens.goldSoft}; --canvas: ${tokens.canvas}; --surface: ${tokens.surface};
          --text: ${tokens.text}; --muted: ${tokens.muted}; --line: ${tokens.line}; --success: ${tokens.success}; --danger: ${tokens.danger};
          font-family: 'Inter', sans-serif; color: var(--text); background: var(--canvas); min-height: 100vh; display: flex; }
        .cl-root * { box-sizing: border-box; }
        .cl-root button { font-family: inherit; cursor: pointer; }
        .cl-sidebar { width: 260px; flex-shrink: 0; background: linear-gradient(180deg, var(--ink) 0%, var(--ink2) 100%);
          display: flex; flex-direction: column; height: 100vh; position: sticky; top: 0; }
        .cl-brand { padding: 26px 20px 18px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .cl-brand-name { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 16px; color: #fff; }
        .cl-brand-sub { font-size: 10.5px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--gold); margin-top: 4px; }
        .cl-profile { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .cl-profile-name { font-size: 13px; font-weight: 600; color: #fff; }
        .cl-profile-role { font-size: 10px; color: var(--gold); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
        .cl-nav { flex: 1; padding: 14px 12px; }
        .cl-nav-btn { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: transparent;
          border: none; border-radius: 10px; color: rgba(255,255,255,0.72); font-size: 13px; font-weight: 500; text-align: left; margin-bottom: 3px; }
        .cl-nav-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .cl-nav-btn.active { background: var(--indigo-light); color: #fff; box-shadow: inset 3px 0 0 var(--gold); }
        .cl-logout { margin: 10px 12px 16px; display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px;
          background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 12.5px; width: calc(100% - 24px); }
        .cl-main { flex: 1; min-width: 0; }
        .cl-topbar { height: 64px; background: var(--surface); border-bottom: 1px solid var(--line); display: flex;
          align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 10; }
        .cl-content { padding: 24px 28px 48px; max-width: 1100px; }
        .cl-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 20px; margin-bottom: 18px; }
        .cl-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px; }
        .cl-stat-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
        .cl-stat-label { font-size: 11.5px; color: var(--muted); font-weight: 600; }
        .cl-stat-value { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 22px; margin-top: 6px; }
        .cl-input, .cl-textarea, select.cl-input { width: 100%; padding: 9px 12px; border: 1px solid var(--line); border-radius: 8px;
          font-size: 13px; font-family: inherit; margin-bottom: 10px; background: #fff; }
        .cl-textarea { resize: vertical; min-height: 60px; }
        .cl-label { font-size: 12px; color: var(--muted); font-weight: 600; margin-bottom: 4px; display: block; }
        .cl-btn { background: var(--indigo); color: #fff; border: none; padding: 10px 18px; border-radius: 9px; font-size: 13px; font-weight: 600; }
        .cl-btn:hover { background: var(--indigo-light); }
        .cl-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--line); }
        .cl-row:last-child { border-bottom: none; }
        .cl-toast { position: fixed; bottom: 20px; right: 20px; background: var(--ink); color: #fff; padding: 12px 18px;
          border-radius: 10px; font-size: 13px; z-index: 100; }
        .cl-empty { color: var(--muted); font-size: 13px; text-align: center; padding: 20px; }
        .cl-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 760px) {
          .cl-sidebar { position: fixed; left: 0; top: 0; transform: translateX(-100%); transition: transform 0.2s ease; width: 260px; z-index: 40; }
          .cl-sidebar.open { transform: translateX(0); }
          .cl-stats { grid-template-columns: 1fr; }
          .cl-grid2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <aside className={`cl-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="cl-brand">
          <div className="cl-brand-name">Dominion City</div>
          <div className="cl-brand-sub">Cell Leader Portal</div>
        </div>
        <div className="cl-profile">
          <div className="cl-profile-name">{user?.full_name || 'Cell Leader'}</div>
          <div className="cl-profile-role">Leader of {cell?.name || 'Cell'}</div>
        </div>
        <nav className="cl-nav">
          {NAV.map((item) => (
            <button
              key={item.key}
              className={`cl-nav-btn ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.key); setMobileOpen(false); }}
            >
              <item.icon size={16} /> {item.label}
            </button>
          ))}
        </nav>
        <button className="cl-logout" onClick={handleLogout}><LogOut size={15} /> Logout</button>
      </aside>

      <div className="cl-main">
        <header className="cl-topbar">
          <button onClick={() => setMobileOpen(true)} style={{ display: 'none' }} className="cl-menu-toggle"><MenuIcon size={20} /></button>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 15 }}>
            {NAV.find(n => n.key === activeTab)?.label}
          </div>
          <div style={{ fontSize: 12, color: tokens.muted }}>{cell?.name}</div>
        </header>

        <div className="cl-content">
          {activeTab === 'overview' && (
            <>
              <div className="cl-stats">
                <div className="cl-stat-card">
                  <div className="cl-stat-label">Cell</div>
                  <div className="cl-stat-value" style={{ fontSize: 16 }}>{cell?.name}</div>
                </div>
                <div className="cl-stat-card">
                  <div className="cl-stat-label">Members</div>
                  <div className="cl-stat-value">{cell?.member_count ?? 0}</div>
                </div>
                <div className="cl-stat-card">
                  <div className="cl-stat-label">Meets</div>
                  <div className="cl-stat-value" style={{ fontSize: 14 }}>
                    {cell?.meeting_day || 'Not set'}{cell?.meeting_time ? ` · ${cell.meeting_time}` : ''}
                  </div>
                </div>
              </div>
              <div className="cl-card">
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{cell?.name}</div>
                <div style={{ color: tokens.muted, fontSize: 13 }}>{cell?.description || 'No description set.'}</div>
                {cell?.meeting_location && (
                  <div style={{ fontSize: 13, marginTop: 8 }}>
                    <MapPin size={13} style={{ verticalAlign: 'middle' }} /> {cell.meeting_location}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'announcements' && (
            <div className="cl-card">
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Announcements</div>
              {announcements.length === 0 ? (
                <div className="cl-empty">Nothing posted for you right now.</div>
              ) : announcements.map((a) => (
                <div key={a.id} className="cl-row" style={{ display: 'block' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{a.title}</div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase',
                      background: a.priority === 'urgent' ? '#fff3e0' : a.priority === 'high' ? '#ffebee' : '#e8f5e9',
                      color: a.priority === 'urgent' ? '#ef6c00' : a.priority === 'high' ? tokens.danger : tokens.success,
                    }}>{a.priority}</span>
                  </div>
                  <div style={{ fontSize: 12, color: tokens.muted, marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.content}</div>
                  <div style={{ fontSize: 11, color: tokens.muted, marginTop: 6 }}>
                    {new Date(a.published_at || a.created_at).toLocaleDateString()}
                    {a.target_cell_name && ` · Cell: ${a.target_cell_name}`}
                    {a.target_department_name && ` · Dept: ${a.target_department_name}`}
                    {a.target_user_name && ` · Memo to: ${a.target_user_name}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'members' && (
            <>
              <div className="cl-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Add a Member</div>
                <div style={{ fontSize: 12.5, color: tokens.muted, marginBottom: 8 }}>
                  Only for people already registered as church members. For a first-time visitor, use "Register Visitor" instead.
                </div>
                <input
                  className="cl-input"
                  placeholder="Search registered church members by name or email..."
                  value={memberQuery}
                  onChange={(e) => searchMembers(e.target.value)}
                />
                {memberResults.length > 0 && (
                  <div style={{ border: `1px solid ${tokens.line}`, borderRadius: 8, marginTop: -4, marginBottom: 10 }}>
                    {memberResults.map((m) => (
                      <div key={m.id} className="cl-row" style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: 13 }}>{m.name} <span style={{ color: tokens.muted }}>({m.email})</span></span>
                        <button className="cl-btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => addMember(m.id)}>Add</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="cl-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Cell Roster ({members.length})</div>
                {members.length === 0 ? (
                  <div className="cl-empty">No members yet — search above to add one.</div>
                ) : members.map((m) => (
                  <div key={m.id} className="cl-row">
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: tokens.muted, display: 'flex', gap: 12, marginTop: 2 }}>
                        {m.phone_number && <span><Phone size={11} style={{ verticalAlign: 'middle' }} /> {m.phone_number}</span>}
                        {m.address && <span><MapPin size={11} style={{ verticalAlign: 'middle' }} /> {m.address}</span>}
                      </div>
                    </div>
                    <button onClick={() => removeMember(m.id)} style={{ background: 'none', border: 'none', color: tokens.danger }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'meeting' && (
            <div className="cl-card">
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Meeting Day, Time & Venue</div>
              <label className="cl-label">Day</label>
              <input className="cl-input" placeholder="e.g. Wednesday" value={meetingForm.meeting_day}
                onChange={(e) => setMeetingForm({ ...meetingForm, meeting_day: e.target.value })} />
              <label className="cl-label">Time</label>
              <input className="cl-input" placeholder="e.g. 6:00 PM" value={meetingForm.meeting_time}
                onChange={(e) => setMeetingForm({ ...meetingForm, meeting_time: e.target.value })} />
              <label className="cl-label">Venue</label>
              <input className="cl-input" placeholder="e.g. 12 Adeola Street" value={meetingForm.meeting_location}
                onChange={(e) => setMeetingForm({ ...meetingForm, meeting_location: e.target.value })} />
              <button className="cl-btn" onClick={saveMeetingInfo}>Save</button>
            </div>
          )}

          {activeTab === 'activity' && (
            <>
              <div className="cl-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Submit Weekly Activity</div>
                <label className="cl-label">Week Starting</label>
                <input type="date" className="cl-input" value={activityForm.week_start_date}
                  onChange={(e) => setActivityForm({ ...activityForm, week_start_date: e.target.value })} />
                <div className="cl-grid2">
                  <div>
                    <label className="cl-label">Attendance</label>
                    <input type="number" className="cl-input" value={activityForm.attendance}
                      onChange={(e) => setActivityForm({ ...activityForm, attendance: e.target.value })} />
                  </div>
                  <div>
                    <label className="cl-label">New Members</label>
                    <input type="number" className="cl-input" value={activityForm.new_members_count}
                      onChange={(e) => setActivityForm({ ...activityForm, new_members_count: e.target.value })} />
                  </div>
                </div>
                <label className="cl-label">Offering (₦) — if there was any</label>
                <input type="number" className="cl-input" placeholder="Leave blank if none" value={activityForm.offering_amount}
                  onChange={(e) => setActivityForm({ ...activityForm, offering_amount: e.target.value })} />
                <label className="cl-label">Location (for this meeting)</label>
                <input className="cl-input" placeholder="e.g. Sister Ada's house" value={activityForm.meeting_location}
                  onChange={(e) => setActivityForm({ ...activityForm, meeting_location: e.target.value })} />
                <label className="cl-label">Names of Attendees</label>
                <textarea className="cl-textarea" placeholder="List names, one per line or comma-separated"
                  value={activityForm.attendee_names}
                  onChange={(e) => setActivityForm({ ...activityForm, attendee_names: e.target.value })} />
                <label className="cl-label">Names of Children Present</label>
                <textarea className="cl-textarea" placeholder="List children's names, if any"
                  value={activityForm.children_names}
                  onChange={(e) => setActivityForm({ ...activityForm, children_names: e.target.value })} />

                <label className="cl-label">Meeting Agenda / Program</label>
                {activityForm.agenda_items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                    <input
                      className="cl-input"
                      style={{ flex: 2, marginBottom: 0 }}
                      placeholder="e.g. Praise and Worship"
                      value={item.segment_name}
                      onChange={(e) => updateAgendaItem(i, 'segment_name', e.target.value)}
                    />
                    <input
                      className="cl-input"
                      style={{ flex: 1, marginBottom: 0 }}
                      placeholder="6:01"
                      value={item.start_time}
                      onChange={(e) => updateAgendaItem(i, 'start_time', e.target.value)}
                    />
                    <span style={{ color: tokens.muted, fontSize: 12 }}>–</span>
                    <input
                      className="cl-input"
                      style={{ flex: 1, marginBottom: 0 }}
                      placeholder="6:08"
                      value={item.end_time}
                      onChange={(e) => updateAgendaItem(i, 'end_time', e.target.value)}
                    />
                    <button
                      onClick={() => removeAgendaItem(i)}
                      style={{ background: 'none', border: 'none', color: tokens.danger, fontSize: 18, lineHeight: 1, cursor: 'pointer' }}
                    >×</button>
                  </div>
                ))}
                <button
                  onClick={addAgendaItem}
                  style={{ background: 'none', border: `1px dashed ${tokens.line}`, borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: tokens.indigo, marginBottom: 10, width: '100%' }}
                >
                  + Add agenda item
                </button>

                <label className="cl-label">Prayer Points</label>
                <textarea className="cl-textarea" value={activityForm.prayer_points}
                  onChange={(e) => setActivityForm({ ...activityForm, prayer_points: e.target.value })} />
                <label className="cl-label">Testimonies</label>
                <textarea className="cl-textarea" value={activityForm.testimonies}
                  onChange={(e) => setActivityForm({ ...activityForm, testimonies: e.target.value })} />
                <label className="cl-label">Challenges</label>
                <textarea className="cl-textarea" value={activityForm.challenges}
                  onChange={(e) => setActivityForm({ ...activityForm, challenges: e.target.value })} />
                <label className="cl-label">General Report</label>
                <textarea className="cl-textarea" value={activityForm.report}
                  onChange={(e) => setActivityForm({ ...activityForm, report: e.target.value })} />
                <button className="cl-btn" onClick={submitActivity}>Submit</button>
              </div>
              <div className="cl-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Past Activity Reports</div>
                {activities.length === 0 ? <div className="cl-empty">No reports submitted yet.</div> : activities.map((a) => (
                  <div key={a.id} className="cl-row" style={{ display: 'block' }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>
                      Week of {new Date(a.week_start_date).toLocaleDateString()}
                      {a.offering_amount ? ` · ₦${a.offering_amount.toLocaleString()} offering` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: tokens.muted, marginTop: 2 }}>
                      Attendance: {a.attendance ?? 0} {a.new_members_count ? `· ${a.new_members_count} new` : ''}
                      {a.meeting_location ? ` · ${a.meeting_location}` : ''}
                    </div>
                    {a.attendee_names && (
                      <div style={{ fontSize: 12, color: tokens.muted, marginTop: 4 }}>
                        <strong>Attendees:</strong> {a.attendee_names}
                      </div>
                    )}
                    {a.children_names && (
                      <div style={{ fontSize: 12, color: tokens.muted, marginTop: 2 }}>
                        <strong>Children:</strong> {a.children_names}
                      </div>
                    )}
                    {a.agenda_items && a.agenda_items.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        {a.agenda_items.map((item, i) => (
                          <div key={i} style={{ fontSize: 12, color: tokens.muted }}>
                            {item.segment_name}{(item.start_time || item.end_time) && `: ${item.start_time || ''}${item.end_time ? `–${item.end_time}` : ''}`}
                          </div>
                        ))}
                      </div>
                    )}
                    {a.report && <div style={{ fontSize: 12, color: tokens.muted, marginTop: 4 }}>{a.report}</div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'mvp' && (
            <div className="cl-card">
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Register a First-Time Visitor</div>
              <div style={{ fontSize: 12.5, color: tokens.muted, marginBottom: 10 }}>
                For someone who isn't a registered church member yet. They'll be assigned to you for follow-up.
              </div>
              <div className="cl-grid2">
                <div>
                  <label className="cl-label">First Name</label>
                  <input className="cl-input" value={mvpForm.first_name} onChange={(e) => setMvpForm({ ...mvpForm, first_name: e.target.value })} />
                </div>
                <div>
                  <label className="cl-label">Last Name</label>
                  <input className="cl-input" value={mvpForm.last_name} onChange={(e) => setMvpForm({ ...mvpForm, last_name: e.target.value })} />
                </div>
              </div>
              <label className="cl-label">Phone</label>
              <input className="cl-input" value={mvpForm.phone} onChange={(e) => setMvpForm({ ...mvpForm, phone: e.target.value })} />
              <label className="cl-label">Email</label>
              <input className="cl-input" value={mvpForm.email} onChange={(e) => setMvpForm({ ...mvpForm, email: e.target.value })} />
              <label className="cl-label">Visit Date</label>
              <input type="date" className="cl-input" value={mvpForm.visit_date} onChange={(e) => setMvpForm({ ...mvpForm, visit_date: e.target.value })} />
              <label className="cl-label">Notes</label>
              <textarea className="cl-textarea" value={mvpForm.notes} onChange={(e) => setMvpForm({ ...mvpForm, notes: e.target.value })} />
              <button className="cl-btn" onClick={submitMvp}>Register Visitor</button>
            </div>
          )}

          {activeTab === 'requests' && (
            <>
              <div className="cl-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Request Funds</div>
                <div style={{ fontSize: 12.5, color: tokens.muted, marginBottom: 10 }}>
                  Sent to the Overall Pastor / Super Admin for approval.
                </div>
                <label className="cl-label">Amount (₦)</label>
                <input type="number" className="cl-input" value={requestForm.amount}
                  onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })} />
                <label className="cl-label">Purpose</label>
                <input className="cl-input" placeholder="e.g. Refreshments for meeting" value={requestForm.purpose}
                  onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })} />
                <label className="cl-label">Description</label>
                <textarea className="cl-textarea" value={requestForm.description}
                  onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })} />
                <label className="cl-label">Date Needed (optional)</label>
                <input type="date" className="cl-input" value={requestForm.date_needed}
                  onChange={(e) => setRequestForm({ ...requestForm, date_needed: e.target.value })} />
                <button className="cl-btn" onClick={submitRequest}>Submit Request</button>
              </div>
              <div className="cl-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Your Requests</div>
                {myRequests.length === 0 ? <div className="cl-empty">No requests submitted yet.</div> : myRequests.map((r) => (
                  <div key={r.id} className="cl-row" style={{ display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 13 }}>
                        <strong>₦{r.amount.toLocaleString()}</strong> — {r.purpose || r.description}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                        background: r.status === 'disbursed' ? '#e8f5e9' : r.status === 'approved' ? '#e3f2fd' : r.status === 'rejected' ? '#ffebee' : '#fff3e0',
                        color: r.status === 'disbursed' ? tokens.success : r.status === 'approved' ? '#1565c0' : r.status === 'rejected' ? tokens.danger : '#ef6c00',
                        textTransform: 'uppercase'
                      }}>{r.status}</span>
                    </div>
                    <div style={{ fontSize: 11, color: tokens.muted, marginTop: 4 }}>
                      Submitted {new Date(r.created_at).toLocaleDateString()}
                      {r.date_needed && ` · Needed by ${new Date(r.date_needed).toLocaleDateString()}`}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'help' && (
            <div className="cl-card">
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Need Help From Admin?</div>
              <div style={{ fontSize: 13, color: tokens.muted, marginBottom: 10 }}>
                If a member in your cell needs support, describe it below and it'll go straight to admin.
              </div>
              <textarea className="cl-textarea" placeholder="Describe what's needed..." value={helpForm.description}
                onChange={(e) => setHelpForm({ description: e.target.value })} />
              <button className="cl-btn" onClick={submitHelp}>Send to Admin</button>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="cl-card">
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Your Requests</div>
              {myHelpRequests.length === 0 ? (
                <div className="cl-empty">Nothing sent yet.</div>
              ) : myHelpRequests.map((h) => (
                <div key={h.id} className="cl-row" style={{ display: 'block' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 13, maxWidth: '80%' }}>{h.description}</div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                      background: h.status === 'resolved' ? '#e8f5e9' : '#fff3e0',
                      color: h.status === 'resolved' ? tokens.success : '#ef6c00',
                      textTransform: 'uppercase'
                    }}>{h.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: tokens.muted, marginTop: 4 }}>
                    Sent {new Date(h.created_at).toLocaleDateString()}
                  </div>
                  {h.admin_notes && (
                    <div style={{ fontSize: 12, color: tokens.muted, marginTop: 4, fontStyle: 'italic' }}>
                      Admin: {h.admin_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'followup' && (
            <>
              <div className="cl-card">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Members Not Currently Active</div>
                <div style={{ fontSize: 12.5, color: tokens.muted, marginBottom: 10 }}>
                  These members in your cell aren't marked active — log a check-in when you follow up.
                </div>
                {inactiveMembers.length === 0 ? (
                  <div className="cl-empty">Everyone in your cell is active — nothing to follow up on.</div>
                ) : inactiveMembers.map((m) => (
                  <div key={m.id} className="cl-row">
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: tokens.muted, display: 'flex', gap: 12, marginTop: 2 }}>
                        {m.phone_number && <span><Phone size={11} style={{ verticalAlign: 'middle' }} /> {m.phone_number}</span>}
                        <span>Status: {m.membership_status}</span>
                      </div>
                    </div>
                    <button
                      className="cl-btn"
                      style={{ padding: '5px 12px', fontSize: 12 }}
                      onClick={() => setFollowUpForm({ ...followUpForm, member_id: m.id })}
                    >
                      Log Follow-Up
                    </button>
                  </div>
                ))}
              </div>

              {followUpForm.member_id && (
                <div className="cl-card">
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>
                    Log Follow-Up — {inactiveMembers.find(m => m.id === followUpForm.member_id)?.name}
                  </div>
                  <label className="cl-label">Date</label>
                  <input type="date" className="cl-input" value={followUpForm.follow_up_date}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, follow_up_date: e.target.value })} />
                  <label className="cl-label">Method</label>
                  <select className="cl-input" value={followUpForm.method}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, method: e.target.value })}>
                    <option value="call">Phone Call</option>
                    <option value="visitation">Visitation</option>
                    <option value="message">Message</option>
                    <option value="other">Other</option>
                  </select>
                  <label className="cl-label">Why did they stop coming?</label>
                  <textarea className="cl-textarea" value={followUpForm.reason_for_inactivity}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, reason_for_inactivity: e.target.value })} />
                  <label className="cl-label">Notes</label>
                  <textarea className="cl-textarea" value={followUpForm.notes}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })} />
                  <label className="cl-label">Outcome</label>
                  <input className="cl-input" placeholder="e.g. Will return next week, No answer, Moved away"
                    value={followUpForm.outcome} onChange={(e) => setFollowUpForm({ ...followUpForm, outcome: e.target.value })} />
                  <button className="cl-btn" onClick={submitFollowUp}>Save Follow-Up</button>
                </div>
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <>
              <div className="cl-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Profile</div>
                <label className="cl-label">Full Name</label>
                <input className="cl-input" value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
                <label className="cl-label">Email</label>
                <input className="cl-input" value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
                <label className="cl-label">Phone Number</label>
                <input className="cl-input" value={profileForm.phone_number}
                  onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })} />
                <button className="cl-btn" onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
              <div className="cl-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Change Password</div>
                <label className="cl-label">Current Password</label>
                <input type="password" className="cl-input" value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} />
                <label className="cl-label">New Password</label>
                <input type="password" className="cl-input" value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} />
                <label className="cl-label">Confirm New Password</label>
                <input type="password" className="cl-input" value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} />
                <button className="cl-btn" onClick={changePassword} disabled={savingPassword}>
                  {savingPassword ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {toast && <div className="cl-toast">{toast}</div>}
    </div>
  );
}