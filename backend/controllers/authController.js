const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { getJwtSecret } = require('../config/jwt');
const { createUser, findUserByEmail } = require('../services/userStore');

/**
 * Auth Controller
 * Handles user registration and login with JWT token generation.
 */

/**
 * POST /api/auth/signup
 * Registers a new user with hashed password and returns a JWT token.
 */
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const trimmedName = String(name || '').trim();

    // Validate required fields
    if (!trimmedName || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const usingMongo = mongoose.connection.readyState === 1;

    // Check if user already exists
    const existingUser = usingMongo
      ? await User.findOne({ email: normalizedEmail })
      : await findUserByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password with bcrypt (12 salt rounds)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in database
    const user = usingMongo
      ? await new User({
          name: trimmedName,
          email: normalizedEmail,
          password: hashedPassword
        }).save()
      : await createUser({
          name: trimmedName,
          email: normalizedEmail,
          password: hashedPassword
        });

    const userId = user._id ? String(user._id) : user.id;

    // Generate JWT token (expires in 7 days)
    const token = jwt.sign(
      { userId, email: user.email, name: user.name },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: userId,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
};

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT token.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Validate required fields
    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const usingMongo = mongoose.connection.readyState === 1;

    // Find user by email
    const user = usingMongo
      ? await User.findOne({ email: normalizedEmail })
      : await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare password with bcrypt hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id ? String(user._id) : user.id, email: user.email, name: user.name },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    const userId = user._id ? String(user._id) : user.id;

    res.json({
      token,
      user: {
        id: userId,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

module.exports = { signup, login };
