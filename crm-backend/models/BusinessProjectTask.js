const mongoose = require('mongoose');

const businessProjectTaskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProject' },
  projectName: { type: String, default: '', trim: true },
  name: { type: String, required: true, trim: true },
  assignee: { type: String, default: '', trim: true },
  assigneeEmail: { type: String, default: '', trim: true },
  team: { type: String, default: 'Delivery', trim: true },
  due: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Backlog', 'To Do', 'In Progress', 'Review', 'Complete'],
    default: 'To Do',
  },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  dependency: { type: String, default: '', trim: true },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  milestone: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

module.exports = mongoose.model('BusinessProjectTask', businessProjectTaskSchema);
