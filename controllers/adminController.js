import bcrypt from 'bcrypt';
import User from '../models/User.js';

export const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check if admin already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      originalPassword: password // ⚠️ only for demo/testing
    });

    await admin.save();
    res.status(201).json({ message: 'Admin created successfully', admin });
  } catch (err) {
    console.error('Admin creation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};