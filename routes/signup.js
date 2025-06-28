// backend/routes/signup.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../database');

// Signup POST route
router.post('/', async (req, res) => {
  const { name, email, userId, password } = req.body;

  if (!name || !email || !userId || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO signup (name, email, userId, password)
      VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [name, email, userId, hashedPassword], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email or User ID already exists.' });
        }
        console.error(err);
        return res.status(500).json({ error: 'Database error.' });
      }

      res.status(201).json({ message: 'Signup successful!' });
    });
  } catch (err) {
    console.error('Hashing error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
