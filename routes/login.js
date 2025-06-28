const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../database');

// POST /api/login
router.post('/', async (req, res) => {  // Added async here
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: 'User ID and password are required.' });
  }

  try {
    // Get connection from pool
    const connection = await db.getConnection();
    
    try {
      const [rows] = await connection.query(
        'SELECT * FROM signup WHERE userId = ?', 
        [userId]
      );

      if (rows.length === 0) {  // Changed from results to rows
        return res.status(401).json({ error: 'Invalid credentials.' });  // Changed to 401
      }

      const user = rows[0];  // Changed from results to rows

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      res.json({
        message: 'Login successful',
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email
        }
      });
    } finally {
      // Always release the connection back to the pool
      connection.release();
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;