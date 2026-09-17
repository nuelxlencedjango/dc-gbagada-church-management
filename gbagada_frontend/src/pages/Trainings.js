import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Snackbar, Alert,
  CircularProgress, Grid, Tooltip, Card, CardContent, Avatar, List,
  ListItem, ListItemText
} from '@mui/material';
import {
  Add, Edit, Delete, CheckCircle, PersonAdd, School,
  EventAvailable, People, HighlightOff
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { useLocation } from 'react-router-dom';
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

const TYPE_LABELS = {
  mvps: 'MVPs',
  members: 'Members',
  workers: 'Workers',
  department: 'Department',
  headquarters: 'Headquarters',
  other: 'Other',
};

const Trainings = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const [trainings, setTrainings] = useState([]);
  const [overview, setOverview] = useState(null);
  const [members, setMembers] = useState([]);
  const [mvps, setMvps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openRegisterDialog, setOpenRegisterDialog] = useState(false);
  const [openAttendeesDialog, setOpenAttendeesDialog] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    training_type: 'members',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    facilitator: '',
    max_capacity: 50,
    notes: '',
  });
  const [registerData, setRegisterData] = useState({
    attendee_type: 'member',
    attendee_id: '',
  });
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');
    if (typeParam && ['mvps', 'members', 'workers', 'department', 'headquarters', 'other'].includes(typeParam)) {
      setFilterType(typeParam);
    } else {
      setFilterType('');
    }
  }, [location.search]);

  useEffect(() => {
    fetchTrainings();
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterStatus]);

  useEffect(() => {
    fetchMembers();
    fetchMvps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTrainings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('training_type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      const res = await axios.get(`${API_URL}/trainings/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrainings(res.data);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const res = await axios.get(`${API_URL}/trainings/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOverview(res.data);
    } catch (error) {
      console.error('Error fetching training overview:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await axios.get(`${API_URL}/members/`, {
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

  const fetchMvps = async () => {
    try {
      const res = await axios.get(`${API_URL}/mvps/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMvps(res.data);
    } catch (error) {
      console.error('Error fetching MVPs:', error);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (training = null) => {
    if (training) {
      setEditingTraining(training);
      setFormData({
        title: training.title || '',
        description: training.description || '',
        training_type: training.training_type || 'members',
        date: training.date || '',
        start_time: training.start_time || '',
        end_time: training.end_time || '',
        location: training.location || '',
        facilitator: training.facilitator || '',
        max_capacity: training.max_capacity || 50,
        notes: training.notes || '',
      });
    } else {
      setEditingTraining(null);
      setFormData({
        title: '',
        description: '',
        training_type: filterType || 'members',
        date: '',
        start_time: '',
        end_time: '',
        location: '',
        facilitator: '',
        max_capacity: 50,
        notes: '',
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
        max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : null,
      };
      if (editingTraining) {
        await axios.put(`${API_URL}/trainings/${editingTraining.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Training updated', 'success');
      } else {
        await axios.post(`${API_URL}/trainings/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Training created', 'success');
      }
      handleCloseDialog();
      fetchTrainings();
      fetchOverview();
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this training?')) {
      try {
        await axios.delete(`${API_URL}/trainings/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Training deleted', 'success');
        fetchTrainings();
        fetchOverview();
      } catch (error) {
        showSnackbar(getErrorMessage(error), 'error');
      }
    }
  };

  const handleOpenRegister = (training) => {
    setSelectedTraining(training);
    setRegisterData({
      attendee_type: 'member',
      attendee_id: '',
    });
    setOpenRegisterDialog(true);
  };

  const handleRegister = async () => {
    try {
      await axios.post(`${API_URL}/trainings/${selectedTraining.id}/register`, registerData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Registered successfully', 'success');
      setOpenRegisterDialog(false);
      fetchTrainings();
      fetchOverview();
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleOpenAttendees = async (training) => {
    setSelectedTraining(training);
    setOpenAttendeesDialog(true);
    setLoadingAttendees(true);
    try {
      const res = await axios.get(`${API_URL}/trainings/${training.id}/attendees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendees(res.data);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoadingAttendees(false);
    }
  };

  const handleMarkAttendance = async (registrationId, newStatus) => {
    try {
      await axios.post(
        `/api/trainings/${selectedTraining.id}/attendees/${registrationId}/mark?attendance_status=${newStatus}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAttendees(prev => prev.map(a => a.registration_id === registrationId ? { ...a, status: newStatus } : a));
      fetchOverview();
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const getTypeChip = (type) => {
    const config = {
      workers: { label: 'Workers', color: 'primary' },
      department: { label: 'Department', color: 'secondary' },
      members: { label: 'Members', color: 'success' },
      mvps: { label: 'MVPs', color: 'info' },
      headquarters: { label: 'HQ', color: 'info' },
      other: { label: 'Other', color: 'default' }
    };
    const c = config[type] || config.other;
    return <Chip label={c.label} size="small" color={c.color} />;
  };

  const getStatusChip = (status) => {
    const config = {
      scheduled: { label: 'Scheduled', color: 'info' },
      ongoing: { label: 'Ongoing', color: 'warning' },
      completed: { label: 'Completed', color: 'success' },
      cancelled: { label: 'Cancelled', color: 'error' }
    };
    const c = config[status] || config.scheduled;
    return <Chip label={c.label} size="small" color={c.color} />;
  };

  const getAttendanceChip = (status) => {
    const config = {
      registered: { label: 'Registered', color: 'default' },
      attended: { label: 'Attended', color: 'success' },
      no_show: { label: 'No Show', color: 'error' },
    };
    const c = config[status] || config.registered;
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
          Trainings
        </Typography>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ backgroundColor: '#1a237e' }}
          >
            Add Training
          </Button>
        )}
      </Box>

      {/* Overview */}
      {overview && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" variant="caption">Total Sessions</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>{overview.total_sessions}</Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#e3f2fd', color: '#1565c0' }}><School /></Avatar>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" variant="caption">Upcoming</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#0277bd' }}>{overview.upcoming_sessions}</Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#e1f5fe', color: '#0277bd' }}><EventAvailable /></Avatar>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" variant="caption">Completed</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#2e7d32' }}>{overview.completed_sessions}</Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}><CheckCircle /></Avatar>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" variant="caption">Attendance Rate</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a237e' }}>{overview.attendance_rate}%</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {overview.attended_count}/{overview.registered_count} attended
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#ede7f6', color: '#1a237e' }}><People /></Avatar>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>Trainings Per Month</Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={overview.monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip />
                  <Bar dataKey="count" fill="#1a237e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>By Type</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {overview.by_type && Object.entries(overview.by_type).map(([type, count]) => (
                  <Chip key={type} label={`${TYPE_LABELS[type] || type}: ${count}`} size="small" />
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Type</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="Filter by Type"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="mvps">MVPs</MenuItem>
                <MenuItem value="members">Members</MenuItem>
                <MenuItem value="workers">Workers</MenuItem>
                <MenuItem value="department">Department</MenuItem>
                <MenuItem value="headquarters">Headquarters</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Filter by Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="ongoing">Ongoing</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button variant="outlined" onClick={() => { setFilterType(''); setFilterStatus(''); }}>
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
                <TableCell>Type</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Facilitator</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Attendees</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trainings.map((training) => (
                <TableRow key={training.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {training.title}
                    </Typography>
                    {training.description && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        {training.description.length > 60 ? training.description.substring(0,60)+'...' : training.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{getTypeChip(training.training_type)}</TableCell>
                  <TableCell>{new Date(training.date).toLocaleDateString()}</TableCell>
                  <TableCell>{training.facilitator || '—'}</TableCell>
                  <TableCell>{getStatusChip(training.status)}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleOpenAttendees(training)}>
                      {training.attendee_count || 0}{training.max_capacity ? ` / ${training.max_capacity}` : ''}
                    </Button>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {(training.status === 'scheduled' || training.status === 'ongoing') && canManage && (
                        <Tooltip title="Register Attendee">
                          <IconButton size="small" color="primary" onClick={() => handleOpenRegister(training)}>
                            <PersonAdd />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canManage && (
                        <>
                          <Tooltip title="Edit">
                            <IconButton size="small" color="primary" onClick={() => handleOpenDialog(training)}>
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDelete(training.id)}>
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
        {trainings.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">No trainings found</Typography>
          </Box>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTraining ? 'Edit Training' : 'Add Training'}</DialogTitle>
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
            <InputLabel>Training Type</InputLabel>
            <Select
              value={formData.training_type}
              onChange={(e) => setFormData({ ...formData, training_type: e.target.value })}
              label="Training Type"
            >
              <MenuItem value="mvps">MVPs</MenuItem>
              <MenuItem value="members">Members</MenuItem>
              <MenuItem value="workers">Workers</MenuItem>
              <MenuItem value="department">Department</MenuItem>
              <MenuItem value="headquarters">Headquarters</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Date"
            type="date"
            margin="normal"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            fullWidth
            label="Start Time"
            type="time"
            margin="normal"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="End Time"
            type="time"
            margin="normal"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            InputLabelProps={{ shrink: true }}
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
            label="Facilitator"
            margin="normal"
            value={formData.facilitator}
            onChange={(e) => setFormData({ ...formData, facilitator: e.target.value })}
          />
          <TextField
            fullWidth
            label="Max Capacity"
            type="number"
            margin="normal"
            value={formData.max_capacity}
            onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
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
            {editingTraining ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Register Dialog */}
      <Dialog open={openRegisterDialog} onClose={() => setOpenRegisterDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Register for Training</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Attendee Type</InputLabel>
            <Select
              value={registerData.attendee_type}
              onChange={(e) => setRegisterData({ ...registerData, attendee_type: e.target.value, attendee_id: '' })}
              label="Attendee Type"
            >
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="mvp">MVP (Visitor)</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Attendee</InputLabel>
            <Select
              value={registerData.attendee_id}
              onChange={(e) => setRegisterData({ ...registerData, attendee_id: e.target.value })}
              label="Select Attendee"
            >
              <MenuItem value="">Select...</MenuItem>
              {registerData.attendee_type === 'member' && members.map(m => (
                <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</MenuItem>
              ))}
              {registerData.attendee_type === 'mvp' && mvps.map(m => (
                <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRegisterDialog(false)}>Cancel</Button>
          <Button onClick={handleRegister} variant="contained" sx={{ backgroundColor: '#1a237e' }} disabled={!registerData.attendee_id}>
            Register
          </Button>
        </DialogActions>
      </Dialog>

      {/* Attendees Dialog — view list, mark attendance */}
      <Dialog open={openAttendeesDialog} onClose={() => setOpenAttendeesDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Attendees — {selectedTraining?.title}
        </DialogTitle>
        <DialogContent>
          {loadingAttendees ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : attendees.length === 0 ? (
            <Typography color="textSecondary" sx={{ py: 2 }}>No one registered yet.</Typography>
          ) : (
            <List>
              {attendees.map((a) => (
                <ListItem key={a.registration_id} divider>
                  <ListItemText
                    primary={a.name}
                    secondary={a.attendee_type === 'mvp' ? 'MVP (Visitor)' : 'Member'}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getAttendanceChip(a.status)}
                    {canManage && (
                      <>
                        <Tooltip title="Mark Attended">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleMarkAttendance(a.registration_id, 'attended')}
                            disabled={a.status === 'attended'}
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Mark No-Show">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleMarkAttendance(a.registration_id, 'no_show')}
                            disabled={a.status === 'no_show'}
                          >
                            <HighlightOff fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAttendeesDialog(false)}>Close</Button>
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

export default Trainings;