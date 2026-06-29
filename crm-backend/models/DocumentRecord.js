const mongoose = require('mongoose');

const documentRecordSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, default: 'Proposal', trim: true },
  project: { type: String, default: 'All Projects', trim: true },
  owner: { type: String, default: 'Admin', trim: true },
  access: {
    type: String,
    enum: ['Internal', 'Client View', 'Restricted'],
    default: 'Internal',
  },
  fileUrl: { type: String, default: '', trim: true },
  notes: { type: String, default: '', trim: true },
  uploadedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

module.exports = mongoose.model('DocumentRecord', documentRecordSchema);
