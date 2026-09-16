import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Building2, Users, ClipboardList, CalendarDays, HandCoins,
  LifeBuoy, LogOut, Menu as MenuIcon, Plus, Trash2,
  Phone, MapPin, PhoneCall, Settings as SettingsIcon, DollarSign, Megaphone,
  Baby, Wallet
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const tokens = {
  ink: '#0B1030', ink2: '#141B4D', indigo: '#1E2B7A', indigoLight: '#2E3FA0',
  gold: '#C9A227', goldSoft: '#F6ECC9', canvas: '#F3F4F8', surface: '#FFFFFF',
  text: '#1C2333', muted: '#6B7280', line: '#E7E8EF', success: '#1E8E5A', danger: '#C0392B',
};

const NAV = [
  { key: 'overview', label: 'Overview', icon: Building2 },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'reports', label: 'Weekly Reports', icon: ClipboardList },
  { key: 'programs', label: 'Programs', icon: CalendarDays },
  { key: 'contributions', label: 'Contributions', icon: HandCoins },
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

export default function DepartmentHeadDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, token } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [dept, setDept] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [members, setMembers] = useState([]);
  const [reports, setReports] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [inactiveMembers, setInactiveMembers] = useState([]);
  const [myHelpRequests, setMyHelpRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const isChildrenMinistryHead = !!dept?.name?.toLowerCase().includes('children');
  const visibleNav = isChildrenMinistryHead
    ? [
        NAV[0],
        { key: 'children', label: "Children's Department", icon: Baby, path: '/children' },
        { key: 'children-offering', label: "Record Offering", icon: Wallet, path: '/children-offering' },
        ...NAV.slice(1)
      ]
    : NAV;

  useEffect(() => {
    fetchDepartment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location.state?.successMessage) {
      showToast(location.state.successMessage);
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dept) return;
    if (activeTab === 'members') fetchMembers();
    if (activeTab === 'announcements') fetchAnnouncements();
    if (activeTab === 'reports') fetchReports();
    if (activeTab === 'programs') fetchPrograms();
    if (activeTab === 'contributions') fetchContributions();
    if (activeTab === 'requests') fetchMyRequests();
    if (activeTab === 'followup') fetchInactiveMembers();
    if (activeTab === 'settings') fetchProfile();
    if (activeTab === 'help') fetchMyHelpRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dept]);

  const fetchDepartment = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/department-head/my-department', { headers });
      setDept(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await axios.get('/api/department-head/my-department/members', { headers });
      setMembers(res.data);
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get('/api/announcements/', { headers });
      setAnnouncements(res.data);
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const fetchReports = async () => {
    try {
      const res = await axios.get('/api/department-head/my-department/activities', { headers });
      setReports(res.data);
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const fetchPrograms = async () => {
    try {
      const res = await axios.get('/api/department-head/my-department/programs', { headers });
      setPrograms(res.data);
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const fetchContributions = async () => {
    try {
      const res = await axios.get('/api/department-head/my-department/contributions', { headers });
      setContributions(res.data);
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
      const res = await axios.get('/api/department-head/my-department/inactive-members', { headers });
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
      const res = await axios.get('/api/department-head/my-department/help-requests', { headers });
      setMyHelpRequests(res.data);
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const searchMembers = async (q) => {
    setMemberQuery(q);
    if (!q) { setMemberResults([]); return; }
    try {
      const res = await axios.get(`/api/department-head/members/search?q=${encodeURIComponent(q)}`, { headers });
      setMemberResults(res.data);
    } catch (err) { /* silent */ }
  };
  const addMember = async (memberId) => {
    try {
      await axios.post(`/api/department-head/my-department/members/${memberId}`, {}, { headers });
      showToast('Member added');
      setMemberQuery(''); setMemberResults([]);
      fetchMembers(); fetchDepartment();
    } catch (err) { showToast(getErrorMessage(err)); }
  };
  const removeMember = async (memberId) => {
    if (!window.confirm('Remove this member from the department?')) return;
    try {
      await axios.delete(`/api/department-head/my-department/members/${memberId}`, { headers });
      showToast('Member removed');
      fetchMembers(); fetchDepartment();
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const [reportForm, setReportForm] = useState({
    week_start_date: new Date().toISOString().split('T')[0],
    activities_performed: '', challenges: '', achievements: '', prayer_requests: '', report: ''
  });
  const submitReport = async () => {
    try {
      await axios.post('/api/department-head/my-department/activity', reportForm, { headers });
      showToast('Report sent to admin');
      setReportForm({ week_start_date: new Date().toISOString().split('T')[0], activities_performed: '', challenges: '', achievements: '', prayer_requests: '', report: '' });
      fetchReports();
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const [programForm, setProgramForm] = useState({ title: '', description: '', program_date: '', program_time: '', location: '' });
  const submitProgram = async () => {
    if (!programForm.title || !programForm.program_date) { showToast('Title and date are required'); return; }
    try {
      await axios.post('/api/department-head/my-department/programs', programForm, { headers });
      showToast('Program recorded');
      setProgramForm({ title: '', description: '', program_date: '', program_time: '', location: '' });
      fetchPrograms();
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  const [contribForm, setContribForm] = useState({ contributor_name: '', amount: '', purpose: '', contribution_date: new Date().toISOString().split('T')[0] });
  const submitContribution = async () => {
    if (!contribForm.amount || !contribForm.contribution_date) { showToast('Amount and date are required'); return; }
    try {
      await axios.post('/api/department-head/my-department/contributions', {
        ...contribForm,
        amount: parseFloat(contribForm.amount),
      }, { headers });
      showToast('Contribution recorded');
      setContribForm({ contributor_name: '', amount: '', purpose: '', contribution_date: new Date().toISOString().split('T')[0] });
      fetchContributions();
    } catch (err) { showToast(getErrorMessage(err)); }
  };

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

  const [followUpForm, setFollowUpForm] = useState({
    member_id: '', follow_up_date: new Date().toISOString().split('T')[0],
    method: 'call', reason_for_inactivity: '', notes: '', outcome: ''
  });
  const submitFollowUp = async () => {
    if (!followUpForm.member_id) { showToast('Select a member first'); return; }
    try {
      await axios.post(
        `/api/department-head/my-department/members/${followUpForm.member_id}/follow-up`,
        followUpForm, { headers }
      );
      showToast('Follow-up logged');
      setFollowUpForm({
        member_id: '', follow_up_date: new Date().toISOString().split('T')[0],
        method: 'call', reason_for_inactivity: '', notes: '', outcome: ''
      });
    } catch (err) { showToast(getErrorMessage(err)); }
  };

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

  const [helpForm, setHelpForm] = useState({ description: '' });
  const submitHelp = async () => {
    if (!helpForm.description) { showToast('Please describe the issue'); return; }
    try {
      await axios.post('/api/department-head/my-department/help-requests', helpForm, { headers });
      showToast('Sent to admin');
      setHelpForm({ description: '' });
      fetchMyHelpRequests();
    } catch (err) { showToast(getErrorMessage(err)); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
        Loading your department...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: 24, textAlign: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>Can't load your department</div>
        <div style={{ color: tokens.muted }}>{error}</div>
        <button onClick={handleLogout} className="hd-logout" style={{ position: 'static', width: 'auto', padding: '10px 20px' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    );
  }

  return (
    <div className="hd-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .hd-root { --ink: ${tokens.ink}; --ink2: ${tokens.ink2}; --indigo: ${tokens.indigo}; --indigo-light: ${tokens.indigoLight};
          --gold: ${tokens.gold}; --gold-soft: ${tokens.goldSoft}; --canvas: ${tokens.canvas}; --surface: ${tokens.surface};
          --text: ${tokens.text}; --muted: ${tokens.muted}; --line: ${tokens.line}; --success: ${tokens.success}; --danger: ${tokens.danger};
          font-family: 'Inter', sans-serif; color: var(--text); background: var(--canvas); min-height: 100vh; display: flex; }
        .hd-root * { box-sizing: border-box; }
        .hd-root button { font-family: inherit; cursor: pointer; }
        .hd-sidebar { width: 260px; flex-shrink: 0; background: linear-gradient(180deg, var(--ink) 0%, var(--ink2) 100%);
          display: flex; flex-direction: column; height: 100vh; position: sticky; top: 0; }
        .hd-brand { padding: 26px 20px 18px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }
        .hd-brand-name { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 16px; color: #fff; }
        .hd-brand-sub { font-size: 10.5px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--gold); margin-top: 4px; }
        .hd-profile { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }
        .hd-profile-name { font-size: 13px; font-weight: 600; color: #fff; }
        .hd-profile-role { font-size: 10px; color: var(--gold); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
        .hd-nav { flex: 1; padding: 14px 12px; overflow-y: auto; min-height: 0; }
        .hd-nav::-webkit-scrollbar { width: 4px; }
        .hd-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .hd-nav-btn { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: transparent;
          border: none; border-radius: 10px; color: rgba(255,255,255,0.72); font-size: 13px; font-weight: 500; text-align: left; margin-bottom: 3px; }
        .hd-nav-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .hd-nav-btn.active { background: var(--indigo-light); color: #fff; box-shadow: inset 3px 0 0 var(--gold); }
        .hd-logout { margin: 10px 12px 16px; display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px;
          background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 12.5px; width: calc(100% - 24px); flex-shrink: 0; }
        .hd-main { flex: 1; min-width: 0; }
        .hd-topbar { height: 64px; background: var(--surface); border-bottom: 1px solid var(--line); display: flex;
          align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 10; }
        .hd-content { padding: 24px 28px 48px; max-width: 1100px; }
        .hd-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 20px; margin-bottom: 18px; }
        .hd-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px; }
        .hd-stat-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
        .hd-stat-label { font-size: 11.5px; color: var(--muted); font-weight: 600; }
        .hd-stat-value { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 22px; margin-top: 6px; }
        .hd-input, .hd-textarea, select.hd-input { width: 100%; padding: 9px 12px; border: 1px solid var(--line); border-radius: 8px;
          font-size: 13px; font-family: inherit; margin-bottom: 10px; background: #fff; }
        .hd-textarea { resize: vertical; min-height: 60px; }
        .hd-label { font-size: 12px; color: var(--muted); font-weight: 600; margin-bottom: 4px; display: block; }
        .hd-btn { background: var(--indigo); color: #fff; border: none; padding: 10px 18px; border-radius: 9px; font-size: 13px; font-weight: 600; }
        .hd-btn:hover { background: var(--indigo-light); }
        .hd-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--line); }
        .hd-row:last-child { border-bottom: none; }
        .hd-toast { position: fixed; bottom: 20px; right: 20px; background: var(--ink); color: #fff; padding: 12px 18px;
          border-radius: 10px; font-size: 13px; z-index: 100; }
        .hd-empty { color: var(--muted); font-size: 13px; text-align: center; padding: 20px; }
        @media (max-width: 760px) {
          .hd-sidebar { position: fixed; left: 0; top: 0; transform: translateX(-100%); transition: transform 0.2s ease; width: 260px; z-index: 40; }
          .hd-sidebar.open { transform: translateX(0); }
          .hd-stats { grid-template-columns: 1fr; }
        }
      `}</style>

      <aside className={`hd-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="hd-brand">
          <div className="hd-brand-name">Dominion City</div>
          <div className="hd-brand-sub">Department Portal</div>
        </div>
        <div className="hd-profile">
          <div className="hd-profile-name">{user?.full_name || 'Department Head'}</div>
          <div className="hd-profile-role">Head of {dept?.name || 'Department'}</div>
        </div>
        <nav className="hd-nav">
          {visibleNav.map((item) => (
            <button
              key={item.key}
              className={`hd-nav-btn ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => {
                if (item.path) {
                  navigate(item.path);
                } else {
                  setActiveTab(item.key);
                }
                setMobileOpen(false);
              }}
            >
              <item.icon size={16} /> {item.label}
            </button>
          ))}
        </nav>
        <button className="hd-logout" onClick={handleLogout}><LogOut size={15} /> Logout</button>
      </aside>

      <div className="hd-main">
        <header className="hd-topbar">
          <button onClick={() => setMobileOpen(true)} style={{ display: 'none' }} className="hd-menu-toggle"><MenuIcon size={20} /></button>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 15 }}>
            {visibleNav.find(n => n.key === activeTab)?.label}
          </div>
          <div style={{ fontSize: 12, color: tokens.muted }}>{dept?.name}</div>
        </header>

        <div className="hd-content">
          {activeTab === 'overview' && (
            <>
              <div className="hd-stats">
                <div className="hd-stat-card">
                  <div className="hd-stat-label">Department</div>
                  <div className="hd-stat-value" style={{ fontSize: 16 }}>{dept?.name}</div>
                </div>
                <div className="hd-stat-card">
                  <div className="hd-stat-label">Members</div>
                  <div className="hd-stat-value">{dept?.member_count ?? 0}</div>
                </div>
                <div className="hd-stat-card">
                  <div className="hd-stat-label">Assistant Head</div>
                  <div className="hd-stat-value" style={{ fontSize: 15 }}>{dept?.assistant_head_name || '—'}</div>
                </div>
              </div>
              <div className="hd-card">
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{dept?.name}</div>
                <div style={{ color: tokens.muted, fontSize: 13 }}>{dept?.description || 'No description set.'}</div>
              </div>
            </>
          )}

          {activeTab === 'announcements' && (
            <div className="hd-card">
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Announcements</div>
              {announcements.length === 0 ? (
                <div className="hd-empty">Nothing posted for you right now.</div>
              ) : announcements.map((a) => (
                <div key={a.id} className="hd-row" style={{ display: 'block' }}>
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
              <div className="hd-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Add a Member</div>
                <input
                  className="hd-input"
                  placeholder="Search registered church members by name or email..."
                  value={memberQuery}
                  onChange={(e) => searchMembers(e.target.value)}
                />
                {memberResults.length > 0 && (
                  <div style={{ border: `1px solid ${tokens.line}`, borderRadius: 8, marginTop: -4, marginBottom: 10 }}>
                    {memberResults.map((m) => (
                      <div key={m.id} className="hd-row" style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: 13 }}>{m.name} <span style={{ color: tokens.muted }}>({m.email})</span></span>
                        <button className="hd-btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => addMember(m.id)}>
                          <Plus size={12} style={{ verticalAlign: 'middle' }} /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="hd-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Department Roster ({members.length})</div>
                {members.length === 0 ? (
                  <div className="hd-empty">No members yet — search above to add one.</div>
                ) : members.map((m) => (
                  <div key={m.id} className="hd-row">
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

          {activeTab === 'reports' && (
            <>
              <div className="hd-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Submit Weekly Report</div>
                <label className="hd-label">Week Starting</label>
                <input type="date" className="hd-input" value={reportForm.week_start_date}
                  onChange={(e) => setReportForm({ ...reportForm, week_start_date: e.target.value })} />
                <label className="hd-label">Activities Performed</label>
                <textarea className="hd-textarea" value={reportForm.activities_performed}
                  onChange={(e) => setReportForm({ ...reportForm, activities_performed: e.target.value })} />
                <label className="hd-label">Achievements</label>
                <textarea className="hd-textarea" value={reportForm.achievements}
                  onChange={(e) => setReportForm({ ...reportForm, achievements: e.target.value })} />
                <label className="hd-label">Challenges</label>
                <textarea className="hd-textarea" value={reportForm.challenges}
                  onChange={(e) => setReportForm({ ...reportForm, challenges: e.target.value })} />
                <label className="hd-label">Prayer Requests</label>
                <textarea className="hd-textarea" value={reportForm.prayer_requests}
                  onChange={(e) => setReportForm({ ...reportForm, prayer_requests: e.target.value })} />
                <label className="hd-label">General Report</label>
                <textarea className="hd-textarea" value={reportForm.report}
                  onChange={(e) => setReportForm({ ...reportForm, report: e.target.value })} />
                <button className="hd-btn" onClick={submitReport}>Send to Admin</button>
              </div>
              <div className="hd-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Past Reports</div>
                {reports.length === 0 ? <div className="hd-empty">No reports submitted yet.</div> : reports.map((r) => (
                  <div key={r.id} className="hd-row" style={{ display: 'block' }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>Week of {new Date(r.week_start_date).toLocaleDateString()}</div>
                    {r.report && <div style={{ fontSize: 12, color: tokens.muted, marginTop: 4 }}>{r.report}</div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'programs' && (
            <>
              <div className="hd-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Record a Program</div>
                <label className="hd-label">Title</label>
                <input className="hd-input" value={programForm.title} onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })} />
                <label className="hd-label">Date</label>
                <input type="date" className="hd-input" value={programForm.program_date} onChange={(e) => setProgramForm({ ...programForm, program_date: e.target.value })} />
                <label className="hd-label">Time</label>
                <input className="hd-input" placeholder="e.g. 10:00 AM" value={programForm.program_time} onChange={(e) => setProgramForm({ ...programForm, program_time: e.target.value })} />
                <label className="hd-label">Location</label>
                <input className="hd-input" value={programForm.location} onChange={(e) => setProgramForm({ ...programForm, location: e.target.value })} />
                <label className="hd-label">Description</label>
                <textarea className="hd-textarea" value={programForm.description} onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })} />
                <button className="hd-btn" onClick={submitProgram}>Record Program</button>
              </div>
              <div className="hd-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Upcoming / Past Programs</div>
                {programs.length === 0 ? <div className="hd-empty">No programs recorded yet.</div> : programs.map((p) => (
                  <div key={p.id} className="hd-row" style={{ display: 'block' }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: tokens.muted, marginTop: 2 }}>
                      {new Date(p.program_date).toLocaleDateString()} {p.program_time && `· ${p.program_time}`} {p.location && `· ${p.location}`}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'contributions' && (
            <>
              <div className="hd-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Record a Contribution / Donation</div>
                <label className="hd-label">Contributor Name (optional)</label>
                <input className="hd-input" value={contribForm.contributor_name} onChange={(e) => setContribForm({ ...contribForm, contributor_name: e.target.value })} />
                <label className="hd-label">Amount (₦)</label>
                <input type="number" className="hd-input" value={contribForm.amount} onChange={(e) => setContribForm({ ...contribForm, amount: e.target.value })} />
                <label className="hd-label">Purpose</label>
                <input className="hd-input" placeholder="e.g. New instruments" value={contribForm.purpose} onChange={(e) => setContribForm({ ...contribForm, purpose: e.target.value })} />
                <label className="hd-label">Date</label>
                <input type="date" className="hd-input" value={contribForm.contribution_date} onChange={(e) => setContribForm({ ...contribForm, contribution_date: e.target.value })} />
                <button className="hd-btn" onClick={submitContribution}>Record Contribution</button>
              </div>
              <div className="hd-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Contribution History</div>
                {contributions.length === 0 ? <div className="hd-empty">No contributions recorded yet.</div> : contributions.map((c) => (
                  <div key={c.id} className="hd-row">
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{c.contributor_name || 'Anonymous'} {c.purpose && `— ${c.purpose}`}</div>
                      <div style={{ fontSize: 12, color: tokens.muted }}>{new Date(c.contribution_date).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontWeight: 600, fontFamily: 'Sora, sans-serif' }}>₦{c.amount.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'requests' && (
            <>
              <div className="hd-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Request Funds</div>
                <div style={{ fontSize: 12.5, color: tokens.muted, marginBottom: 10 }}>
                  Sent to the Overall Pastor / Super Admin for approval.
                </div>
                <label className="hd-label">Amount (₦)</label>
                <input type="number" className="hd-input" value={requestForm.amount}
                  onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })} />
                <label className="hd-label">Purpose</label>
                <input className="hd-input" placeholder="e.g. Sound equipment repair" value={requestForm.purpose}
                  onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })} />
                <label className="hd-label">Description</label>
                <textarea className="hd-textarea" value={requestForm.description}
                  onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })} />
                <label className="hd-label">Date Needed (optional)</label>
                <input type="date" className="hd-input" value={requestForm.date_needed}
                  onChange={(e) => setRequestForm({ ...requestForm, date_needed: e.target.value })} />
                <button className="hd-btn" onClick={submitRequest}>Submit Request</button>
              </div>
              <div className="hd-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Your Requests</div>
                {myRequests.length === 0 ? <div className="hd-empty">No requests submitted yet.</div> : myRequests.map((r) => (
                  <div key={r.id} className="hd-row" style={{ display: 'block' }}>
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
            <div className="hd-card">
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Need Help From Admin?</div>
              <div style={{ fontSize: 13, color: tokens.muted, marginBottom: 10 }}>
                If a member needs support, or your department needs something from admin, describe it below.
              </div>
              <textarea className="hd-textarea" placeholder="Describe what's needed..." value={helpForm.description}
                onChange={(e) => setHelpForm({ description: e.target.value })} />
              <button className="hd-btn" onClick={submitHelp}>Send to Admin</button>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="hd-card">
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Your Requests</div>
              {myHelpRequests.length === 0 ? (
                <div className="hd-empty">Nothing sent yet.</div>
              ) : myHelpRequests.map((h) => (
                <div key={h.id} className="hd-row" style={{ display: 'block' }}>
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
              <div className="hd-card">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Members Not Currently Active</div>
                <div style={{ fontSize: 12.5, color: tokens.muted, marginBottom: 10 }}>
                  These members in your department aren't marked active — log a check-in when you follow up.
                </div>
                {inactiveMembers.length === 0 ? (
                  <div className="hd-empty">Everyone in your department is active — nothing to follow up on.</div>
                ) : inactiveMembers.map((m) => (
                  <div key={m.id} className="hd-row">
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: tokens.muted, display: 'flex', gap: 12, marginTop: 2 }}>
                        {m.phone_number && <span><Phone size={11} style={{ verticalAlign: 'middle' }} /> {m.phone_number}</span>}
                        <span>Status: {m.membership_status}</span>
                      </div>
                    </div>
                    <button
                      className="hd-btn"
                      style={{ padding: '5px 12px', fontSize: 12 }}
                      onClick={() => setFollowUpForm({ ...followUpForm, member_id: m.id })}
                    >
                      Log Follow-Up
                    </button>
                  </div>
                ))}
              </div>

              {followUpForm.member_id && (
                <div className="hd-card">
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>
                    Log Follow-Up — {inactiveMembers.find(m => m.id === followUpForm.member_id)?.name}
                  </div>
                  <label className="hd-label">Date</label>
                  <input type="date" className="hd-input" value={followUpForm.follow_up_date}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, follow_up_date: e.target.value })} />
                  <label className="hd-label">Method</label>
                  <select className="hd-input" value={followUpForm.method}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, method: e.target.value })}>
                    <option value="call">Phone Call</option>
                    <option value="visitation">Visitation</option>
                    <option value="message">Message</option>
                    <option value="other">Other</option>
                  </select>
                  <label className="hd-label">Why did they stop coming?</label>
                  <textarea className="hd-textarea" value={followUpForm.reason_for_inactivity}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, reason_for_inactivity: e.target.value })} />
                  <label className="hd-label">Notes</label>
                  <textarea className="hd-textarea" value={followUpForm.notes}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })} />
                  <label className="hd-label">Outcome</label>
                  <input className="hd-input" placeholder="e.g. Will return next week, No answer, Moved away"
                    value={followUpForm.outcome} onChange={(e) => setFollowUpForm({ ...followUpForm, outcome: e.target.value })} />
                  <button className="hd-btn" onClick={submitFollowUp}>Save Follow-Up</button>
                </div>
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <>
              <div className="hd-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Profile</div>
                <label className="hd-label">Full Name</label>
                <input className="hd-input" value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
                <label className="hd-label">Email</label>
                <input className="hd-input" value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
                <label className="hd-label">Phone Number</label>
                <input className="hd-input" value={profileForm.phone_number}
                  onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })} />
                <button className="hd-btn" onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
              <div className="hd-card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Change Password</div>
                <label className="hd-label">Current Password</label>
                <input type="password" className="hd-input" value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} />
                <label className="hd-label">New Password</label>
                <input type="password" className="hd-input" value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} />
                <label className="hd-label">Confirm New Password</label>
                <input type="password" className="hd-input" value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} />
                <button className="hd-btn" onClick={changePassword} disabled={savingPassword}>
                  {savingPassword ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {toast && <div className="hd-toast">{toast}</div>}
    </div>
  );
}