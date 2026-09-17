import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  UsersRound,
  Wallet,
  Settings2,
  GraduationCap,
  Star,
  UserCog,
  Settings,
  ChevronDown,
  ChevronRight,
  Bell,
  LogOut,
  Search,
  Menu as MenuIcon,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Banknote,
  ReceiptText,
  Church,
  Megaphone,
  UserPlus,
  Gauge,
  FileText,
  User,
  Baby
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Design tokens
const tokens = {
  ink: '#0B1030',
  ink2: '#141B4D',
  indigo: '#1E2B7A',
  indigoLight: '#2E3FA0',
  gold: '#C9A227',
  goldSoft: '#F6ECC9',
  canvas: '#F3F4F8',
  surface: '#FFFFFF',
  text: '#1C2333',
  muted: '#6B7280',
  line: '#E7E8EF',
  success: '#1E8E5A',
  danger: '#C0392B',
};

// ---- Formatting helpers ----
const formatCompactNaira = (value) => {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `₦${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `₦${(n / 1_000).toFixed(1)}K`;
  return `₦${n.toLocaleString()}`;
};

const formatDelta = (percent) => {
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent}%`;
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const then = new Date(timestamp);
  const now = new Date();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Full Navigation with Dropdowns - ALL items included
const NAV = [
  { key: 'overview', label: 'Overview', icon: Gauge, path: '/dashboard' },
  { 
    key: 'departments', 
    label: 'Manage Department', 
    icon: Building2, 
    children: [
      { label: 'Manage HOD', path: '/hod' },
      { label: 'View Departments', path: '/departments' },
      { label: 'Add Department', path: '/departments/add' },
      { label: 'Announcements', path: '/announcements' },
      { label: 'Reports', path: '/reports' }
    ]
  },
  { 
    key: 'cells', 
    label: 'Manage Cell Group', 
    icon: UsersRound,
    children: [
      { label: 'Manage Cell Leaders', path: '/cell-leaders' },
      { label: 'View Cell Groups', path: '/cells' },
      { label: 'Add Cell Group', path: '/cells/add' },
      { label: 'Announcements', path: '/announcements' },
      { label: 'Reports', path: '/reports' }
    ]
  },
  { 
    key: 'church', 
    label: 'Manage Church', 
    icon: Church,
    children: [
      { label: 'Satellite Churches', path: '/satellite' },
      { label: 'Manage Events', path: '/events' },
      { label: 'Church Services', path: '/services' },
      { label: 'Manage Services', path: '/services/manage' },
      { label: 'Announcements', path: '/announcements' },
      { label: 'Reports', path: '/reports' }
    ]
  },
  { key: 'membership', label: 'Manage Membership', icon: Users, path: '/members' },
  { key: 'create-user', label: 'Create User', icon: UserPlus, path: '/create-user' },
  { key: 'manage-users', label: 'Manage Users', icon: Users, path: '/manage-users' },
  { 
    key: 'finance', 
    label: 'Finance', 
    icon: Wallet,
    children: [
      { label: 'Overview', path: '/finance/overview' },
      { label: 'Add Income', path: '/finance/income' },
      { label: 'Add Expenses', path: '/finance/expenses' },
      { label: 'Make A Request', path: '/make-request' },  
      { label: 'Fund Requests (Approve)', path: '/requests' },
      { label: 'Budget Planning', path: '/budget' },      
      { label: 'Reports', path: '/reports' }
      
    ]
  },
  { 
    key: 'operations', 
    label: 'Church Operations', 
    icon: Settings2,
    children: [
      { label: 'Operations', path: '/operations' },
      { label: 'Church Assets', path: '/equipment' }
    ]
  },
   { key: 'mvps', label: 'MVPs', icon: Star, path: '/mvps' },

   { key: 'children', label: "Children's Department", icon: Baby, path: '/children' },
   { 
    key: 'training', 
    label: 'Training', 
    icon: GraduationCap,
    children: [
      { label: 'All Trainings', path: '/trainings' },
      { label: 'MVPs Trainings', path: '/trainings?type=mvps' },
      { label: 'Membership Training', path: '/trainings?type=members' },
    ]
  },
  { 
    key: 'pastors', 
    label: 'Manage Pastors', 
    icon: UserCog,
    children: [
      { label: 'View Pastors', path: '/pastors' },
      { label: 'Add Pastor', path: '/pastors/add' },
      { label: 'Assignments', path: '/pastors/assignments' },
      { label: 'Reports', path: '/pastors/reports' }
    ]
  },
  { key: 'admin-reports', label: 'Department & Cell Reports', icon: FileText, path: '/admin-reports' },

  { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

function StatCard({ stat, onClick }) {
  const Icon = stat.icon;
  const Trend = stat.up ? TrendingUp : TrendingDown;
  return (
    <div 
      className="cd-stat-card" 
      onClick={() => onClick(stat.path)}
      style={{ cursor: 'pointer' }}
    >
      <div className="cd-stat-top">
        <span className="cd-stat-label">{stat.label}</span>
        <span className="cd-stat-icon">
          <Icon size={16} strokeWidth={2} />
        </span>
      </div>
      <div className="cd-stat-value">{stat.display}</div>
      <div className={`cd-stat-delta ${stat.up ? 'up' : 'down'}`}>
        <Trend size={13} strokeWidth={2.4} />
        {stat.delta}
      </div>
    </div>
  );
}

function NavItem({ item, isActive, onSelect, isOpen, onToggle }) {
  const Icon = item.icon;
  const hasChildren = !!item.children;

  return (
    <div className="cd-nav-item">
      <button
        className={`cd-nav-btn ${isActive ? 'active' : ''}`}
        onClick={() => hasChildren ? onToggle(item.key) : onSelect(item.path)}
      >
        <Icon size={17} strokeWidth={2} className="cd-nav-icon" />
        <span className="cd-nav-text">{item.label}</span>
        {hasChildren && (
          <span className="cd-chevron">
            {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </span>
        )}
      </button>
      {hasChildren && (
        <div className={`cd-submenu ${isOpen ? 'open' : ''}`}>
          <div className="cd-submenu-inner">
            {item.children.map((child) => (
              <button
                key={child.label}
                className="cd-subitem"
                onClick={() => onSelect(child.path)}
              >
                {child.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chartTab, setChartTab] = useState('growth');
  const [activePath, setActivePath] = useState('/dashboard'); 
  const [openGroups, setOpenGroups] = useState({});

  const [stats, setStats] = useState(null);
  const [growthData, setGrowthData] = useState([]);
  const [offeringData, setOfferingData] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      // allSettled, not all — a single endpoint failing (e.g. member-growth
      // erroring) should not wipe out data from the other two that
      // succeeded. Each result is applied independently below.
      const [statsResult, growthResult, offeringResult] = await Promise.allSettled([
        axios.get('/api/dashboard/stats', { headers }),
        axios.get('/api/dashboard/member-growth', { headers }),
        axios.get('/api/dashboard/offering-trends', { headers }),
      ]);

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value.data);
        setActivity(
          (statsResult.value.data.recentActivities || []).map((a) => ({
            text: a.text,
            time: formatRelativeTime(a.timestamp),
          }))
        );
      } else {
        console.error('Error fetching dashboard stats:', statsResult.reason);
      }

      if (growthResult.status === 'fulfilled') {
        setGrowthData(Array.isArray(growthResult.value.data) ? growthResult.value.data : []);
      } else {
        console.error('Error fetching member growth:', growthResult.reason);
      }

      if (offeringResult.status === 'fulfilled') {
        setOfferingData(Array.isArray(offeringResult.value.data) ? offeringResult.value.data : []);
      } else {
        console.error('Error fetching offering trends:', offeringResult.reason);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleNavigate = (path) => {
    setActivePath(path);
    navigate(path);
    setMobileOpen(false);
  };

  const handleToggle = (key) => {
    setOpenGroups((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Build stat cards from real data — falls back to a neutral placeholder while loading
  const STATS = [
    {
      label: 'Total Members',
      display: (stats?.totalMembers ?? 0).toLocaleString(),
      delta: stats ? formatDelta(stats.memberGrowthPercent) : '',
      up: stats ? stats.memberGrowthPercent >= 0 : true,
      icon: Users,
      path: '/members'
    },
    {
      label: 'Active Cells',
      display: (stats?.totalCells ?? 0).toLocaleString(),
      delta: stats ? `+${stats.cellsAddedThisQuarter} this qtr` : '',
      up: true,
      icon: UsersRound,
      path: '/cells'
    },
    {
      label: 'Offerings (MTD)',
      display: stats ? formatCompactNaira(stats.offeringsThisMonth) : '—',
      delta: stats ? formatDelta(stats.offeringsChangePercent) : '',
      up: stats ? stats.offeringsChangePercent >= 0 : true,
      icon: Banknote,
      path: '/finance'
    },
    {
      label: 'Expenses (MTD)',
      display: stats ? formatCompactNaira(stats.expensesThisMonth) : '—',
      delta: stats ? formatDelta(stats.expensesChangePercent) : '',
      // Fewer expenses than last month is the "good" direction, so the
      // up/down arrow is intentionally flipped relative to the raw sign.
      up: stats ? stats.expensesChangePercent < 0 : false,
      icon: ReceiptText,
      path: '/finance'
    },
  ];

  const chartData = chartTab === 'growth'
    ? (Array.isArray(growthData) ? growthData : []).map(d => ({ month: d.month, value: d.members }))
    : (Array.isArray(offeringData) ? offeringData : []).map(d => ({ month: d.month, value: d.offerings / 1_000_000 })); // millions, matching original axis scale

  const chartColor = tokens.indigoLight;

  // Many months of history can crowd the X axis — thin labels out so it
  // stays readable instead of overlapping.
  const tickInterval = chartData.length > 12 ? Math.ceil(chartData.length / 12) : 0;
  const crowded = chartData.length > 8;

  return (
    <div className="cd-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

        .cd-root {
          --ink: ${tokens.ink};
          --ink2: ${tokens.ink2};
          --indigo: ${tokens.indigo};
          --indigo-light: ${tokens.indigoLight};
          --gold: ${tokens.gold};
          --gold-soft: ${tokens.goldSoft};
          --canvas: ${tokens.canvas};
          --surface: ${tokens.surface};
          --text: ${tokens.text};
          --muted: ${tokens.muted};
          --line: ${tokens.line};
          --success: ${tokens.success};
          --danger: ${tokens.danger};
          font-family: 'Inter', sans-serif;
          color: var(--text);
          background: var(--canvas);
          min-height: 100vh;
          display: flex;
          position: relative;
        }
        .cd-root * { box-sizing: border-box; }
        .cd-root button { font-family: inherit; cursor: pointer; }

        /* Sidebar */
        .cd-sidebar {
          width: 272px;
          flex-shrink: 0;
          background: linear-gradient(180deg, var(--ink) 0%, var(--ink2) 100%);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          overflow-y: auto;
          z-index: 40;
        }
        .cd-sidebar::-webkit-scrollbar {
          width: 4px;
        }
        .cd-sidebar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
        }
        .cd-brand {
          padding: 28px 20px 20px;
          text-align: center;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .cd-brand-mark {
          width: 46px; height: 46px; margin: 0 auto 10px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--gold) 0%, #8f7415 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif;
          font-weight: 700;
          color: var(--ink);
          font-size: 18px;
        }
        .cd-brand-name {
          font-family: 'Sora', sans-serif;
          font-weight: 700;
          font-size: 18px;
          color: #fff;
          letter-spacing: -0.2px;
        }
        .cd-brand-sub {
          font-size: 11px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
          margin-top: 2px;
        }
        .cd-profile {
          display: flex; align-items: center; gap: 11px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .cd-avatar {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--indigo-light);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 600; font-size: 14px;
          font-family: 'Sora', sans-serif;
        }
        .cd-profile-name { font-size: 13.5px; font-weight: 600; color: #fff; }
        .cd-profile-role {
          font-size: 10.5px; color: var(--gold); font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .cd-nav {
          flex: 1; padding: 14px 12px; overflow-y: auto;
        }
        .cd-nav-item { margin-bottom: 3px; }
        .cd-nav-btn {
          width: 100%;
          display: flex; align-items: center; gap: 11px;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 10px;
          color: rgba(255,255,255,0.72);
          font-size: 13.5px;
          font-weight: 500;
          text-align: left;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .cd-nav-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .cd-nav-btn.active {
          background: var(--indigo-light);
          color: #fff;
          box-shadow: inset 3px 0 0 var(--gold);
        }
        .cd-nav-icon { flex-shrink: 0; opacity: 0.9; }
        .cd-nav-text { flex: 1; }
        .cd-chevron { display: flex; opacity: 0.6; }

        .cd-submenu {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.22s ease;
        }
        .cd-submenu.open { max-height: 320px; }
        .cd-submenu-inner { 
          padding: 4px 0 6px 40px; 
          display: flex; 
          flex-direction: column; 
          gap: 1px; 
        }
        .cd-subitem {
          background: transparent; 
          border: none; 
          text-align: left;
          padding: 7px 10px; 
          border-radius: 8px;
          font-size: 12.5px; 
          color: rgba(255,255,255,0.55);
          transition: background 0.15s ease, color 0.15s ease;
        }
        .cd-subitem:hover { 
          color: #fff; 
          background: rgba(255,255,255,0.05); 
        }
        .cd-subitem.active { 
          color: var(--gold); 
          font-weight: 600; 
        }

        .cd-logout {
          margin: 8px 12px 16px;
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px;
          background: transparent; border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 500;
          transition: background 0.15s ease, color 0.15s ease;
          width: calc(100% - 24px);
        }
        .cd-logout:hover { background: rgba(192,57,43,0.15); color: #ff8a80; border-color: rgba(192,57,43,0.3); }

        /* Topbar */
        .cd-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .cd-topbar {
          height: 68px; background: var(--surface);
          border-bottom: 1px solid var(--line);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; position: sticky; top: 0; z-index: 30;
        }
        .cd-topbar-left { display: flex; align-items: center; gap: 14px; }
        .cd-menu-toggle {
          display: none; background: none; border: none; color: var(--text);
        }
        .cd-crumb-title {
          font-family: 'Sora', sans-serif; font-weight: 600; font-size: 16px;
        }
        .cd-crumb-sub { font-size: 12px; color: var(--muted); margin-top: 1px; }
        .cd-search {
          display: flex; align-items: center; gap: 8px;
          background: var(--canvas); border-radius: 9px; padding: 8px 12px;
          width: 220px; color: var(--muted); font-size: 13px;
        }
        .cd-topbar-right { display: flex; align-items: center; gap: 16px; }
        .cd-bell {
          position: relative; background: none; border: none; color: var(--muted);
          width: 34px; height: 34px; border-radius: 9px; display: flex;
          align-items: center; justify-content: center;
        }
        .cd-bell:hover { background: var(--canvas); }
        .cd-bell-dot {
          position: absolute; top: 7px; right: 8px; width: 7px; height: 7px;
          border-radius: 50%; background: var(--danger); border: 2px solid #fff;
        }
        .cd-topbar-avatar {
          width: 34px; height: 34px; border-radius: 9px; background: var(--ink);
          color: #fff; display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif; font-weight: 600; font-size: 13px;
        }

        /* Content */
        .cd-content { padding: 26px 28px 48px; max-width: 1180px; }
        .cd-hero {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 22px; flex-wrap: wrap; gap: 12px;
        }
        .cd-hero-title {
          font-family: 'Sora', sans-serif; font-weight: 700; font-size: 24px;
          letter-spacing: -0.3px;
        }
        .cd-hero-sub { color: var(--muted); font-size: 13.5px; margin-top: 4px; }
        .cd-hero-date {
          font-family: 'IBM Plex Mono', monospace; font-size: 12.5px;
          color: var(--muted); background: var(--surface); border: 1px solid var(--line);
          padding: 7px 12px; border-radius: 9px;
        }

        .cd-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 22px; }
        .cd-stat-card {
          background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
          padding: 18px; transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .cd-stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(11,16,48,0.08); }
        .cd-stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .cd-stat-label { font-size: 12px; color: var(--muted); font-weight: 600; }
        .cd-stat-icon {
          width: 30px; height: 30px; border-radius: 9px; background: var(--gold-soft);
          color: #8a6d10; display: flex; align-items: center; justify-content: center;
        }
        .cd-stat-value {
          font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 24px;
          letter-spacing: -0.5px;
        }
        .cd-stat-delta {
          display: flex; align-items: center; gap: 4px; margin-top: 8px;
          font-size: 12px; font-weight: 600;
        }
        .cd-stat-delta.up { color: var(--success); }
        .cd-stat-delta.down { color: var(--danger); }

        .cd-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; margin-bottom: 22px; }
        .cd-card {
          background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 20px;
        }
        .cd-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .cd-card-title { font-family: 'Sora', sans-serif; font-weight: 600; font-size: 15px; }
        .cd-tabs { display: flex; gap: 4px; background: var(--canvas); padding: 3px; border-radius: 9px; }
        .cd-tab {
          border: none; background: transparent; padding: 6px 12px; border-radius: 7px;
          font-size: 12.5px; font-weight: 600; color: var(--muted);
          transition: background 0.15s ease, color 0.15s ease;
        }
        .cd-tab.active { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

        .cd-activity-list { display: flex; flex-direction: column; gap: 3px; max-height: 300px; overflow-y: auto; }
        .cd-activity-item {
          padding: 11px 12px; border-radius: 10px; background: var(--canvas);
          border-left: 3px solid var(--indigo-light);
        }
        .cd-activity-text { font-size: 13px; font-weight: 500; }
        .cd-activity-time { font-size: 11px; color: var(--muted); margin-top: 3px; }
        .cd-empty-state { font-size: 13px; color: var(--muted); padding: 24px 12px; text-align: center; }

        .cd-quick-title { font-family: 'Sora', sans-serif; font-weight: 600; font-size: 15px; margin-bottom: 12px; }
        .cd-quick-row { display: flex; flex-wrap: wrap; gap: 10px; }
        .cd-quick-pill {
          display: flex; align-items: center; gap: 8px;
          background: var(--surface); border: 1px solid var(--line); border-radius: 11px;
          padding: 10px 15px; font-size: 13px; font-weight: 600; color: var(--text);
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .cd-quick-pill:hover { border-color: var(--indigo-light); transform: translateY(-1px); }

        .cd-overlay {
          display: none; position: fixed; inset: 0; background: rgba(11,16,48,0.5); z-index: 39;
        }

        @media (max-width: 980px) {
          .cd-stats { grid-template-columns: repeat(2, 1fr); }
          .cd-grid { grid-template-columns: 1fr; }
          .cd-search { display: none; }
        }
        @media (max-width: 760px) {
          .cd-sidebar {
            position: fixed; left: 0; top: 0; transform: translateX(-100%);
            transition: transform 0.22s ease; box-shadow: 12px 0 30px rgba(0,0,0,0.25);
            width: 280px;
          }
          .cd-sidebar.open { transform: translateX(0); }
          .cd-menu-toggle { display: flex; }
          .cd-overlay.show { display: block; }
          .cd-stats { grid-template-columns: 1fr 1fr; }
          .cd-content { padding: 18px 16px 40px; }
        }
      `}</style>

      <div className={`cd-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside className={`cd-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="cd-brand">
          <div className="cd-brand-mark">DC</div>
          <div className="cd-brand-name">Dominion City</div>
          <div className="cd-brand-sub">Gbagada</div>
        </div>

        <div className="cd-profile">
          <div className="cd-avatar">{user?.full_name?.[0] || 'A'}</div>
          <div>
            <div className="cd-profile-name">{user?.full_name || 'Admin'}</div>
            <div className="cd-profile-role">Super Admin</div>
          </div>
        </div>

        <nav className="cd-nav">
          {NAV.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              isActive={activePath === item.path || (item.children && item.children.some(c => c.path === activePath))}
              onSelect={handleNavigate}
              isOpen={openGroups[item.key]}
              onToggle={handleToggle}
            />
          ))}
        </nav>

        <button className="cd-logout" onClick={handleLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </aside>

      <div className="cd-main">
        <header className="cd-topbar">
          <div className="cd-topbar-left">
            <button className="cd-menu-toggle" onClick={() => setMobileOpen(true)}>
              <MenuIcon size={20} />
            </button>
            <div>
              <div className="cd-crumb-title">Overview</div>
              <div className="cd-crumb-sub">Dominion City · Gbagada</div>
            </div>
          </div>
          <div className="cd-topbar-right">
            <div className="cd-search">
              <Search size={14} />
              Search…
            </div>
            <button className="cd-bell">
              <Bell size={17} />
              <span className="cd-bell-dot" />
            </button>
            <div className="cd-topbar-avatar">{user?.full_name?.[0] || 'A'}</div>
          </div>
        </header>

        <div className="cd-content">
          <div className="cd-hero">
            <div>
              <div className="cd-hero-title">Good evening, {user?.full_name?.split(' ')[0] || 'Admin'}</div>
              <div className="cd-hero-sub">Here's what's happening across the church today.</div>
            </div>
            <div className="cd-hero-date">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })} · {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Stats Cards - Clickable */}
          <div className="cd-stats">
            {STATS.map((s) => (
              <StatCard key={s.label} stat={s} onClick={handleNavigate} />
            ))}
          </div>

          <div className="cd-grid">
            <div className="cd-card">
              <div className="cd-card-head">
                <span className="cd-card-title">
                  {chartTab === 'growth' ? 'Member Growth' : 'Offering Trends'}
                </span>
                <div className="cd-tabs">
                  <button
                    className={`cd-tab ${chartTab === 'growth' ? 'active' : ''}`}
                    onClick={() => setChartTab('growth')}
                  >
                    Growth
                  </button>
                  <button
                    className={`cd-tab ${chartTab === 'offerings' ? 'active' : ''}`}
                    onClick={() => setChartTab('offerings')}
                  >
                    Offerings
                  </button>
                </div>
              </div>
              {chartData.length === 0 ? (
                <div className="cd-empty-state">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  {chartTab === 'growth' ? (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="cdGrowth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartColor} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={tokens.line} vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: tokens.muted }}
                        axisLine={false}
                        tickLine={false}
                        interval={tickInterval}
                        angle={crowded ? -35 : 0}
                        textAnchor={crowded ? 'end' : 'middle'}
                        height={crowded ? 50 : 30}
                      />
                      <YAxis tick={{ fontSize: 12, fill: tokens.muted }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${tokens.line}`, fontSize: 12 }} />
                      <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2.5} fill="url(#cdGrowth)" />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={tokens.line} vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: tokens.muted }}
                        axisLine={false}
                        tickLine={false}
                        interval={tickInterval}
                        angle={crowded ? -35 : 0}
                        textAnchor={crowded ? 'end' : 'middle'}
                        height={crowded ? 50 : 30}
                      />
                      <YAxis tick={{ fontSize: 12, fill: tokens.muted }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${tokens.line}`, fontSize: 12 }} formatter={(v) => `₦${v.toFixed(2)}M`} />
                      <Bar dataKey="value" fill={tokens.gold} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>

            <div className="cd-card">
              <div className="cd-card-head">
                <span className="cd-card-title">Recent Activity</span>
              </div>
              <div className="cd-activity-list">
                {activity.length === 0 ? (
                  <div className="cd-empty-state">No recent activity yet</div>
                ) : (
                  activity.map((a, i) => (
                    <div className="cd-activity-item" key={i}>
                      <div className="cd-activity-text">{a.text}</div>
                      <div className="cd-activity-time">{a.time}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions - Clickable */}
          <div className="cd-card">
            <div className="cd-quick-title">Quick Actions</div>
            <div className="cd-quick-row">
              {[
                { label: 'Add Member', icon: Users, path: '/members' },
                { label: 'Add Cell Group', icon: UsersRound, path: '/cells' },
                { label: 'Record Offering', icon: Banknote, path: '/finance' },
                { label: "Children's Department", icon: Baby, path: '/children' },
                { label: 'New Announcement', icon: Megaphone, path: '/announcements' },
                { label: 'Manage Cell Leaders', icon: User, path: '/cell-leaders' },
                { label: 'Create User', icon: UserPlus, path: '/create-user' },
              ].map((a) => (
                <button 
                  className="cd-quick-pill" 
                  key={a.label}
                  onClick={() => handleNavigate(a.path)}
                >
                  <a.icon size={15} />
                  {a.label}
                  <ArrowUpRight size={13} style={{ opacity: 0.4 }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}