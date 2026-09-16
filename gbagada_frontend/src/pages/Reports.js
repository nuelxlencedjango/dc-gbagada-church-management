import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  Button, Chip, Divider, MenuItem, TextField,
  CircularProgress, Avatar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
  Alert, Snackbar, useTheme, useMediaQuery
} from '@mui/material';
import {
  FileDownload, Print, People, Business,
  AttachMoney, TrendingUp, TrendingDown,
  Refresh, Groups, AccountBalance,
  CheckCircle, Cancel
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const Reports = () => {
  const { token } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('members');
  const [dateRange, setDateRange] = useState('this-month');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [membersData, setMembersData] = useState([]);
  const [departmentsData, setDepartmentsData] = useState([]);
  const [cellsData, setCellsData] = useState([]);
  const [financeData, setFinanceData] = useState([]);
  const [memberGrowthData, setMemberGrowthData] = useState([]);
  const [offeringData, setOfferingData] = useState([]);
  const [summary, setSummary] = useState({
    totalMembers: 0,
    totalDepartments: 0,
    totalCells: 0,
    totalOfferings: 0,
    totalExpenses: 0,
    activeMembers: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        membersRes,
        departmentsRes,
        cellsRes,
        financeRes,
        growthRes,
        offeringsRes,
        statsRes
      ] = await Promise.all([
        axios.get(`${API_URL}/members/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/departments/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/cells/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/finance/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/dashboard/member-growth`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/dashboard/offering-trends`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setMembersData(membersRes.data || []);
      setDepartmentsData(departmentsRes.data || []);
      setCellsData(cellsRes.data || []);
      setFinanceData(financeRes.data || []);
      setMemberGrowthData(growthRes.data || []);
      setOfferingData(offeringsRes.data || []);
      
      if (statsRes.data) {
        setSummary({
          totalMembers: statsRes.data.totalMembers || 0,
          totalDepartments: departmentsRes.data?.length || 0,
          totalCells: cellsRes.data?.length || 0,
          totalOfferings: statsRes.data.totalOfferings || 0,
          totalExpenses: statsRes.data.totalExpenses || 0,
          activeMembers: statsRes.data.activeMembers || 0
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error loading report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const title = reportTypes.find(r => r.id === reportType)?.label || 'Report';
      
      doc.setFontSize(18);
      doc.text(`${title} - Dominion City Gbagada`, 14, 20);
      doc.setFontSize(11);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      
      doc.setFontSize(12);
      doc.text('Summary', 14, 45);
      doc.setFontSize(10);
      doc.text(`Total Members: ${summary.totalMembers}`, 14, 55);
      doc.text(`Active Members: ${summary.activeMembers}`, 14, 62);
      doc.text(`Departments: ${summary.totalDepartments}`, 14, 69);
      doc.text(`Cells: ${summary.totalCells}`, 14, 76);
      doc.text(`Total Offerings: ₦${summary.totalOfferings.toLocaleString()}`, 14, 83);
      doc.text(`Total Expenses: ₦${summary.totalExpenses.toLocaleString()}`, 14, 90);
      
      doc.save(`${title.toLowerCase().replace(/\s/g, '_')}_report.pdf`);
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('PDF export error:', error);
      showSnackbar('Error exporting PDF', 'error');
    }
  };

  const handleExportExcel = () => {
    try {
      let exportData = [];
      if (reportType === 'members') {
        exportData = membersData.map(m => ({
          Name: `${m.first_name} ${m.last_name}`,
          Email: m.email,
          Phone: m.phone_number,
          Department: m.department_name || 'Not assigned',
          Cell: m.cell_name || 'Not assigned',
          Status: m.membership_status || 'Active'
        }));
      } else if (reportType === 'departments') {
        exportData = departmentsData.map(d => ({
          Department: d.name,
          Description: d.description || 'N/A',
          Members: d.member_count || 0,
          HOD: d.hod_name || 'Not assigned'
        }));
      } else if (reportType === 'finance') {
        exportData = financeData.map(f => ({
          Date: new Date(f.date).toLocaleDateString(),
          Type: f.transaction_type,
          Amount: f.amount,
          Description: f.description || 'N/A',
          Status: f.status || 'Completed'
        }));
      }
      
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      XLSX.writeFile(wb, `${reportType}_report.xlsx`);
      showSnackbar('Excel downloaded successfully', 'success');
    } catch (error) {
      console.error('Excel export error:', error);
      showSnackbar('Error exporting Excel', 'error');
    }
  };

  const reportTypes = [
    { id: 'members', label: 'Members Report', icon: <People /> },
    { id: 'departments', label: 'Departments Report', icon: <Business /> },
    { id: 'cells', label: 'Cells Report', icon: <Groups /> },
    { id: 'finance', label: 'Financial Report', icon: <AttachMoney /> },
    { id: 'growth', label: 'Growth Report', icon: <TrendingUp /> },
  ];

  const getReportContent = () => {
    switch (reportType) {
      case 'members':
        return (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size={isMobile ? 'small' : 'medium'}>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  {!isMobile && <TableCell>Phone</TableCell>}
                  <TableCell>Department</TableCell>
                  {!isMobile && <TableCell>Cell</TableCell>}
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {membersData.map((member) => (
                  <TableRow key={member.id} hover>
                    <TableCell>{member.first_name} {member.last_name}</TableCell>
                    <TableCell sx={{ maxWidth: isMobile ? 100 : 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {member.email}
                    </TableCell>
                    {!isMobile && <TableCell>{member.phone_number}</TableCell>}
                    <TableCell>
                      <Chip
                        label={member.department_name || 'Not assigned'}
                        size="small"
                        sx={{
                          backgroundColor: member.department_name ? '#e8f5e9' : '#ffebee',
                          color: member.department_name ? '#2e7d32' : '#c62828'
                        }}
                      />
                    </TableCell>
                    {!isMobile && <TableCell>{member.cell_name || 'Not assigned'}</TableCell>}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
      case 'departments':
        return (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size={isMobile ? 'small' : 'medium'}>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Department</TableCell>
                  {!isMobile && <TableCell>Description</TableCell>}
                  <TableCell>Members</TableCell>
                  <TableCell>HOD</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {departmentsData.map((dept) => (
                  <TableRow key={dept.id} hover>
                    <TableCell>{dept.name}</TableCell>
                    {!isMobile && <TableCell>{dept.description || 'N/A'}</TableCell>}
                    <TableCell>{dept.member_count || 0}</TableCell>
                    <TableCell>
                      {dept.hod_name ? (
                        <Chip
                          icon={<CheckCircle sx={{ fontSize: 16 }} />}
                          label={dept.hod_name}
                          size="small"
                          sx={{ 
                            backgroundColor: '#e8f5e9', 
                            color: '#2e7d32',
                            fontWeight: 600,
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
                            '& .MuiChip-icon': { color: '#c62828' }
                          }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
      case 'cells':
        return (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size={isMobile ? 'small' : 'medium'}>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Cell Group</TableCell>
                  {!isMobile && <TableCell>Description</TableCell>}
                  <TableCell>Members</TableCell>
                  {!isMobile && <TableCell>Leader</TableCell>}
                  <TableCell>Meeting Day</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cellsData.map((cell) => (
                  <TableRow key={cell.id} hover>
                    <TableCell>{cell.name}</TableCell>
                    {!isMobile && <TableCell>{cell.description || 'N/A'}</TableCell>}
                    <TableCell>{cell.member_count || 0}</TableCell>
                    {!isMobile && <TableCell>{cell.leader_name || 'Not assigned'}</TableCell>}
                    <TableCell>{cell.meeting_day || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
      case 'finance':
        return (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size={isMobile ? 'small' : 'medium'}>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  {!isMobile && <TableCell>Description</TableCell>}
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {financeData.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.transaction_type}
                        size="small"
                        sx={{
                          backgroundColor: transaction.transaction_type === 'expense' ? '#ffebee' : '#e8f5e9',
                          color: transaction.transaction_type === 'expense' ? '#c62828' : '#2e7d32'
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          color: transaction.transaction_type === 'expense' ? '#c62828' : '#2e7d32',
                          fontWeight: 600
                        }}
                      >
                        {transaction.transaction_type === 'expense' ? '-' : '+'}
                        ₦{transaction.amount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    {!isMobile && <TableCell>{transaction.description || 'N/A'}</TableCell>}
                    <TableCell>
                      <Chip
                        label={transaction.status || 'Completed'}
                        size="small"
                        sx={{
                          backgroundColor: transaction.status === 'pending' ? '#fff3e0' : '#e8f5e9',
                          color: transaction.status === 'pending' ? '#e65100' : '#2e7d32'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
      case 'growth':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Member Growth</Typography>
                <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                  <LineChart data={memberGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="members" stroke="#1a237e" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Offering Trends</Typography>
                <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                  <BarChart data={offeringData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="offerings" fill="#1a237e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        );
      default:
        return <Typography>Select a report type</Typography>;
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e', fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
            Reports
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Generate and view church reports with real-time data
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchAllData}
            size={isMobile ? 'small' : 'medium'}
            sx={{ borderColor: '#1a237e', color: '#1a237e' }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={handleExportPDF}
            size={isMobile ? 'small' : 'medium'}
            sx={{ borderColor: '#1a237e', color: '#1a237e' }}
          >
            {isMobile ? 'PDF' : 'Export PDF'}
          </Button>
          <Button
            variant="contained"
            startIcon={<FileDownload />}
            onClick={handleExportExcel}
            size={isMobile ? 'small' : 'medium'}
            sx={{ backgroundColor: '#1a237e', '&:hover': { backgroundColor: '#0d1442' } }}
          >
            {isMobile ? 'Excel' : 'Export Excel'}
          </Button>
        </Box>
      </Box>

      {/* Summary Cards - Responsive */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#e3f2fd', height: '100%' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="#1a237e" variant="caption" sx={{ fontWeight: 600, fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                    Total Members
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a237e', fontSize: { xs: '1.2rem', sm: '1.5rem', md: '2rem' } }}>
                    {summary.totalMembers}
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#1a237e', color: 'white', width: { xs: 32, sm: 40, md: 56 }, height: { xs: 32, sm: 40, md: 56 } }}>
                  <People sx={{ fontSize: { xs: 16, sm: 20, md: 28 } }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#e8f5e9', height: '100%' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="#2e7d32" variant="caption" sx={{ fontWeight: 600, fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                    Departments
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#2e7d32', fontSize: { xs: '1.2rem', sm: '1.5rem', md: '2rem' } }}>
                    {summary.totalDepartments}
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#2e7d32', color: 'white', width: { xs: 32, sm: 40, md: 56 }, height: { xs: 32, sm: 40, md: 56 } }}>
                  <Business sx={{ fontSize: { xs: 16, sm: 20, md: 28 } }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#fff3e0', height: '100%' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="#e65100" variant="caption" sx={{ fontWeight: 600, fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                    Cell Groups
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#e65100', fontSize: { xs: '1.2rem', sm: '1.5rem', md: '2rem' } }}>
                    {summary.totalCells}
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#e65100', color: 'white', width: { xs: 32, sm: 40, md: 56 }, height: { xs: 32, sm: 40, md: 56 } }}>
                  <Groups sx={{ fontSize: { xs: 16, sm: 20, md: 28 } }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#ffebee', height: '100%' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="#c62828" variant="caption" sx={{ fontWeight: 600, fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                    Balance
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#c62828', fontSize: { xs: '1rem', sm: '1.2rem', md: '1.5rem' } }}>
                    ₦{(summary.totalOfferings - summary.totalExpenses).toLocaleString()}
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#c62828', color: 'white', width: { xs: 32, sm: 40, md: 56 }, height: { xs: 32, sm: 40, md: 56 } }}>
                  <AccountBalance sx={{ fontSize: { xs: 16, sm: 20, md: 28 } }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Report Type Selection and Content */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Report Type
            </Typography>
            {reportTypes.map((type) => (
              <Button
                key={type.id}
                fullWidth
                variant={reportType === type.id ? 'contained' : 'text'}
                startIcon={type.icon}
                onClick={() => setReportType(type.id)}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  justifyContent: 'flex-start',
                  mb: 1,
                  backgroundColor: reportType === type.id ? '#1a237e' : 'transparent',
                  color: reportType === type.id ? 'white' : '#333',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  '&:hover': {
                    backgroundColor: reportType === type.id ? '#0d1442' : '#f5f5f5'
                  }
                }}
              >
                {type.label}
              </Button>
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12} md={9}>
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {reportTypes.find(r => r.id === reportType)?.label || 'Reports'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  label="Period"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 150 } }}
                >
                  <MenuItem value="this-month">This Month</MenuItem>
                  <MenuItem value="last-month">Last Month</MenuItem>
                  <MenuItem value="this-quarter">This Quarter</MenuItem>
                  <MenuItem value="this-year">This Year</MenuItem>
                </TextField>
                <Chip 
                  label={`${reportTypes.find(r => r.id === reportType)?.label || 'Report'}`}
                  size="small"
                  sx={{ backgroundColor: '#e3f2fd', color: '#1a237e' }}
                />
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {getReportContent()}
          </Paper>
        </Grid>
      </Grid>

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

export default Reports;