import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, CircularProgress, Chip, Grid, Card,
  CardContent, IconButton, MenuItem, FormControl, InputLabel, Select
} from '@mui/material';
import { Add, Edit, Delete, Announcement as AnnouncementIcon } from '@mui/icons-material';
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

const Announcements = () => {
  const { token } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [cells, setCells] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    announcement_type: 'public',
    priority: 'normal',
    expires_at: '',
    target_cell_id: '',
    target_department_id: '',
    target_user_id: ''
  });

  useEffect(() => {
    fetchAnnouncements();
    fetchCells();
    fetchDepartments();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get(`${API_URL}/announcements/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCells = async () => {
    try {
      const res = await axios.get(`${API_URL}/cells/`, { headers: { Authorization: `Bearer ${token}` } });
      setCells(res.data);
    } catch (error) { /* non-critical, form still works without the picker populated */ }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_URL}/departments/`, { headers: { Authorization: `Bearer ${token}` } });
      setDepartments(res.data);
    } catch (error) { /* non-critical */ }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/all`, { headers: { Authorization: `Bearer ${token}` } });
      let usersData = res.data;
      if (!Array.isArray(usersData)) {
        usersData = (usersData && usersData.data && Array.isArray(usersData.data)) ? usersData.data : [];
      }
      setAllUsers(usersData.filter((u) => u.is_active !== false));
    } catch (error) { /* non-critical, form still works without the picker populated */ }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (announcement = null) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title || '',
        content: announcement.content || '',
        announcement_type: announcement.announcement_type || 'public',
        priority: announcement.priority || 'normal',
        expires_at: announcement.expires_at ? new Date(announcement.expires_at).toISOString().split('T')[0] : '',
        target_cell_id: announcement.target_cell_id || '',
        target_department_id: announcement.target_department_id || '',
        target_user_id: announcement.target_user_id || ''
      });
    } else {
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        content: '',
        announcement_type: 'public',
        priority: 'normal',
        expires_at: '',
        target_cell_id: '',
        target_department_id: '',
        target_user_id: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAnnouncement(null);
  };

  const handleSubmit = async () => {
    try {
      const submitData = {
        title: formData.title,
        content: formData.content,
        announcement_type: formData.announcement_type,
        priority: formData.priority,
        expires_at: formData.expires_at || null,
        target_cell_id: formData.target_cell_id || null,
        target_department_id: formData.target_department_id || null,
        target_user_id: formData.target_user_id || null,
      };

      if (editingAnnouncement) {
        await axios.put(`${API_URL}/announcements/${editingAnnouncement.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Announcement updated successfully', 'success');
      } else {
        await axios.post(`${API_URL}/announcements/`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Announcement created successfully', 'success');
      }
      handleCloseDialog();
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleDelete = async (announcementId) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await axios.delete(`${API_URL}/announcements/${announcementId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Announcement deleted successfully', 'success');
        fetchAnnouncements();
      } catch (error) {
        showSnackbar(getErrorMessage(error), 'error');
      }
    }
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
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e' }}>
            Announcements
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage church announcements — including direct memos to one person
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ backgroundColor: '#1a237e', '&:hover': { backgroundColor: '#0d1442' } }}
        >
          Create Announcement
        </Button>
      </Box>

      <Grid container spacing={3}>
        {announcements.map((announcement) => (
          <Grid item xs={12} key={announcement.id}>
            <Card sx={{ 
              borderLeft: `4px solid ${announcement.priority === 'high' ? '#f44336' : announcement.priority === 'urgent' ? '#ff9800' : '#4caf50'}`,
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateX(8px)' }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {announcement.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={announcement.announcement_type || 'Public'}
                        size="small"
                        sx={{ backgroundColor: '#e3f2fd', color: '#1a237e' }}
                      />
                      <Chip
                        label={announcement.priority || 'Normal'}
                        size="small"
                        sx={{
                          backgroundColor: announcement.priority === 'high' ? '#ffebee' :
                                         announcement.priority === 'urgent' ? '#fff3e0' : '#e8f5e9',
                          color: announcement.priority === 'high' ? '#c62828' :
                                 announcement.priority === 'urgent' ? '#e65100' : '#2e7d32'
                        }}
                      />
                      {announcement.target_cell_name && (
                        <Chip label={`Cell: ${announcement.target_cell_name}`} size="small" variant="outlined" />
                      )}
                      {announcement.target_department_name && (
                        <Chip label={`Dept: ${announcement.target_department_name}`} size="small" variant="outlined" />
                      )}
                      {announcement.target_user_name && (
                        <Chip label={`To: ${announcement.target_user_name}`} size="small" sx={{ backgroundColor: '#f3e5f5', color: '#6a1b9a' }} />
                      )}
                      <Typography variant="caption" color="textSecondary">
                        {new Date(announcement.published_at || announcement.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
                      {announcement.content}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', ml: 2 }}>
                    <IconButton size="small" onClick={() => handleOpenDialog(announcement)}>
                      <Edit />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(announcement.id)}>
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {announcements.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <AnnouncementIcon sx={{ fontSize: 60, color: '#bdbdbd' }} />
              <Typography variant="h6" color="textSecondary">
                No announcements yet
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                sx={{ mt: 2 }}
              >
                Create First Announcement
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Content"
                multiline
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.announcement_type}
                  onChange={(e) => setFormData({ ...formData, announcement_type: e.target.value })}
                  label="Type"
                >
                  <MenuItem value="public">Public</MenuItem>
                  <MenuItem value="internal">Internal</MenuItem>
                  <MenuItem value="workers_only">Workers Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  label="Priority"
                >
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Target Cell (optional)</InputLabel>
                <Select
                  value={formData.target_cell_id}
                  onChange={(e) => setFormData({ ...formData, target_cell_id: e.target.value })}
                  label="Target Cell (optional)"
                >
                  <MenuItem value="">Everyone (no cell restriction)</MenuItem>
                  {cells.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Target Department (optional)</InputLabel>
                <Select
                  value={formData.target_department_id}
                  onChange={(e) => setFormData({ ...formData, target_department_id: e.target.value })}
                  label="Target Department (optional)"
                >
                  <MenuItem value="">Everyone (no department restriction)</MenuItem>
                  {departments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Send as a Memo to One Person (optional)</InputLabel>
                <Select
                  value={formData.target_user_id}
                  onChange={(e) => setFormData({ ...formData, target_user_id: e.target.value })}
                  label="Send as a Memo to One Person (optional)"
                >
                  <MenuItem value="">Not a memo — use the targeting above instead</MenuItem>
                  {allUsers.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.full_name || u.name || 'Unnamed'} ({u.role || 'member'})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="textSecondary">
                Selecting a person here sends this only to them (plus admins) — it overrides the Type/Cell/Department
                targeting above for who can see it. This is still a one-way notice; the recipient cannot reply to it
                from within the app.
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Expires At"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty for no expiration"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            {editingAnnouncement ? 'Update' : 'Create'}
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

export default Announcements;