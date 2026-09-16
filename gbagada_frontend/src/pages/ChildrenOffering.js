import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, TextField, Button,
  FormControl, InputLabel, Select, MenuItem, Snackbar, Alert,
  CircularProgress, InputAdornment, Grid
} from '@mui/material';
import { Payments, ChildCare } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const getErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (Array.isArray(detail)) return detail.map(d => d.msg || JSON.stringify(d)).join('; ');
    if (typeof detail === 'string') return detail;
  }
  return error.message || 'An error occurred';
};

const ChildrenOffering = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    class_id: '',
    amount: '',
    notes: ''
  });

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API_URL}/children/classes`, { headers: { Authorization: `Bearer ${token}` } });
      setClasses(res.data);
    } catch (error) {
      setSnackbar({ open: true, message: getErrorMessage(error), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setSnackbar({ open: true, message: 'Enter a valid amount', severity: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/children/record-offering`, {
        date: form.date,
        class_id: form.class_id || null,
        amount: parseFloat(form.amount),
        notes: form.notes || null,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setSnackbar({ open: true, message: 'Offering recorded — pending confirmation by another admin', severity: 'success' });
      setForm({ date: new Date().toISOString().split('T')[0], class_id: '', amount: '', notes: '' });
      setTimeout(() => {
        navigate('/dashboard', {
          state: { successMessage: `Offering of ₦${parseFloat(form.amount).toLocaleString()} recorded — pending confirmation by another admin` }
        });
      }, 900);
    } catch (error) {
      setSnackbar({ open: true, message: getErrorMessage(error), severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e', mb: 1 }}>
        <ChildCare sx={{ fontSize: 28, verticalAlign: 'middle', mr: 1 }} />
        Record Children's Offering
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Not tied to a specific class — covers the whole children's service unless you pick one below.
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount (₦)"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">₦</InputAdornment> }}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Class (optional)</InputLabel>
              <Select
                value={form.class_id}
                onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                label="Class (optional)"
              >
                <MenuItem value="">Whole children's service</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes (optional)"
              multiline
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Payments />}
              onClick={handleSubmit}
              disabled={submitting}
              sx={{ backgroundColor: '#1a237e', py: 1.2 }}
            >
              {submitting ? 'Recording...' : 'Record Offering'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
};

export default ChildrenOffering;