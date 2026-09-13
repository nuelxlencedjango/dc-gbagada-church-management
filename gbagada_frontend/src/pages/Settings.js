import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, TextField, Button,
  Snackbar, Alert, CircularProgress, Divider, Avatar
} from '@mui/material';
import { Person, Lock, Save } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const getErrorMessage = (err) => {
  if (!err) return 'An unknown error occurred.';
  if (typeof err === 'string') return err;
  if (err.response && err.response.data) {
    const data = err.response.data;
    if (data.detail) {
      if (Array.isArray(data.detail)) {
        return data.detail.map(item => item.msg || JSON.stringify(item)).join('; ');
      }
      if (typeof data.detail === 'string') return data.detail;
      return JSON.stringify(data.detail);
    }
    if (data.message) return data.message;
    if (typeof data === 'string') return data;
  }
  return err.message || 'An error occurred';
};

const Settings = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMe = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfileData({
        full_name: res.data.full_name || '',
        email: res.data.email || '',
        phone_number: res.data.phone_number || '',
      });
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await axios.put('/api/users/me', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Profile updated successfully', 'success');
      // Full reload so the sidebar/topbar (name shown from cached auth
      // state) picks up the change without needing a full re-login.
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    const errors = {};
    if (!passwordData.current_password) errors.current_password = 'Required';
    if (!passwordData.new_password) errors.new_password = 'Required';
    if (passwordData.new_password && passwordData.new_password.length < 6) {
      errors.new_password = 'Must be at least 6 characters';
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors({});
    setSavingPassword(true);
    try {
      await axios.post('/api/users/me/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Password changed successfully', 'success');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e', mb: 3 }}>
        Settings
      </Typography>

      {/* Profile Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Avatar sx={{ backgroundColor: '#e3f2fd', color: '#1565c0' }}><Person /></Avatar>
          <Typography variant="h6">Profile Information</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Full Name"
              value={profileData.full_name}
              onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone Number"
              value={profileData.phone_number}
              onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
              helperText={!profileData.phone_number ? "No member profile linked, or none set yet" : ""}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSaveProfile}
            disabled={savingProfile}
            sx={{ backgroundColor: '#1a237e' }}
          >
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </Button>
        </Box>
      </Paper>

      {/* Password Section */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Avatar sx={{ backgroundColor: '#fff3e0', color: '#ef6c00' }}><Lock /></Avatar>
          <Typography variant="h6">Change Password</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={passwordData.current_password}
              onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
              error={!!passwordErrors.current_password}
              helperText={passwordErrors.current_password}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              error={!!passwordErrors.new_password}
              helperText={passwordErrors.new_password}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
              error={!!passwordErrors.confirm_password}
              helperText={passwordErrors.confirm_password}
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<Lock />}
            onClick={handleChangePassword}
            disabled={savingPassword}
            sx={{ backgroundColor: '#1a237e' }}
          >
            {savingPassword ? 'Updating...' : 'Change Password'}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;