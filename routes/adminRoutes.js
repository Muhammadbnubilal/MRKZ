const express = require('express');
const router = express.Router();

const { requireAdmin } = require('../middleware/auth');
const admin = require('../controllers/adminController');

// Authentication
router.post('/auth/login', admin.login);
router.post('/auth/logout', admin.logout);

// Protected admin APIs
router.get('/api/admin/state', requireAdmin, admin.adminState);
router.post('/api/admin/credentials', requireAdmin, admin.updateCredentials);

// Website Settings
router.post('/api/admin/settings', requireAdmin, admin.saveSettings);

// If you really created this function in controller, keep it
router.post('/api/admin/settings/undo', requireAdmin, admin.undoSettings);

// Form Options
router.post('/api/admin/form-options', requireAdmin, admin.saveFormOptions);

// Notices
router.post('/api/admin/notices', requireAdmin, admin.addNotice);
router.delete('/api/admin/notices/:id', requireAdmin, admin.deleteNotice);

// Events
router.post('/api/admin/events', requireAdmin, admin.addEvent);
router.delete('/api/admin/events/:id', requireAdmin, admin.deleteEvent);

// Admissions
router.post('/api/admin/admissions/:id/action', requireAdmin, admin.applicationAction);

// Keep this only if adminController really has deleteApplication
router.delete('/api/admin/admissions/:id', requireAdmin, admin.deleteApplication);

// Messages
router.delete('/api/admin/messages/:id', requireAdmin, admin.deleteMessage);

router.get('/admin/state', requireAdmin, admin.adminState);
router.post('/admin/settings', requireAdmin, admin.saveSettings);

router.post('/admin/login', admin.login);
router.post('/admin/logout', admin.logout);

router.post('/admin/credentials', requireAdmin, admin.updateCredentials);

router.post('/admin/settings/undo', requireAdmin, admin.undoSettings);

router.post('/admin/form-options', requireAdmin, admin.saveFormOptions);

router.post('/admin/notices', requireAdmin, admin.addNotice);
router.delete('/admin/notices/:id', requireAdmin, admin.deleteNotice);

router.post('/admin/events', requireAdmin, admin.addEvent);
router.delete('/admin/events/:id', requireAdmin, admin.deleteEvent);

router.post('/admin/admissions/:id/action', requireAdmin, admin.applicationAction);
router.delete('/admin/admissions/:id', requireAdmin, admin.deleteApplication);

router.delete('/admin/messages/:id', requireAdmin, admin.deleteMessage);

module.exports = router;