import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}
    >
      <CircularProgress size={60} sx={{ color: '#1a237e' }} />
      <Typography variant="h6" sx={{ mt: 2, color: '#1a237e' }}>
        {message}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>
        Dominion City Gbagada
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;
