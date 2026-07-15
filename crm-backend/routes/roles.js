const express = require('express');
const RolePermission = require('../models/RolePermission');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { loadAuthorization, requirePermission, preventPrivilegeEscalation } = require('../middleware/authorization');
const { ROLE_TEMPLATES, ACTIONS, SCOPES, USER_TYPES, PERMISSION_RESOURCES, MODULES } = require('../config/accessControl');
const { normalizePermission } = require('../services/accessControlService');
const { writeAuditLog } = require('../services/auditService');

const router = express.Router();
router.use(authMiddleware, loadAuthorization);

const ensureRoleTemplates = async () => {
  for (const template of ROLE_TEMPLATES) {
    const existing = await RolePermission.findOne({ roleKey: template.roleKey });
    if (!existing) {
      await RolePermission.create({ ...template, systemRole: true });
      continue;
    }
    if (template.roleKey === 'super_admin' || !(existing.permissions || []).length) {
      Object.assign(existing, { ...template, systemRole: true });
      await existing.save();
    }
  }
};

const normalizeRolePayload = (body) => ({
  roleKey: String(body.roleKey || '').trim().toLowerCase(),
  roleLabel: String(body.roleLabel || body.roleName || '').trim(),
  description: String(body.description || '').trim(),
  allowedUserTypes: [...new Set((body.allowedUserTypes || []).filter((item) => USER_TYPES.includes(item)))],
  permissions: (body.permissions || []).map(normalizePermission).filter((item) => item.resource && PERMISSION_RESOURCES.includes(item.resource)),
  defaultScope: SCOPES.includes(body.defaultScope) ? body.defaultScope : 'none',
  active: body.active !== false,
});

router.get('/', requirePermission('roles', 'view'), async (req, res, next) => {
  try {
    await ensureRoleTemplates();
    const roles = await RolePermission.find().sort({ locked: -1, roleLabel: 1 }).lean();
    const counts = await User.aggregate([{ $match: { isDeleted: { $ne: true } } }, { $group: { _id: '$roleKey', count: { $sum: 1 } } }]);
    const countMap = new Map(counts.map((item) => [item._id, item.count]));
    res.json(roles.map((role) => ({ ...role, userCount: countMap.get(role.roleKey) || 0 })));
  } catch (error) { next(error); }
});

router.post('/', requirePermission('roles', 'create'), preventPrivilegeEscalation(), async (req, res, next) => {
  try {
    const payload = normalizeRolePayload(req.body);
    if (!/^[a-z][a-z0-9_]*$/.test(payload.roleKey)) return res.status(400).json({ message: 'Role key must use lowercase letters, numbers, and underscores' });
    if (!payload.roleLabel) return res.status(400).json({ message: 'Role name is required' });
    const role = await RolePermission.create({ ...payload, locked: false, systemRole: false, createdBy: req.user._id, updatedBy: req.user._id });
    await writeAuditLog({ req, action: 'role_created', resource: 'roles', resourceId: role.roleKey, newValue: role.toObject() });
    res.status(201).json({ message: 'Custom role created', role });
  } catch (error) { next(error); }
});

router.get('/:roleKey', requirePermission('roles', 'view'), async (req, res, next) => {
  try {
    const role = await RolePermission.findOne({ roleKey: req.params.roleKey });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    const userCount = await User.countDocuments({ roleKey: role.roleKey, isDeleted: { $ne: true } });
    res.json({ ...role.toObject(), userCount });
  } catch (error) { next(error); }
});

router.put('/:roleKey', requirePermission('roles', 'update'), preventPrivilegeEscalation(), async (req, res, next) => {
  try {
    const role = await RolePermission.findOne({ roleKey: req.params.roleKey });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    if (role.roleKey === 'super_admin' || role.locked) return res.status(403).json({ message: 'Locked role permissions cannot be modified' });
    const previousValue = role.toObject();
    const payload = normalizeRolePayload({ ...req.body, roleKey: role.roleKey });
    Object.assign(role, payload, { roleKey: role.roleKey, updatedBy: req.user._id });
    await role.save();
    await User.updateMany({ roleKey: role.roleKey }, { $inc: { sessionVersion: 1 } });
    await writeAuditLog({ req, action: 'permissions_changed', resource: 'roles', resourceId: role.roleKey, previousValue, newValue: role.toObject() });
    res.json({ message: 'Role updated', role });
  } catch (error) { next(error); }
});

router.post('/:roleKey/duplicate', requirePermission('roles', 'create'), async (req, res, next) => {
  try {
    const source = await RolePermission.findOne({ roleKey: req.params.roleKey }).lean();
    if (!source) return res.status(404).json({ message: 'Role not found' });
    const roleKey = String(req.body.roleKey || `${source.roleKey}_copy`).trim().toLowerCase();
    const role = await RolePermission.create({ ...source, _id: undefined, roleKey, roleLabel: req.body.roleLabel || `${source.roleLabel} Copy`, locked: false, systemRole: false, createdBy: req.user._id, updatedBy: req.user._id });
    await writeAuditLog({ req, action: 'role_duplicated', resource: 'roles', resourceId: role.roleKey, newValue: role.toObject(), metadata: { sourceRoleKey: source.roleKey } });
    res.status(201).json({ message: 'Role duplicated', role });
  } catch (error) { next(error); }
});

router.post('/:roleKey/reset-default', requirePermission('roles', 'manage'), async (req, res, next) => {
  try {
    const template = ROLE_TEMPLATES.find((item) => item.roleKey === req.params.roleKey);
    if (!template) return res.status(400).json({ message: 'No system default exists for this role' });
    if (template.roleKey === 'super_admin') return res.status(403).json({ message: 'Super Admin is already locked to full access' });
    const role = await RolePermission.findOneAndUpdate({ roleKey: template.roleKey }, { $set: { ...template, systemRole: true, updatedBy: req.user._id } }, { new: true, upsert: true, runValidators: true });
    await User.updateMany({ roleKey: role.roleKey }, { $inc: { sessionVersion: 1 } });
    await writeAuditLog({ req, action: 'role_reset_default', resource: 'roles', resourceId: role.roleKey, newValue: role.toObject() });
    res.json({ message: 'Role reset to secure default', role });
  } catch (error) { next(error); }
});

router.get('/meta/resources/list', requirePermission('permissions', 'view'), (req, res) => res.json({ resources: PERMISSION_RESOURCES, actions: ACTIONS, scopes: SCOPES, modules: MODULES }));

module.exports = router;
