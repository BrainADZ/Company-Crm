const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  communityKey: { type: String, required: true, default: 'live', index: true },
  officeModule: { type: String, default: 'Sales', trim: true, index: true },
  team: { type: String, default: '', trim: true, index: true },
  participantUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  clientVisible: { type: Boolean, default: false },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientDataset', required: true },
  rowIndex: { type: Number, required: true },
  datasetName: { type: String, default: '' },
  clientName: { type: String, default: '' },
  companyName: { type: String, default: '' },
  meetingTitle: { type: String, required: true, trim: true },
  meetingDate: { type: String, required: true },
  meetingTime: { type: String, required: true },
  meetingMode: {
    type: String,
    enum: ['Physical', 'Online', 'Phone'],
    default: 'Online',
  },
  platformOrLocation: { type: String, default: '' },
  notes: { type: String, default: '' },
}, {
  timestamps: true,
});

meetingSchema.index({ communityKey: 1, employee: 1, meetingDate: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);
