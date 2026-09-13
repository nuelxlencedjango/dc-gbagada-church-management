import React, { useState, useRef } from 'react';
import {
  Container, Paper, Typography, Box, Avatar, Button,
  TextField, Grid, Chip, IconButton, Snackbar, Alert,
  CircularProgress, Divider
} from '@mui/material';
import { PhotoCamera, Save, Close, Edit } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import api from '../utils/api';

const MemberProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    address: user?.address || '',
    profile_picture_url: user?.profile_picture_url || ''
  });
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const fileInputRef = useRef(null);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = async () => {
    if (!imageFile) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('profile_picture', imageFile);

    try {
      const response = await api.post('/api/members/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile({ ...profile, profile_picture_url: response.data.url });
      setSnackbar({ open: true, message: 'Profile picture updated!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error uploading image', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/api/members/profile', profile);
      setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error updating profile', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          My Profile
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={4}>
          {/* Profile Picture */}
          <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <Avatar
                src={imagePreview || profile.profile_picture_url}
                sx={{
                  width: 200,
                  height: 200,
                  mb: 2,
                  border: '4px solid #1a237e'
                }}
              >
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </Avatar>
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: 20,
                  right: 0,
                  backgroundColor: '#1a237e',
                  color: 'white',
                  '&:hover': { backgroundColor: '#0d1442' }
                }}
                onClick={() => fileInputRef.current.click()}
              >
                <PhotoCamera />
              </IconButton>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleImageChange}
              />
            </Box>
            {imageFile && (
              <Button
                variant="contained"
                size="small"
                onClick={handleUploadImage}
                disabled={loading}
                sx={{ mt: 1 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Upload Photo'}
              </Button>
            )}
            <Chip
              label="Click camera icon to upload photo"
              size="small"
              sx={{ mt: 1, backgroundColor: '#e3f2fd' }}
            />
          </Grid>

          {/* Profile Info */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={profile.phone_number}
                  onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  multiline
                  rows={2}
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSave}
                  disabled={loading}
                  sx={{ backgroundColor: '#1a237e', '&:hover': { backgroundColor: '#0d1442' } }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                </Button>
              </Grid>
            </Grid>
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
      </Paper>
    </Container>
  );
};

export default MemberProfile;
