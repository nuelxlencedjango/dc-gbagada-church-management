import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Snackbar, Alert, CircularProgress, Tabs, Tab, Grid, Card, CardContent
} from '@mui/material';
import { CheckCircle, ChildCare } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const getErrorMessage = (err) => {
  if (!err) return 'An unknown error occurred.';
  if (err.response?.data?.detail) {
    const detail = err.response.data.detail;
    if (Array.isArray(detail)) {
      return detail.map(d => d.msg || JSON.stringify(d)).join('; ');
    }
    if (typeof detail === 'string') return detail;
    return JSON.stringify(detail);
  }
  return err.message || 'An error occurred';
};

const AdminReports = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [deptReports, setDeptReports] = useState([]);
  const [deptPrograms, setDeptPrograms] = useState([]);
  const [cellReports, setCellReports] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [pastorReports, setPastorReports] = useState([]);
  const [pastorPrograms, setPastorPrograms] = useState([]);
  const [childrenSummary, setChildrenSummary] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  const [resolveDialog, setResolveDialog] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === 7 && childrenSummary.length === 0) {
      fetchChildrenSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dr, dp, cr, fu, hr, pr, pp] = await Promise.allSettled([
        axios.get(`${API_URL}/admin-reports/department-reports`, { headers }),
        axios.get(`${API_URL}/admin-reports/department-programs`, { headers }),
        axios.get(`${API_URL}/admin-reports/cell-reports`, { headers }),
        axios.get(`${API_URL}/admin-reports/follow-ups`, { headers }),
        axios.get(`${API_URL}/help-requests/`, { headers }),
        axios.get(`${API_URL}/admin-reports/pastor-reports`, { headers }),
        axios.get(`${API_URL}/admin-reports/pastor-programs`, { headers }),
      ]);
      if (dr.status === 'fulfilled') setDeptReports(dr.value.data);
      if (dp.status === 'fulfilled') setDeptPrograms(dp.value.data);
      if (cr.status === 'fulfilled') setCellReports(cr.value.data);
      if (fu.status === 'fulfilled') setFollowUps(fu.value.data);
      if (hr.status === 'fulfilled') setHelpRequests(hr.value.data);
      if (pr.status === 'fulfilled') setPastorReports(pr.value.data);
      if (pp.status === 'fulfilled') setPastorPrograms(pp.value.data);
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchChildrenSummary = async () => {
    setLoadingChildren(true);
    try {
      const classesRes = await axios.get(`${API_URL}/children/classes`, { headers });
      const classes = classesRes.data;

      const summaries = await Promise.all(classes.map(async (cls) => {
        try {
          const [historyRes, lessonsRes] = await Promise.all([
            axios.get(`${API_URL}/children/classes/${cls.id}/attendance-history`, { headers, params: { limit: 1 } }),
            axios.get(`${API_URL}/children/classes/${cls.id}/lessons`, { headers }),
          ]);
          return {
            ...cls,
            lastAttendance: historyRes.data[0] || null,
            lastLesson: lessonsRes.data[0] || null,
          };
        } catch {
          return { ...cls, lastAttendance: null, lastLesson: null };
        }
      }));

      setChildrenSummary(summaries);
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error');
    } finally {
      setLoadingChildren(false);
    }
  };

  const resolveHelpRequest = async () => {
    try {
      await axios.post(`${API_URL}/help-requests/${resolveDialog.id}/resolve`, { admin_notes: resolveNotes }, { headers });
      showSnackbar('Marked as resolved');
      setResolveDialog(null);
      setResolveNotes('');
      fetchAll();
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e', mb: 3 }}>
        Department & Cell Reports
      </Typography>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label={`Department Reports (${deptReports.length})`} />
          <Tab label={`Department Programs (${deptPrograms.length})`} />
          <Tab label={`Cell Reports (${cellReports.length})`} />
          <Tab label={`Pastor Reports (${pastorReports.length})`} />
          <Tab label={`Pastor Programs (${pastorPrograms.length})`} />
          <Tab label={`Follow-Ups (${followUps.length})`} />
          <Tab label={`Help Requests (${helpRequests.filter(h => h.status === 'pending').length} pending)`} />
          <Tab label="Children's Department" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Department</TableCell>
                  <TableCell>Week Of</TableCell>
                  <TableCell>Submitted By</TableCell>
                  <TableCell>Report</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deptReports.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.department_name}</TableCell>
                    <TableCell>{new Date(r.week_start_date).toLocaleDateString()}</TableCell>
                    <TableCell>{r.submitted_by_name || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 400 }}>{r.report || r.activities_performed || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {deptReports.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No reports submitted yet.</Box>
          )}
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Department</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Location</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deptPrograms.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.department_name}</TableCell>
                    <TableCell>{p.title}</TableCell>
                    <TableCell>{new Date(p.program_date).toLocaleDateString()} {p.program_time}</TableCell>
                    <TableCell>{p.location || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {deptPrograms.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No programs recorded yet.</Box>
          )}
        </Paper>
      )}

      {tab === 2 && (
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cell</TableCell>
                  <TableCell>Week Of</TableCell>
                  <TableCell>Attendance</TableCell>
                  <TableCell>Offering</TableCell>
                  <TableCell>Submitted By</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cellReports.map((r) => (
                  <TableRow key={r.id} hover sx={{ verticalAlign: 'top' }}>
                    <TableCell>{r.cell_name}</TableCell>
                    <TableCell>{new Date(r.week_start_date).toLocaleDateString()}</TableCell>
                    <TableCell>{r.attendance ?? '—'}</TableCell>
                    <TableCell>{r.offering_amount ? `₦${r.offering_amount.toLocaleString()}` : '—'}</TableCell>
                    <TableCell>{r.submitted_by_name || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 380 }}>
                      {r.report && <Box sx={{ mb: 0.5 }}>{r.report}</Box>}
                      {r.meeting_location && (
                        <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
                          <strong>Location:</strong> {r.meeting_location}
                        </Box>
                      )}
                      {r.attendee_names && (
                        <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
                          <strong>Attendees:</strong> {r.attendee_names}
                        </Box>
                      )}
                      {r.children_names && (
                        <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
                          <strong>Children:</strong> {r.children_names}
                        </Box>
                      )}
                      {r.agenda_items && r.agenda_items.length > 0 && (
                        <Box sx={{ mt: 0.5 }}>
                          {r.agenda_items.map((item, i) => (
                            <Box key={i} sx={{ fontSize: 12, color: 'text.secondary' }}>
                              {item.segment_name}
                              {(item.start_time || item.end_time) &&
                                `: ${item.start_time || ''}${item.end_time ? `–${item.end_time}` : ''}`}
                            </Box>
                          ))}
                        </Box>
                      )}
                      {!r.report && !r.meeting_location && !r.attendee_names && !r.children_names &&
                        (!r.agenda_items || r.agenda_items.length === 0) && '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {cellReports.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No reports submitted yet.</Box>
          )}
        </Paper>
      )}

      {tab === 3 && (
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pastor</TableCell>
                  <TableCell>Week Of</TableCell>
                  <TableCell>Submitted By</TableCell>
                  <TableCell>Report</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pastorReports.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.pastor_name}</TableCell>
                    <TableCell>{new Date(r.week_start_date).toLocaleDateString()}</TableCell>
                    <TableCell>{r.submitted_by_name || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 400 }}>{r.report || r.activities_performed || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {pastorReports.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No reports submitted yet.</Box>
          )}
        </Paper>
      )}

      {tab === 4 && (
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pastor</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Location</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pastorPrograms.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.pastor_name}</TableCell>
                    <TableCell>{p.title}</TableCell>
                    <TableCell>{new Date(p.program_date).toLocaleDateString()} {p.program_time}</TableCell>
                    <TableCell>{p.location || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {pastorPrograms.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No programs recorded yet.</Box>
          )}
        </Paper>
      )}

      {tab === 5 && (
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Outcome</TableCell>
                  <TableCell>Followed Up By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {followUps.map((f) => (
                  <TableRow key={f.id} hover>
                    <TableCell>{f.member_name}</TableCell>
                    <TableCell>{new Date(f.follow_up_date).toLocaleDateString()}</TableCell>
                    <TableCell><Chip label={f.method} size="small" /></TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>{f.reason_for_inactivity || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>{f.outcome || '—'}</TableCell>
                    <TableCell>{f.followed_up_by_name || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {followUps.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No follow-ups logged yet.</Box>
          )}
        </Paper>
      )}

      {tab === 6 && (
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Source</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Sent By</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {helpRequests.map((h) => (
                  <TableRow key={h.id} hover>
                    <TableCell>{h.source_name} <Chip label={h.source_type} size="small" sx={{ ml: 1 }} /></TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>{h.description}</TableCell>
                    <TableCell>{h.submitted_by_name || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={h.status}
                        size="small"
                        color={h.status === 'resolved' ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>{new Date(h.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="center">
                      {h.status !== 'resolved' && (
                        <IconButton size="small" color="success" onClick={() => { setResolveDialog(h); setResolveNotes(''); }}>
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {helpRequests.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No help requests yet.</Box>
          )}
        </Paper>
      )}

      {tab === 7 && (
        <Paper sx={{ p: 2 }}>
          {loadingChildren ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
          ) : childrenSummary.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No classes set up yet.</Box>
          ) : (
            <Grid container spacing={2}>
              {childrenSummary.map((cls) => (
                <Grid item xs={12} sm={6} md={4} key={cls.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <ChildCare sx={{ color: '#1a237e', fontSize: 20 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{cls.name}</Typography>
                      </Box>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Teacher: {cls.teacher_name || 'Unassigned'}
                      </Typography>
                      <Chip label={`${cls.child_count} children`} size="small" sx={{ mt: 1, mb: 1.5, backgroundColor: '#e3f2fd', color: '#1a237e' }} />

                      <Box sx={{ borderTop: '1px solid #eee', pt: 1, mt: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }} display="block">Last Attendance</Typography>
                        {cls.lastAttendance ? (
                          <Typography variant="caption" color="textSecondary">
                            {new Date(cls.lastAttendance.date).toLocaleDateString()} — {cls.lastAttendance.present}/{cls.lastAttendance.total} present
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="textSecondary">None recorded yet</Typography>
                        )}
                      </Box>

                      <Box sx={{ borderTop: '1px solid #eee', pt: 1, mt: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }} display="block">Last Lesson</Typography>
                        {cls.lastLesson ? (
                          <Typography variant="caption" color="textSecondary">
                            {cls.lastLesson.title} — {new Date(cls.lastLesson.date).toLocaleDateString()}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="textSecondary">None logged yet</Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      <Dialog open={!!resolveDialog} onClose={() => setResolveDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolve Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>{resolveDialog?.description}</Typography>
          <TextField
            fullWidth
            label="Notes (optional)"
            multiline
            rows={3}
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialog(null)}>Cancel</Button>
          <Button onClick={resolveHelpRequest} variant="contained" sx={{ backgroundColor: '#1a237e' }}>
            Mark Resolved
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminReports;