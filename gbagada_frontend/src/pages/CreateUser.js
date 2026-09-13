import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, TextField,
  Button, MenuItem, FormControl, InputLabel, Select,
  Alert, Snackbar, CircularProgress, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  PersonAdd, Search, People, CheckCircle
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8000/api';

const CreateUser = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedMember, setSelectedMember] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    password: '',
    confirm_password: '',
    role: 'member'
  });

  const [errors, setErrors] = useState({});

  const roles = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'pastor', label: 'Pastor' },
    { value: 'admin', label: 'Admin' },
    { value: 'department_head', label: 'Department Head' },
    { value: 'cell_leader', label: 'Cell Leader' },
    { value: 'member', label: 'Member' }
  ];

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await axios.get(`${API_URL}/members/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const membersWithoutAccount = response.data.filter(m => !m.user_id);
      setMembers(membersWithoutAccount);
      setFilteredMembers(membersWithoutAccount);
    } catch (error) {
      console.error('Error fetching members:', error);
      showSnackbar('Error loading members', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = members.filter(m => 
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term)
    );
    setFilteredMembers(filtered);
    setPage(0);
  };

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setFormData({
      password: '',
      confirm_password: '',
      role: 'member'
    });
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMember(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/members/create-user/${selectedMember.id}`, {
        password: formData.password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSnackbar(`User account created for ${selectedMember.first_name} ${selectedMember.last_name}!`, 'success');
      setOpenDialog(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error) {
      console.error('Error creating user:', error);
      let errorMsg = 'Error creating user account';
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      }
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e' }}>
          Create User Account
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Select a registered member and create a user account for them
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder="Search members by name or email..."
            size="small"
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ width: 400 }}
          />
          <Typography variant="caption" color="textSecondary" sx={{ ml: 2 }}>
            Showing members without user accounts
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Department</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMembers
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((member) => (
                  <TableRow key={member.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#1a237e', width: 32, height: 32 }}>
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {member.first_name} {member.last_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      {member.department_name || 'Not assigned'}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PersonAdd />}
                        onClick={() => handleSelectMember(member)}
                        sx={{ 
                          backgroundColor: '#1a237e',
                          '&:hover': { backgroundColor: '#0d1442' },
                          textTransform: 'none'
                        }}
                      >
                        Create Account
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredMembers.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <People sx={{ fontSize: 60, color: '#bdbdbd' }} />
            <Typography variant="h6" color="textSecondary">
              No members without user accounts
            </Typography>
            <Typography variant="body2" color="textSecondary">
              All members already have user accounts.
            </Typography>
          </Box>
        )}

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

      {/* Create Account Dialog */}
      {selectedMember && (
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonAdd sx={{ color: '#1a237e' }} />
              Create User Account
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 3, mt: 1 }}>
              <Alert severity="info">
                Creating account for: <strong>{selectedMember.first_name} {selectedMember.last_name}</strong>
              </Alert>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  error={!!errors.password}
                  helperText={errors.password}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  name="confirm_password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  error={!!errors.confirm_password}
                  helperText={errors.confirm_password}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    label="Role"
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  {formData.role === 'super_admin' && 'Full access to everything'}
                  {formData.role === 'pastor' && 'Can view all, approve expenses, send memos'}
                  {formData.role === 'admin' && 'Manage finances, equipment, transactions'}
                  {formData.role === 'department_head' && 'Manage their department'}
                  {formData.role === 'cell_leader' && 'Manage their cell group'}
                  {formData.role === 'member' && 'Basic member access'}
                </Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">Member Details</Typography>
              <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Name</Typography>
                    <Typography variant="body2">{selectedMember.first_name} {selectedMember.last_name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Email</Typography>
                    <Typography variant="body2">{selectedMember.email}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained" 
              disabled={loading}
              sx={{ backgroundColor: '#1a237e', '&:hover': { backgroundColor: '#0d1442' } }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

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

export default CreateUser;
