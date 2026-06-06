const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
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

module.exports = mongoose.model('Meeting', meetingSchema);
