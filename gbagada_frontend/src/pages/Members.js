import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Avatar, TablePagination, TextField, InputAdornment,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Snackbar, Alert, CircularProgress, Card, CardContent
} from '@mui/material';
import {
  Search, Add, Edit, Delete, Visibility, Phone, Email, Person,
  Close, Upload, PhotoCamera, Cake
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8000/api';

const Members = () => {
  const { token } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [birthdays, setBirthdays] = useState([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState(true);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    date_of_birth: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

  useEffect(() => {
    fetchMembers();
    fetchBirthdays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await axios.get(`${API_URL}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
      showSnackbar('Error fetching members', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBirthdays = async () => {
    setLoadingBirthdays(true);
    try {
      const response = await axios.get(`${API_URL}/members/birthdays/upcoming`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { days: 30 }
      });
      setBirthdays(response.data);
    } catch (error) {
      console.error('Error fetching birthdays:', error);
    } finally {
      setLoadingBirthdays(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (member = null) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        email: member.email || '',
        phone_number: member.phone_number || '',
        address: member.address || '',
        date_of_birth: member.date_of_birth || '',
        emergency_contact_name: member.emergency_contact_name || '',
        emergency_contact_phone: member.emergency_contact_phone || ''
      });
    } else {
      setEditingMember(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        address: '',
        date_of_birth: '',
        emergency_contact_name: '',
        emergency_contact_phone: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMember(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      address: '',
      date_of_birth: '',
      emergency_contact_name: '',
      emergency_contact_phone: ''
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingMember) {
        await axios.put(`${API_URL}/members/${editingMember.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Member updated successfully', 'success');
      } else {
        await axios.post(`${API_URL}/members`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Member added successfully', 'success');
      }
      handleCloseDialog();
      fetchMembers();
      fetchBirthdays();
    } catch (error) {
      showSnackbar(error.response?.data?.detail || 'Error saving member', 'error');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      try {
        await axios.delete(`${API_URL}/members/${memberId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Member deleted successfully', 'success');
        fetchMembers();
      } catch (error) {
        showSnackbar('Error deleting member', 'error');
      }
    }
  };

  const handleViewMember = (member) => {
    setSelectedMember(member);
    setOpenViewDialog(true);
  };

  const filteredMembers = members.filter(member =>
    `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
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
          Members
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ backgroundColor: '#1a237e', '&:hover': { backgroundColor: '#0d1442' } }}
        >
          Add Member
        </Button>
      </Box>

      {!loadingBirthdays && birthdays.length > 0 && (
        <Card sx={{ mb: 3, borderLeft: '4px solid #f9a825' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Cake sx={{ color: '#f9a825' }} />
              Upcoming Birthdays (next 30 days)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {birthdays.map((b) => (
                <Chip
                  key={b.id}
                  label={`${b.first_name} ${b.last_name} - ${new Date(b.next_birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${b.days_until === 0 ? ' (today!)' : ''}`}
                  size="small"
                  sx={{
                    backgroundColor: b.days_until === 0 ? '#fff3e0' : '#fffde7',
                    color: b.days_until === 0 ? '#e65100' : '#8a6d10',
                    fontWeight: b.days_until === 0 ? 600 : 400
                  }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <TextField
            placeholder="Search members..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          <Typography variant="body2" color="textSecondary">
            Total: {filteredMembers.length} members
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMembers
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((member) => (
                  <TableRow key={member.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#1a237e', width: 40, height: 40 }}>
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {member.first_name} {member.last_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Joined: {new Date(member.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email fontSize="small" color="action" /> {member.email}
                        </Typography>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Phone fontSize="small" color="action" /> {member.phone_number}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.membership_status || 'Active'}
                        size="small"
                        sx={{
                          backgroundColor: member.membership_status === 'active' ? '#e8f5e9' : '#ffebee',
                          color: member.membership_status === 'active' ? '#2e7d32' : '#c62828'
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleViewMember(member)}>
                        <Visibility />
                      </IconButton>
                      <IconButton size="small" color="primary" onClick={() => handleOpenDialog(member)}>
                        <Edit />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteMember(member.id)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredMembers.length}
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
          {editingMember ? 'Edit Member' : 'Add New Member'}
        </DialogTitle>
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
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                required
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
                label="Date of Birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Name"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            {editingMember ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Member Details</Typography>
            <IconButton onClick={() => setOpenViewDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedMember && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ width: 80, height: 80, bgcolor: '#1a237e', fontSize: 32 }}>
                  {selectedMember.first_name?.[0]}{selectedMember.last_name?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {selectedMember.first_name} {selectedMember.last_name}
                  </Typography>
                  <Chip
                    label={selectedMember.membership_status || 'Active'}
                    size="small"
                    sx={{
                      backgroundColor: selectedMember.membership_status === 'active' ? '#e8f5e9' : '#ffebee',
                      color: selectedMember.membership_status === 'active' ? '#2e7d32' : '#c62828'
                    }}
                  />
                </Box>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Contact Information</Typography>
                  <Typography variant="body2">Email: {selectedMember.email}</Typography>
                  <Typography variant="body2">Phone: {selectedMember.phone_number}</Typography>
                  <Typography variant="body2">Address: {selectedMember.address || 'Not provided'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Emergency Contact</Typography>
                  <Typography variant="body2">Name: {selectedMember.emergency_contact_name || 'Not provided'}</Typography>
                  <Typography variant="body2">Phone: {selectedMember.emergency_contact_phone || 'Not provided'}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
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

export default Members;