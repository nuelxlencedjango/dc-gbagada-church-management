import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Snackbar, Alert,
  CircularProgress, Tabs, Tab, Avatar, Divider, Tooltip
} from '@mui/material';
import {
  Receipt, MoneyOff, TrendingUp, TrendingDown,
  CheckCircle, Cancel, Pending, Add, Visibility,
  CreditCard, Payments, AccountBalance, FilterList, Download, Clear
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const getErrorMessage = (err) => {
  if (!err) return 'An unknown error occurred.';
  if (typeof err === 'string') return err;

  if (err.response && err.response.data) {
    const data = err.response.data;
    if (data.detail) {
      if (Array.isArray(data.detail)) {
        return data.detail
          .map((item) => {
            if (item.msg) return item.msg;
            if (typeof item === 'string') return item;
            return JSON.stringify(item);
          })
          .join('; ');
      }
      if (typeof data.detail === 'string') return data.detail;
      try {
        return JSON.stringify(data.detail);
      } catch {
        return 'An error occurred with the request.';
      }
    }
    if (data.message) {
      if (typeof data.message === 'string') return data.message;
      try {
        return JSON.stringify(data.message);
      } catch {
        return 'An error occurred.';
      }
    }
    if (Array.isArray(data)) {
      return data
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item.msg) return item.msg;
          return JSON.stringify(item);
        })
        .join('; ');
    }
    try {
      return JSON.stringify(data);
    } catch {
      return 'An error occurred while processing the request.';
    }
  }

  if (err.message) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return 'An unknown error occurred.';
  }
};

const FULL_ADMIN_ROLES = ['admin', 'pastor', 'overall_pastor', 'super_admin'];

const INCOME_TYPES = ['offering', 'tithe', 'first_fruits', 'gift', 'donation'];

const CATEGORY_LABELS = {
  offering: 'Offering',
  tithe: 'Tithe',
  first_fruits: 'First Fruits',
  gift: 'Gift',
  donation: 'Donation',
  expense: 'Expense',
};

const CATEGORY_COLORS = {
  offering: '#4caf50',
  tithe: '#2196f3',
  first_fruits: '#9c27b0',
  gift: '#ff9800',
  donation: '#e91e63',
  expense: '#f44336',
};

