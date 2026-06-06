const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if unable to connect to MongoDB
  });

// Function to add an admin user
const addAdminUser = async () => {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'; // Default admin email
  const password = process.env.ADMIN_PASSWORD || 'admin12345'; // Default admin password

  try {
    // Check if the admin user already exists
    const user = await User.findOne({ email });
    if (user) {
      console.log('Admin user already exists');
      return;
    }

    // Create new admin user
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
    const newUser = new User({
      name: 'Admin User',
      email,
      password: hashedPassword,
      role: 'admin',
    });

    // Save the user to the database
    await newUser.save();
    console.log(`Admin user created successfully:
    Email: ${email}
    Password: ${password}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the function to add the admin user
addAdminUser();
