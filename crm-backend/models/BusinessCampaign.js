const mongoose = require('mongoose');

const businessCampaignSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  channel: { type: String, default: 'Google Ads', trim: true },
  spend: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  leads: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  roi: { type: Number, default: 0 },
  cpl: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Paused', 'Completed'],
    default: 'Active',
  },
  owner: { type: String, default: 'Marketing', trim: true },
  notes: { type: String, default: '', trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

module.exports = mongoose.model('BusinessCampaign', businessCampaignSchema);
