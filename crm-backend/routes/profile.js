const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'uploads/');
  },
  filename: (req, file, callback) => {
    callback(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, callback) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extension = file.originalname.split('.').pop().toLowerCase();

    if (allowedTypes.test(file.mimetype) && allowedTypes.test(extension)) {
      callback(null, true);
      return;
    }

    callback(new Error('Only images are allowed (jpeg, jpg, png)'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const publicProfile = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || '',
  address: user.address || '',
  position: user.position || '',
  imageUrl: user.imageUrl || '',
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    return res.json({ user: publicProfile(user) });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.put('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    const { name, email, password, phone, address, position } = req.body;

    if (typeof name === 'string' && name.trim()) user.name = name.trim();
    if (typeof phone === 'string') user.phone = phone.trim();
    if (typeof address === 'string') user.address = address.trim();
    if (typeof position === 'string') user.position = position.trim();

    if (user.role === 'admin') {
      if (typeof email === 'string' && email.trim()) {
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: user._id },
        });

        if (existingUser) {
          return res.status(400).json({ message: 'Email already in use' });
        }

        user.email = normalizedEmail;
      }

      if (typeof password === 'string' && password.trim()) {
        if (password.trim().length < 8) {
          return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }
        user.password = await bcrypt.hash(password.trim(), 10);
      }
    }

    if (req.file) {
      user.imageUrl = req.file.path.replace(/\\/g, '/');
    }

    await user.save();
    return res.json({
      message: 'Profile updated successfully',
      user: publicProfile(user),
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
