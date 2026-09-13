import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  TablePagination, TextField, InputAdornment,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Snackbar, Alert, CircularProgress, Select, MenuItem, FormControl, InputLabel,
  Tooltip
} from '@mui/material';
import {
  Search, Refresh, PersonAdd, Edit, Block, CheckCircle,
  Cancel, AdminPanelSettings, Person, Group, VerifiedUser
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8000/api';

const ManageUsers = () => {
  const { token, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/users/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      showSnackbar('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    if (term === '') {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter(u =>
        u.full_name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      ));
    }
  };

  const handleChangeRole = async () => {
    try {
      await axios.put(
        `${API_URL}/users/${selectedUser.id}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSnackbar(`Role updated to ${newRole}`, 'success');
      setOpenRoleDialog(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      showSnackbar(error.response?.data?.detail || 'Failed to update role', 'error');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    try {
      await axios.put(
        `${API_URL}/users/${userId}/toggle-status`,
        { is_active: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSnackbar(`User ${newStatus ? 'activated' : 'deactivated'}`, 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error toggling status:', error);
      showSnackbar(error.response?.data?.detail || 'Failed to update status', 'error');
    }
  };

  const openRoleDialogForUser = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setOpenRoleDialog(true);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return '#c62828';
      case 'pastor': return '#1a237e';
      case 'admin': return '#2e7d32';
      case 'department_head': return '#e65100';
      case 'cell_leader': return '#6a1b9a';
      default: return '#757575';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'super_admin': return <AdminPanelSettings />;
      case 'pastor': return <VerifiedUser />;
      case 'admin': return <Group />;
      default: return <Person />;
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
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e' }}>
          Manage Users
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => navigate('/create-user')}
          sx={{ backgroundColor: '#1a237e' }}
        >
          Create User
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <TextField
            placeholder="Search users..."
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
            sx={{ width: 300 }}
          />
          <Box>
            <IconButton onClick={fetchUsers} title="Refresh">
              <Refresh />
            </IconButton>
            <Typography variant="body2" color="textSecondary" component="span" sx={{ ml: 1 }}>
              Total: {filteredUsers.length} users
            </Typography>
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Full Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {user.full_name}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getRoleIcon(user.role)}
                        label={user.role.replace('_', ' ').toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: getRoleColor(user.role),
                          color: 'white',
                          fontWeight: 600,
                          '& .MuiChip-icon': { color: 'white' }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Chip
                          icon={<CheckCircle sx={{ fontSize: 16 }} />}
                          label="Active"
                          size="small"
                          sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}
                        />
                      ) : (
                        <Chip
                          icon={<Cancel sx={{ fontSize: 16 }} />}
                          label="Inactive"
                          size="small"
                          sx={{ backgroundColor: '#ffebee', color: '#c62828' }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Change Role">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => openRoleDialogForUser(user)}
                          disabled={user.id === currentUser?.id}
                        >
                          <Edit sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={user.is_active ? 'Deactivate' : 'Activate'}>
                        <IconButton
                          size="small"
                          color={user.is_active ? 'error' : 'success'}
                          onClick={() => handleToggleStatus(user.id, user.is_active)}
                          disabled={user.id === currentUser?.id}
                        >
                          {user.is_active ? <Block sx={{ fontSize: 20 }} /> : <CheckCircle sx={{ fontSize: 20 }} />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredUsers.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">No users found</Typography>
          </Box>
        )}

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Change Role Dialog */}
      <Dialog open={openRoleDialog} onClose={() => setOpenRoleDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Role</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            User: <strong>{selectedUser?.full_name}</strong>
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              label="Role"
            >
              <MenuItem value="super_admin">Super Admin</MenuItem>
              <MenuItem value="pastor">Pastor</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="department_head">Department Head</MenuItem>
              <MenuItem value="cell_leader">Cell Leader</MenuItem>
              <MenuItem value="member">Member</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRoleDialog(false)}>Cancel</Button>
          <Button onClick={handleChangeRole} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            Update Role
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

export default ManageUsers;