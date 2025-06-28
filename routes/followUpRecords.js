const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/followups');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, JPG, and PNG files are allowed'));
    }
  }
});

// Create new follow-up record
router.post('/', upload.single('attachment'), async (req, res) => {
  try {
    const { IPNo, name, date, diagnosis, notes, actions, comments } = req.body;

    if (!IPNo || !name || !date) {
      return res.status(400).json({
        success: false,
        error: 'HospNo, name, and date are required fields'
      });
    }

    const [result] = await db.query(
      `INSERT INTO follow_up_records (
        IPNo, name, date, diagnosis, notes, 
        actions, comments, attachment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        IPNo,
        name,
        date,
        diagnosis || null,
        notes || null,
        actions || null,
        comments || null,
        req.file ? req.file.filename : null
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        IPNo,
        name,
        date,
        attachment: req.file ? req.file.filename : null
      }
    });

  } catch (err) {
    console.error('Error creating follow-up:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to create follow-up record'
    });
  }
});

// Get all follow-ups for a specific patient
router.get('/patient/:IPNo', async (req, res) => {
  try {
    const { IPNo } = req.params;

    const [records] = await db.query(
      `SELECT * FROM follow_up_records 
       WHERE IPNo = ? 
       ORDER BY date DESC`,
      [IPNo]
    );

    res.json({
      success: true,
      data: records
    });

  } catch (err) {
    console.error('Error fetching follow-ups:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch follow-up records'
    });
  }
});

// Get single follow-up by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [records] = await db.query(
      `SELECT * FROM follow_up_records WHERE id = ?`,
      [id]
    );

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Follow-up record not found'
      });
    }

    res.json({
      success: true,
      data: records[0]
    });

  } catch (err) {
    console.error('Error fetching follow-up:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch follow-up record'
    });
  }
});

// Get all follow-up records (for filtering by date, etc.)
router.get('/', async (req, res) => {
  try {
    const [records] = await db.query(`SELECT * FROM follow_up_records ORDER BY date DESC`);
    res.json({ success: true, data: records });
  } catch (err) {
    console.error('Error fetching all follow-ups:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch follow-up records' });
  }
});

// Update follow-up record
router.put('/:id', upload.single('attachment'), async (req, res) => {
  try {
    const { id } = req.params;
    const { IPNo, name, date, diagnosis, notes, actions, comments } = req.body;

    // First get the existing record
    const [existing] = await db.query(
      `SELECT * FROM follow_up_records WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Follow-up record not found'
      });
    }

    // Prepare update data
    const updateData = {
      IPNo: IPNo || existing[0].IPNo,
      name: name || existing[0].name,
      date: date || existing[0].date,
      diagnosis: diagnosis || existing[0].diagnosis,
      notes: notes || existing[0].notes,
      actions: actions || existing[0].actions,
      comments: comments || existing[0].comments,
      attachment: req.file ? req.file.filename : existing[0].attachment
    };

    await db.query(
      `UPDATE follow_up_records SET
        IPNo = ?, name = ?, date = ?, diagnosis = ?,
        notes = ?, actions = ?, comments = ?, attachment = ?
       WHERE id = ?`,
      [
        updateData.IPNo,
        updateData.name,
        updateData.date,
        updateData.diagnosis,
        updateData.notes,
        updateData.actions,
        updateData.comments,
        updateData.attachment,
        id
      ]
    );

    res.json({
      success: true,
      data: { id, ...updateData }
    });

  } catch (err) {
    console.error('Error updating follow-up:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update follow-up record'
    });
  }
});

// Download attachment
router.get('/attachment/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/followups', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.download(filePath);

  } catch (err) {
    console.error('Error downloading file:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

module.exports = router;