import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Members from './pages/Members';
import Cells from './pages/Cells';
import CellLeaders from './pages/CellLeaders';
import CreateUserForMember from './pages/CreateUserForMember';
import Departments from './pages/Departments'; 
import Finance from './pages/Finance';
import Announcements from './pages/Announcements';
import HOD from './pages/HOD';
import Reports from './pages/Reports'; 
import CreateUser from './pages/CreateUser';
import ManageUsers from './pages/ManageUsers';
// Components
import AIChat from './components/AIChat';
import Navigation from './components/Navigation';
import LoadingSpinner from './components/LoadingSpinner';


import SatelliteChurches from './pages/SatelliteChurches';
import Pastors from './pages/Pastors';
import ChurchEvents from './pages/ChurchEvents';
import Services from './pages/Services';

import MakeRequest from './pages/MakeRequest';
import Budget from './pages/Budget';

import Operations from './pages/Operations';
import Equipment from './pages/Equipment';

import MVPs from './pages/MVPs';
import Trainings from './pages/Trainings';


import PastorAssignments from './pages/PastorAssignments';
import PastorReports from './pages/PastorReports'; 

import Settings from './pages/Settings';


import DepartmentHeadDashboard from './pages/department-head/Dashboard'; 
import CellLeaderDashboard from './pages/cell-leader/Dashboard';


import DashboardRouter from './pages/DashboardRouter';

import AdminReports from './pages/AdminReports'; 

import Requests from './pages/Requests';
import ChildrenDepartment from './pages/ChildrenDepartment';
import ChildrenOffering from './pages/ChildrenOffering';

import ResetPassword from './pages/ResetPassword';

//import Reports from './pages/Reports';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1a237e',
      light: '#3949ab',
      dark: '#0d1442',
    },
    secondary: {
      main: '#ff6f00',
      light: '#ffa040',
      dark: '#c43e00',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};


const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

const AppContent = () => {
  const { isAuthenticated, token } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        } />
        
        {/* Members Routes */}
        <Route path="/members" element={
          <ProtectedRoute>
            <Members />
          </ProtectedRoute>
        } />
        <Route path="/members/add" element={
          <ProtectedRoute>
            <Members />
          </ProtectedRoute>
        } />
        <Route path="/members/:memberId/create-user" element={
          <ProtectedRoute>
            <CreateUserForMember />
          </ProtectedRoute>
        } />

        <Route path="/manage-users" element={
              <ProtectedRoute>
                 <ManageUsers />
              </ProtectedRoute>
        } />
        
        {/* Cells Routes */}
        <Route path="/cells" element={
          <ProtectedRoute>
            <Cells />
          </ProtectedRoute>
        } />
        <Route path="/cells/add" element={
          <ProtectedRoute>
            <Cells />
          </ProtectedRoute>
        } />
        <Route path="/cell-leaders" element={
          <ProtectedRoute>
            <CellLeaders />
          </ProtectedRoute>
        } />

        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/children" element={<ProtectedRoute><ChildrenDepartment /></ProtectedRoute>} />
        <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
        <Route path="/admin-reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
        <Route path="/pastors/assignments" element={<ProtectedRoute><PastorAssignments /></ProtectedRoute>} />
        <Route path="/pastors/reports" element={<ProtectedRoute><PastorReports /></ProtectedRoute>} /> 
        <Route path="/dept-dashboard" element={<ProtectedRoute><DepartmentHeadDashboard /></ProtectedRoute>} /> 
        <Route path="/cell-dashboard" element={<ProtectedRoute><CellLeaderDashboard /></ProtectedRoute>} />
  
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/mvps" element={<ProtectedRoute><MVPs /></ProtectedRoute>} />
        <Route path="/trainings" element={<ProtectedRoute><Trainings /></ProtectedRoute>} />
        <Route path="/operations" element={<ProtectedRoute><Operations /></ProtectedRoute>} />
        <Route path="/equipment" element={<ProtectedRoute><Equipment /></ProtectedRoute>} />

        <Route path="/make-request" element={<ProtectedRoute><MakeRequest /></ProtectedRoute>} />
        <Route path="/budget" element={<ProtectedRoute><Budget /></ProtectedRoute>} />
       

        <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
        <Route path="/services/manage" element={<ProtectedRoute><Services /></ProtectedRoute>} />

        <Route path="/satellite" element={<ProtectedRoute><SatelliteChurches /></ProtectedRoute>} />
        <Route path="/pastors" element={<ProtectedRoute><Pastors /></ProtectedRoute>} />
        <Route path="/pastors/add" element={<ProtectedRoute><Pastors /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><ChurchEvents /></ProtectedRoute>} />
        <Route path="/children-offering" element={<ProtectedRoute><ChildrenOffering /></ProtectedRoute>} />
        
        {/* Departments Routes */}
        <Route path="/departments" element={ 
          <ProtectedRoute>
            <Departments />
          </ProtectedRoute>
        } />
        <Route path="/departments/add" element={
          <ProtectedRoute>
            <Departments /> 
          </ProtectedRoute>
        } />

        <Route path="/hod" element={
          <ProtectedRoute>
            <HOD />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <Reports /> 
          </ProtectedRoute>
        } />
        
        {/* Admin Routes */}
        <Route path="/create-user" element={
          <AdminRoute>
            <CreateUser />
          </AdminRoute>
        } />
        
        {/* Finance Routes */}
        <Route path="/finance" element={
          <ProtectedRoute>
            <Finance />
          </ProtectedRoute>
        } />
        <Route path="/finance/overview" element={
          <ProtectedRoute>
            <Finance />
          </ProtectedRoute>
        } />
        <Route path="/finance/income" element={
          <ProtectedRoute>
            <Finance />
          </ProtectedRoute>
        } />
        <Route path="/finance/expenses" element={
          <ProtectedRoute>
            <Finance />
          </ProtectedRoute>
        } />
        <Route path="/finance/request" element={
          <ProtectedRoute>
            <Finance />
          </ProtectedRoute>
        } />
        <Route path="/finance/budget" element={
          <ProtectedRoute>
            <Finance />
          </ProtectedRoute>
        } />
        <Route path="/finance/reports" element={ 
          <ProtectedRoute>
            <Finance />
          </ProtectedRoute>
        } />
        
        {/* Announcements Routes */}
        <Route path="/announcements" element={
          <ProtectedRoute>
            <Announcements />
          </ProtectedRoute>
        } />
        <Route path="/announcements/add" element={
          <ProtectedRoute>
            <Announcements />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {isAuthenticated && (
        <AIChat 
          isOpen={chatOpen} 
          onToggle={() => setChatOpen(!chatOpen)} 
          token={token} 
        />
      )}
    </>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;