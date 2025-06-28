const express = require('express');
const router = express.Router();
const db = require('../database'); // your mysql connection file

// Add CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// GET patient by HospNo - improved version
router.get('/:HospNo', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM op_patients WHERE HospNo = ?',
      [req.params.HospNo.trim()]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({ 
      success: true, 
      patient: rows[0] });
  } catch (err) {
    console.error('Database error:', {
      message: err.message,
      sql: err.sql,
      sqlMessage: err.sqlMessage
    });
    res.status(500).json({ 
      error: 'Database error',
      details: err.sqlMessage 
    });
  }
});

// POST new patient (excluding BMI)
router.post('/patient-registration', async (req, res) => {
  try {
    const {
      HospNo,
      name,
      date,
      age,
      gender,
      blood_group,
      height,
      weight,
      department,
      phone,
      address
    } = req.body;

    // Validation
    if (!HospNo || !name || !date || !age || !gender) {
      return res.status(400).json({ error: 'HospNo, name, date, age, and gender are required.' });
    }

    if (isNaN(age) || age < 0) {
      return res.status(400).json({ error: 'Age must be a valid positive number.' });
    }

    if (height && isNaN(height)) {
      return res.status(400).json({ error: 'Height must be a number.' });
    }

    if (weight && isNaN(weight)) {
      return res.status(400).json({ error: 'Weight must be a number.' });
    }

    if (phone && !/^\d{10,15}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone must be 10-15 digits only.' });
    }

    // SQL insert (excluding BMI)
    const [result] = await db.query(
      `INSERT INTO op_patients (
        HospNo, name, date, age, gender, blood_group,
        height, weight, department, phone, address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [HospNo, name, date, age, gender, blood_group, height, weight, department, phone, address]
    );

    res.status(201).json({ 
      success: true,
      message: 'Patient saved successfully',
      patientId: result.insertId  // Send back the new ID
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Hospital Number already exists.' });
    }
    console.error('Patient registration error:', err);
    res.status(500).json({ 
      error: 'Database operation failed',
      details: err.sqlMessage 
    });
  }
});

// Test route
router.get('/test-param/:hospNo', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM op_patients WHERE HospNo = ?',
      [req.params.hospNo]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
