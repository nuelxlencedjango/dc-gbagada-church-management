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
  Search, Add, Edit, Delete, Event, LocationOn, CalendarToday
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

const ChurchEvents = () => {
  const { token } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [satellites, setSatellites] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    satellite_id: '',
    is_published: true
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchEvents();
    fetchSatellites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/events/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
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

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (event = null) => {
    setFormErrors({});
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title || '',
        description: event.description || '',
        start_date: event.start_date ? event.start_date.slice(0, 16) : '',
        end_date: event.end_date ? event.end_date.slice(0, 16) : '',
        location: event.location || '',
        satellite_id: event.satellite_id || '',
        is_published: event.is_published !== undefined ? event.is_published : true
      });
    } else {
      setEditingEvent(null);
      setFormData({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        location: '',
        satellite_id: '',
        is_published: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingEvent(null);
  };

  const handleSubmit = async () => {
    setFormErrors({});
    const errors = {};
    if (!formData.title) errors.title = 'Title is required';
    if (!formData.start_date) errors.start_date = 'Start date is required';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const submitData = { ...formData };
      if (editingEvent) {
        await axios.put(`${API_URL}/events/${editingEvent.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Event updated successfully', 'success');
      } else {
        await axios.post(`${API_URL}/events/`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Event created successfully', 'success');
      }
      handleCloseDialog();
      fetchEvents();
    } catch (error) {
      console.error('Submit error:', error);
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await axios.delete(`${API_URL}/events/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Event deleted', 'success');
        fetchEvents();
      } catch (error) {
        console.error('Delete error:', error);
        showSnackbar(getErrorMessage(error), 'error');
      }
    }
  };

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.location && e.location.toLowerCase().includes(searchTerm.toLowerCase()))
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
          Church Events
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ backgroundColor: '#1a237e' }}
        >
          Add Event
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <TextField
            placeholder="Search events..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
            }}
            sx={{ width: 300 }}
          />
          <Typography variant="body2" color="textSecondary">
            Total: {filteredEvents.length}
          </Typography>
        </Box>

        <TableContainer>
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Date & Time</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Satellite</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEvents
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((event) => (
                  <TableRow key={event.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {event.title}
                      </Typography>
                      {event.description && (
                        <Typography variant="caption" display="block" color="textSecondary">
                          {event.description.length > 60 ? event.description.substring(0, 60) + '...' : event.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <CalendarToday fontSize="inherit" sx={{ fontSize: 12, mr: 0.5 }} />
                      {new Date(event.start_date).toLocaleString()}
                      {event.end_date && (
                        <Typography variant="caption" display="block" color="textSecondary">
                          to {new Date(event.end_date).toLocaleString()}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{event.location || '—'}</TableCell>
                    <TableCell>
                      {event.satellite_name ? (
                        <Chip label={event.satellite_name} size="small" sx={{ backgroundColor: '#e3f2fd' }} />
                      ) : (
                        <Chip label="Main Church" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={event.is_published ? 'Published' : 'Draft'}
                        size="small"
                        color={event.is_published ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(event)}>
                          <Edit sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(event.id)}>
                          <Delete sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredEvents.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Event sx={{ fontSize: 60, color: '#bdbdbd' }} />
            <Typography variant="h6" color="textSecondary">No events found</Typography>
          </Box>
        )}

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredEvents.length}
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
          {editingEvent ? 'Edit Event' : 'Add Event'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                error={!!formErrors.title}
                helperText={formErrors.title}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date & Time"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                error={!!formErrors.start_date}
                helperText={formErrors.start_date}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date & Time"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Satellite Church</InputLabel>
                <Select
                  value={formData.satellite_id}
                  onChange={(e) => setFormData({ ...formData, satellite_id: e.target.value })}
                  label="Satellite Church"
                >
                  <MenuItem value="">Main Church</MenuItem>
                  {satellites.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.is_published ? 'published' : 'draft'}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.value === 'published' })}
                  label="Status"
                >
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            {editingEvent ? 'Update' : 'Add'}
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

export default ChurchEvents;