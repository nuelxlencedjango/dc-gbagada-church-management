import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  TablePagination, TextField, InputAdornment, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Snackbar, Alert, CircularProgress, useTheme, useMediaQuery,
  MenuItem, FormControl, InputLabel, Select, Tooltip, ToggleButton, ToggleButtonGroup,
  Tabs, Tab
} from '@mui/material';
import {
  Search, Add, Edit, Delete, Event, AccessTime, CalendarToday,
  AttachMoney,
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

const Services = () => {
  const { token, user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [openOfferingDialog, setOpenOfferingDialog] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [offeringAmount, setOfferingAmount] = useState('');
  const [speakerMode, setSpeakerMode] = useState('existing');
  const [mainTab, setMainTab] = useState(0); // 0: Services, 1: Rotation Report
  const [rotationData, setRotationData] = useState(null);
  const [rotationLoading, setRotationLoading] = useState(false); // 'existing' | 'guest'
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    start_time: '',
    end_time: '',
    overseer_id: '',
    opening_prayer_id: '',
    closing_prayer_id: '',
    worship_leader_id: '',
    speaker_id: '',
    speaker_name: '',
    theme: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchServices();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mainTab === 1 && !rotationData) {
      fetchRotationReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/services/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Previously filtered to a fixed set of "leadership" roles by
      // reading u.role directly — but assigning someone as a Cell Leader
      // or HOD never updates that field (established repeatedly
      // elsewhere in this app), so real officials were randomly missing
      // from this list depending on whether their role field happened
      // to also be set correctly. Listing every active account avoids
      // that fragile signal entirely — anyone active could plausibly
      // serve in one of these roles.
      const response = await axios.get(`${API_URL}/users/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let usersData = response.data;
      if (!Array.isArray(usersData)) {
        usersData = (usersData && usersData.data && Array.isArray(usersData.data)) ? usersData.data : [];
      }
      setUsers(usersData.filter(u => u.is_active !== false));
    } catch (error) {
      console.error('Error fetching users:', error);
      if (user) setUsers([user]);
    }
  };

  const fetchRotationReport = async () => {
    setRotationLoading(true);
    try {
      const res = await axios.get(`${API_URL}/services/rotation-report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRotationData(res.data);
    } catch (error) {
      console.error('Error fetching rotation report:', error);
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setRotationLoading(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (service = null) => {
    setFormErrors({});
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name || '',
        date: service.date ? service.date.slice(0, 16) : '',
        start_time: service.start_time || '',
        end_time: service.end_time || '',
        overseer_id: service.overseer_id || '',
        opening_prayer_id: service.opening_prayer_id || '',
        closing_prayer_id: service.closing_prayer_id || '',
        worship_leader_id: service.worship_leader_id || '',
        speaker_id: service.speaker_id || '',
        speaker_name: service.speaker_name || '',
        theme: service.theme || '',
        notes: service.notes || ''
      });
      // If this service already has a guest speaker name (no account),
      // open the form in guest mode so it's not silently hidden.
      setSpeakerMode(service.speaker_name && !service.speaker_id ? 'guest' : 'existing');
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        date: '',
        start_time: '',
        end_time: '',
        overseer_id: '',
        opening_prayer_id: '',
        closing_prayer_id: '',
        worship_leader_id: '',
        speaker_id: '',
        speaker_name: '',
        theme: '',
        notes: ''
      });
      setSpeakerMode('existing');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingService(null);
  };

  const handleSpeakerModeChange = (event, newMode) => {
    if (!newMode) return;
    setSpeakerMode(newMode);
    // Clear whichever field doesn't apply to the newly selected mode,
    // so a stale value never gets submitted alongside the active one.
    if (newMode === 'existing') {
      setFormData({ ...formData, speaker_name: '' });
    } else {
      setFormData({ ...formData, speaker_id: '' });
    }
  };

  const handleSubmit = async () => {
    setFormErrors({});
    const errors = {};
    if (!formData.name) errors.name = 'Name is required';
    if (!formData.date) errors.date = 'Date is required';
    if (!formData.start_time) errors.start_time = 'Start time is required';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const submitData = { ...formData };
      ['overseer_id', 'opening_prayer_id', 'closing_prayer_id', 'worship_leader_id', 'speaker_id'].forEach(field => {
        submitData[field] = submitData[field] ? parseInt(submitData[field]) : null;
      });
      submitData.speaker_name = submitData.speaker_name || null;

      if (editingService) {
        await axios.put(`${API_URL}/services/${editingService.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Service updated successfully', 'success');
      } else {
        await axios.post(`${API_URL}/services/`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Service created successfully', 'success');
      }
      handleCloseDialog();
      fetchServices();
    } catch (error) {
      console.error('Submit error:', error);
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await axios.delete(`${API_URL}/services/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Service deleted', 'success');
        fetchServices();
      } catch (error) {
        console.error('Delete error:', error);
        showSnackbar(getErrorMessage(error), 'error');
      }
    }
  };

  const handleRecordOffering = (service) => {
    setSelectedService(service);
    setOfferingAmount('');
    setOpenOfferingDialog(true);
  };

  const handleSubmitOffering = async () => {
    if (!offeringAmount || parseFloat(offeringAmount) <= 0) {
      showSnackbar('Please enter a valid amount', 'error');
      return;
    }
    try {
      await axios.post(
        `${API_URL}/services/${selectedService.id}/record-offering?amount=${parseFloat(offeringAmount)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSnackbar('Offering recorded successfully', 'success');
      setOpenOfferingDialog(false);
      fetchServices();
    } catch (error) {
      console.error('Offering error:', error);
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.theme && s.theme.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e', fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
          Church Services
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ backgroundColor: '#1a237e' }}
        >
          Add Service
        </Button>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={mainTab} onChange={(e, v) => setMainTab(v)}>
          <Tab label="Services" />
          <Tab label="Rotation Report" />
        </Tabs>
      </Paper>

      {mainTab === 1 && (
        <Paper sx={{ p: { xs: 1, sm: 2 } }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Who's served in which role, how often, and over what date range — all time, across every recorded service.
          </Typography>
          {rotationLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : !rotationData ? null : (
            <Grid container spacing={2}>
              {[
                { key: 'overseer', label: 'Overseer' },
                { key: 'speaker', label: 'Speaker' },
                { key: 'opening_prayer', label: 'Opening Prayer' },
                { key: 'closing_prayer', label: 'Closing Prayer' },
                { key: 'worship_leader', label: 'Worship Leader' },
              ].map(({ key, label }) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>{label}</Typography>
                    {(!rotationData[key] || rotationData[key].length === 0) ? (
                      <Typography variant="caption" color="textSecondary">No one has served in this role yet.</Typography>
                    ) : (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell align="center">Times</TableCell>
                            <TableCell>Last Served</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rotationData[key].map((row) => (
                            <TableRow key={row.user_id}>
                              <TableCell sx={{ fontSize: '0.8rem' }}>{row.full_name}</TableCell>
                              <TableCell align="center">
                                <Chip label={row.times_served} size="small" />
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.75rem' }}>
                                {row.last_served ? new Date(row.last_served).toLocaleDateString() : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      {mainTab === 0 && (
      <Paper sx={{ p: { xs: 1, sm: 2 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 2, gap: 1 }}>
          <TextField
            placeholder="Search services..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
            }}
            sx={{ width: { xs: '100%', sm: 300 } }}
          />
          <Typography variant="body2" color="textSecondary">
            Total: {filteredServices.length}
          </Typography>
        </Box>

        {/* Mobile: card list instead of a 9-column table that would
            otherwise require horizontal scrolling on a phone */}
        {isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {filteredServices
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((service) => (
                <Paper key={service.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{service.name}</Typography>
                    <Chip
                      label={service.is_cancelled ? 'Cancelled' : 'Scheduled'} 
                      size="small"
                      color={service.is_cancelled ? 'error' : 'success'} 
                    />
                  </Box>
                  <Typography variant="caption" display="block" color="textSecondary">
                    <CalendarToday fontSize="inherit" sx={{ fontSize: 12, mr: 0.5 }} />
                    {new Date(service.date).toLocaleDateString()}
                    {'  '}
                    <AccessTime fontSize="inherit" sx={{ fontSize: 12, mr: 0.5, ml: 1 }} />
                    {service.start_time} {service.end_time ? `- ${service.end_time}` : ''}
                  </Typography>
                  {service.theme && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>Theme: {service.theme}</Typography>
                  )}
                  <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
                    <Typography variant="caption" display="block">Overseer: {service.overseer?.full_name || '—'}</Typography>
                    <Typography variant="caption" display="block">
                      Speaker: {service.speaker?.full_name || service.speaker_name || '—'}
                      {!service.speaker?.full_name && service.speaker_name && (
                        <Chip label="Guest" size="small" sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }} />
                      )}
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary">
                      Open: {service.opening_prayer?.full_name || '—'} · Close: {service.closing_prayer?.full_name || '—'}
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary">
                      Worship: {service.worship_leader?.full_name || '—'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                    {service.offerings_recorded ? (
                      <Chip
                        label={`₦${service.offerings_total || 0}`}
                        size="small"
                        sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}
                      />
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AttachMoney />}
                        onClick={() => handleRecordOffering(service)}
                      >
                        Record
                      </Button>
                    )}
                    <Box>
                      <IconButton size="small" color="primary" onClick={() => handleOpenDialog(service)}>
                        <Edit sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(service.id)}>
                        <Delete sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              ))}
          </Box>
        ) : (
        <TableContainer>
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Date & Time</TableCell>
                <TableCell>Theme</TableCell>
                <TableCell>Overseer</TableCell>
                <TableCell>Speaker</TableCell>
                <TableCell>Officiating Team</TableCell>
                <TableCell>Offering</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredServices
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((service) => (
                  <TableRow key={service.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {service.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <CalendarToday fontSize="inherit" sx={{ fontSize: 12, mr: 0.5 }} />
                      {new Date(service.date).toLocaleDateString()}
                      <Typography variant="caption" display="block" color="textSecondary">
                        <AccessTime fontSize="inherit" sx={{ fontSize: 12, mr: 0.5 }} />
                        {service.start_time} {service.end_time ? `- ${service.end_time}` : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>{service.theme || '—'}</TableCell>
                    <TableCell>{service.overseer?.full_name || '—'}</TableCell>
                    <TableCell>
                      {service.speaker?.full_name || service.speaker_name || '—'}
                      {!service.speaker?.full_name && service.speaker_name && (
                        <Chip label="Guest" size="small" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block" color="textSecondary">
                        Open: {service.opening_prayer?.full_name || '—'}
                      </Typography>
                      <Typography variant="caption" display="block" color="textSecondary">
                        Close: {service.closing_prayer?.full_name || '—'}
                      </Typography>
                      <Typography variant="caption" display="block" color="textSecondary">
                        Worship: {service.worship_leader?.full_name || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {service.offerings_recorded ? (
                        <Chip
                          label={`₦${service.offerings_total || 0}`}
                          size="small"
                          sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}
                        />
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AttachMoney />}
                          onClick={() => handleRecordOffering(service)}
                        >
                          Record
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={service.is_cancelled ? 'Cancelled' : 'Scheduled'} 
                        size="small"
                        color={service.is_cancelled ? 'error' : 'success'} 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(service)}>
                          <Edit sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(service.id)}>
                          <Delete sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        )}

        {filteredServices.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Event sx={{ fontSize: 60, color: '#bdbdbd' }} />
            <Typography variant="h6" color="textSecondary">No services found</Typography>
          </Box>
        )}

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredServices.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingService ? 'Edit Service' : 'Add Service'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Service Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date"
                type="datetime-local"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                error={!!formErrors.date}
                helperText={formErrors.date}
                required
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Start Time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
                error={!!formErrors.start_time}
                helperText={formErrors.start_time}
                required
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="End Time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Theme"
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
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
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Overseer</InputLabel>
                <Select
                  value={formData.overseer_id}
                  onChange={(e) => setFormData({ ...formData, overseer_id: e.target.value })}
                  label="Overseer"
                >
                  <MenuItem value="">None</MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="caption" color="textSecondary">Speaker:</Typography>
                <ToggleButtonGroup
                  value={speakerMode}
                  exclusive
                  size="small"
                  onChange={handleSpeakerModeChange}
                >
                  <ToggleButton value="existing" sx={{ py: 0.25, fontSize: '0.7rem' }}>Select Person</ToggleButton>
                  <ToggleButton value="guest" sx={{ py: 0.25, fontSize: '0.7rem' }}>Guest Speaker</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              {speakerMode === 'existing' ? (
                <FormControl fullWidth>
                  <InputLabel>Speaker</InputLabel>
                  <Select
                    value={formData.speaker_id}
                    onChange={(e) => setFormData({ ...formData, speaker_id: e.target.value })}
                    label="Speaker"
                  >
                    <MenuItem value="">None</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  fullWidth
                  label="Guest Speaker's Name"
                  placeholder="e.g. Pastor John Doe, XYZ Ministries"
                  value={formData.speaker_name}
                  onChange={(e) => setFormData({ ...formData, speaker_name: e.target.value })}
                />
              )}
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Opening Prayer</InputLabel>
                <Select
                  value={formData.opening_prayer_id}
                  onChange={(e) => setFormData({ ...formData, opening_prayer_id: e.target.value })}
                  label="Opening Prayer"
                >
                  <MenuItem value="">None</MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Closing Prayer</InputLabel>
                <Select
                  value={formData.closing_prayer_id}
                  onChange={(e) => setFormData({ ...formData, closing_prayer_id: e.target.value })}
                  label="Closing Prayer"
                >
                  <MenuItem value="">None</MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Worship Leader</InputLabel>
                <Select
                  value={formData.worship_leader_id}
                  onChange={(e) => setFormData({ ...formData, worship_leader_id: e.target.value })}
                  label="Worship Leader"
                >
                  <MenuItem value="">None</MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button> 
          <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            {editingService ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openOfferingDialog} onClose={() => setOpenOfferingDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Record Offering</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Service: <strong>{selectedService?.name}</strong>
          </Typography>
          <TextField
            fullWidth
            label="Amount (₦)"
            type="number"
            value={offeringAmount}
            onChange={(e) => setOfferingAmount(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">₦</InputAdornment> }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenOfferingDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmitOffering} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            Record
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

export default Services;