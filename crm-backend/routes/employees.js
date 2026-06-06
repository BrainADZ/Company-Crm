const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Set up multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(file.originalname.split('.').pop().toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed (jpeg, jpg, png)'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB file size limit
});

// Get all employees
router.get('/', authMiddleware, async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' });
    res.json(employees);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Register new employee
router.post('/register', authMiddleware, upload.single('image'), async (req, res) => {
  const { name, email, password, phone, address, position } = req.body;

  try {
    // Validate input
    if (!name || !email || !password || !phone || !address || !position) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new employee
    const newEmployee = new User({
      name,
      email,
      password: hashedPassword,
      role: 'employee',
      phone,
      address,
      imageUrl: req.file ? req.file.path : null,
      position,
    });

    await newEmployee.save();
    res.status(201).json({ message: 'Employee registered successfully', employeeId: newEmployee._id });
  } catch (err) {
    console.error('Error in employee registration:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete an employee by ID
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.params.id;

    console.log(`Received request to delete employee with ID: ${employeeId}`); // Log the ID to check

    const employee = await User.findByIdAndDelete(employeeId);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('Error during deletion:', err.message);
    res.status(500).send('Server error');
  }
});

// Update an employee by ID
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  const { name, email, password, phone, address, position } = req.body;

  try {
    // Find the employee by ID
    const employee = await User.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Update employee fields
    employee.name = name || employee.name;
    employee.email = email || employee.email;
    employee.phone = phone || employee.phone;
    employee.address = address || employee.address;
    employee.position = position || employee.position;

    if (password) {
      // If a new password is provided, hash it
      const salt = await bcrypt.genSalt(10);
      employee.password = await bcrypt.hash(password, salt);
    }

    if (req.file) {
      // If a new image is uploaded, update the imageUrl
      employee.imageUrl = req.file.path.replace(/\\/g, '/'); // Ensure correct file path format
    }

    await employee.save();
    res.status(200).json({ message: 'Employee updated successfully' });
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Get logged-in employee details
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const employee = await User.findById(req.user.id).select('-password'); // Exclude the password
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (err) {
    console.error('Error fetching employee details:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
