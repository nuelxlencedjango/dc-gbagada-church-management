import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Snackbar, Alert,
  CircularProgress, Grid, Tooltip
} from '@mui/material';
import { Add, Edit, Delete, CheckCircle } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const MANAGE_ROLES = ['admin', 'super_admin', 'pastor', 'overall_pastor'];

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

const Operations = () => {
  const { token, user } = useAuth();
  const [operations, setOperations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOp, setEditingOp] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to_id: '',
    priority: 'medium',
    due_date: '',
    category: '',
    location: '',
    notes: '',
    is_recurring: false,
    recurrence_pattern: '',
  });
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch whenever a filter changes — reading filterStatus/filterAssigned
  // directly here avoids the stale-closure bug of calling fetchOperations()
  // manually inside each filter's onChange handler.
  useEffect(() => {
    fetchOperations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterAssigned]);

  const fetchOperations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterAssigned) params.append('assigned_to', filterAssigned);
      const res = await axios.get(`/api/operations/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOperations(res.data);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
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

  const handleOpenDialog = (op = null) => {
    if (op) {
      setEditingOp(op);
      setFormData({
        title: op.title || '',
        description: op.description || '',
        assigned_to_id: op.assigned_to_id || '',
        priority: op.priority || 'medium',
        due_date: op.due_date || '',
        category: op.category || '',
        location: op.location || '',
        notes: op.notes || '',
        is_recurring: op.is_recurring || false,
        recurrence_pattern: op.recurrence_pattern || '',
      });
    } else {
      setEditingOp(null);
      setFormData({
        title: '',
        description: '',
        assigned_to_id: '',
        priority: 'medium',
        due_date: '',
        category: '',
        location: '',
        notes: '',
        is_recurring: false,
        recurrence_pattern: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        assigned_to_id: formData.assigned_to_id ? parseInt(formData.assigned_to_id) : null,
        due_date: formData.due_date ? formData.due_date : null,
      };
      if (editingOp) {
        await axios.put(`/api/operations/${editingOp.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Operation updated', 'success');
      } else {
        await axios.post('/api/operations/', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Operation created', 'success');
      }
      handleCloseDialog();
      fetchOperations();
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleComplete = async (id) => {
    try {
      await axios.post(`/api/operations/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Operation marked as completed', 'success');
      fetchOperations();
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this operation?')) {
      try {
        await axios.delete(`/api/operations/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Operation deleted', 'success');
        fetchOperations();
      } catch (error) {
        showSnackbar(getErrorMessage(error), 'error');
      }
    }
  };

  const getPriorityChip = (priority) => {
    const colors = {
      low: 'success',
      medium: 'info',
      high: 'warning',
      urgent: 'error'
    };
    return <Chip label={priority} size="small" color={colors[priority] || 'default'} />;
  };

  const getStatusChip = (status) => {
    const config = {
      pending: { label: 'Pending', color: 'warning' },
      in_progress: { label: 'In Progress', color: 'info' },
      completed: { label: 'Completed', color: 'success' },
      cancelled: { label: 'Cancelled', color: 'error' }
    };
    const c = config[status] || config.pending;
    return <Chip label={c.label} size="small" color={c.color} />;
  };

  const canManage = MANAGE_ROLES.includes(user?.role);

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
          Church Operations
        </Typography>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ backgroundColor: '#1a237e' }}
          >
            Add Operation
          </Button>
        )}
      </Box>

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
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Assigned to</InputLabel>
              <Select
                value={filterAssigned}
                onChange={(e) => setFilterAssigned(e.target.value)}
                label="Assigned to"
              >
                <MenuItem value="">All</MenuItem>
                {users.map(u => (
                  <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button variant="outlined" onClick={() => { setFilterStatus(''); setFilterAssigned(''); }}>
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
                <TableCell>Title</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operations.map((op) => {
                const isAssignee = user?.id === op.assigned_to_id;
                const canComplete = isAssignee || canManage;
                return (
                  <TableRow key={op.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {op.title}
                      </Typography>
                      {op.description && (
                        <Typography variant="caption" display="block" color="textSecondary">
                          {op.description.length > 60 ? op.description.substring(0, 60) + '...' : op.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {op.assigned_to_name || 'Unassigned'}
                    </TableCell>
                    <TableCell>{getPriorityChip(op.priority)}</TableCell>
                    <TableCell>{getStatusChip(op.status)}</TableCell>
                    <TableCell>{op.due_date ? new Date(op.due_date).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>{op.category || '—'}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {op.status !== 'completed' && op.status !== 'cancelled' && (
                          <Tooltip title={canComplete ? 'Mark as complete' : 'Only the assignee or an admin can complete this'}>
                            <span>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleComplete(op.id)}
                                disabled={!canComplete}
                              >
                                <CheckCircle />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        {canManage && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => handleOpenDialog(op)}>
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDelete(op.id)}>
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {operations.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">No operations found</Typography>
          </Box>
        )}
      </Paper>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingOp ? 'Edit Operation' : 'Add Operation'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            margin="normal"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <TextField
            fullWidth
            label="Description"
            margin="normal"
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <FormControl fullWidth margin="normal">
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
          <FormControl fullWidth margin="normal">
            <InputLabel>Priority</InputLabel>
            <Select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              label="Priority"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Due Date"
            type="date"
            margin="normal"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Category"
            margin="normal"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
          <TextField
            fullWidth
            label="Location"
            margin="normal"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
          <TextField
            fullWidth
            label="Notes"
            margin="normal"
            multiline
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            {editingOp ? 'Update' : 'Add'}
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

export default Operations;