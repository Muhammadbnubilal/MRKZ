
const express = require('express');
const router = express.Router();
const { publicPage, publicData, submitContact, submitAdmission } = require('../controllers/publicController');

router.get('/', publicPage);
router.get('/api/public-data', publicData);
router.post('/api/contact', submitContact);
router.post('/api/admission', submitAdmission);

module.exports = router;
