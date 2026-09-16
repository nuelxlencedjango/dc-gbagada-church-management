import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Avatar, TablePagination, TextField, InputAdornment,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Snackbar, Alert, CircularProgress, MenuItem,
  FormControl, InputLabel, Select, Tooltip
} from '@mui/material';
import {
  Search, Add, Edit, Delete, Person,
  Close, PersonAdd, Business, Warning
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const HOD = () => {
  const { token } = useAuth();
  const [hods, setHods] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentMembers, setDepartmentMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingHOD, setEditingHOD] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    department_id: '',
    member_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const deptRes = await axios.get(`${API_URL}/departments/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(deptRes.data);

      const hodRes = await axios.get(`${API_URL}/hod/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHods(hodRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error fetching data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentMembers = async (departmentId) => {
    try {
      const response = await axios.get(`${API_URL}/hod/department-members/${departmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartmentMembers(response.data);
    } catch (error) {
      console.error('Error fetching department members:', error);
      showSnackbar('Error fetching department members', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = async (hod = null) => {
    if (hod) {
      setEditingHOD(hod);
      setFormData({
        department_id: hod.id || '',
        member_id: hod.hod?.id || ''
      });
      if (hod.id) {
        await fetchDepartmentMembers(hod.id);
      }
    } else {
      setEditingHOD(null);
      setFormData({
        department_id: '',
        member_id: ''
      });
      setDepartmentMembers([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingHOD(null);
    setFormData({
      department_id: '',
      member_id: ''
    });
    setDepartmentMembers([]);
  };

  const handleDepartmentChange = async (e) => {
    const deptId = e.target.value;
    setFormData({ ...formData, department_id: deptId, member_id: '' });
    if (deptId) {
      await fetchDepartmentMembers(deptId);
    } else {
      setDepartmentMembers([]);
    }
  };

  const handleSubmit = async () => {
    try {
      await axios.post(`${API_URL}/hod/assign`, {
        member_id: parseInt(formData.member_id),
        department_id: parseInt(formData.department_id)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const assignedMember = departmentMembers.find(m => m.id === parseInt(formData.member_id));
      const department = departments.find(d => d.id === parseInt(formData.department_id));
      
      showSnackbar(
        `${assignedMember?.first_name} ${assignedMember?.last_name} assigned as HOD of ${department?.name}`,
        'success'
      );
      handleCloseDialog();
      fetchData();
    } catch (error) {
      console.error('Error assigning HOD:', error);
      showSnackbar(error.response?.data?.detail || 'Error assigning HOD', 'error');
    }
  };

  const handleRemoveHOD = async (departmentId, departmentName) => {
    if (window.confirm(`Are you sure you want to remove the HOD from ${departmentName}?`)) {
      try {
        await axios.delete(`${API_URL}/hod/remove/${departmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar(`HOD removed from ${departmentName}`, 'success');
        fetchData();
      } catch (error) {
        showSnackbar('Error removing HOD', 'error');
      }
    }
  };

  const filteredHODs = hods.filter(hod =>
    hod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (hod.hod && `${hod.hod.first_name} ${hod.hod.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
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
            Manage HODs
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Assign Heads of Departments (must be members of the department)
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => handleOpenDialog()}
          sx={{ backgroundColor: '#1a237e', '&:hover': { backgroundColor: '#0d1442' } }}
        >
          Assign HOD
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <TextField
            placeholder="Search departments or HODs..."
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
            Total: {filteredHODs.length} departments
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Department</TableCell>
                <TableCell>HOD</TableCell>
                <TableCell>Members</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredHODs
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
                      {dept.hod ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ bgcolor: '#2e7d32', width: 30, height: 30 }}>
                            <Person />
                          </Avatar>
                          <Typography variant="body2">
                            {dept.hod.first_name} {dept.hod.last_name}
                          </Typography>
                          <Chip
                            label="HOD"
                            size="small"
                            sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32', ml: 1 }}
                          />
                        </Box>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          Not assigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${dept.member_count || 0} members`}
                        size="small"
                        sx={{ backgroundColor: '#e3f2fd', color: '#1a237e' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {dept.hod ? (
                        <>
                          <IconButton size="small" color="primary" onClick={() => handleOpenDialog(dept)}>
                            <Edit />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleRemoveHOD(dept.id, dept.name)}>
                            <Delete />
                          </IconButton>
                        </>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PersonAdd />}
                          onClick={() => handleOpenDialog(dept)}
                          sx={{ borderColor: '#1a237e', color: '#1a237e' }}
                        >
                          Assign HOD
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredHODs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Assign HOD Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingHOD ? 'Edit HOD' : 'Assign New HOD'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Department</InputLabel>
                <Select
                  value={formData.department_id}
                  onChange={handleDepartmentChange}
                  label="Select Department"
                >
                  <MenuItem value="">Select a department</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name} {dept.hod ? '(Has HOD)' : '(No HOD)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth disabled={!formData.department_id}>
                <InputLabel>Select Member</InputLabel>
                <Select
                  value={formData.member_id}
                  onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                  label="Select Member"
                >
                  <MenuItem value="">Select a member</MenuItem>
                  {departmentMembers.map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name} 
                      {member.is_hod ? ' (Current HOD)' : ''}
                      {!member.user_id ? ' ⚠️ No user account' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {formData.department_id && departmentMembers.length === 0 && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  No members found in this department. Please add members to this department first.
                </Typography>
              )}
              {formData.member_id && (
                (() => {
                  const selected = departmentMembers.find(m => m.id === parseInt(formData.member_id));
                  if (selected && !selected.user_id) {
                    return (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        <Typography variant="caption" display="block">
                          ⚠️ This member does not have a user account. 
                          Please create a user account for them before assigning as HOD.
                        </Typography>
                      </Alert>
                    );
                  }
                  return null;
                })()
              )}
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="textSecondary">
                Only members of the selected department can be assigned as HOD.
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            sx={{ backgroundColor: '#1a237e' }}
            disabled={!formData.department_id || !formData.member_id}
          >
            {editingHOD ? 'Update' : 'Assign'}
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

export default HOD;
