import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Avatar, TablePagination, TextField, InputAdornment,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Snackbar, Alert, CircularProgress, useTheme, useMediaQuery,
  Tabs, Tab, Divider, MenuItem, FormControl, InputLabel, Select,
  Tooltip
} from '@mui/material';
import {
  Search, Add, Edit, Delete, Visibility, Groups,
  Close, LocationOn, AccessTime, CheckCircle, Cancel,
  PersonAdd, PersonRemove, Assignment, EventNote,
  People, Dashboard, CalendarToday, Person
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8000/api';

const Cells = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [cells, setCells] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openMemberDialog, setOpenMemberDialog] = useState(false);
  const [openActivityDialog, setOpenActivityDialog] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [cellMembers, setCellMembers] = useState([]);
  const [cellActivities, setCellActivities] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [tabValue, setTabValue] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    meeting_day: '',
    meeting_time: '',
    meeting_location: ''
  });
  
  const [memberForm, setMemberForm] = useState({
    member_id: '',
    role: 'member'
  });
  
  const [activityForm, setActivityForm] = useState({
    week_start_date: new Date().toISOString().split('T')[0],
    attendance: '',
    new_members_count: '',
    prayer_points: '',
    testimonies: '',
    challenges: '',
    report: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cellsRes, membersRes] = await Promise.all([
        axios.get(`${API_URL}/cells/`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/members/`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setCells(cellsRes.data);
      setMembers(membersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error fetching data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCellDetails = async (cellId) => {
    try {
      const [membersRes, activitiesRes] = await Promise.all([
        axios.get(`${API_URL}/cells/${cellId}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/cells/${cellId}/activities`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setCellMembers(membersRes.data);
      setCellActivities(activitiesRes.data);
    } catch (error) {
      console.error('Error fetching cell details:', error);
      showSnackbar('Error fetching cell details', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // THE MISSING FUNCTION — "View Details" called this but it never
  // existed anywhere in the file, so clicking it threw a hard JS error
  // instead of opening the dialog. This is the actual root cause of
  // "cell members don't show" — not a backend issue at all.
  const handleViewCell = (cell) => {
    setSelectedCell(cell);
    setTabValue(0);
    fetchCellDetails(cell.id);
    setOpenViewDialog(true);
  };

  const handleOpenDialog = (cell = null) => {
    if (cell) {
      setEditingCell(cell);
      setFormData({
        name: cell.name || '',
        description: cell.description || '',
        meeting_day: cell.meeting_day || '',
        meeting_time: cell.meeting_time || '',
        meeting_location: cell.meeting_location || ''
      });
    } else {
      setEditingCell(null);
      setFormData({
        name: '',
        description: '',
        meeting_day: '',
        meeting_time: '',
        meeting_location: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCell(null);
  };

  const handleSubmit = async () => {
    try {
      const submitData = {
        name: formData.name,
        description: formData.description || null,
        meeting_day: formData.meeting_day || null,
        meeting_time: formData.meeting_time || null,
        meeting_location: formData.meeting_location || null
      };

      if (editingCell) {
        await axios.put(`${API_URL}/cells/${editingCell.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Cell updated successfully', 'success');
      } else {
        await axios.post(`${API_URL}/cells/`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Cell created successfully', 'success');
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      console.error('Submit error:', error);
      let errorMsg = 'Error saving cell';
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      }
      showSnackbar(errorMsg, 'error');
    }
  };

  const handleDeleteCell = async (cellId) => {
    if (window.confirm('Are you sure you want to delete this cell group?')) {
      try {
        await axios.delete(`${API_URL}/cells/${cellId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Cell deleted successfully', 'success');
        fetchData();
      } catch (error) {
        showSnackbar('Error deleting cell', 'error');
      }
    }
  };

  const handleOpenMemberDialog = (cell) => {
    setSelectedCell(cell);
    setMemberForm({
      member_id: '',
      role: 'member'
    });
    setOpenMemberDialog(true);
  };

  const handleCloseMemberDialog = () => {
    setOpenMemberDialog(false);
    setSelectedCell(null);
  };

  const handleAssignMember = async () => {
    try {
      await axios.post(`${API_URL}/cells/assign-member`, {
        member_id: parseInt(memberForm.member_id),
        cell_id: selectedCell.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Member assigned successfully', 'success');
      handleCloseMemberDialog();
      fetchData();
      if (selectedCell) {
        fetchCellDetails(selectedCell.id);
      }
    } catch (error) {
      console.error('Error assigning member:', error);
      showSnackbar(error.response?.data?.detail || 'Error assigning member', 'error');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm('Are you sure you want to remove this member from the cell?')) {
      try {
        await axios.delete(`${API_URL}/cells/remove-member/${memberId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Member removed successfully', 'success');
        fetchData();
        if (selectedCell) {
          fetchCellDetails(selectedCell.id);
        }
      } catch (error) {
        showSnackbar('Error removing member', 'error');
      }
    }
  };

  const handleAssignLeader = async (memberId, role) => {
    try {
      await axios.post(
        `${API_URL}/cells/assign-leader?member_id=${memberId}&cell_id=${selectedCell.id}&role=${role}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSnackbar(`${role.charAt(0).toUpperCase() + role.slice(1)} assigned successfully`, 'success');
      fetchData();
      if (selectedCell) {
        fetchCellDetails(selectedCell.id);
      }
    } catch (error) {
      console.error('Error assigning leader:', error);
      const errorMsg = error.response?.data?.detail || 'Error assigning leader';
      showSnackbar(errorMsg, 'error');
    }
  };

  const handleRemoveLeader = async (role) => {
    if (window.confirm(`Are you sure you want to remove the ${role} from this cell?`)) {
      try {
        await axios.delete(`${API_URL}/cells/remove-leader/${selectedCell.id}?role=${role}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar(`${role.charAt(0).toUpperCase() + role.slice(1)} removed successfully`, 'success');
        fetchData();
        if (selectedCell) {
          fetchCellDetails(selectedCell.id);
        }
      } catch (error) {
        showSnackbar('Error removing leader', 'error');
      }
    }
  };

  const handleOpenActivityDialog = (cell) => {
    setSelectedCell(cell);
    setActivityForm({
      week_start_date: new Date().toISOString().split('T')[0],
      attendance: '',
      new_members_count: '',
      prayer_points: '',
      testimonies: '',
      challenges: '',
      report: ''
    });
    setOpenActivityDialog(true);
  };

  const handleCloseActivityDialog = () => {
    setOpenActivityDialog(false);
  };

  const handleSubmitActivity = async () => {
    try {
      await axios.post(`${API_URL}/cells/${selectedCell.id}/activity`, {
        week_start_date: activityForm.week_start_date,
        attendance: parseInt(activityForm.attendance) || 0,
        new_members_count: parseInt(activityForm.new_members_count) || 0,
        prayer_points: activityForm.prayer_points,
        testimonies: activityForm.testimonies,
        challenges: activityForm.challenges,
        report: activityForm.report
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Activity submitted successfully', 'success');
      handleCloseActivityDialog();
    } catch (error) {
      console.error('Error submitting activity:', error);
      showSnackbar('Error submitting activity', 'error');
    }
  };

  const navigateToCellLeaders = () => {
    navigate('/cell-leaders');
  };

  const getDayColor = (day) => {
    const colors = {
      'Monday': '#1976d2',
      'Tuesday': '#2e7d32',
      'Wednesday': '#e65100',
      'Thursday': '#6a1b9a',
      'Friday': '#c62828',
      'Saturday': '#00695c',
      'Sunday': '#f9a825'
    };
    return colors[day] || '#1a237e';
  };

  const filteredCells = cells.filter(cell =>
    cell.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cell.description && cell.description.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e', fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
            Cell Groups
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage all cell groups, members, and activities
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Person />}
            onClick={navigateToCellLeaders}
            sx={{ borderColor: '#1a237e', color: '#1a237e' }}
          >
            Manage Leaders
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ backgroundColor: '#1a237e', '&:hover': { backgroundColor: '#0d1442' } }}
          >
            Add Cell Group
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: { xs: 1, sm: 2 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 2, gap: 1 }}>
          <TextField
            placeholder="Search cell groups..."
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
            sx={{ width: { xs: '100%', sm: 300 } }}
          />
          <Typography variant="body2" color="textSecondary">
            Total: {filteredCells.length} cell groups
          </Typography>
        </Box>

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Cell Group</TableCell>
                <TableCell>Meeting Details</TableCell>
                <TableCell>Members</TableCell>
                <TableCell>Leadership</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCells
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((cell) => (
                  <TableRow key={cell.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#1a237e', width: { xs: 28, sm: 40 }, height: { xs: 28, sm: 40 } }}>
                          <Groups sx={{ fontSize: { xs: 16, sm: 24 } }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                            {cell.name}
                          </Typography>
                          {cell.description && (
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                              {cell.description.length > 50 ? cell.description.substring(0, 50) + '...' : cell.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {cell.meeting_day && (
                          <Chip
                            label={cell.meeting_day}
                            size="small"
                            sx={{
                              backgroundColor: getDayColor(cell.meeting_day),
                              color: 'white',
                              fontSize: '0.6rem',
                              height: 22
                            }}
                          />
                        )}
                        {cell.meeting_time && (
                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                            <AccessTime fontSize="small" sx={{ fontSize: 14 }} /> {cell.meeting_time}
                          </Typography>
                        )}
                        {cell.meeting_location && (
                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                            <LocationOn fontSize="small" sx={{ fontSize: 14 }} /> {cell.meeting_location}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${cell.member_count || 0} members`}
                        size="small"
                        sx={{ backgroundColor: '#e3f2fd', color: '#1a237e', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}
                      />
                    </TableCell>
                    <TableCell>
                      {cell.leader_name ? (
                        <Chip
                          icon={<CheckCircle sx={{ fontSize: 16 }} />}
                          label={cell.leader_name}
                          size="small"
                          sx={{ 
                            backgroundColor: '#e8f5e9', 
                            color: '#2e7d32',
                            fontWeight: 600,
                            fontSize: { xs: '0.6rem', sm: '0.75rem' },
                            '& .MuiChip-icon': { color: '#2e7d32' }
                          }}
                        />
                      ) : (
                        <Chip
                          icon={<Cancel sx={{ fontSize: 16 }} />}
                          label="No Leader"
                          size="small"
                          sx={{ 
                            backgroundColor: '#ffebee', 
                            color: '#c62828',
                            fontSize: { xs: '0.6rem', sm: '0.75rem' },
                            '& .MuiChip-icon': { color: '#c62828' }
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewCell(cell)}>
                          <Visibility sx={{ fontSize: { xs: 18, sm: 24 } }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Cell">
                        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(cell)}>
                          <Edit sx={{ fontSize: { xs: 18, sm: 24 } }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Add Member">
                        <IconButton size="small" color="success" onClick={() => handleOpenMemberDialog(cell)}>
                          <PersonAdd sx={{ fontSize: { xs: 18, sm: 24 } }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Cell">
                        <IconButton size="small" color="error" onClick={() => handleDeleteCell(cell.id)}>
                          <Delete sx={{ fontSize: { xs: 18, sm: 24 } }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredCells.length}
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
          {editingCell ? 'Edit Cell Group' : 'Add New Cell Group'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cell Group Name"
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
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Meeting Day"
                value={formData.meeting_day}
                onChange={(e) => setFormData({ ...formData, meeting_day: e.target.value })}
                placeholder="e.g., Wednesday"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Meeting Time"
                value={formData.meeting_time}
                onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                placeholder="e.g., 6:00 PM"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Meeting Location"
                value={formData.meeting_location}
                onChange={(e) => setFormData({ ...formData, meeting_location: e.target.value })}
                placeholder="e.g., Room 101"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            {editingCell ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Cell Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Cell Group Details</Typography>
            <IconButton onClick={() => setOpenViewDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedCell && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ width: 60, height: 60, bgcolor: '#1a237e' }}>
                  <Groups />
                </Avatar>
                <Box>
                  <Typography variant="h5">
                    {selectedCell.name}
                  </Typography>
                  <Chip
                    label={`${selectedCell.member_count || 0} members`}
                    size="small"
                    sx={{ backgroundColor: '#e3f2fd', color: '#1a237e' }}
                  />
                </Box>
              </Box>

              <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
                <Tab label="Overview" icon={<Dashboard />} />
                <Tab label="Members" icon={<People />} />
                <Tab label="Activities" icon={<EventNote />} />
              </Tabs>

              {tabValue === 0 && (
                <Box>
                  {selectedCell.description && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                      <Typography variant="body2">{selectedCell.description}</Typography>
                    </Box>
                  )}
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">Meeting Schedule</Typography>
                      <Typography variant="body2">
                        {selectedCell.meeting_day ? `${selectedCell.meeting_day} at ${selectedCell.meeting_time || 'TBD'}` : 'Not set'}
                      </Typography>
                      <Typography variant="body2">Location: {selectedCell.meeting_location || 'Not set'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">Leadership</Typography>
                      {selectedCell.leader_name ? (
                        <Chip
                          icon={<CheckCircle sx={{ fontSize: 16 }} />}
                          label={`Leader: ${selectedCell.leader_name}`}
                          sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32', fontWeight: 600, mt: 1 }}
                        />
                      ) : (
                        <Chip
                          icon={<Cancel sx={{ fontSize: 16 }} />}
                          label="No Leader assigned"
                          sx={{ backgroundColor: '#ffebee', color: '#c62828', mt: 1 }}
                        />
                      )}
                    </Grid>
                  </Grid>
                </Box>
              )}

              {tabValue === 1 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Members ({cellMembers.length})
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PersonAdd />}
                      onClick={() => handleOpenMemberDialog(selectedCell)}
                      sx={{ backgroundColor: '#1a237e' }}
                    >
                      Add Member
                    </Button>
                  </Box>
                  {cellMembers.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">No members assigned to this cell</Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cellMembers.map((member) => {
                          const isLeader = member.user_id && selectedCell.leader_id === member.user_id;
                          const isAssistant = member.user_id && selectedCell.assistant_leader_id === member.user_id;
                          return (
                            <TableRow key={member.id}>
                              <TableCell>{member.name}</TableCell>
                              <TableCell>
                                {isLeader ? (
                                  <Chip label="Leader" size="small" sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }} />
                                ) : isAssistant ? (
                                  <Chip label="Assistant" size="small" sx={{ backgroundColor: '#fff3e0', color: '#e65100' }} />
                                ) : (
                                  <Chip label="Member" size="small" variant="outlined" />
                                )}
                              </TableCell>
                              <TableCell align="right">
                                {!isLeader && (
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleAssignLeader(member.id, 'leader')} 
                                    title="Make Leader"
                                    disabled={!member.user_id}
                                  >
                                    <Assignment sx={{ fontSize: 16 }} />
                                  </IconButton>
                                )}
                                {!isAssistant && !isLeader && (
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleAssignLeader(member.id, 'assistant')} 
                                    title="Make Assistant"
                                    disabled={!member.user_id}
                                  >
                                    <PersonAdd sx={{ fontSize: 16 }} />
                                  </IconButton>
                                )}
                                <IconButton size="small" color="error" onClick={() => handleRemoveMember(member.id)}>
                                  <PersonRemove sx={{ fontSize: 16 }} />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                  {selectedCell.leader_name && (
                    <Box sx={{ mt: 2 }}>
                      <Button size="small" color="error" variant="outlined" onClick={() => handleRemoveLeader('leader')}>
                        Remove Leader
                      </Button>
                    </Box>
                  )}
                </Box>
              )}

              {tabValue === 2 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Activity Reports
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => handleOpenActivityDialog(selectedCell)}
                      sx={{ backgroundColor: '#1a237e' }}
                    >
                      Submit Activity
                    </Button>
                  </Box>
                  {cellActivities.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">No activities reported yet</Typography>
                  ) : (
                    cellActivities.map((activity) => (
                      <Paper key={activity.id} sx={{ p: 2, mb: 1, backgroundColor: '#f8f9fa' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2">
                            Week of {new Date(activity.week_start_date).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Submitted: {new Date(activity.submitted_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                          <Chip label={`Attendance: ${activity.attendance}`} size="small" />
                          <Chip label={`New Members: ${activity.new_members_count}`} size="small" />
                        </Box>
                        {activity.report && (
                          <Typography variant="body2" sx={{ mt: 1 }}>{activity.report}</Typography>
                        )}
                      </Paper>
                    ))
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Assign Member Dialog */}
      <Dialog open={openMemberDialog} onClose={handleCloseMemberDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Member to Cell</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Member</InputLabel>
                <Select
                  value={memberForm.member_id}
                  onChange={(e) => setMemberForm({ ...memberForm, member_id: e.target.value })}
                  label="Select Member"
                >
                  <MenuItem value="">Select a member</MenuItem>
                  {members.filter(m => !m.cell_id).map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name} ({member.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMemberDialog}>Cancel</Button>
          <Button onClick={handleAssignMember} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            Assign Member
          </Button>
        </DialogActions>
      </Dialog>

      {/* Submit Activity Dialog */}
      <Dialog open={openActivityDialog} onClose={handleCloseActivityDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Cell Activity Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Week Starting"
                type="date"
                value={activityForm.week_start_date}
                onChange={(e) => setActivityForm({ ...activityForm, week_start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Attendance"
                type="number"
                value={activityForm.attendance}
                onChange={(e) => setActivityForm({ ...activityForm, attendance: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="New Members"
                type="number"
                value={activityForm.new_members_count}
                onChange={(e) => setActivityForm({ ...activityForm, new_members_count: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Prayer Points"
                multiline
                rows={2}
                value={activityForm.prayer_points}
                onChange={(e) => setActivityForm({ ...activityForm, prayer_points: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Testimonies"
                multiline
                rows={2}
                value={activityForm.testimonies}
                onChange={(e) => setActivityForm({ ...activityForm, testimonies: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Challenges"
                multiline
                rows={2}
                value={activityForm.challenges}
                onChange={(e) => setActivityForm({ ...activityForm, challenges: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Report Summary"
                multiline
                rows={2}
                value={activityForm.report}
                onChange={(e) => setActivityForm({ ...activityForm, report: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseActivityDialog}>Cancel</Button>
          <Button onClick={handleSubmitActivity} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            Submit Report
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

export default Cells;