import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  TablePagination, TextField, InputAdornment, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Snackbar, Alert, CircularProgress, useTheme, useMediaQuery,
  MenuItem, FormControl, InputLabel, Select, Tooltip
} from '@mui/material';
import {
  Search, Add, Edit, Delete, Person, Email, Phone
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8000/api';

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

const Pastors = () => {
  const { token, user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [pastors, setPastors] = useState([]);
  const [satellites, setSatellites] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPastor, setEditingPastor] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    user_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: '',
    ordination_date: '',
    assigned_satellite_id: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const canManage = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'pastor' || user?.role === 'overall_pastor';

  useEffect(() => {
    fetchPastors();
    fetchSatellites();
    fetchAvailableUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPastors = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/pastors/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPastors(response.data);
    } catch (error) {
      console.error('Error fetching pastors:', error);
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSatellites = async () => {
    try {
      const response = await axios.get(`${API_URL}/satellites/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSatellites(response.data);
    } catch (error) {
      console.error('Error fetching satellites:', error);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/pastors/available-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableUsers(response.data);
    } catch (error) {
      console.error('Error fetching available pastor accounts:', error);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (pastor = null) => {
    setFormErrors({});
    // Refresh so the account picker reflects anyone newly created/freed since last open
    fetchAvailableUsers();
    if (pastor) {
      setEditingPastor(pastor);
      setFormData({
        user_id: pastor.user_id || '',
        first_name: pastor.first_name || '',
        last_name: pastor.last_name || '',
        email: pastor.email || '',
        phone: pastor.phone || '',
        bio: pastor.bio || '',
        ordination_date: pastor.ordination_date || '',
        assigned_satellite_id: pastor.assigned_satellite_id || ''
      });
    } else {
      setEditingPastor(null);
      setFormData({
        user_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        bio: '',
        ordination_date: '',
        assigned_satellite_id: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPastor(null);
  };

  // When picking the linked account, prefill name/email so the admin
  // isn't retyping what's already on the User record.
  const handleUserSelect = (userId) => {
    const picked = availableUsers.find(u => u.id === userId);
    if (picked) {
      const [firstGuess, ...restGuess] = (picked.full_name || '').split(' ');
      setFormData({
        ...formData,
        user_id: userId,
        first_name: formData.first_name || firstGuess || '',
        last_name: formData.last_name || restGuess.join(' ') || '',
        email: formData.email || picked.email || '',
        phone: formData.phone || picked.phone || '',
      });
    } else {
      setFormData({ ...formData, user_id: userId });
    }
  };

  const handleSubmit = async () => {
    setFormErrors({});
    const errors = {};
    if (!formData.user_id) errors.user_id = 'A linked user account is required';
    if (!formData.first_name) errors.first_name = 'First name is required';
    if (!formData.last_name) errors.last_name = 'Last name is required';
    if (!formData.email) errors.email = 'Email is required';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const submitData = { ...formData, user_id: parseInt(formData.user_id) };
      if (editingPastor) {
        await axios.put(`${API_URL}/pastors/${editingPastor.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Pastor updated successfully', 'success');
      } else {
        await axios.post(`${API_URL}/pastors/`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Pastor added successfully', 'success');
      }
      handleCloseDialog();
      fetchPastors();
      fetchAvailableUsers();
    } catch (error) {
      console.error('Submit error:', error);
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this pastor?')) {
      try {
        await axios.delete(`${API_URL}/pastors/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Pastor deactivated', 'success');
        fetchPastors();
      } catch (error) {
        console.error('Delete error:', error);
        showSnackbar(getErrorMessage(error), 'error');
      }
    }
  };

  const filteredPastors = pastors.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // When editing, the currently-linked user won't appear in "available"
  // (it's already taken by this profile) — add it back so it still shows
  // as the selected option.
  const userOptionsForForm = editingPastor && formData.user_id
    ? [
        ...availableUsers,
        ...(availableUsers.some(u => u.id === formData.user_id)
          ? []
          : [{ id: formData.user_id, full_name: `${formData.first_name} ${formData.last_name}`.trim(), email: formData.email }])
      ]
    : availableUsers;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e' }}>
          Manage Pastors
        </Typography>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ backgroundColor: '#1a237e' }}
          >
            Add Pastor
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <TextField
            placeholder="Search pastors..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
            }}
            sx={{ width: 300 }}
          />
          <Typography variant="body2" color="textSecondary">
            Total: {filteredPastors.length}
          </Typography>
        </Box>

        <TableContainer>
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email / Phone</TableCell>
                <TableCell>Satellite</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPastors
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((pastor) => (
                  <TableRow key={pastor.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {pastor.first_name} {pastor.last_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {pastor.email}
                      {pastor.phone && (
                        <Typography variant="caption" display="block" color="textSecondary">
                          <Phone fontSize="inherit" sx={{ fontSize: 12, mr: 0.5 }} /> {pastor.phone}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {pastor.assigned_satellite_name ? (
                        <Chip label={pastor.assigned_satellite_name} size="small" sx={{ backgroundColor: '#e3f2fd' }} />
                      ) : (
                        <Chip label="Not assigned" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pastor.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={pastor.is_active ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {canManage && (
                        <>
                          <Tooltip title="Edit">
                            <IconButton size="small" color="primary" onClick={() => handleOpenDialog(pastor)}>
                              <Edit sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDelete(pastor.id)}>
                              <Delete sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredPastors.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Person sx={{ fontSize: 60, color: '#bdbdbd' }} />
            <Typography variant="h6" color="textSecondary">No pastors found</Typography>
          </Box>
        )}

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredPastors.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPastor ? 'Edit Pastor' : 'Add Pastor'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!formErrors.user_id}>
                <InputLabel>Select Account *</InputLabel>
                <Select
                  value={formData.user_id}
                  onChange={(e) => handleUserSelect(e.target.value)}
                  label="Select Account *"
                  required
                >
                  <MenuItem value="">Select account</MenuItem>
                  {userOptionsForForm.length === 0 && (
                    <MenuItem disabled>No unlinked pastor accounts — create one first</MenuItem>
                  )}
                  {userOptionsForForm.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.full_name} — {u.role ? u.role.replace('_', ' ') : 'member'} — {u.email}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.user_id && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {formErrors.user_id}
                  </Typography>
                )}
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                  Select the account belonging to this pastor. A pastor may also
                  be listed as an HOD or Cell Leader elsewhere — that's fine,
                  any active account can be linked here.
                </Typography>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                error={!!formErrors.first_name}
                helperText={formErrors.first_name}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                error={!!formErrors.last_name}
                helperText={formErrors.last_name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={!!formErrors.email}
                helperText={formErrors.email}
                required
                InputProps={{ startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bio"
                multiline
                rows={2}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ordination Date"
                type="date"
                value={formData.ordination_date}
                onChange={(e) => setFormData({ ...formData, ordination_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Assign to Satellite</InputLabel>
                <Select
                  value={formData.assigned_satellite_id}
                  onChange={(e) => setFormData({ ...formData, assigned_satellite_id: e.target.value })}
                  label="Assign to Satellite"
                >
                  <MenuItem value="">None</MenuItem>
                  {satellites.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            {editingPastor ? 'Update' : 'Add'}
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

export default Pastors;