const Finance = () => {
  const { token, user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expenses: 0,
    balance: 0,
    by_category: {},
    pending_income: 0,
    pending_expenses: 0
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    transaction_type: 'offering',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    service_type: '',
    payment_method: '',
    reference_number: '',
    verified_by: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    transaction_type: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({
    start_date: '',
    end_date: '',
    transaction_type: ''
  });

  useEffect(() => {
    fetchData(appliedFilters);
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  const buildParams = (f) => {
    const params = {};
    if (f.start_date) params.start_date = new Date(f.start_date).toISOString();
    if (f.end_date) {
      const end = new Date(f.end_date);
      end.setHours(23, 59, 59, 999);
      params.end_date = end.toISOString();
    }
    if (f.transaction_type) params.transaction_type = f.transaction_type;
    return params;
  };

  const fetchData = async (f) => {
    setLoading(true);
    try {
      const params = buildParams(f);
      const [transactionsRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/finance/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        }),
        axios.get(`${API_URL}/finance/summary`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { start_date: params.start_date, end_date: params.end_date }
        })
      ]);
      setTransactions(transactionsRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching finance data:', error);
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get(`${API_URL}/users/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let usersData = response.data;
      if (!Array.isArray(usersData)) {
        if (usersData && usersData.data && Array.isArray(usersData.data)) {
          usersData = usersData.data;
        } else {
          usersData = [];
        }
      }
      const activeUsers = usersData.filter((u) => u.is_active !== false);
      setUsers(activeUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (user) {
        setUsers([user]);
      } else {
        setUsers([]);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const handleClearFilters = () => {
    const cleared = { start_date: '', end_date: '', transaction_type: '' };
    setFilters(cleared);
    setAppliedFilters(cleared);
  };

  const hasActiveFilters = appliedFilters.start_date || appliedFilters.end_date || appliedFilters.transaction_type;

  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) {
      showSnackbar('Nothing to export for the current filters', 'error');
      return;
    }
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Recorded By', 'Verifier', 'Confirmed/Approved By', 'Status'];
    const rows = filteredTransactions.map((t) => [
      new Date(t.date).toLocaleDateString(),
      t.transaction_type,
      (t.description || '').replace(/,/g, ';'),
      t.amount,
      t.recorded_by_name || '',
      t.verified_by_name || '',
      t.confirmed_by_name || t.approved_by_name || '',
      t.status,
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `finance_report_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setFormErrors({});
    setFormData({
      transaction_type: 'offering',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      service_type: '',
      payment_method: '',
      reference_number: '',
      verified_by: '',
    });
    fetchUsers();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormErrors({});
  };

  const handleSubmit = async () => {
    const errors = {};
    if (!formData.verified_by) errors.verified_by = 'Verified By is required';
    if (!formData.amount) errors.amount = 'Amount is required';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      const payload = {
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: new Date(formData.date).toISOString(),
        payment_method: formData.payment_method,
        ...(formData.reference_number && { reference_number: formData.reference_number }),
        verified_by_id: parseInt(formData.verified_by),
        ...(formData.service_type && { service_type: formData.service_type }),
      };

      await axios.post(`${API_URL}/finance/transactions`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Transaction recorded successfully', 'success');
      handleCloseDialog();
      fetchData(appliedFilters);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleConfirm = async (transactionId) => {
    try {
      await axios.post(`${API_URL}/finance/transactions/${transactionId}/confirm`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Transaction confirmed successfully', 'success');
      fetchData(appliedFilters);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleApprove = async (transactionId) => {
    try {
      await axios.post(`${API_URL}/finance/transactions/${transactionId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Expense approved successfully', 'success');
      fetchData(appliedFilters);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const getStatusChip = (status) => {
    const statusMap = {
      pending: { label: 'Pending', color: '#ff9800', icon: <Pending /> },
      confirmed: { label: 'Confirmed', color: '#4caf50', icon: <CheckCircle /> },
      approved: { label: 'Approved', color: '#2196f3', icon: <CheckCircle /> },
      rejected: { label: 'Rejected', color: '#f44336', icon: <Cancel /> },
      disbursed: { label: 'Disbursed', color: '#607d8b', icon: <CheckCircle /> }
    };
    const info = statusMap[status] || statusMap.pending;
    return (
      <Chip
        label={info.label}
        size="small"
        icon={info.icon}
        sx={{ backgroundColor: info.color, color: 'white' }}
      />
    );
  };

  const getTransactionTypeChip = (type) => {
    const typeMap = {
      offering: { label: 'Offering', color: '#4caf50' },
      tithe: { label: 'Tithe', color: '#2196f3' },
      first_fruits: { label: 'First Fruits', color: '#9c27b0' },
      gift: { label: 'Gift', color: '#ff9800' },
      donation: { label: 'Donation', color: '#e91e63' },
      expense: { label: 'Expense', color: '#f44336' },
      request: { label: 'Fund Request', color: '#607d8b' }
    };
    const info = typeMap[type] || { label: type, color: '#9e9e9e' };
    return (
      <Chip
        label={info.label}
        size="small"
        sx={{ backgroundColor: info.color, color: 'white' }}
      />
    );
  };

  const filteredTransactions = transactions.filter(t => {
    if (tabValue === 0) return true;
    // Fund requests (TransactionType.REQUEST) belong in neither Income
    // nor Expenses — they were previously bucketed into Income just
    // because they aren't literally "expense", which was wrong.
    if (tabValue === 1) return INCOME_TYPES.includes(t.transaction_type);
    if (tabValue === 2) return t.transaction_type === 'expense';
    return true;
  });

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
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Finance
        </Typography>
        {FULL_ADMIN_ROLES.includes(user?.role) && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenDialog}
            sx={{ backgroundColor: '#1a237e', '&:hover': { backgroundColor: '#0d1442' } }}
          >
            Record Transaction
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FilterList sx={{ color: '#1a237e' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Report Filters</Typography>
        </Box>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="From"
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="To"
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.transaction_type}
                onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })}
                label="Category"
              >
                <MenuItem value="">All Categories</MenuItem>
                <MenuItem value="offering">Offering</MenuItem>
                <MenuItem value="tithe">Tithe</MenuItem>
                <MenuItem value="first_fruits">First Fruits</MenuItem>
                <MenuItem value="gift">Gift</MenuItem>
                <MenuItem value="donation">Donation</MenuItem>
                <MenuItem value="expense">Expense</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" size="small" onClick={handleApplyFilters} sx={{ backgroundColor: '#1a237e' }}>
                Apply
              </Button>
              {hasActiveFilters && (
                <Button variant="outlined" size="small" startIcon={<Clear />} onClick={handleClearFilters}>
                  Clear
                </Button>
              )}
              <Button variant="outlined" size="small" startIcon={<Download />} onClick={handleExportCsv}>
                Export
              </Button>
            </Box>
          </Grid>
        </Grid>
        {hasActiveFilters && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" color="textSecondary">
              Showing: {appliedFilters.start_date || 'the beginning'} to {appliedFilters.end_date || 'now'}
              {appliedFilters.transaction_type && ` · ${CATEGORY_LABELS[appliedFilters.transaction_type]} only`}
            </Typography>
          </Box>
        )}
      </Paper>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="caption">
                    Total Income
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                    ₦{(summary.total_income || 0).toLocaleString()}
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32', width: 56, height: 56 }}>
                  <TrendingUp />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="caption">
                    Total Expenses
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#c62828' }}>
                    ₦{(summary.total_expenses || 0).toLocaleString()}
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#ffebee', color: '#c62828', width: 56, height: 56 }}>
                  <TrendingDown />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="caption">
                    Balance
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a237e' }}>
                    ₦{(summary.balance || 0).toLocaleString()}
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#e3f2fd', color: '#1a237e', width: 56, height: 56 }}>
                  <AccountBalance />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {summary.by_category && Object.keys(summary.by_category).length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
            Breakdown by Category {hasActiveFilters ? '(for selected range)' : '(all time)'}
          </Typography>
          {((summary.pending_income || 0) > 0 || (summary.pending_expenses || 0) > 0) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {summary.pending_income > 0 && `₦${summary.pending_income.toLocaleString()} in income`}
              {summary.pending_income > 0 && summary.pending_expenses > 0 && ' and '}
              {summary.pending_expenses > 0 && `₦${summary.pending_expenses.toLocaleString()} in expenses`}
              {' '}still awaiting confirmation/approval — not counted in the totals below until then.
            </Alert>
          )}
          <Grid container spacing={1.5}>
            {Object.entries(summary.by_category).map(([category, amount]) => (
              <Grid item xs={6} sm={4} md={2} key={category}>
                <Box sx={{
                  p: 1.5, borderRadius: 2, border: '1px solid #e0e0e0',
                  borderLeft: `4px solid ${CATEGORY_COLORS[category] || '#9e9e9e'}`
                }}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    {CATEGORY_LABELS[category] || category}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    ₦{amount.toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="All Transactions" />
          <Tab label="Income" />
          <Tab label="Expenses" />
        </Tabs>

        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Recorded By</TableCell>
                <TableCell>Assigned Verifier</TableCell>
                <TableCell>Confirmed By</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions.map((transaction) => {
                const isOwnTransaction = user?.id === transaction.recorded_by_id;
                const isPending = transaction.status === 'pending';
                const isIncome = transaction.transaction_type !== 'expense';
                const isConfirmed = transaction.status === 'confirmed';
                const isApproved = transaction.status === 'approved';

                return (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {getTransactionTypeChip(transaction.transaction_type)}
                    </TableCell>
                    <TableCell>{transaction.description || 'N/A'}</TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: transaction.transaction_type === 'expense' ? '#c62828' : '#2e7d32'
                        }}
                      >
                        {transaction.transaction_type === 'expense' ? '-' : '+'}
                        ₦{transaction.amount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {transaction.recorded_by_name || (transaction.recorded_by_id ? `User ${transaction.recorded_by_id}` : '—')}
                    </TableCell>
                    <TableCell>
                      {transaction.verified_by_name || '—'}
                    </TableCell>
                    <TableCell>
                      {transaction.confirmed_by_name || transaction.approved_by_name || '—'}
                    </TableCell>
                    <TableCell>{getStatusChip(transaction.status)}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {isPending && isIncome && (
                          <Tooltip title={isOwnTransaction ? 'You cannot confirm your own transaction' : 'Confirm Transaction'}>
                            <span>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleConfirm(transaction.id)}
                                disabled={isOwnTransaction}
                              >
                                <CheckCircle />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        {isPending && !isIncome && (
                          <Tooltip title={isOwnTransaction ? 'You cannot approve your own expense' : 'Approve Expense'}>
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleApprove(transaction.id)}
                                disabled={isOwnTransaction}
                              >
                                <CheckCircle />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        {(isConfirmed || isApproved) && (
                          <Tooltip title="Already confirmed/approved">
                            <span>
                              <IconButton size="small" disabled>
                                <CheckCircle sx={{ color: '#bdbdbd' }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        <IconButton size="small" title="View Details">
                          <Visibility />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {filteredTransactions.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            No transactions match the current filters.
          </Box>
        )}
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Record Transaction
          </Typography>
          <Typography variant="caption" color="textSecondary">
            This will be recorded under your name. A different admin must confirm it.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Recorded By"
            margin="normal"
            value={`${user?.full_name || user?.name || 'You'} (${user?.role || 'admin'})`}
            disabled
            InputProps={{ readOnly: true }}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Transaction Type</InputLabel>
            <Select
              value={formData.transaction_type}
              onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
              label="Transaction Type"
            >
              <MenuItem value="offering">Offering</MenuItem>
              <MenuItem value="tithe">Tithe</MenuItem>
              <MenuItem value="first_fruits">First Fruits</MenuItem>
              <MenuItem value="gift">Gift</MenuItem>
              <MenuItem value="donation">Donation</MenuItem>
              <MenuItem value="expense">Expense</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Amount"
            type="number"
            margin="normal"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            error={!!formErrors.amount}
            helperText={formErrors.amount}
          />
          <TextField
            fullWidth
            label="Description"
            margin="normal"
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <TextField
            fullWidth
            label="Date"
            type="date"
            margin="normal"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Payment Method"
            margin="normal"
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
            placeholder="e.g., Cash, Bank Transfer, Card"
          />
          <TextField
            fullWidth
            label="Reference Number"
            margin="normal"
            value={formData.reference_number}
            onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
            placeholder="Optional – leave blank for auto-generation"
          />

          <FormControl fullWidth margin="normal" error={!!formErrors.verified_by}>
            <InputLabel>Verified By *</InputLabel>
            <Select
              value={formData.verified_by}
              onChange={(e) => {
                setFormData({ ...formData, verified_by: e.target.value });
                setFormErrors({ ...formErrors, verified_by: '' });
              }}
              label="Verified By *"
              required
              disabled={loadingUsers}
            >
              <MenuItem value="">Select verifier</MenuItem>
              {users.length === 0 && !loadingUsers && <MenuItem disabled>No users found</MenuItem>}
              {users
                .filter((u) => u.id !== user?.id)
                .map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.full_name || u.name || 'Unnamed User'} ({u.role || 'member'})
                  </MenuItem>
                ))}
            </Select>
            {loadingUsers && (
              <Typography variant="caption" color="textSecondary">
                Loading users...
              </Typography>
            )}
            {formErrors.verified_by && (
              <Typography variant="caption" color="error">{formErrors.verified_by}</Typography>
            )}
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{ backgroundColor: '#1a237e', '&:hover': { backgroundColor: '#0d1442' } }}
          >
            Record Transaction
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

export default Finance;