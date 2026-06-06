const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Client = require('../models/Client');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Specify the uploads folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Name the file with a timestamp
  }
});
const upload = multer({ storage });
const router = express.Router();

// Get all clients
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admins only' });
    }

    const clients = await Client.find().populate('assignedTo', 'name email'); // Populate the assignedTo field
    res.json(clients);
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(500).send('Server error');
  }
});

// Client comment route with optimized validation
router.post('/:clientId/comment', authMiddleware, upload.single('screenshotUrl'), async (req, res) => {
  const { comment, callStatus } = req.body;

  if (!comment || !callStatus) {
    return res.status(400).json({ message: 'Comment and call status are required.' });
  }

  try {
    const update = {
      $push: {
        callLogs: {
          comment,
          callStatus,
          screenshotUrl: req.file ? req.file.path : null, // Handle optional screenshot
          employee: req.user.id,
        },
      },
    };

    await Client.findByIdAndUpdate(req.params.clientId, update, {
      runValidators: false, // Skip other field validations
    });

    res.status(200).json({ message: 'Comment submitted successfully' });
  } catch (err) {
    console.error('Error saving comment:', err.message);
    res.status(500).send('Server error');
  }
});


// POST a comment (with screenshot) on a client
router.post('/:clientId/comment', authMiddleware, upload.single('screenshotUrl'), async (req, res) => {
  const { comment, callStatus } = req.body;

  if (!comment || !callStatus) {
    return res.status(400).json({ message: 'Comment and call status are required.' });
  }

  try {
    const client = await Client.findById(req.params.clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const newLog = {
      comment,
      callStatus,
      screenshotUrl: req.file ? req.file.path : null, // Store the screenshot path
      employee: req.user.id,
    };

    client.callLogs.push(newLog);
    await client.save();

    res.status(200).json({ message: 'Comment submitted successfully' });
  } catch (err) {
    console.error('Error saving comment:', err.message);
    res.status(500).send('Server error');
  }
});

// Fetch comments for a specific client
router.get('/:clientId/comments', authMiddleware, async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId).select('callLogs');
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(client);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign clients in bulk to an employee
router.post('/assign/bulk', authMiddleware, async (req, res) => {
  const { clientIds, employeeId } = req.body;

  try {
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      return res.status(400).json({ message: 'Invalid employee' });
    }

    await Client.updateMany(
      { _id: { $in: clientIds } },
      { $set: { assignedTo: employeeId } }
    );

    res.status(200).json({ message: 'Clients assigned successfully' });
  } catch (err) {
    console.error('Error bulk assigning clients:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all clients assigned to a specific employee
router.get('/assigned/:employeeId', authMiddleware, async (req, res) => {
  try {
    const clients = await Client.find({ assignedTo: req.params.employeeId });
    res.json(clients);
  } catch (err) {
    console.error('Error fetching assigned clients:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all assignments (for admin to see who is assigned to which clients)
router.get('/assignments', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admins only' });
    }

    const assignments = await Client.find().populate('assignedTo', 'name email');
    res.json(assignments);
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// Unassign a client from an employee
router.put('/:clientId/unassign', authMiddleware, async (req, res) => {
  const { clientId } = req.params;

  try {
    // Use `findByIdAndUpdate` with $unset and disable validation for other fields
    await Client.findByIdAndUpdate(clientId, { $unset: { assignedTo: "" } }, { runValidators: false });

    res.status(200).json({ message: 'Client unassigned successfully' });
  } catch (err) {
    console.error('Error unassigning client:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
