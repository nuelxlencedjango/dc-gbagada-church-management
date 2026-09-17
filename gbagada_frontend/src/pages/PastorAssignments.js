import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Chip, Avatar,
  List, ListItem, ListItemAvatar, ListItemText, CircularProgress
} from '@mui/material';
import { Church, PersonOff } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const PastorAssignments = () => {
  const { token } = useAuth();
  const [pastors, setPastors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPastors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPastors = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/pastors/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPastors(res.data);
    } catch (error) {
      console.error('Error fetching pastors:', error);
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

  // Group by satellite name, with an "Unassigned" bucket
  const groups = {};
  pastors.forEach((p) => {
    const key = p.assigned_satellite_name || 'Unassigned';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  const assignedGroups = Object.entries(groups).filter(([key]) => key !== 'Unassigned');
  const unassigned = groups['Unassigned'] || [];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e', mb: 3 }}>
        Pastor Assignments
      </Typography>

      <Grid container spacing={3}>
        {assignedGroups.map(([satelliteName, groupPastors]) => (
          <Grid item xs={12} md={6} key={satelliteName}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Church sx={{ color: '#1a237e' }} />
                <Typography variant="h6">{satelliteName}</Typography>
                <Chip label={groupPastors.length} size="small" />
              </Box>
              <List dense>
                {groupPastors.map((p) => (
                  <ListItem key={p.id}>
                    <ListItemAvatar>
                      <Avatar sx={{ backgroundColor: '#e3f2fd', color: '#1565c0' }}>
                        {p.first_name?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${p.first_name} ${p.last_name}`}
                      secondary={p.email}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        ))}

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PersonOff sx={{ color: '#9e9e9e' }} />
              <Typography variant="h6">Not Assigned to Any Satellite</Typography>
              <Chip label={unassigned.length} size="small" />
            </Box>
            {unassigned.length === 0 ? (
              <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                Every active pastor is assigned somewhere.
              </Typography>
            ) : (
              <List dense>
                {unassigned.map((p) => (
                  <ListItem key={p.id}>
                    <ListItemAvatar>
                      <Avatar sx={{ backgroundColor: '#f5f5f5', color: '#9e9e9e' }}>
                        {p.first_name?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${p.first_name} ${p.last_name}`}
                      secondary={p.email}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {pastors.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 3 }}>
          <Typography color="textSecondary">No active pastors found.</Typography>
        </Paper>
      )}
    </Container>
  );
};

export default PastorAssignments;