import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, IconButton,
  Menu, MenuItem, Avatar, Box, Drawer, List,
  ListItem, ListItemIcon, ListItemText, Divider
} from '@mui/material';
import {
  Church, Menu as MenuIcon, Dashboard, Logout
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navigation = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    handleClose();
    setMobileOpen(false);
  };

  // Deliberately just Dashboard + Logout here — not a fixed list of
  // admin-only pages. /dashboard already correctly routes anyone to
  // their own proper portal (DashboardRouter), and that portal has its
  // own correct, role-appropriate sidebar already. This menu previously
  // hardcoded /members, /cells, /departments, /finance, /announcements
  // for every single user regardless of role — a Cell Leader or
  // Department Head clicking these landed on generic admin pages that
  // were never meant for them.
  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  ];

  const drawer = (
    <Box sx={{ width: 280, bgcolor: '#1a2e47', height: '100%', color: 'white' }}>
      <Box sx={{ p: 2, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Church sx={{ fontSize: 40, color: 'white', mb: 1 }} />
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
          Dominion City
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Gbagada
        </Typography>
      </Box>

      <List sx={{ pt: 2 }}>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
            sx={{
              color: 'rgba(255,255,255,0.7)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' },
              borderRadius: 1,
              mx: 1,
              my: 0.5
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />

      <ListItem
        button
        onClick={handleLogout}
        sx={{
          color: 'rgba(255,255,255,0.7)',
          '&:hover': { bgcolor: 'rgba(255,82,82,0.15)', color: '#ff6b6b' },
          borderRadius: 1,
          mx: 1,
          my: 0.5
        }}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}><Logout /></ListItemIcon>
        <ListItemText primary="Logout" />
      </ListItem>
    </Box>
  );

  return (
    <>
      <AppBar position="sticky" sx={{ backgroundColor: '#1a2e47' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleDrawerToggle}
            sx={{ display: { xs: 'block', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Church sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
              Dominion City Gbagada
            </Link>
          </Typography>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center' }}>
            <Button color="inherit" component={Link} to="/">Home</Button>
            {isAuthenticated ? (
              <>
                <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
                <Button
                  color="inherit"
                  onClick={handleMenu}
                  startIcon={
                    <Avatar sx={{ width: 24, height: 24, bgcolor: '#ff6f00' }}>
                      {user?.full_name?.[0] || 'U'}
                    </Avatar>
                  }
                >
                  {user?.full_name?.split(' ')[0] || 'User'}
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  {menuItems.map((item) => (
                    <MenuItem
                      key={item.text}
                      onClick={() => {
                        navigate(item.path);
                        handleClose();
                      }}
                    >
                      {item.icon} {item.text}
                    </MenuItem>
                  ))}
                  <MenuItem onClick={handleLogout} sx={{ color: '#c62828' }}>
                    <Logout /> Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button color="inherit" component={Link} to="/login">Login</Button>
                <Button
                  color="inherit"
                  component={Link} to="/register"
                  sx={{ backgroundColor: '#ff6f00', '&:hover': { backgroundColor: '#e65100' } }}
                >
                  Register
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Navigation;