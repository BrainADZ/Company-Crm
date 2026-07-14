const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { COMMUNITY_KEYS } = require('../config/accessControl');

const router = express.Router();
const TOKEN_EXPIRES_IN = '7d';

const getSourceIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'Unknown';
};

const recordLogin = async (user, req, status = 'Success') => {
  const now = new Date();
  user.lastLoginAt = now;
  user.loginHistory = [
    {
      loginTime: now,
      sourceIp: getSourceIp(req),
      status,
      loginUrl: req.get('origin') || req.get('host') || '',
      location: 'India',
      userAgent: req.get('user-agent') || '',
    },
    ...(user.loginHistory || []),
  ].slice(0, 25);

  await user.save();
};

// Admin Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verify the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Ensure the user is an admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admins only' });
    }

    if (user.crmRole !== 'super_admin' || COMMUNITY_KEYS.some((key) => !(user.communities || []).includes(key))) {
      user.crmRole = 'super_admin';
      user.communities = COMMUNITY_KEYS;
    }

    await recordLogin(user, req);

    // Generate JWT for admin
    const payload = {
      user: {
        id: user._id,
        role: user.role,
        crmRole: user.crmRole,
        communities: user.communities,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, crmRole: user.crmRole, communities: user.communities } });
  } catch (err) {
    console.error('Error during admin login:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Employee Login
router.post('/employee-login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the employee exists
    const employee = await User.findOne({ email, role: 'employee' });

    if (!employee) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verify the password
    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    await recordLogin(employee, req);

    // Generate JWT for employee
    const payload = {
      user: {
        id: employee._id,
        role: employee.role,
        crmRole: employee.crmRole,
        communities: employee.communities || [],
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

    res.json({ token, user: { id: employee._id, name: employee.name, email: employee.email, role: employee.role, crmRole: employee.crmRole, communities: employee.communities || [] } });
  } catch (err) {
    console.error('Error during employee login:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
