const mongoose = require('mongoose');
const { ACTIONS, SCOPES, USER_TYPES } = require('../config/accessControl');

const permissionSchema = new mongoose.Schema({
  resource: { type: String, required: true, trim: true },
  actions: [{ type: String, enum: ACTIONS }],
  scope: { type: String, enum: SCOPES, default: 'none' },
}, { _id: false });

const rolePermissionSchema = new mongoose.Schema({
  roleKey: { type: String, required: true, unique: true, trim: true, lowercase: true, match: /^[a-z][a-z0-9_]*$/ },
  roleLabel: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  allowedUserTypes: [{ type: String, enum: USER_TYPES }],
  permissions: [permissionSchema],
  defaultScope: { type: String, enum: SCOPES, default: 'none' },
  modules: [{ type: String, trim: true }],
  locked: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  systemRole: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

rolePermissionSchema.index({ active: 1, roleLabel: 1 });
module.exports = mongoose.model('RolePermission', rolePermissionSchema);
