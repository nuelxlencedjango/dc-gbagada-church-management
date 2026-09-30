import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, FormControlLabel,
  Switch, Chip, Snackbar, Alert
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8000/api';

const EMPTY_FORM = {
  title: '',
  frequency_label: '',
  time_label: '',
  location: '',
  is_virtual: false,
  link: '',
  description: '',
  is_active: true,
  display_order: 0,
};

const Activities = () => {
  const { token } = useAuth();
  const [activities, setActivities] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API_URL}/activities/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setSnackbar({ open: true, message: 'Failed to load activities', severity: 'error' });
    }
  };

  const openAddDialog = () => {
    setEditingActivity(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (activity) => {
    setEditingActivity(activity);
    setForm({
      title: activity.title || '',
      frequency_label: activity.frequency_label || '',
      time_label: activity.time_label || '',
      location: activity.location || '',
      is_virtual: !!activity.is_virtual,
      link: activity.link || '',
      description: activity.description || '',
      is_active: !!activity.is_active,
      display_order: activity.display_order || 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.frequency_label.trim()) {
      setSnackbar({ open: true, message: 'Title and frequency are required', severity: 'error' });
      return;
    }
    try {
      if (editingActivity) {
        await axios.put(`${API_URL}/activities/${editingActivity.id}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSnackbar({ open: true, message: 'Activity updated', severity: 'success' });
      } else {
        await axios.post(`${API_URL}/activities/`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSnackbar({ open: true, message: 'Activity added', severity: 'success' });
      }
      setDialogOpen(false);
      fetchActivities();
    } catch (error) {
      console.error('Error saving activity:', error);
      setSnackbar({ open: true, message: 'Failed to save activity', severity: 'error' });
    }
  };

  const handleDelete = async (activityId) => {
    if (!window.confirm('Delete this activity? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_URL}/activities/${activityId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnackbar({ open: true, message: 'Activity deleted', severity: 'success' });
      fetchActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      setSnackbar({ open: true, message: 'Failed to delete activity', severity: 'error' });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Regular Activities</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openAddDialog}>
          Add Activity
        </Button>
      </Box>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        These show on the public homepage under "Regular Activities" — prayer meetings,
        communion service, counselling sessions, and anything else on a recurring schedule.
        Only activities marked Active are shown publicly.
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Schedule</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="textSecondary" sx={{ py: 3 }}>
                    No activities yet — click "Add Activity" to create the first one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>{activity.title}</TableCell>
                  <TableCell>
                    {activity.frequency_label}
                    {activity.time_label ? ` • ${activity.time_label}` : ''}
                  </TableCell>
                  <TableCell>
                    {activity.is_virtual ? 'Virtual' : (activity.location || '—')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={activity.is_active ? 'Active' : 'Inactive'}
                      color={activity.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEditDialog(activity)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(activity.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingActivity ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            fullWidth
            margin="normal"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Online Prayer Meeting"
          />
          <TextField
            label="Frequency"
            fullWidth
            margin="normal"
            value={form.frequency_label}
            onChange={(e) => setForm({ ...form, frequency_label: e.target.value })}
            placeholder="e.g. Every Friday, or Last Saturday of month"
          />
          <TextField
            label="Time"
            fullWidth
            margin="normal"
            value={form.time_label}
            onChange={(e) => setForm({ ...form, time_label: e.target.value })}
            placeholder="e.g. 10:00pm - 11:00pm"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.is_virtual}
                onChange={(e) => setForm({ ...form, is_virtual: e.target.checked })}
              />
            }
            label="Virtual / Online"
          />
          {form.is_virtual ? (
            <TextField
              label="Meeting Link"
              fullWidth
              margin="normal"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://..."
            />
          ) : (
            <TextField
              label="Location"
              fullWidth
              margin="normal"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. 18 Ibrahim Onashokun St, Gbagada, Lagos"
            />
          )}
          <TextField
            label="Description (optional)"
            fullWidth
            multiline
            rows={2}
            margin="normal"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            label="Display Order"
            type="number"
            fullWidth
            margin="normal"
            value={form.display_order}
            onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value, 10) || 0 })}
            helperText="Lower numbers show first on the homepage"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
            }
            label="Active (visible on homepage)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editingActivity ? 'Save Changes' : 'Add Activity'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Activities;
