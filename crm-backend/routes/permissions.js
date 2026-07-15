const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { loadAuthorization, requirePermission } = require('../middleware/authorization');
const { ACTIONS, SCOPES, PERMISSION_RESOURCES, MODULES } = require('../config/accessControl');

const router = express.Router();
router.get('/resources', authMiddleware, loadAuthorization, requirePermission('permissions', 'view'), (req, res) => {
  res.json({ resources: PERMISSION_RESOURCES, actions: ACTIONS, scopes: SCOPES, modules: MODULES });
});
module.exports = router;
