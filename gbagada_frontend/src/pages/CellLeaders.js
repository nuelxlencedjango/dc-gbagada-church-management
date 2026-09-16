import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Avatar, TablePagination, TextField, InputAdornment,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Snackbar, Alert, CircularProgress, useTheme, useMediaQuery,
  MenuItem, FormControl, InputLabel, Select, Tooltip
} from '@mui/material';
import {
  Search, Person, CheckCircle, Cancel, PersonAdd,
  Delete, Edit, Visibility, Close, Assignment, Groups,
  Warning as WarningIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const CellLeaders = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [cells, setCells] = useState([]);
  const [cellMembers, setCellMembers] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    cell_id: '',
    member_id: '',
    role: 'leader'
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchCells();
  }, []);

  const fetchCells = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/cells/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCells(response.data);
    } catch (error) {
      console.error('Error fetching cells:', error);
      showSnackbar('Error fetching cells', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCellMembers = async (cellId) => {
    try {
      const response = await axios.get(`${API_URL}/cells/${cellId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCellMembers(response.data);
      const cell = cells.find(c => c.id === cellId);
      setSelectedCell(cell);
    } catch (error) {
      console.error('Error fetching cell members:', error);
      showSnackbar('Error fetching cell members', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (cell = null) => {
    setFormErrors({});
    if (cell) {
      setFormData({
        cell_id: cell.id,
        member_id: '',
        role: cell.leader_name ? 'assistant' : 'leader'
      });
      fetchCellMembers(cell.id);
    } else {
      setFormData({
        cell_id: '',
        member_id: '',
        role: 'leader'
      });
      setCellMembers([]);
      setSelectedCell(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCell(null);
    setCellMembers([]);
    setFormErrors({});
  };

  const handleCellChange = async (e) => {
    const cellId = parseInt(e.target.value);
    setFormData({ ...formData, cell_id: cellId, member_id: '' });
    setFormErrors({});
    if (cellId) {
      await fetchCellMembers(cellId);
    } else {
      setCellMembers([]);
      setSelectedCell(null);
    }
  };

  const navigateToCreateUser = (memberId) => {
    navigate(`/members/${memberId}/create-user`);
  };

  const handleAssignLeader = async () => {
    setFormErrors({});
    
    // Validation
    const errors = {};
    if (!formData.cell_id) {
      errors.cell_id = 'Please select a cell group';
    }
    if (!formData.member_id) {
      errors.member_id = 'Please select a member';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Extra validation: selected member must belong to selected cell
    const selectedMember = cellMembers.find(m => m.id === parseInt(formData.member_id));
    if (!selectedMember) {
      setFormErrors({ member_id: 'Selected member is not in this cell group.' });
      return;
    }

    // Check if member has a user account
    if (!selectedMember.user_id) {
      setFormErrors({ member_id: 'This member does not have a user account. Please create one first.' });
      return;
    }

    // Check if the cell already has a leader/assistant (optional – backend will catch)
    if (formData.role === 'leader' && selectedCell.leader_name) {
      setFormErrors({ role: 'This cell already has a leader. Remove the current leader first.' });
      return;
    }
    if (formData.role === 'assistant' && selectedCell.assistant_leader_name) {
      setFormErrors({ role: 'This cell already has an assistant leader. Remove the current one first.' });
      return;
    }

    try {
      await axios.post(
        `${API_URL}/cells/assign-leader?member_id=${formData.member_id}&cell_id=${formData.cell_id}&role=${formData.role}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const assignedMember = cellMembers.find(m => m.id === parseInt(formData.member_id));
      const cell = cells.find(c => c.id === parseInt(formData.cell_id));
      
      showSnackbar(
        `${assignedMember?.name} assigned as ${formData.role} of ${cell?.name}`,
        'success'
      );
      handleCloseDialog();
      fetchCells();
    } catch (error) {
      console.error('Error assigning leader:', error);
      let errorMsg = 'Error assigning leader';
      if (error.response) {
        const data = error.response.data;
        if (data.detail) {
          errorMsg = data.detail;
        } else if (data.message) {
          errorMsg = data.message;
        } else if (typeof data === 'string') {
          errorMsg = data;
        }
      } else if (error.request) {
        errorMsg = 'No response from server. Please check your connection.';
      } else {
        errorMsg = error.message;
      }
      showSnackbar(errorMsg, 'error');
    }
  };

  const handleRemoveLeader = async (cellId, role) => {
    if (window.confirm(`Are you sure you want to remove the ${role} from this cell?`)) {
      try {
        await axios.delete(`${API_URL}/cells/remove-leader/${cellId}?role=${role}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar(`${role.charAt(0).toUpperCase() + role.slice(1)} removed successfully`, 'success');
        fetchCells();
      } catch (error) {
        showSnackbar('Error removing leader', 'error');
      }
    }
  };

  const filteredCells = cells.filter(cell =>
    cell.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if selected member has a user account
  const selectedMember = formData.member_id ? cellMembers.find(m => m.id === parseInt(formData.member_id)) : null;
  const hasUserAccount = selectedMember?.user_id !== null && selectedMember?.user_id !== undefined && selectedMember?.user_id > 0;
  const isMemberInCell = selectedMember ? true : false; // will be true if found in cellMembers

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
            Manage Cell Leaders
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Assign Heads and Assistant Leaders to Cell Groups (must be members of the cell with user accounts)
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => handleOpenDialog()}
          sx={{ backgroundColor: '#1a237e', '&:hover': { backgroundColor: '#0d1442' } }}
        >
          Assign Leader
        </Button>
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
                <TableCell>Leader</TableCell>
                <TableCell>Assistant</TableCell>
                <TableCell>Members</TableCell>
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
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                          {cell.name}
                        </Typography>
                      </Box>
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
                          label="Not assigned"
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
                    <TableCell>
                      {cell.assistant_leader_name ? (
                        <Chip
                          icon={<Person sx={{ fontSize: 16 }} />}
                          label={cell.assistant_leader_name}
                          size="small"
                          sx={{ 
                            backgroundColor: '#fff3e0', 
                            color: '#e65100',
                            fontWeight: 500,
                            fontSize: { xs: '0.6rem', sm: '0.75rem' }
                          }}
                        />
                      ) : (
                        <Chip
                          icon={<Cancel sx={{ fontSize: 16 }} />}
                          label="Not assigned"
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
                    <TableCell>
                      <Chip
                        label={`${cell.member_count || 0} members`}
                        size="small"
                        sx={{ backgroundColor: '#e3f2fd', color: '#1a237e', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PersonAdd />}
                        onClick={() => handleOpenDialog(cell)}
                        sx={{ borderColor: '#1a237e', color: '#1a237e', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}
                      >
                        {cell.leader_name ? 'Edit' : 'Assign'}
                      </Button>
                      {cell.leader_name && (
                        <Tooltip title="Remove Leader">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleRemoveLeader(cell.id, 'leader')}
                            sx={{ ml: 1 }}
                          >
                            <Delete sx={{ fontSize: { xs: 18, sm: 24 } }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {cell.assistant_leader_name && (
                        <Tooltip title="Remove Assistant">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleRemoveLeader(cell.id, 'assistant')}
                            sx={{ ml: 0.5 }}
                          >
                            <Delete sx={{ fontSize: { xs: 18, sm: 24 } }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredCells.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Groups sx={{ fontSize: 60, color: '#bdbdbd' }} />
            <Typography variant="h6" color="textSecondary">
              No cell groups found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Create a cell group first before assigning leaders.
            </Typography>
          </Box>
        )}

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

      {/* Assign Leader Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedCell?.leader_name ? 'Edit Leadership' : 'Assign New Leader'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!formErrors.cell_id}>
                <InputLabel>Select Cell Group</InputLabel>
                <Select
                  value={formData.cell_id}
                  onChange={handleCellChange}
                  label="Select Cell Group"
                >
                  <MenuItem value="">Select a cell group</MenuItem>
                  {cells.map((cell) => (
                    <MenuItem key={cell.id} value={cell.id}>
                      {cell.name} {cell.leader_name ? '(Has Leader)' : '(No Leader)'}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.cell_id && (
                  <Typography variant="caption" color="error">{formErrors.cell_id}</Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth disabled={!formData.cell_id} error={!!formErrors.member_id}>
                <InputLabel>Select Member</InputLabel>
                <Select
                  value={formData.member_id}
                  onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                  label="Select Member"
                >
                  <MenuItem value="">Select a member</MenuItem>
                  {cellMembers.map((member) => {
                    const hasAccount = member.user_id !== null && member.user_id !== undefined && member.user_id > 0;
                    const isLeader = member.is_leader === true;
                    const isAssistant = member.is_assistant === true;
                    
                    // Disable if no account or already leader/assistant
                    const isDisabled = !hasAccount || isLeader || isAssistant;
                    
                    return (
                      <MenuItem 
                        key={member.id} 
                        value={member.id}
                        disabled={isDisabled}
                        sx={{
                          opacity: isDisabled ? 0.5 : 1,
                          fontStyle: isDisabled ? 'italic' : 'normal'
                        }}
                      >
                        {member.name} 
                        {!hasAccount ? ' ⚠️ No user account' : ''}
                        {isLeader ? ' (Current Leader)' : ''}
                        {isAssistant ? ' (Current Assistant)' : ''}
                      </MenuItem>
                    );
                  })}
                </Select>
                {formErrors.member_id && (
                  <Typography variant="caption" color="error">{formErrors.member_id}</Typography>
                )}
              </FormControl>
              {formData.cell_id && cellMembers.length === 0 && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  No members found in this cell group. Please add members to this cell first.
                </Typography>
              )}
              {selectedCell && selectedCell.leader_name && (
                <Typography variant="caption" color="warning" sx={{ mt: 1, display: 'block' }}>
                  This cell already has a leader: <strong>{selectedCell.leader_name}</strong>
                </Typography>
              )}
              
              {/* Show warning if selected member doesn't have a user account */}
              {selectedMember && !hasUserAccount && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    ⚠️ This member does not have a user account.
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    Please create a user account for them before assigning as leader.
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    startIcon={<PersonAdd />}
                    onClick={() => navigateToCreateUser(selectedMember.id)}
                    sx={{ mt: 1 }}
                  >
                    Create User Account
                  </Button>
                </Alert>
              )}
              
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                ⚠️ Members must have a user account to be assigned as leaders.
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                Only members of the selected cell group with user accounts can be assigned as leaders.
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!formErrors.role}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  label="Role"
                >
                  <MenuItem value="leader">Leader</MenuItem>
                  <MenuItem value="assistant">Assistant Leader</MenuItem>
                </Select>
                {formErrors.role && (
                  <Typography variant="caption" color="error">{formErrors.role}</Typography>
                )}
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleAssignLeader} 
            variant="contained" 
            sx={{ backgroundColor: '#1a237e' }}
            disabled={
              !formData.cell_id || 
              !formData.member_id || 
              (selectedMember && !hasUserAccount) ||
              !selectedMember // member not in cell
            }
          >
            Assign
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

export default CellLeaders;