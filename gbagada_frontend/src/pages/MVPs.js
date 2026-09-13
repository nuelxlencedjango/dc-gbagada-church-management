import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Snackbar, Alert,
  CircularProgress, Grid, Tooltip, Card, CardContent, Avatar
} from '@mui/material';
import {
  Add, Edit, Delete, PersonAdd, Person, CheckCircle,
  People
} from '@mui/icons-material';
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

const MVPs = () => {
  const { token, user } = useAuth();
  const [mvps, setMvps] = useState([]);
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConvertDialog, setOpenConvertDialog] = useState(false);
  const [editingMvp, setEditingMvp] = useState(null);
  const [selectedMvp, setSelectedMvp] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    occupation: '',
    prayer_point: '',
    visit_date: new Date().toISOString().split('T')[0],
    notes: '',
    assigned_to_id: '',
  });
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchMembers();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMVPs();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const fetchMVPs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      const res = await axios.get(`/api/mvps/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMvps(res.data);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/mvps/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching MVP stats:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await axios.get('/api/members/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      let membersData = res.data;
      if (!Array.isArray(membersData)) {
        membersData = membersData?.data && Array.isArray(membersData.data) ? membersData.data : [];
      }
      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      let usersData = res.data;
      if (!Array.isArray(usersData)) {
        usersData = usersData?.data && Array.isArray(usersData.data) ? usersData.data : [];
      }
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (mvp = null) => {
    if (mvp) {
      setEditingMvp(mvp);
      setFormData({
        first_name: mvp.first_name || '',
        last_name: mvp.last_name || '',
        email: mvp.email || '',
        phone: mvp.phone || '',
        address: mvp.address || '',
        occupation: mvp.occupation || '',
        prayer_point: mvp.prayer_point || '',
        visit_date: mvp.visit_date || new Date().toISOString().split('T')[0],
        notes: mvp.notes || '',
        assigned_to_id: mvp.assigned_to_id || '',
      });
    } else {
      setEditingMvp(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        occupation: '',
        prayer_point: '',
        visit_date: new Date().toISOString().split('T')[0],
        notes: '',
        assigned_to_id: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSubmit = async () => {
    try {
      const payload = { ...formData };
      if (payload.assigned_to_id === '') payload.assigned_to_id = null;
      if (editingMvp) {
        await axios.put(`/api/mvps/${editingMvp.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('MVP updated', 'success');
      } else {
        await axios.post('/api/mvps/', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('MVP created', 'success');
      }
      handleCloseDialog();
      fetchMVPs();
      fetchStats();
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this MVP?')) {
      try {
        await axios.delete(`/api/mvps/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('MVP deleted', 'success');
        fetchMVPs();
        fetchStats();
      } catch (error) {
        showSnackbar(getErrorMessage(error), 'error');
      }
    }
  };

  const handleOpenConvert = (mvp) => {
    setSelectedMvp(mvp);
    setSelectedMemberId('');
    setOpenConvertDialog(true);
  };

  const handleConvert = async () => {
    if (!selectedMemberId) {
      showSnackbar('Please select a member', 'error');
      return;
    }
    try {
      await axios.post(`/api/mvps/${selectedMvp.id}/convert?member_id=${selectedMemberId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('MVP converted to member successfully', 'success');
      setOpenConvertDialog(false);
      fetchMVPs();
      fetchStats();
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const getStatusChip = (status) => {
    const config = {
      new: { label: 'New', color: 'info' },
      followed_up: { label: 'Followed Up', color: 'warning' },
      converted: { label: 'Converted', color: 'success' }
    };
    const c = config[status] || config.new;
    return <Chip label={c.label} size="small" color={c.color} />;
  };

  const canManage = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'pastor' || user?.role === 'overall_pastor';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e' }}>
          Most Valuable Persons (MVPs)
        </Typography>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ backgroundColor: '#1a237e' }}
          >
            Add MVP
          </Button>
        )}
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="caption">
                      Total MVPs
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a237e' }}>
                      {stats.total}
                    </Typography>
                  </Box>
                  <Avatar sx={{ backgroundColor: '#1a237e', color: 'white' }}>
                    <People />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="caption">
                      New This Week
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: '#ff9800' }}>
                      {stats.new_this_week}
                    </Typography>
                  </Box>
                  <Avatar sx={{ backgroundColor: '#ff9800', color: 'white' }}>
                    <PersonAdd />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="caption">
                      Followed Up
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: '#2196f3' }}>
                      {stats.followed_up}
                    </Typography>
                  </Box>
                  <Avatar sx={{ backgroundColor: '#2196f3', color: 'white' }}>
                    <Person />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="caption">
                      Converted
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: '#4caf50' }}>
                      {stats.converted}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {stats.conversion_rate}% rate
                    </Typography>
                  </Box>
                  <Avatar sx={{ backgroundColor: '#4caf50', color: 'white' }}>
                    <CheckCircle />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Filter by Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="followed_up">Followed Up</MenuItem>
                <MenuItem value="converted">Converted</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button variant="outlined" onClick={() => setFilterStatus('')}>
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <Paper sx={{ p: 2 }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Occupation</TableCell>
                <TableCell>Visit Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mvps.map((mvp) => (
                <TableRow key={mvp.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {mvp.first_name} {mvp.last_name}
                    </Typography>
                    {mvp.address && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        {mvp.address.length > 40 ? mvp.address.substring(0, 40) + '...' : mvp.address}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {mvp.email && <div>{mvp.email}</div>}
                    {mvp.phone && <div>{mvp.phone}</div>}
                  </TableCell>
                  <TableCell>{mvp.occupation || '—'}</TableCell>
                  <TableCell>{new Date(mvp.visit_date).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusChip(mvp.status)}</TableCell>
                  <TableCell>{mvp.assigned_to_name || 'Unassigned'}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {mvp.status !== 'converted' && canManage && (
                        <Tooltip title="Convert to Member">
                          <IconButton size="small" color="success" onClick={() => handleOpenConvert(mvp)}>
                            <PersonAdd />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canManage && (
                        <>
                          <Tooltip title="Edit">
                            <IconButton size="small" color="primary" onClick={() => handleOpenDialog(mvp)}>
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDelete(mvp.id)}>
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {mvps.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">No MVPs found</Typography>
          </Box>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingMvp ? 'Edit MVP' : 'Add MVP'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                multiline
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Occupation"
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Visit Date"
                type="date"
                value={formData.visit_date}
                onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Assigned To</InputLabel>
                <Select
                  value={formData.assigned_to_id}
                  onChange={(e) => setFormData({ ...formData, assigned_to_id: e.target.value })}
                  label="Assigned To"
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {users.map(u => (
                    <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Prayer Point"
                multiline
                rows={2}
                value={formData.prayer_point}
                onChange={(e) => setFormData({ ...formData, prayer_point: e.target.value })}
                placeholder="What would they like prayer for?"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            {editingMvp ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Convert Dialog */}
      <Dialog open={openConvertDialog} onClose={() => setOpenConvertDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Convert MVP to Member</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Select an existing member to link this MVP to, or create a new member first.
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Select Member</InputLabel>
            <Select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              label="Select Member"
            >
              <MenuItem value="">Select a member</MenuItem>
              {members.map(m => (
                <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConvertDialog(false)}>Cancel</Button>
          <Button onClick={handleConvert} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            Convert
          </Button>
        </DialogActions>
      </Dialog>

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

export default MVPs;