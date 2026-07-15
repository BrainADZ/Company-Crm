const mongoose = require('mongoose');

const rowLogEntrySchema = new mongoose.Schema({
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedByRole: String,
  statusChanged: { type: Boolean, default: false },
  remarkChanged: { type: Boolean, default: false },
  previousStatus: { type: String, default: '' },
  currentStatus: { type: String, default: '' },
  previousRemark: { type: String, default: '' },
  currentRemark: { type: String, default: '' },
  changedAt: { type: Date, default: Date.now },
}, { _id: false });

const rowLogSchema = new mongoose.Schema({
  rowIndex: { type: Number, required: true },
  entries: [rowLogEntrySchema],
}, { _id: false });

const rowAssignmentSchema = new mongoose.Schema({
  rowIndex: { type: Number, required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeName: { type: String, default: '' },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: { type: Date, default: Date.now },
}, { _id: false });

const clientDatasetSchema = new mongoose.Schema({
  communityKey: { type: String, required: true, default: 'live', index: true },
  officeModule: { type: String, default: 'Sales', trim: true, index: true },
  team: { type: String, default: '', trim: true, index: true },
  name: { type: String, required: true, trim: true },
  year: { type: String, trim: true },
  label: { type: String, default: 'Prospect List', trim: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  source: { type: String, default: 'Excel Import', trim: true },
  ownerAlias: { type: String, default: 'Admin', trim: true },
  salesStage: { type: String, default: 'Prospecting', trim: true },
  originalFileName: String,
  columns: [{ type: String }],
  rows: [[mongoose.Schema.Types.Mixed]],
  rowLogs: [rowLogSchema],
  rowAssignments: [rowAssignmentSchema],
  rowCount: { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

clientDatasetSchema.index({ communityKey: 1, createdAt: -1 });

module.exports = mongoose.model('ClientDataset', clientDatasetSchema);
