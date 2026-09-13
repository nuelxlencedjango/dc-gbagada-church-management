import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, Snackbar, Alert, CircularProgress, Chip,
  Grid, Card, CardContent
} from '@mui/material';
import { Add, Edit, Delete, AccountBalance } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const getErrorMessage = (err) => {
  if (!err) return 'An unknown error occurred.';
  if (typeof err === 'string') return err;
  if (err.response && err.response.data) {
    const data = err.response.data;
    if (data.detail) {
      if (Array.isArray(data.detail)) {
        return data.detail.map(item => item.msg || JSON.stringify(item)).join('; ');
      }
      if (typeof data.detail === 'string') return data.detail;
      return JSON.stringify(data.detail);
    }
    if (data.message) return data.message;
    if (typeof data === 'string') return data;
  }
  return err.message || 'An error occurred';
};

const Budget = () => {
  const { token } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formData, setFormData] = useState({
    department_id: '',
    year: new Date().getFullYear(),
    month: '',
    allocated_amount: '',
    notes: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchBudgets();
    fetchDepartments();
  }, []);

  const fetchBudgets = async () => {
    try {
      const response = await axios.get('/api/budget/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBudgets(response.data);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/api/departments/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (budget = null) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData({
        department_id: budget.department_id || '',
        year: budget.year,
        month: budget.month || '',
        allocated_amount: budget.allocated_amount,
        notes: budget.notes || ''
      });
    } else {
      setEditingBudget(null);
      setFormData({
        department_id: '',
        year: new Date().getFullYear(),
        month: '',
        allocated_amount: '',
        notes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        department_id: formData.department_id !== '' ? parseInt(formData.department_id) : null,
        year: parseInt(formData.year),
        month: formData.month !== '' ? parseInt(formData.month) : null,
        allocated_amount: parseFloat(formData.allocated_amount),
        notes: formData.notes || null,
      };

      if (editingBudget) {
        await axios.put(`/api/budget/${editingBudget.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Budget updated successfully', 'success');
      } else {
        await axios.post('/api/budget/', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Budget created successfully', 'success');
      }
      setOpenDialog(false);
      fetchBudgets();
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await axios.delete(`/api/budget/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Budget deleted successfully', 'success');
        fetchBudgets();
      } catch (error) {
        showSnackbar(getErrorMessage(error), 'error');
      }
    }
  };

  const getTotalBudget = () => {
    return budgets.reduce((sum, b) => sum + b.allocated_amount, 0);
  };

  const getTotalSpent = () => {
    return budgets.reduce((sum, b) => sum + b.spent_amount, 0);
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
          Budget Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ backgroundColor: '#1a237e' }}
        >
          Add Budget
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="caption">
                Total Budget
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a237e' }}>
                ₦{getTotalBudget().toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="caption">
                Total Spent
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#c62828' }}>
                ₦{getTotalSpent().toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="caption">
                Remaining
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                ₦{(getTotalBudget() - getTotalSpent()).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Department</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Month</TableCell>
                <TableCell align="right">Allocated</TableCell>
                <TableCell align="right">Spent</TableCell>
                <TableCell align="right">Remaining</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {budgets.map((budget) => {
                const remaining = budget.allocated_amount - budget.spent_amount;
                const percentUsed = budget.allocated_amount > 0
                  ? (budget.spent_amount / budget.allocated_amount) * 100
                  : 0;
                return (
                  <TableRow key={budget.id} hover>
                    <TableCell>{budget.department_name || 'General'}</TableCell>
                    <TableCell>{budget.year}</TableCell>
                    <TableCell>{budget.month || 'Annual'}</TableCell>
                    <TableCell align="right">₦{budget.allocated_amount.toLocaleString()}</TableCell>
                    <TableCell align="right">₦{budget.spent_amount.toLocaleString()}</TableCell>
                    <TableCell align="right">₦{remaining.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${Math.round(percentUsed)}% Used`}
                        size="small"
                        color={percentUsed > 90 ? 'error' : percentUsed > 70 ? 'warning' : 'success'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => handleOpenDialog(budget)}>Edit</Button>
                      <Button size="small" color="error" onClick={() => handleDelete(budget.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingBudget ? 'Edit Budget' : 'Add Budget'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Department</InputLabel>
            <Select
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              label="Department"
            >
              <MenuItem value="">General</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Year"
            type="number"
            margin="normal"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
          />
          <TextField
            fullWidth
            label="Month (optional)"
            type="number"
            margin="normal"
            value={formData.month}
            onChange={(e) => setFormData({ ...formData, month: e.target.value })}
            placeholder="Leave blank for annual budget"
          />
          <TextField
            fullWidth
            label="Allocated Amount (₦)"
            type="number"
            margin="normal"
            value={formData.allocated_amount}
            onChange={(e) => setFormData({ ...formData, allocated_amount: e.target.value })}
            required
          />
          <TextField
            fullWidth
            label="Notes"
            margin="normal"
            multiline
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            {editingBudget ? 'Update' : 'Add'}
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

export default Budget;