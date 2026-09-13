import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Grid, TextField, Button,
  Snackbar, Alert, CircularProgress
} from '@mui/material';
import { Send, RequestQuote } from '@mui/icons-material';
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

const MakeRequest = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    purpose: '',
    date_needed: new Date().toISOString().split('T')[0]
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // ✅ Convert date to ISO datetime string
      const payload = {
        amount: parseFloat(formData.amount),
        description: formData.description,
        purpose: formData.purpose,
        date_needed: new Date(formData.date_needed).toISOString(),
      };
      await axios.post('/api/requests/', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnackbar({ open: true, message: 'Request submitted successfully!', severity: 'success' });
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      setSnackbar({
        open: true,
        message: getErrorMessage(error),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <RequestQuote sx={{ fontSize: 30, color: '#1a237e', mr: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e' }}>
          Make a Request
        </Typography>
      </Box>
      <Paper sx={{ p: 4 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Amount (₦)"
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                InputProps={{ startAdornment: '₦' }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Purpose"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                required
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date Needed"
                type="date"
                name="date_needed"
                value={formData.date_needed}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => navigate('/dashboard')} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ backgroundColor: '#1a237e' }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Send />}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </Box>
        </form>
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

export default MakeRequest;