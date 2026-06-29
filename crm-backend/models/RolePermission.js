const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema({
  roleKey: { type: String, required: true, unique: true, trim: true },
  roleLabel: { type: String, required: true, trim: true },
  modules: [{ type: String, trim: true }],
  locked: { type: Boolean, default: false },
}, {
  timestamps: true,
});

module.exports = mongoose.model('RolePermission', rolePermissionSchema);
