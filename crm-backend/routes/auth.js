const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const TOKEN_EXPIRES_IN = '7d';

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

    // Generate JWT for admin
    const payload = {
      user: {
        id: user._id,
        role: user.role,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

    res.json({ token });
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

    // Generate JWT for employee
    const payload = {
      user: {
        id: employee._id,
        role: employee.role,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

    res.json({ token });
  } catch (err) {
    console.error('Error during employee login:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
