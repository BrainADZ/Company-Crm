const mongoose = require('mongoose');
const { CRM_ROLE_KEYS, COMMUNITY_KEYS } = require('../config/accessControl');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
  crmRole: {
    type: String,
    enum: CRM_ROLE_KEYS,
    default: 'employee',
  },
  communities: [{ type: String, enum: COMMUNITY_KEYS }],
  department: { type: String, default: 'Sales' },
  officeModule: { type: String, default: 'Sales' },
  team: { type: String, default: 'Sales Team' },
  permissions: [{ type: String }],
  phone: String,
  mobile: String,
  address: String,
  street: String,
  city: String,
  stateProvince: String,
  postalCode: String,
  country: { type: String, default: 'India' },
  imageUrl: String, // URL to the employee's image
  position: String, // Employee position or title
  alias: String,
  nickname: String,
  timezone: { type: String, default: '(GMT+05:30) India Standard Time (Asia/Kolkata)' },
  locale: { type: String, default: 'English (India)' },
  language: { type: String, default: 'English' },
  emailEncoding: { type: String, default: 'Unicode (UTF-8)' },
  securityQuestion: { type: String, default: 'In what city were you born?' },
  securityAnswerHash: String,
  securityAnswerUpdatedAt: Date,
  lastLoginAt: Date,
  passwordChangedAt: Date,
  loginHistory: [{
    loginTime: { type: Date, default: Date.now },
    sourceIp: String,
    loginType: { type: String, default: 'Application' },
    loginSubtype: { type: String, default: 'UI Username-Password' },
    status: String,
    application: { type: String, default: 'Browser' },
    loginUrl: String,
    location: String,
    userAgent: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
