const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  name: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true },
}, { _id: false });

const businessProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  client: { type: String, required: true, trim: true },
  owner: { type: String, default: 'Project Manager', trim: true },
  ownerEmail: { type: String, default: '', trim: true },
  assignedTeam: [teamMemberSchema],
  visibilityUsers: [{ type: String, trim: true }],
  documentAccessUsers: [{ type: String, trim: true }],
  deadline: { type: String, default: '' },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  stage: { type: String, default: 'Requirement Received', trim: true },
  health: {
    type: String,
    enum: ['Healthy', 'At Risk', 'Blocked', 'Closed'],
    default: 'Healthy',
  },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  notes: { type: String, default: '', trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

module.exports = mongoose.model('BusinessProject', businessProjectSchema);
