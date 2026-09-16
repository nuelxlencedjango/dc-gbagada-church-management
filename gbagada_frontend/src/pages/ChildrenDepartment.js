import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, IconButton, Chip,
  TextField, InputAdornment, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Snackbar, Alert, CircularProgress, useTheme,
  useMediaQuery, MenuItem, FormControl, InputLabel, Select,
  Checkbox, FormControlLabel, Avatar
} from '@mui/material';
import {
  Search, Add, Edit, Delete, ArrowBack, ChildCare, Person,
  EventAvailable, History, MenuBook
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const getErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (Array.isArray(detail)) return detail.map(d => d.msg || JSON.stringify(d)).join('; ');
    if (typeof detail === 'string') return detail;
  }
  return error.message || 'An error occurred';
};

const ChildrenDepartment = () => {
  const { token } = useAuth();
  const theme = useTheme();

  const [view, setView] = useState('classes'); // 'classes' | 'detail'
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Class dialog
  const [openClassDialog, setOpenClassDialog] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classForm, setClassForm] = useState({
    name: '', age_range: '', description: '', department_id: '', teacher_id: '', assistant_teacher_id: ''
  });

  // Selected class detail view
  const [selectedClass, setSelectedClass] = useState(null);
  const [children, setChildren] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [lessonForm, setLessonForm] = useState({ date: new Date().toISOString().split('T')[0], title: '', notes: '' });

  // Child dialog
  const [openChildDialog, setOpenChildDialog] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [childForm, setChildForm] = useState({
    first_name: '', last_name: '', date_of_birth: '', gender: '',
    parent_name: '', parent_phone: '', parent_email: '', notes: ''
  });

  // Attendance marking
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({}); // child_id -> bool
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchDepartments();
    
  }, []);

  const showSnackbar = (message, severity) => setSnackbar({ open: true, message, severity });

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/children/classes`, { headers: { Authorization: `Bearer ${token}` } });
      setClasses(res.data);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_URL}/departments/`, { headers: { Authorization: `Bearer ${token}` } });
      setDepartments(res.data);
    } catch (error) { /* non-critical */ }
  };

  const fetchDeptMembers = async (departmentId) => {
    // Scoped to the actual department this class is linked to — a
    // Teacher/Assistant Teacher assignment shouldn't be pickable from
    // every active user in the church, only people actually registered
    // in that department. Falls back to an empty list (not all users)
    // if no department is selected yet.
    if (!departmentId) {
      setUsers([]);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/departments/${departmentId}/members`, { headers: { Authorization: `Bearer ${token}` } });
      const withAccounts = res.data.filter(m => m.user_id);
      setUsers(withAccounts.map(m => ({ id: m.user_id, full_name: m.name })));
    } catch (error) {
      setUsers([]);
    }
  };

  // ---------- Class CRUD ----------

  const handleOpenClassDialog = (cls = null) => {
    if (cls) {
      setEditingClass(cls);
      setClassForm({
        name: cls.name || '', age_range: cls.age_range || '', description: cls.description || '',
        department_id: cls.department_id || '', teacher_id: cls.teacher_id || '', assistant_teacher_id: cls.assistant_teacher_id || ''
      });
      fetchDeptMembers(cls.department_id);
    } else {
      setEditingClass(null);
      const childrenMinistry = departments.find(d => d.name.toLowerCase().includes('children'));
      const defaultDeptId = childrenMinistry ? childrenMinistry.id : '';
      setClassForm({
        name: '', age_range: '', description: '',
        department_id: defaultDeptId, teacher_id: '', assistant_teacher_id: ''
      });
      fetchDeptMembers(defaultDeptId);
    }
    setOpenClassDialog(true);
  };

  const handleDepartmentChange = (newDeptId) => {
    setClassForm({ ...classForm, department_id: newDeptId, teacher_id: '', assistant_teacher_id: '' });
    fetchDeptMembers(newDeptId);
  };

  const handleSubmitClass = async () => {
    if (!classForm.name) {
      showSnackbar('Class name is required', 'error');
      return;
    }
    try {
      const payload = {
        ...classForm,
        department_id: classForm.department_id || null,
        teacher_id: classForm.teacher_id || null,
        assistant_teacher_id: classForm.assistant_teacher_id || null,
      };
      if (editingClass) {
        await axios.put(`${API_URL}/children/classes/${editingClass.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        showSnackbar('Class updated', 'success');
      } else {
        await axios.post(`${API_URL}/children/classes`, payload, { headers: { Authorization: `Bearer ${token}` } });
        showSnackbar('Class created', 'success');
      }
      setOpenClassDialog(false);
      fetchClasses();
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleDeleteClass = async (classId) => {
    if (window.confirm('Deactivate this class? Children in it will stay on record.')) {
      try {
        await axios.delete(`${API_URL}/children/classes/${classId}`, { headers: { Authorization: `Bearer ${token}` } });
        showSnackbar('Class deactivated', 'success');
        fetchClasses();
      } catch (error) {
        showSnackbar(getErrorMessage(error), 'error');
      }
    }
  };

  // ---------- Class detail view ----------

  const openClassDetail = async (cls) => {
    setSelectedClass(cls);
    setView('detail');
    setDetailLoading(true);
    try {
      const [childrenRes, historyRes, lessonsRes] = await Promise.all([
        axios.get(`${API_URL}/children/classes/${cls.id}/children`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/children/classes/${cls.id}/attendance-history`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/children/classes/${cls.id}/lessons`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setChildren(childrenRes.data);
      setAttendanceHistory(historyRes.data);
      setLessons(lessonsRes.data);
      await loadAttendanceForDate(cls.id, attendanceDate, childrenRes.data);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddLesson = async () => {
    if (!lessonForm.title) {
      showSnackbar('Lesson title is required', 'error');
      return;
    }
    try {
      await axios.post(`${API_URL}/children/classes/${selectedClass.id}/lessons`, lessonForm, { headers: { Authorization: `Bearer ${token}` } });
      showSnackbar('Lesson logged', 'success');
      setLessonForm({ date: new Date().toISOString().split('T')[0], title: '', notes: '' });
      const res = await axios.get(`${API_URL}/children/classes/${selectedClass.id}/lessons`, { headers: { Authorization: `Bearer ${token}` } });
      setLessons(res.data);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (window.confirm('Remove this lesson entry?')) {
      try {
        await axios.delete(`${API_URL}/children/lessons/${lessonId}`, { headers: { Authorization: `Bearer ${token}` } });
        showSnackbar('Lesson entry removed', 'success');
        setLessons(lessons.filter(l => l.id !== lessonId));
      } catch (error) {
        showSnackbar(getErrorMessage(error), 'error');
      }
    }
  };

  const loadAttendanceForDate = async (classId, dateStr, childList) => {
    setLoadingAttendance(true);
    try {
      const res = await axios.get(`${API_URL}/children/classes/${classId}/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: dateStr }
      });
      const existing = res.data;
      const roster = childList || children;
      const map = {};
      roster.forEach(c => {
        map[c.id] = existing.hasOwnProperty(c.id) ? existing[c.id] : true;
      });
      setAttendanceMap(map);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleDateChange = (newDate) => {
    setAttendanceDate(newDate);
    if (selectedClass) loadAttendanceForDate(selectedClass.id, newDate);
  };

  const handleSubmitAttendance = async () => {
    try {
      const records = children.map(c => ({ child_id: c.id, present: !!attendanceMap[c.id] }));
      const res = await axios.post(`${API_URL}/children/classes/${selectedClass.id}/attendance`, {
        date: attendanceDate, records
      }, { headers: { Authorization: `Bearer ${token}` } });
      showSnackbar(`Attendance saved — ${res.data.present_count}/${res.data.total} present`, 'success');
      const historyRes = await axios.get(`${API_URL}/children/classes/${selectedClass.id}/attendance-history`, { headers: { Authorization: `Bearer ${token}` } });
      setAttendanceHistory(historyRes.data);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  // ---------- Child CRUD ----------

  const handleOpenChildDialog = (child = null) => {
    if (child) {
      setEditingChild(child);
      setChildForm({
        first_name: child.first_name || '', last_name: child.last_name || '',
        date_of_birth: child.date_of_birth || '', gender: child.gender || '',
        parent_name: child.parent_name || '', parent_phone: child.parent_phone || '',
        parent_email: child.parent_email || '', notes: child.notes || ''
      });
    } else {
      setEditingChild(null);
      setChildForm({ first_name: '', last_name: '', date_of_birth: '', gender: '', parent_name: '', parent_phone: '', parent_email: '', notes: '' });
    }
    setOpenChildDialog(true);
  };

  const handleSubmitChild = async () => {
    if (!childForm.first_name || !childForm.last_name) {
      showSnackbar('First and last name are required', 'error');
      return;
    }
    try {
      const payload = { ...childForm, class_id: selectedClass.id, date_of_birth: childForm.date_of_birth || null };
      if (editingChild) {
        await axios.put(`${API_URL}/children/children/${editingChild.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        showSnackbar('Child updated', 'success');
      } else {
        await axios.post(`${API_URL}/children/children`, payload, { headers: { Authorization: `Bearer ${token}` } });
        showSnackbar('Child registered', 'success');
      }
      setOpenChildDialog(false);
      const res = await axios.get(`${API_URL}/children/classes/${selectedClass.id}/children`, { headers: { Authorization: `Bearer ${token}` } });
      setChildren(res.data);
      loadAttendanceForDate(selectedClass.id, attendanceDate, res.data);
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error');
    }
  };

  const handleDeleteChild = async (childId) => {
    if (window.confirm('Remove this child from the roster?')) {
      try {
        await axios.delete(`${API_URL}/children/children/${childId}`, { headers: { Authorization: `Bearer ${token}` } });
        showSnackbar('Child removed', 'success');
        const res = await axios.get(`${API_URL}/children/classes/${selectedClass.id}/children`, { headers: { Authorization: `Bearer ${token}` } });
        setChildren(res.data);
      } catch (error) {
        showSnackbar(getErrorMessage(error), 'error');
      }
    }
  };

  const filteredClasses = classes.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}><CircularProgress /></Box>;
  }

  // ================= DETAIL VIEW =================
  if (view === 'detail' && selectedClass) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2, md: 3 } }}>
        <Button startIcon={<ArrowBack />} onClick={() => setView('classes')} sx={{ mb: 2 }}>
          Back to Classes
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e', mb: 1 }}>{selectedClass.name}</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          {selectedClass.age_range && `Ages: ${selectedClass.age_range} · `}
          Teacher: {selectedClass.teacher_name || '—'}
          {selectedClass.assistant_teacher_name && ` · Assistant: ${selectedClass.assistant_teacher_name}`}
        </Typography>

        {detailLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <Grid container spacing={3}>
            {/* Roster */}
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    <ChildCare sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                    Roster ({children.length})
                  </Typography>
                  <Button size="small" variant="contained" startIcon={<Add />} onClick={() => handleOpenChildDialog()} sx={{ backgroundColor: '#1a237e' }}>
                    Add Child
                  </Button>
                </Box>
                {children.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">No children registered in this class yet.</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Parent/Guardian</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {children.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.first_name} {c.last_name}</TableCell>
                          <TableCell>
                            <Typography variant="caption" display="block">{c.parent_name || '—'}</Typography>
                            <Typography variant="caption" display="block" color="textSecondary">{c.parent_phone || ''}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" color="primary" onClick={() => handleOpenChildDialog(c)}>
                              <Edit sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteChild(c.id)}>
                              <Delete sx={{ fontSize: 18 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Paper>

              <Paper sx={{ p: 2, mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                  <History sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                  Attendance History
                </Typography>
                {attendanceHistory.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">No attendance recorded yet.</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Present</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceHistory.map((h) => (
                        <TableRow key={h.date}>
                          <TableCell>{new Date(h.date).toLocaleDateString()}</TableCell>
                          <TableCell align="right">
                            <Chip label={`${h.present} / ${h.total}`} size="small" sx={{ backgroundColor: '#e3f2fd', color: '#1a237e' }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Paper>

              <Paper sx={{ p: 2, mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                  <MenuBook sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                  Lesson Log
                </Typography>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth size="small" type="date" label="Date"
                      value={lessonForm.date}
                      onChange={(e) => setLessonForm({ ...lessonForm, date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth size="small" label="Lesson title"
                      placeholder="e.g. The Good Shepherd"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button fullWidth variant="contained" size="small" onClick={handleAddLesson} sx={{ backgroundColor: '#1a237e', height: '100%' }}>
                      Log It
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth size="small" label="Notes (optional)" multiline rows={1}
                      value={lessonForm.notes}
                      onChange={(e) => setLessonForm({ ...lessonForm, notes: e.target.value })}
                    />
                  </Grid>
                </Grid>
                {lessons.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">No lessons logged yet.</Typography>
                ) : (
                  <Box sx={{ maxHeight: 260, overflowY: 'auto' }}>
                    {lessons.map((l) => (
                      <Box key={l.id} sx={{ py: 1, borderBottom: '1px solid #eee' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{l.title}</Typography>
                            <Typography variant="caption" color="textSecondary" display="block">
                              {new Date(l.date).toLocaleDateString()} {l.taught_by_name && `· Taught by ${l.taught_by_name}`}
                            </Typography>
                            {l.notes && <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{l.notes}</Typography>}
                          </Box>
                          <IconButton size="small" color="error" onClick={() => handleDeleteLesson(l.id)}>
                            <Delete sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Attendance marking */}
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                  <EventAvailable sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                  Mark Attendance
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  value={attendanceDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
                {loadingAttendance ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
                ) : children.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">Add children to this class first.</Typography>
                ) : (
                  <>
                    <Box sx={{ maxHeight: 320, overflowY: 'auto', mb: 2 }}>
                      {children.map((c) => (
                        <FormControlLabel
                          key={c.id}
                          sx={{ display: 'flex', width: '100%' }}
                          control={
                            <Checkbox
                              checked={!!attendanceMap[c.id]}
                              onChange={(e) => setAttendanceMap({ ...attendanceMap, [c.id]: e.target.checked })}
                            />
                          }
                          label={`${c.first_name} ${c.last_name}`}
                        />
                      ))}
                    </Box>
                    <Button fullWidth variant="contained" onClick={handleSubmitAttendance} sx={{ backgroundColor: '#1a237e' }}>
                      Save Attendance
                    </Button>
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Add/Edit Child Dialog */}
        <Dialog open={openChildDialog} onClose={() => setOpenChildDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingChild ? 'Edit Child' : 'Register Child'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="First Name" required value={childForm.first_name} onChange={(e) => setChildForm({ ...childForm, first_name: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Last Name" required value={childForm.last_name} onChange={(e) => setChildForm({ ...childForm, last_name: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Date of Birth" type="date" value={childForm.date_of_birth} onChange={(e) => setChildForm({ ...childForm, date_of_birth: e.target.value })} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select value={childForm.gender} onChange={(e) => setChildForm({ ...childForm, gender: e.target.value })} label="Gender">
                    <MenuItem value="">Not specified</MenuItem>
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Parent/Guardian Name" value={childForm.parent_name} onChange={(e) => setChildForm({ ...childForm, parent_name: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Parent Phone" value={childForm.parent_phone} onChange={(e) => setChildForm({ ...childForm, parent_phone: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Parent Email" value={childForm.parent_email} onChange={(e) => setChildForm({ ...childForm, parent_email: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Notes" multiline rows={2} value={childForm.notes} onChange={(e) => setChildForm({ ...childForm, notes: e.target.value })} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenChildDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmitChild} sx={{ backgroundColor: '#1a237e' }}>{editingChild ? 'Update' : 'Register'}</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
        </Snackbar>
      </Container>
    );
  }

  // ================= CLASSES LIST VIEW =================
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e', fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
            Children's Department
          </Typography>
          <Typography variant="body2" color="textSecondary">Classes, roster, and attendance</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenClassDialog()} sx={{ backgroundColor: '#1a237e' }}>
          Add Class
        </Button>
      </Box>

      <Paper sx={{ p: { xs: 1, sm: 2 } }}>
        <TextField
          placeholder="Search classes..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          sx={{ width: { xs: '100%', sm: 300 }, mb: 2 }}
        />

        <Grid container spacing={2}>
          {filteredClasses.map((cls) => (
            <Grid item xs={12} sm={6} md={4} key={cls.id}>
              <Paper variant="outlined" sx={{ p: 2, cursor: 'pointer', '&:hover': { boxShadow: 2 } }} onClick={() => openClassDetail(cls)}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: '#1a237e', width: 36, height: 36 }}><ChildCare sx={{ fontSize: 20 }} /></Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{cls.name}</Typography>
                      {cls.age_range && <Typography variant="caption" color="textSecondary">Ages {cls.age_range}</Typography>}
                    </Box>
                  </Box>
                  <Box onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" color="primary" onClick={() => handleOpenClassDialog(cls)}>
                      <Edit sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteClass(cls.id)}>
                      <Delete sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" display="block">
                    <Person sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                    Teacher: {cls.teacher_name || 'Unassigned'}
                  </Typography>
                  <Chip label={`${cls.child_count} children`} size="small" sx={{ mt: 1, backgroundColor: '#e3f2fd', color: '#1a237e' }} />
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {filteredClasses.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <ChildCare sx={{ fontSize: 60, color: '#bdbdbd' }} />
            <Typography variant="h6" color="textSecondary">No classes yet</Typography>
            <Button variant="outlined" startIcon={<Add />} onClick={() => handleOpenClassDialog()} sx={{ mt: 2 }}>
              Create First Class
            </Button>
          </Box>
        )}
      </Paper>

      {/* Add/Edit Class Dialog */}
      <Dialog open={openClassDialog} onClose={() => setOpenClassDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingClass ? 'Edit Class' : 'Add Class'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Class Name" required value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="e.g. Toddlers, Grade 1-3" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Age Range" value={classForm.age_range} onChange={(e) => setClassForm({ ...classForm, age_range: e.target.value })} placeholder="e.g. 2-4 years" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Linked Department</InputLabel>
                <Select value={classForm.department_id} onChange={(e) => handleDepartmentChange(e.target.value)} label="Linked Department">
                  <MenuItem value="">None</MenuItem>
                  {departments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" multiline rows={2} value={classForm.description} onChange={(e) => setClassForm({ ...classForm, description: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Teacher</InputLabel>
                <Select value={classForm.teacher_id} onChange={(e) => setClassForm({ ...classForm, teacher_id: e.target.value })} label="Teacher">
                  <MenuItem value="">None</MenuItem>
                  {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Assistant Teacher</InputLabel>
                <Select value={classForm.assistant_teacher_id} onChange={(e) => setClassForm({ ...classForm, assistant_teacher_id: e.target.value })} label="Assistant Teacher">
                  <MenuItem value="">None</MenuItem>
                  {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            {classForm.department_id && users.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">
                  No registered members with accounts in that department yet — Teacher/Assistant options come from Manage Members.
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClassDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitClass} sx={{ backgroundColor: '#1a237e' }}>{editingClass ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
};

export default ChildrenDepartment;