import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Snackbar, Alert,
  CircularProgress, Grid, Tooltip
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

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

const Equipment = () => {
  const { token, user } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEq, setEditingEq] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    serial_number: '',
    purchase_date: '',
    purchase_price: '',
    location: '',
    status: 'available',
    condition: 'good',
    assigned_to_person_id: '',
    category: '',
    maintenance_notes: '',
  });
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchEquipment();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (filterStatus) params.append('status', filterStatus);
      const res = await axios.get(`${API_URL}/equipment/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEquipment(res.data);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/all`, {
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

  const handleOpenDialog = (eq = null) => {
    if (eq) {
      setEditingEq(eq);
      setFormData({
        name: eq.name || '',
        description: eq.description || '',
        serial_number: eq.serial_number || '',
        purchase_date: eq.purchase_date ? eq.purchase_date.split('T')[0] : '',
        purchase_price: eq.purchase_price || '',
        location: eq.location || '',
        status: eq.status || 'available',
        condition: eq.condition || 'good',
        assigned_to_person_id: eq.assigned_to_person_id || '',
        category: eq.category || '',
        maintenance_notes: eq.maintenance_notes || '',
      });
    } else {
      setEditingEq(null);
      setFormData({
        name: '',
        description: '',
        serial_number: '',
        purchase_date: '',
        purchase_price: '',
        location: '',
        status: 'available',
        condition: 'good',
        assigned_to_person_id: '',
        category: '',
        maintenance_notes: '',
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
        assigned_to_person_id: formData.assigned_to_person_id ? parseInt(formData.assigned_to_person_id) : null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        // Backend expects a full datetime, not a bare YYYY-MM-DD string.
        purchase_date: formData.purchase_date ? `${formData.purchase_date}T00:00:00` : null,
      };

      if (editingEq) {
        // status is only meaningful on update — a brand new asset always
        // starts "available" server-side, so we don't send it on create.
        await axios.put(`${API_URL}/equipment/${editingEq.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Equipment updated', 'success');
      } else {
        const { status, ...createPayload } = payload;
        await axios.post(`${API_URL}/equipment/`, createPayload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Equipment added', 'success');
      }
      handleCloseDialog();
      fetchEquipment();
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this equipment?')) {
      try {
        await axios.delete(`${API_URL}/equipment/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Equipment deactivated', 'success');
        fetchEquipment();
      } catch (error) {
        showSnackbar(getErrorMessage(error), 'error');
      }
    }
  };

  const getStatusChip = (status) => {
    const colors = {
      available: 'success',
      maintenance: 'warning',
      retired: 'error'
    };
    return <Chip label={status} size="small" color={colors[status] || 'default'} />;
  };

  const getConditionChip = (condition) => {
    const colors = {
      good: 'success',
      fair: 'info',
      poor: 'warning',
      'needs repair': 'error'
    };
    return <Chip label={condition} size="small" color={colors[condition] || 'default'} />;
  };

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
          Church Assets
        </Typography>
        {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'overall_pastor') && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ backgroundColor: '#1a237e' }}
          >
            Add Asset
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Category</InputLabel>
              <Select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); fetchEquipment(); }}
                label="Filter by Category"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="audio">Audio</MenuItem>
                <MenuItem value="video">Video</MenuItem>
                <MenuItem value="furniture">Furniture</MenuItem>
                <MenuItem value="instruments">Instruments</MenuItem>
                <MenuItem value="office">Office</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); fetchEquipment(); }}
                label="Filter by Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="retired">Retired</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button variant="outlined" onClick={() => { setFilterCategory(''); setFilterStatus(''); fetchEquipment(); }}>
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
                <TableCell>Serial #</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Condition</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {equipment.map((eq) => (
                <TableRow key={eq.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {eq.name}
                    </Typography>
                    {eq.category && (
                      <Typography variant="caption" color="textSecondary">
                        {eq.category}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{eq.serial_number || '—'}</TableCell>
                  <TableCell>{eq.location || '—'}</TableCell>
                  <TableCell>{eq.assigned_to_name || 'Unassigned'}</TableCell>
                  <TableCell>{getStatusChip(eq.status)}</TableCell>
                  <TableCell>{getConditionChip(eq.condition)}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'overall_pastor') && (
                        <>
                          <Tooltip title="Edit">
                            <IconButton size="small" color="primary" onClick={() => handleOpenDialog(eq)}>
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Retire">
                            <IconButton size="small" color="error" onClick={() => handleDelete(eq.id)}>
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
        {equipment.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">No equipment found</Typography>
          </Box>
        )}
      </Paper>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingEq ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name *"
            margin="normal"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
          <TextField
            fullWidth
            label="Serial Number"
            margin="normal"
            value={formData.serial_number}
            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
          />
          <TextField
            fullWidth
            label="Purchase Date"
            type="date"
            margin="normal"
            value={formData.purchase_date}
            onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Purchase Price (₦)"
            type="number"
            margin="normal"
            value={formData.purchase_price}
            onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
          />
          <TextField
            fullWidth
            label="Location"
            margin="normal"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
          {editingEq && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="retired">Retired</MenuItem>
              </Select>
            </FormControl>
          )}
          <FormControl fullWidth margin="normal">
            <InputLabel>Condition</InputLabel>
            <Select
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              label="Condition"
            >
              <MenuItem value="good">Good</MenuItem>
              <MenuItem value="fair">Fair</MenuItem>
              <MenuItem value="poor">Poor</MenuItem>
              <MenuItem value="needs repair">Needs Repair</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Assigned To</InputLabel>
            <Select
              value={formData.assigned_to_person_id}
              onChange={(e) => setFormData({ ...formData, assigned_to_person_id: e.target.value })}
              label="Assigned To"
            >
              <MenuItem value="">Unassigned</MenuItem>
              {users.map(u => (
                <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              label="Category"
            >
              <MenuItem value="audio">Audio</MenuItem>
              <MenuItem value="video">Video</MenuItem>
              <MenuItem value="furniture">Furniture</MenuItem>
              <MenuItem value="instruments">Instruments</MenuItem>
              <MenuItem value="office">Office</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Maintenance Notes"
            margin="normal"
            multiline
            rows={2}
            value={formData.maintenance_notes}
            onChange={(e) => setFormData({ ...formData, maintenance_notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            {editingEq ? 'Update' : 'Add'}
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

export default Equipment;