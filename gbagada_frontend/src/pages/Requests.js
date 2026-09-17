import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, TextField,
  InputAdornment, Snackbar, Alert, CircularProgress, Tabs, Tab
} from '@mui/material';
import { Search, CheckCircle, Cancel, Payments } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

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

const statusColor = {
  pending: 'warning',
  approved: 'info',
  rejected: 'error',
  disbursed: 'success',
};

const Requests = () => {
  const { token, user } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const canDecide = user?.role === 'super_admin' || user?.role === 'overall_pastor';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0); // 0: pending, 1: approved, 2: rejected, 3: disbursed, 4: all
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/requests/`, { headers });
      setRequests(res.data);
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const handleApprove = async (id) => {
    try {
      await axios.post(`${API_URL}/requests/${id}/approve`, {}, { headers });
      showSnackbar('Request approved');
      fetchRequests();
    } catch (err) { showSnackbar(getErrorMessage(err), 'error'); }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this request?')) return;
    try {
      await axios.post(`${API_URL}/requests/${id}/reject`, {}, { headers });
      showSnackbar('Request rejected');
      fetchRequests();
    } catch (err) { showSnackbar(getErrorMessage(err), 'error'); }
  };

  const handleDisburse = async (id) => {
    if (!window.confirm('Confirm funds have been disbursed for this request?')) return;
    try {
      await axios.post(`${API_URL}/requests/${id}/disburse`, {}, { headers });
      showSnackbar('Funds disbursed');
      fetchRequests();
    } catch (err) { showSnackbar(getErrorMessage(err), 'error'); }
  };

  const statusFilters = ['pending', 'approved', 'rejected', 'disbursed', null];
  const filtered = requests
    .filter(r => statusFilters[tab] === null || r.status === statusFilters[tab])
    .filter(r =>
      !searchTerm ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.requested_by_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const countByStatus = (s) => requests.filter(r => r.status === s).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e', mb: 1 }}>
        Fund Requests
      </Typography>
      {!canDecide && (
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Viewing only — approving, rejecting, or disbursing requires Super Admin or Overall Pastor.
        </Typography>
      )}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label={`Pending (${countByStatus('pending')})`} />
          <Tab label={`Approved (${countByStatus('approved')})`} />
          <Tab label={`Rejected (${countByStatus('rejected')})`} />
          <Tab label={`Disbursed (${countByStatus('disbursed')})`} />
          <Tab label={`All (${requests.length})`} />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <TextField
          placeholder="Search by description, purpose, or requester..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          sx={{ width: 340, mb: 2 }}
        />

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Requested By</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Purpose</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date Needed</TableCell>
                <TableCell>Submitted</TableCell>
                {canDecide && <TableCell align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.requested_by_name || '—'}</TableCell>
                  <TableCell>₦{r.amount.toLocaleString()}</TableCell>
                  <TableCell>{r.purpose || '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>{r.description}</TableCell>
                  <TableCell>
                    <Chip label={r.status} size="small" color={statusColor[r.status] || 'default'} />
                  </TableCell>
                  <TableCell>{r.date_needed ? new Date(r.date_needed).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  {canDecide && (
                    <TableCell align="center">
                      {r.status === 'pending' && (
                        <>
                          <Button size="small" color="success" startIcon={<CheckCircle />} onClick={() => handleApprove(r.id)}>
                            Approve
                          </Button>
                          <Button size="small" color="error" startIcon={<Cancel />} onClick={() => handleReject(r.id)}>
                            Reject
                          </Button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <Button size="small" color="primary" startIcon={<Payments />} onClick={() => handleDisburse(r.id)}>
                          Disburse
                        </Button>
                      )}
                      {(r.status === 'disbursed' || r.status === 'rejected') && '—'}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {filtered.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No requests here.</Box>
        )}
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Requests;