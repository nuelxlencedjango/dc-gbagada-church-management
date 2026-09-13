import React, { useState, useEffect } from 'react';
import {
  Container, TextField, Button, Typography, Box, Alert,
  Paper, Avatar, Divider, Link as MuiLink, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Church, Email, Lock } from '@mui/icons-material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8000/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expiredMessage, setExpiredMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  // Forgot-password dialog
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // The global axios response interceptor in AuthContext redirects
    // here with ?expired=1 whenever a 401 is hit anywhere in the app —
    // this was previously a silent redirect with no explanation at all.
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === '1') {
      setExpiredMessage('Your session expired. Please log in again.');
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgot = () => {
    setForgotEmail(email); // pre-fill with whatever they already typed, if anything
    setForgotMessage('');
    setForgotOpen(true);
  };

  const handleRequestReset = async () => {
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotMessage('');
    try {
      const res = await axios.post(`${API_URL}/auth/request-password-reset`, { email: forgotEmail });
      setForgotMessage(res.data.message || 'If your email is registered, you will receive a password reset link.');
    } catch (err) {
      // The backend deliberately returns the same generic message whether
      // or not the email exists, to avoid leaking which emails are
      // registered — so a genuine error here is rare, but handle it anyway.
      setForgotMessage('Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 2,
            backgroundColor: 'white'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                backgroundColor: '#1a237e',
                mx: 'auto',
                mb: 2
              }}
            >
              <Church sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Sign in to your Dominion City Gbagada account
            </Typography>
          </Box>

          {expiredMessage && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {expiredMessage}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              InputProps={{
                startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />

            <Box sx={{ textAlign: 'right', mt: 0.5 }}>
              <MuiLink
                component="button"
                type="button"
                variant="body2"
                onClick={handleOpenForgot}
                sx={{ color: '#1a237e' }}
              >
                Forgot password?
              </MuiLink>
            </Box>

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 2,
                mb: 2,
                backgroundColor: '#1a237e',
                '&:hover': { backgroundColor: '#0d1442' },
                py: 1.5
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </form>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2">
              Don't have an account?{' '}
              <MuiLink component={Link} to="/register" sx={{ color: '#1a237e', fontWeight: 600 }}>
                Register Now
              </MuiLink>
            </Typography>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="textSecondary">
              © {new Date().getFullYear()} Dominion City Gbagada. All rights reserved.
            </Typography>
          </Box>
        </Paper>
      </Container>

      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Your Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Enter your account email and we'll send you a link to reset your password.
          </Typography>
          {forgotMessage ? (
            <Alert severity="success">{forgotMessage}</Alert>
          ) : (
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              autoFocus
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotOpen(false)}>Close</Button>
          {!forgotMessage && (
            <Button
              onClick={handleRequestReset}
              variant="contained"
              disabled={forgotLoading || !forgotEmail}
              sx={{ backgroundColor: '#1a237e' }}
            >
              {forgotLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;