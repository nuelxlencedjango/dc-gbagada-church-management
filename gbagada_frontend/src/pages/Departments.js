import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Avatar, TablePagination, TextField, InputAdornment,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Snackbar, Alert, CircularProgress, Divider
} from '@mui/material';
import {
  Search, Add, Edit, Delete, Visibility, Business,
  Close, People, Phone, Email as EmailIcon, CheckCircle
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8000/api';

const Departments = () => {
  const { token } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptMembers, setDeptMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/departments/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      const errorMsg = error.response?.data?.detail || 'Error fetching departments';
      showSnackbar(errorMsg, 'error');
      setDepartments([
        { id: 1, name: 'Ushering', description: 'Organize church activities', member_count: 5 },
        { id: 2, name: 'Media', description: 'Manage church media', member_count: 8 },
        { id: 3, name: 'Children', description: 'Children ministry', member_count: 12 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeptMembers = async (deptId) => {
    setLoadingMembers(true);
    try {
      const response = await axios.get(`${API_URL}/departments/${deptId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeptMembers(response.data);
    } catch (error) {
      console.error('Error fetching department members:', error);
      setDeptMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({
        name: dept.name || '',
        description: dept.description || ''
      });
    } else {
      setEditingDept(null);
      setFormData({
        name: '',
        description: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDept(null);
    setFormData({
      name: '',
      description: ''
    });
  };

  const handleSubmit = async () => {
    try {
      const submitData = {
        name: formData.name,
        description: formData.description || null
      };

      if (editingDept) {
        await axios.put(`${API_URL}/departments/${editingDept.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Department updated successfully', 'success');
      } else {
        await axios.post(`${API_URL}/departments/`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Department created successfully', 'success');
      }
      handleCloseDialog();
      fetchDepartments();
    } catch (error) {
      console.error('Submit error:', error);
      let errorMsg = 'Error saving department';
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error.response?.data?.errors) {
        errorMsg = Object.values(error.response.data.errors).flat().join(', ');
      }
      showSnackbar(errorMsg, 'error');
    }
  };

  const handleDeleteDept = async (deptId) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await axios.delete(`${API_URL}/departments/${deptId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Department deleted successfully', 'success');
        fetchDepartments();
      } catch (error) {
        const errorMsg = error.response?.data?.detail || 'Error deleting department';
        showSnackbar(errorMsg, 'error');
      }
    }
  };

  const handleViewDept = (dept) => {
    setSelectedDept(dept);
    setDeptMembers([]);
    setOpenViewDialog(true);
    fetchDeptMembers(dept.id);
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e' }}>
            Departments
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage all departments in the church
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ backgroundColor: '#1a237e', '&:hover': { backgroundColor: '#0d1442' } }}
        >
          Create Department
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <TextField
            placeholder="Search departments..."
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
            Total: {filteredDepartments.length} departments
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Department</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Members</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDepartments
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((dept) => (
                  <TableRow key={dept.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#1a237e', width: 40, height: 40 }}>
                          <Business />
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {dept.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {dept.description || 'No description'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${dept.member_count || 0} members`}
                        size="small"
                        sx={{ backgroundColor: '#e3f2fd', color: '#1a237e' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleViewDept(dept)}>
                        <Visibility />
                      </IconButton>
                      <IconButton size="small" color="primary" onClick={() => handleOpenDialog(dept)}>
                        <Edit />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteDept(dept.id)}>
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
          count={filteredDepartments.length}
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
          {editingDept ? 'Edit Department' : 'Create New Department'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Department Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            {editingDept ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Department Details</Typography>
            <IconButton onClick={() => setOpenViewDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedDept && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ width: 60, height: 60, bgcolor: '#1a237e' }}>
                  <Business />
                </Avatar>
                <Box>
                  <Typography variant="h5">
                    {selectedDept.name}
                  </Typography>
                  <Chip
                    label={`${selectedDept.member_count || 0} members`}
                    size="small"
                    sx={{ backgroundColor: '#e3f2fd', color: '#1a237e' }}
                  />
                </Box>
              </Box>
              {selectedDept.description && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                  <Typography variant="body2">{selectedDept.description}</Typography>
                </Box>
              )}

              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                <People sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                Members ({deptMembers.length})
              </Typography>

              {loadingMembers ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : deptMembers.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                  No members assigned to this department yet.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Role</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deptMembers.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.name}</TableCell>
                        <TableCell>
                          {m.phone_number && (
                            <Typography variant="caption" display="block">
                              <Phone fontSize="inherit" sx={{ fontSize: 12, mr: 0.5 }} />{m.phone_number}
                            </Typography>
                          )}
                          {m.email && (
                            <Typography variant="caption" display="block" color="textSecondary">
                              <EmailIcon fontSize="inherit" sx={{ fontSize: 12, mr: 0.5 }} />{m.email}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {m.is_head ? (
                            <Chip icon={<CheckCircle sx={{ fontSize: 14 }} />} label="Head" size="small" sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }} />
                          ) : m.is_assistant_head ? (
                            <Chip label="Assistant" size="small" sx={{ backgroundColor: '#fff3e0', color: '#e65100' }} />
                          ) : (
                            <Chip label="Member" size="small" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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

export default Departments;