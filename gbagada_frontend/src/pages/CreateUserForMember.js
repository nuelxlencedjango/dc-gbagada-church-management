import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, TextField,
  Button, Alert, Snackbar, CircularProgress, Avatar,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { PersonAdd, CheckCircle } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const CreateUserForMember = () => {
  const { memberId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [member, setMember] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    password: '',
    confirm_password: '',
    role: 'member'
  });
  const [errors, setErrors] = useState({});

  const roles = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'pastor', label: 'Pastor' },
    { value: 'admin', label: 'Admin' },
    { value: 'department_head', label: 'Department Head' },
    { value: 'cell_leader', label: 'Cell Leader' },
    { value: 'member', label: 'Member' }
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchMember();
  }, [memberId]);

  const fetchMember = async () => {
    try {
      const response = await axios.get(`${API_URL}/members/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMember(response.data);
    } catch (error) {
      console.error('Error fetching member:', error);
      showSnackbar('Error fetching member details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/members/create-user/${memberId}`, {
        password: formData.password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSnackbar(`User account created for ${member.first_name} ${member.last_name}!`, 'success');
      
      // Navigate back to cell leaders page after 2 seconds
      setTimeout(() => {
        navigate('/cell-leaders');
      }, 2000);
    } catch (error) {
      console.error('Error creating user:', error);
      let errorMsg = 'Error creating user account';
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      }
      showSnackbar(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!member) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Member not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: '#1a237e' }}>
            <PersonAdd sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e' }}>
            Create User Account
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Creating account for: <strong>{member.first_name} {member.last_name}</strong>
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Alert severity="info">
            This member will be able to log in with these credentials.
          </Alert>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              error={!!errors.password}
              helperText={errors.password}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Confirm Password"
              name="confirm_password"
              type="password"
              value={formData.confirm_password}
              onChange={handleInputChange}
              error={!!errors.confirm_password}
              helperText={errors.confirm_password}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                label="Role"
              >
                {roles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              {formData.role === 'super_admin' && 'Full access to everything'}
              {formData.role === 'pastor' && 'Can view all, approve expenses, send memos'}
              {formData.role === 'admin' && 'Manage finances, equipment, transactions'}
              {formData.role === 'department_head' && 'Manage their department'}
              {formData.role === 'cell_leader' && 'Manage their cell group'}
              {formData.role === 'member' && 'Basic member access'}
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/cell-leaders')}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={submitting}
            sx={{ backgroundColor: '#1a237e', '&:hover': { backgroundColor: '#0d1442' } }}
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
          >
            {submitting ? 'Creating...' : 'Create Account'}
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

export default CreateUserForMember;
