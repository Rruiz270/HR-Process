const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-process';

async function createAdmin() {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const email = 'admin@example.com';
  const password = 'password123';
  const name = 'Admin User';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Admin user already exists.');
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = new User({
    email,
    password: hashedPassword,
    name,
    role: 'admin',
    isActive: true,
  });
  await admin.save();
  console.log('Admin user created:', email);
  process.exit(0);
}

createAdmin().catch(err => {
  console.error('Error creating admin user:', err);
  process.exit(1);
}); 