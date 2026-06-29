const mongoose = require('mongoose');

const communicationLogSchema = new mongoose.Schema({
  clientName: { type: String, required: true, trim: true },
  contact: { type: String, default: '', trim: true },
  channel: {
    type: String,
    enum: ['WhatsApp', 'Email', 'SMS', 'Call', 'LinkedIn', 'Other'],
    default: 'WhatsApp',
  },
  type: { type: String, default: 'Follow-up', trim: true },
  message: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Failed'],
    default: 'Sent',
  },
  owner: { type: String, default: 'Admin', trim: true },
  relatedDataset: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientDataset', default: null },
  rowIndex: { type: Number, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

module.exports = mongoose.model('CommunicationLog', communicationLogSchema);
