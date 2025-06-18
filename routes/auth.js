const express = require('express');
const db = require('../db');
const router = express.Router();

// Sign Up
router.post('/signup', async (req, res) => {
  console.log('Signup route called', req.body); // Debug log
  const { email, password, role } = req.body;
  // توليد قيم افتراضية
  const username = email.split('@')[0];
  const full_name = email.split('@')[0];
  
  console.log('Generated values:', { username, full_name, email, role }); // Debug log
  
  try {
    console.log('Checking if user exists...'); // Debug log
    const exists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    console.log('User exists check result:', exists.rows.length); // Debug log
    
    if (exists.rows.length > 0) return res.status(400).json({ message: 'User already exists' });

    console.log('Inserting new user...'); // Debug log
    const result = await db.query(
      'INSERT INTO users (username, password, full_name, email, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [username, password, full_name, email, role]
    );
    console.log('User inserted successfully:', result.rows[0]); // Debug log
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('Signup error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      where: err.where
    });
    res.status(500).json({ message: 'Sign up failed', error: err.message });
  }
});

// Log In
router.post('/login', async (req, res) => {
  console.log('Login route called', req.body); // Debug log
  const { email, password } = req.body;
  try {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

module.exports = router; 