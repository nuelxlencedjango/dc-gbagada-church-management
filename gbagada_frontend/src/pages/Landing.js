import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Button, Grid, Card, CardContent,
  Dialog, DialogTitle, DialogContent, TextField, DialogActions,
  Snackbar, Alert, Chip, IconButton
} from '@mui/material';
import {
  Phone, Email, Facebook, Instagram, YouTube,
  AccessTime, LocationOn, Church, Message, Twitter, QuestionAnswer, SmartToy
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PublicAIChat from '../components/PublicAIChat';

const API_URL = 'http://localhost:8000/api';

const Landing = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [openContactDialog, setOpenContactDialog] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get(`${API_URL}/announcements/public`);
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const handleContactSubmit = async () => {
    try {
      await axios.post(`${API_URL}/contact`, contactForm);
      setSnackbar({
        open: true,
        message: 'Thank you for contacting us! We will respond within 24 hours.',
        severity: 'success'
      });
      setOpenContactDialog(false);
      setContactForm({ name: '', email: '', message: '' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error sending message. Please try again.',
        severity: 'error'
      });
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Hero Section */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #1565c0 100%)',
        color: 'white',
        py: { xs: 8, md: 12 },
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Church sx={{ fontSize: { xs: 60, md: 80 }, mb: 2 }} />
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '3.75rem' } }}>
            Dominion City Gbagada
          </Typography>
          <Typography variant="h6" gutterBottom sx={{ mb: 4, fontSize: { xs: '1rem', md: '1.5rem' } }}>
            A Place of Worship, Community, and Transformation
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, maxWidth: 600, mx: 'auto', opacity: 0.9 }}>
            We are a family of believers dedicated to spreading God's love, 
            building strong communities, and transforming lives through the power of the Gospel.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              sx={{
                backgroundColor: '#ff6f00',
                '&:hover': { backgroundColor: '#e65100' },
                px: 4
              }}
              component={Link}
              to="/register"
            >
              Join Our Family
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{
                color: 'white',
                borderColor: 'white',
                '&:hover': { borderColor: '#ff6f00', color: '#ff6f00' },
                px: 4
              }}
              onClick={() => setOpenContactDialog(true)}
            >
              Contact Us
            </Button>
            <Button
              variant="contained"
              size="large"
              startIcon={<QuestionAnswer />}
              onClick={() => setChatOpen(true)}
              sx={{
                backgroundColor: '#4caf50',
                '&:hover': { backgroundColor: '#388e3c' },
                px: 4
              }}
            >
              Ask AI Assistant
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Service Times */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Typography variant="h3" align="center" gutterBottom sx={{ fontWeight: 600 }}>
          Service Times
        </Typography>
        <Typography variant="body1" align="center" color="textSecondary" sx={{ mb: 6 }}>
          Join us for worship and fellowship
        </Typography>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{
              height: '100%',
              textAlign: 'center',
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: 6
              }
            }}>
              <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                <AccessTime sx={{ fontSize: 50, color: '#1a237e', mb: 2 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  Sunday Services
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#1a237e' }}>
                    9:00 AM
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    First Service
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#1a237e', mt: 2 }}>
                    11:00 AM
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Second Service
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{
              height: '100%',
              textAlign: 'center',
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: 6
              }
            }}>
              <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                <AccessTime sx={{ fontSize: 50, color: '#1a237e', mb: 2 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  Tuesday Prayer
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, color: '#1a237e', mt: 2 }}>
                  6:00 PM
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Prayer Meeting
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{
              height: '100%',
              textAlign: 'center',
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: 6
              }
            }}>
              <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                <LocationOn sx={{ fontSize: 50, color: '#1a237e', mb: 2 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  Location
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  We are located at
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, mt: 1 }}>
                  Gbagada, Lagos, Nigeria
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  href="https://maps.google.com/maps?q=Gbagada+Lagos+Nigeria"
                  target="_blank"
                  sx={{ mt: 2 }}
                >
                  Get Directions
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Announcements */}
      {announcements.length > 0 && (
        <Box sx={{ backgroundColor: '#f5f5f5', py: { xs: 4, md: 6 } }}>
          <Container maxWidth="lg">
            <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 600 }}>
              Latest Announcements
            </Typography>
            <Grid container spacing={3} sx={{ mt: 2 }}>
              {announcements.slice(0, 4).map((announcement, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card sx={{
                    transition: 'transform 0.3s',
                    '&:hover': { transform: 'scale(1.02)' }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={announcement.priority || 'Normal'}
                          size="small"
                          sx={{
                            backgroundColor: announcement.priority === 'high' ? '#ff1744' :
                                           announcement.priority === 'urgent' ? '#f44336' : '#4caf50',
                            color: 'white'
                          }}
                        />
                        <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                          {new Date(announcement.published_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        {announcement.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {announcement.content}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      )}

      {/* AI Assistant Section */}
      <Box sx={{ backgroundColor: '#e3f2fd', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1a237e' }}>
                🤖 Ask Our AI Assistant
              </Typography>
              <Typography variant="body1" color="textSecondary" paragraph>
                Have questions about our church? Our AI assistant can help you with:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Chip label="⏰ Service Times" sx={{ backgroundColor: 'white' }} />
                <Chip label="📍 Location" sx={{ backgroundColor: 'white' }} />
                <Chip label="📞 Contact Info" sx={{ backgroundColor: 'white' }} />
                <Chip label="🙏 Prayer Requests" sx={{ backgroundColor: 'white' }} />
                <Chip label="📢 Announcements" sx={{ backgroundColor: 'white' }} />
                <Chip label="👥 Membership" sx={{ backgroundColor: 'white' }} />
              </Box>
              <Button
                variant="contained"
                startIcon={<QuestionAnswer />}
                onClick={() => setChatOpen(true)}
                sx={{
                  backgroundColor: '#1a237e',
                  '&:hover': { backgroundColor: '#0d1442' }
                }}
              >
                Chat with AI Assistant
              </Button>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Box sx={{ 
                backgroundColor: 'white', 
                borderRadius: 2, 
                p: 3,
                boxShadow: 2
              }}>
                <SmartToy sx={{ fontSize: 60, color: '#1a237e' }} />
                <Typography variant="body2" color="textSecondary">
                  Available 24/7
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  No login required
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Contact & Social */}
      <Box sx={{ backgroundColor: '#1a237e', color: 'white', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Contact Us
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <Phone sx={{ mr: 2, color: '#ff6f00' }} />
                <Typography>+234-XXX-XXX-XXXX</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <Email sx={{ mr: 2, color: '#ff6f00' }} />
                <Typography>info@dominioncitygbagada.com</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
                <LocationOn sx={{ mr: 2, color: '#ff6f00' }} />
                <Typography>Gbagada, Lagos, Nigeria</Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Message />}
                onClick={() => setOpenContactDialog(true)}
                sx={{
                  backgroundColor: '#ff6f00',
                  '&:hover': { backgroundColor: '#e65100' }
                }}
              >
                Send Us a Message
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Follow Us
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                Stay connected with us on social media
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <IconButton
                  component="a"
                  href="https://facebook.com/dominioncitygbagada"
                  target="_blank"
                  sx={{
                    backgroundColor: '#3b5998',
                    color: 'white',
                    width: 56,
                    height: 56,
                    '&:hover': { backgroundColor: '#2d4373', transform: 'scale(1.1)' },
                    transition: 'transform 0.2s'
                  }}
                >
                  <Facebook />
                </IconButton>
                <IconButton
                  component="a"
                  href="https://instagram.com/dominioncitygbagada"
                  target="_blank"
                  sx={{
                    backgroundColor: '#e4405f',
                    color: 'white',
                    width: 56,
                    height: 56,
                    '&:hover': { backgroundColor: '#c13584', transform: 'scale(1.1)' },
                    transition: 'transform 0.2s'
                  }}
                >
                  <Instagram />
                </IconButton>
                <IconButton
                  component="a"
                  href="https://youtube.com/dominioncitygbagada"
                  target="_blank"
                  sx={{
                    backgroundColor: '#ff0000',
                    color: 'white',
                    width: 56,
                    height: 56,
                    '&:hover': { backgroundColor: '#cc0000', transform: 'scale(1.1)' },
                    transition: 'transform 0.2s'
                  }}
                >
                  <YouTube />
                </IconButton>
                <IconButton
                  component="a"
                  href="https://twitter.com/dominioncitygbagada"
                  target="_blank"
                  sx={{
                    backgroundColor: '#1da1f2',
                    color: 'white',
                    width: 56,
                    height: 56,
                    '&:hover': { backgroundColor: '#1991db', transform: 'scale(1.1)' },
                    transition: 'transform 0.2s'
                  }}
                >
                  <Twitter />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ backgroundColor: '#0d1442', color: 'white', py: 3, textAlign: 'center' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            © {new Date().getFullYear()} Dominion City Gbagada. All rights reserved.
          </Typography>
        </Container>
      </Box>

      {/* Contact Dialog */}
      <Dialog open={openContactDialog} onClose={() => setOpenContactDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#1a237e', color: 'white' }}>
          Contact Dominion City Gbagada
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Your Name"
            margin="normal"
            value={contactForm.name}
            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            required
          />
          <TextField
            fullWidth
            label="Your Email"
            type="email"
            margin="normal"
            value={contactForm.email}
            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            required
          />
          <TextField
            fullWidth
            label="Message"
            multiline
            rows={4}
            margin="normal"
            value={contactForm.message}
            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
            required
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenContactDialog(false)}>Cancel</Button>
          <Button
            onClick={handleContactSubmit}
            variant="contained"
            sx={{ backgroundColor: '#1a237e', '&:hover': { backgroundColor: '#0d1442' } }}
          >
            Send Message
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Public AI Chat */}
      <PublicAIChat 
        isOpen={chatOpen} 
        onToggle={() => setChatOpen(!chatOpen)} 
      />
    </Box>
  );
};

export default Landing;
