'use strict';

const express = require('express');
const router = express.Router();
const optionalAuth = require('../middleware/optionalAuth');
const { visualizeExecution } = require('../controllers/visualizationController');

router.post('/visualize-execution', optionalAuth, visualizeExecution);

module.exports = router;
