import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  CircularProgress, Divider, Chip, Avatar
} from '@mui/material';
import {
  Event, CalendarToday, CheckCircle, Pending, People,
  TrendingUp, TrendingDown, Assessment
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
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

const TrainingOverview = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/trainings/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      </Container>
    );
  }

  const statCards = [
    { label: 'Total Trainings', value: stats.total, icon: Event, color: '#1a237e' },
    { label: 'Upcoming', value: stats.upcoming, icon: CalendarToday, color: '#ff9800' },
    { label: 'Ongoing', value: stats.ongoing, icon: Pending, color: '#2196f3' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: '#4caf50' },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e' }}>
          Training Overview
        </Typography>
        <Chip
          label={`${stats.attendance_rate}% Attendance Rate`}
          color={stats.attendance_rate > 70 ? 'success' : 'warning'}
        />
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="caption">
                      {stat.label}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: stat.color }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Avatar sx={{ backgroundColor: stat.color, color: 'white' }}>
                    <stat.icon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Attendance Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Attendance Overview</Typography>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box>
                <Typography color="textSecondary" variant="caption">Registered</Typography>
                <Typography variant="h6">{stats.registered_count}</Typography>
              </Box>
              <Box>
                <Typography color="textSecondary" variant="caption">Attended</Typography>
                <Typography variant="h6">{stats.attendance_count}</Typography>
              </Box>
              <Box>
                <Typography color="textSecondary" variant="caption">Rate</Typography>
                <Typography variant="h6">{stats.attendance_rate}%</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Status Breakdown</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip label={`Scheduled: ${stats.upcoming}`} color="info" />
              <Chip label={`Ongoing: ${stats.ongoing}`} color="warning" />
              <Chip label={`Completed: ${stats.completed}`} color="success" />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Monthly Trends Chart */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Monthly Training Trends (Last 6 Months)</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.monthly_trends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#1a237e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Container>
  );
};

export default TrainingOverview;