const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
  phone: String,
  address: String,
  imageUrl: String, // URL to the employee's image
  position: String, // Employee position or title
});

module.exports = mongoose.model('User', userSchema);
