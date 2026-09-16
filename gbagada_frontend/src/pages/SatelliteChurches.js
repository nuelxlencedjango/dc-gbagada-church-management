import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  TablePagination, TextField, InputAdornment, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Snackbar, Alert, CircularProgress, useTheme, useMediaQuery,
  Tooltip, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Search, Add, Edit, Delete, Church, LocationOn,
  Email, Phone, CheckCircle, Cancel
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const getErrorMessage = (error) => {
  if (error.response) {
    const data = error.response.data;
    if (data.detail) {
      if (Array.isArray(data.detail)) {
        return data.detail.map(err => err.msg || err).join(', ');
      }
      if (typeof data.detail === 'string') return data.detail;
    }
    if (data.message) return data.message;
    if (typeof data === 'string') return data;
  }
  return error.message || 'An error occurred';
};

const SatelliteChurches = () => {
  const { token } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [satellites, setSatellites] = useState([]);
  const [availablePastors, setAvailablePastors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSatellite, setEditingSatellite] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    phone: '',
    email: '',
    service_time: '',
    pastor_id: '',
    established_date: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchSatellites();
    fetchAvailablePastors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSatellites = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/satellites/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSatellites(response.data);
    } catch (error) {
      console.error('Error fetching satellites:', error);
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePastors = async () => {
    try {
      const response = await axios.get(`${API_URL}/satellites/available-pastors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailablePastors(response.data);
    } catch (error) {
      console.error('Error fetching pastors:', error);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (satellite = null) => {
    setFormErrors({});
    fetchAvailablePastors();
    if (satellite) {
      setEditingSatellite(satellite);
      setFormData({
        name: satellite.name || '',
        address: satellite.address || '',
        city: satellite.city || '',
        state: satellite.state || '',
        country: satellite.country || 'Nigeria',
        phone: satellite.phone || '',
        email: satellite.email || '',
        service_time: satellite.service_time || '',
        pastor_id: satellite.pastor_id || '',
        established_date: satellite.established_date ? satellite.established_date.split('T')[0] : ''
      });
    } else {
      setEditingSatellite(null);
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        country: 'Nigeria',
        phone: '',
        email: '',
        service_time: '',
        pastor_id: '',
        established_date: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSatellite(null);
  };

  const handleSubmit = async () => {
    setFormErrors({});
    const errors = {};
    if (!formData.name) errors.name = 'Name is required';
    if (!formData.address) errors.address = 'Address is required';
    if (!formData.city) errors.city = 'City is required';
    if (!formData.state) errors.state = 'State is required';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const submitData = {
        ...formData,
        pastor_id: formData.pastor_id ? parseInt(formData.pastor_id) : null,
      };

      if (editingSatellite) {
        await axios.put(`${API_URL}/satellites/${editingSatellite.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Satellite updated successfully', 'success');
      } else {
        await axios.post(`${API_URL}/satellites/`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Satellite created successfully', 'success');
      }
      handleCloseDialog();
      fetchSatellites();
      fetchAvailablePastors();
    } catch (error) {
      console.error('Submit error:', error);
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this satellite church?')) {
      try {
        await axios.delete(`${API_URL}/satellites/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Satellite deactivated', 'success');
        fetchSatellites();
        fetchAvailablePastors();
      } catch (error) {
        console.error('Delete error:', error);
        showSnackbar(getErrorMessage(error), 'error');
      }
    }
  };

  const filteredSatellites = satellites.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          Satellite Churches
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ backgroundColor: '#1a237e' }}
        >
          Add Satellite
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <TextField
            placeholder="Search satellites..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
            }}
            sx={{ width: 300 }}
          />
          <Typography variant="body2" color="textSecondary">
            Total: {filteredSatellites.length}
          </Typography>
        </Box>

        <TableContainer>
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Pastor</TableCell>
                <TableCell>Service Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSatellites
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((satellite) => (
                  <TableRow key={satellite.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {satellite.name}
                      </Typography>
                      {satellite.email && (
                        <Typography variant="caption" display="block" color="textSecondary">
                          <Email fontSize="inherit" sx={{ fontSize: 12, mr: 0.5 }} /> {satellite.email}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {satellite.city}, {satellite.state}
                      <Typography variant="caption" display="block" color="textSecondary">
                        <LocationOn fontSize="inherit" sx={{ fontSize: 12, mr: 0.5 }} /> {satellite.address}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {satellite.pastor_name ? (
                        <Chip label={satellite.pastor_name} size="small" sx={{ backgroundColor: '#e3f2fd' }} />
                      ) : (
                        <Chip label="Not assigned" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>{satellite.service_time || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={satellite.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={satellite.is_active ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(satellite)}>
                          <Edit sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(satellite.id)}>
                          <Delete sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredSatellites.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Church sx={{ fontSize: 60, color: '#bdbdbd' }} />
            <Typography variant="h6" color="textSecondary">No satellite churches found</Typography>
          </Box>
        )}

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredSatellites.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSatellite ? 'Edit Satellite Church' : 'Add Satellite Church'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Church Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                error={!!formErrors.address}
                helperText={formErrors.address}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                error={!!formErrors.city}
                helperText={formErrors.city}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                error={!!formErrors.state}
                helperText={formErrors.state}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Assign Pastor</InputLabel>
                <Select
                  value={formData.pastor_id}
                  onChange={(e) => setFormData({ ...formData, pastor_id: e.target.value })}
                  label="Assign Pastor"
                >
                  <MenuItem value="">None</MenuItem>
                  {availablePastors.map((p) => (
                    <MenuItem key={p.user_id} value={p.user_id}>
                      {p.name}
                      {p.current_satellite_name ? ` (currently at ${p.current_satellite_name})` : ''}
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                  Picking a pastor already assigned elsewhere moves them to this satellite.
                </Typography>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Service Time"
                value={formData.service_time}
                onChange={(e) => setFormData({ ...formData, service_time: e.target.value })}
                placeholder="e.g., Sundays 10:00 AM"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Established Date"
                type="date"
                value={formData.established_date}
                onChange={(e) => setFormData({ ...formData, established_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            {editingSatellite ? 'Update' : 'Add'}
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

export default SatelliteChurches;