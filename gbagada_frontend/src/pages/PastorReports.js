import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  Avatar, Chip, CircularProgress
} from '@mui/material';
import { People, CheckCircle, Cancel, LocationOff } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const PastorReports = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/pastors/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching pastor stats:', error);
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

  if (!stats) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="error">Could not load pastor reports.</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e', mb: 3 }}>
        Pastor Reports
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography color="textSecondary" variant="caption">Total Pastors</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a237e' }}>{stats.total}</Typography>
              </Box>
              <Avatar sx={{ backgroundColor: '#e3f2fd', color: '#1565c0' }}><People /></Avatar>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography color="textSecondary" variant="caption">Active</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#2e7d32' }}>{stats.active}</Typography>
              </Box>
              <Avatar sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}><CheckCircle /></Avatar>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography color="textSecondary" variant="caption">Inactive</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#c62828' }}>{stats.inactive}</Typography>
              </Box>
              <Avatar sx={{ backgroundColor: '#ffebee', color: '#c62828' }}><Cancel /></Avatar>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography color="textSecondary" variant="caption">Unassigned</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#ef6c00' }}>{stats.unassigned}</Typography>
              </Box>
              <Avatar sx={{ backgroundColor: '#fff3e0', color: '#ef6c00' }}><LocationOff /></Avatar>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>By Satellite (active pastors)</Typography>
        {Object.keys(stats.by_satellite).length === 0 ? (
          <Typography variant="body2" color="textSecondary">No active pastors are assigned to a satellite yet.</Typography>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(stats.by_satellite).map(([name, count]) => (
              <Chip key={name} label={`${name}: ${count}`} size="small" />
            ))}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default PastorReports;