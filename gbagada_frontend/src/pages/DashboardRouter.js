import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Dashboard from './Dashboard';
import DepartmentHeadDashboard from './department-head/Dashboard';
import CellLeaderDashboard from './cell-leader/Dashboard';
import PastorDashboard from './pastor/Dashboard';
import LoadingSpinner from '../components/LoadingSpinner';

const API_URL = 'http://localhost:8000/api';

const PORTAL_LABELS = {
  department_head: 'Department Head',
  cell_leader: 'Cell Leader',
  pastor: 'Pastor',
  admin: 'Admin',
};

// Sits at the "/dashboard" route. Previously checked department head,
// then cell leader, then pastor, stopping at the FIRST match — someone
// who legitimately qualified for more than one (e.g. both a Cell Leader
// and a Department Head) could only ever reach whichever check happened
// to run first, with no way to reach the other role at all.
//
// Now it checks all three and collects every portal the account
// qualifies for. If there's only one, nothing changes from before. If
// there's more than one, a small floating switcher appears so the
// person can toggle between the portals they actually have — remembered
// for the session, not stuck on whichever loaded first.
export default function DashboardRouter() {
  const { token, user } = useAuth();
  const [availablePortals, setAvailablePortals] = useState([]);
  const [activePortal, setActivePortal] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const determinePortals = async () => {
      if (user?.role === 'super_admin' || user?.role === 'overall_pastor') {
        if (!cancelled) {
          setAvailablePortals(['admin']);
          setActivePortal('admin');
          setChecking(false);
        }
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const found = [];

      try {
        await axios.get(`${API_URL}/department-head/my-department`, { headers });
        found.push('department_head');
      } catch (err) { /* not a department head — expected */ }

      try {
        await axios.get(`${API_URL}/cell-leader/my-cell`, { headers });
        found.push('cell_leader');
      } catch (err) { /* not a cell leader — expected */ }

      try {
        await axios.get(`${API_URL}/pastor-portal/my-profile`, { headers });
        found.push('pastor');
      } catch (err) { /* not a pastor — expected */ }

      if (found.length === 0) found.push('admin');

      if (!cancelled) {
        setAvailablePortals(found);
        const remembered = sessionStorage.getItem('activePortal');
        setActivePortal(found.includes(remembered) ? remembered : found[0]);
        setChecking(false);
      }
    };

    if (token && user) {
      determinePortals();
    } else if (!token) {
      setChecking(false);
      setAvailablePortals(['admin']);
      setActivePortal('admin');
    }

    return () => { cancelled = true; };
  }, [token, user]);

  const handleSwitch = (portal) => {
    setActivePortal(portal);
    sessionStorage.setItem('activePortal', portal);
  };

  if (checking) {
    return <LoadingSpinner />;
  }

  const renderPortal = () => {
    if (activePortal === 'department_head') return <DepartmentHeadDashboard />;
    if (activePortal === 'cell_leader') return <CellLeaderDashboard />;
    if (activePortal === 'pastor') return <PastorDashboard />;
    return <Dashboard />;
  };

  return (
    <>
      {availablePortals.length > 1 && (
        <div style={{
          position: 'fixed', top: 88, right: 16, zIndex: 99999,
          background: '#1a237e', borderRadius: 10, padding: '6px 10px',
          display: 'flex', gap: 6, alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
        }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, marginRight: 4 }}>Portal:</span>
          {availablePortals.map((p) => (
            <button
              key={p}
              onClick={() => handleSwitch(p)}
              style={{
                border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11,
                fontWeight: 600, cursor: 'pointer',
                background: activePortal === p ? '#C9A227' : 'rgba(255,255,255,0.15)',
                color: activePortal === p ? '#0B1030' : '#fff'
              }}
            >
              {PORTAL_LABELS[p]}
            </button>
          ))}
        </div>
      )}
      {renderPortal()}
    </>
  );
}