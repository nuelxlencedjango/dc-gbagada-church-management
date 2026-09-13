import React, { useState, useEffect } from 'react';
import {
  Container, TextField, Button, Typography, Box, Alert,
  Paper, Avatar, Stepper, Step, StepLabel, Divider,
  Link as MuiLink, Grid, Chip, IconButton, CircularProgress,
  MenuItem, FormControl, InputLabel, Select
} from '@mui/material';
import { PersonAdd, PhotoCamera } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const Register = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [cells, setCells] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    date_of_birth: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    department_id: '',
    cell_id: '',
    is_first_timer: false
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const steps = ['Personal Information', 'Church Details', 'Emergency Contact'];

  useEffect(() => {
    fetchPublicData();
  }, []);

  const fetchPublicData = async () => {
    try {
      const [deptRes, cellRes] = await Promise.all([
        axios.get(`${API_URL}/public/departments`),
        axios.get(`${API_URL}/public/cells`)
      ]);
      setDepartments(deptRes.data);
      setCells(cellRes.data);
    } catch (error) {
      console.error('Error fetching public data:', error);
      // Demo data
      setDepartments([
        { id: 1, name: 'Ushering' },
        { id: 2, name: 'Media' },
        { id: 3, name: 'Children' },
        { id: 4, name: 'Prayer' },
        { id: 5, name: 'Worship' }
      ]);
      setCells([
        { id: 1, name: 'Winners Cell' },
        { id: 2, name: 'Faith Builders' },
        { id: 3, name: 'Youth Impact' },
        { id: 4, name: 'Prayer Warriors' }
      ]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.first_name) newErrors.first_name = 'First name is required';
    if (!formData.last_name) newErrors.last_name = 'Last name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.phone_number) newErrors.phone_number = 'Phone number is required';
    if (!formData.address) newErrors.address = 'Address is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!formData.emergency_contact_name) {
      newErrors.emergency_contact_name = 'Emergency contact name is required';
    }
    if (!formData.emergency_contact_phone) {
      newErrors.emergency_contact_phone = 'Emergency contact phone is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    let isValid = false;
    if (activeStep === 0) isValid = validateStep1();
    else if (activeStep === 1) isValid = validateStep2();
    else if (activeStep === 2) isValid = validateStep3();

    if (isValid) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      // Register the member with department and cell
      const response = await axios.post(`${API_URL}/members/register`, {
        ...formData,
        create_account: false
      });
      
      const memberId = response.data.member_id;
      
      // Upload profile image if exists
      if (profileImage && memberId) {
        const formDataImg = new FormData();
        formDataImg.append('file', profileImage);
        formDataImg.append('member_id', memberId);
        
        await axios.post(`${API_URL}/members/upload-photo`, formDataImg, {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        });
      }
      
      setSuccess('Registration successful! Welcome to Dominion City Gbagada! 🎉');
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  src={imagePreview}
                  sx={{
                    width: 120,
                    height: 120,
                    mb: 2,
                    border: '4px solid #1a237e',
                    bgcolor: '#e3f2fd'
                  }}
                >
                  {!imagePreview && <PersonAdd sx={{ fontSize: 60, color: '#1a237e' }} />}
                </Avatar>
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 10,
                    right: 0,
                    backgroundColor: '#1a237e',
                    color: 'white',
                    '&:hover': { backgroundColor: '#0d1442' }
                  }}
                  component="label"
                >
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <PhotoCamera />
                </IconButton>
              </Box>
              <Typography variant="caption" color="textSecondary" display="block">
                Click the camera icon to upload your profile picture
              </Typography>
              {profileImage && (
                <Chip
                  label="Photo selected"
                  size="small"
                  sx={{ mt: 1, backgroundColor: '#e8f5e9', color: '#2e7d32' }}
                />
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                error={!!errors.first_name}
                helperText={errors.first_name}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                error={!!errors.last_name}
                helperText={errors.last_name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={!!errors.email}
                helperText={errors.email}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <Chip
                label="No password required - you'll be registered as a member"
                sx={{ backgroundColor: '#e3f2fd', color: '#1a237e', width: '100%', mt: 1 }}
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                error={!!errors.phone_number}
                helperText={errors.phone_number}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                multiline
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                error={!!errors.address}
                helperText={errors.address}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Department</InputLabel>
                <Select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  label="Select Department"
                >
                  <MenuItem value="">None</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Cell Group</InputLabel>
                <Select
                  value={formData.cell_id}
                  onChange={(e) => setFormData({ ...formData, cell_id: e.target.value })}
                  label="Select Cell Group"
                >
                  <MenuItem value="">None</MenuItem>
                  {cells.map((cell) => (
                    <MenuItem key={cell.id} value={cell.id}>
                      {cell.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="textSecondary">
                Select a department and cell group you'd like to join. You can change these later.
              </Typography>
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Emergency Contact Name"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                error={!!errors.emergency_contact_name}
                helperText={errors.emergency_contact_name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                error={!!errors.emergency_contact_phone}
                helperText={errors.emergency_contact_phone}
                required
              />
            </Grid>
          </Grid>
        );
      default:
        return 'Unknown step';
    }
  };

  if (loadingData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

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
      <Container maxWidth="md">
        <Paper
          elevation={6}
          sx={{
            p: { xs: 2, md: 4 },
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
              <PersonAdd sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
              Join Dominion City Gbagada
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Register to become a member of our church family
            </Typography>
            <Chip
              label="No login required - just member record"
              sx={{ mt: 1, backgroundColor: '#e8f5e9', color: '#2e7d32' }}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          <Stepper activeStep={activeStep} sx={{ mb: 4, overflowX: 'auto' }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ mt: 2 }}>
            {getStepContent(activeStep)}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, flexWrap: 'wrap', gap: 1 }}>
              {activeStep > 0 && (
                <Button onClick={handleBack}>
                  Back
                </Button>
              )}
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading}
                  sx={{
                    backgroundColor: '#1a237e',
                    '&:hover': { backgroundColor: '#0d1442' }
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Complete Registration'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  sx={{
                    backgroundColor: '#1a237e',
                    '&:hover': { backgroundColor: '#0d1442' }
                  }}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2">
              Already a member?{' '}
              <MuiLink component={Link} to="/login" sx={{ color: '#1a237e', fontWeight: 600 }}>
                Sign In
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
    </Box>
  );
};

export default Register;
