const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads/op_reports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {recursive: true});
}

// File storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/op_reports/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// POST: Save OP Nutritional Screening data
router.post('/nutritional-screening', upload.single('report'), async (req, res) => {
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
      bmi,
      diagnosis,
      food_allergies,
      dietary_advice,
      dietitian_name,
    } = req.body;

    let customFields = [];
    const customFieldsRaw = req.body.customFields;

    try {
      if (customFieldsRaw) {
        customFields = JSON.parse(customFieldsRaw);
      }
    } catch (err) {
      return res.status(400).json({ message: "Invalid format for customFields" });
    }

    const report_filename = req.file ? req.file.filename : null;


    const screeningSql = `
      INSERT INTO op_nutritional_screening (
        HospNo, name, date, age, gender, blood_group,
        height, weight, bmi, diagnosis, food_allergies,
        dietary_advice, report_filename, dietitian_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const screeningValues = [
      HospNo,
      name,
      date,
      age,
      gender,
      blood_group,
      height,
      weight,
      bmi,
      diagnosis,
      food_allergies,
      dietary_advice,
      report_filename,
      dietitian_name
    ];

    const [screeningResult] = await db.query(screeningSql, screeningValues);
    const screening_id = screeningResult.insertId;

    if (customFields && Array.isArray(customFields)) {
      const fieldInserts = customFields.map(field =>
        [screening_id, field.fieldName, field.fieldValue]
      );

      const customSql = `INSERT INTO op_custom_fields (screening_id, field_name, field_value) VALUES ?`;

      try {
        if (fieldInserts.length > 0) {
          await db.query(customSql, [fieldInserts]);
        }
      } catch (err) {
        console.error("Custom field insert error:", err);
      }
    }

    res.status(201).json({ message: 'Screening and custom fields saved', screening_id });
  } catch (error) {
    console.error('Error saving screening data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET: Fetch patient screening + custom fields by HospNo
router.get('/:HospNo', async (req, res) => {
  try {
    const { HospNo } = req.params;

    const [screeningData] = await db.query(
      `SELECT * FROM op_nutritional_screening WHERE HospNo = ? ORDER BY screening_id DESC LIMIT 1`,
      [HospNo]
    );

    if (!screeningData.length) {
      return res.status(404).json({ message: 'No screening record found' });
    }

    const screening = screeningData[0];

    screening.report_path = screening.report_filename 
  ? `uploads/op_reports/${screening.report_filename}` 
  : null;
  
    const [customFields] = await db.query(
      `SELECT field_name, field_value FROM op_custom_fields WHERE screening_id = ?`,
      [screening.screening_id]
    );

    res.json({ screening, customFields });
  } catch (error) {
    console.error('Error fetching screening data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
