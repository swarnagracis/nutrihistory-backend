const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/ip_reports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/ip_reports/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Helper function to transform therapeutic diet fields
const transformDietFields = (diet) => {
  if (!diet) return {};
  return {
    diet_normal: diet.diet_normal ? 1 : 0,
    diet_soft: diet.diet_soft ? 1 : 0,
    diet_liquid_clear: diet.diet_liquid_clear ? 1 : 0,
    diet_liquid_full: diet.diet_liquid_full ? 1 : 0,
    diet_bland: diet.diet_bland ? 1 : 0,
    diet_diabetic: diet.diet_diabetic ? 1 : 0,
    diet_renal: diet.diet_renal ? 1 : 0,
    diet_cardiac: diet.diet_cardiac ? 1 : 0,
    diet_low_salt: diet.diet_low_salt ? 1 : 0,
    diet_npo: diet.diet_npo ? 1 : 0,
    diet_enteral: diet.diet_enteral ? 1 : 0,
    diet_tpn: diet.diet_tpn ? 1 : 0,
    diet_others: diet.diet_others ? 1 : 0
  };
};

// Route to handle IP Nutritional Screening form submission
router.post('/ip-nutritional-screening', upload.single('attachment_path'), async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.IPNo || !req.body.name) {
      return res.status(400).json({ 
        success: false,
        error: 'IPNo and name are required fields' 
      });
    }

    // Parse incoming data
    const {
      IPNo, HospNo, name, ward, date, age, gender, blood_group,
      height, weight, bmi, diagnosis, food_allergies, dietary_advice,
      feed_rate, nutrient_requirements, other_diet_note, dietitian_name
    } = req.body;

    // Parse therapeutic diet
    let diet = {};
    try {
      const therapeuticDiet = req.body.therapeutic_diet 
        ? JSON.parse(req.body.therapeutic_diet)
        : {};
      diet = transformDietFields(therapeuticDiet);
    } catch (err) {
      console.error('Error parsing therapeutic diet:', err);
      return res.status(400).json({
        success: false,
        error: 'Invalid therapeutic diet format'
      });
    }

    // Parse custom fields
    let customFields = [];
    try {
      customFields = req.body.customFields 
        ? JSON.parse(req.body.customFields)
        : [];
    } catch (err) {
      console.error('Error parsing custom fields:', err);
      return res.status(400).json({
        success: false,
        error: 'Invalid custom fields format'
      });
    }

    // Insert main screening data
    const [result] = await db.query(
      `INSERT INTO ip_nutritional_screening (
        IPNo, HospNo, name, ward, date, age, gender, blood_group,
        height, weight, bmi, diagnosis, food_allergies, dietary_advice,
        diet_normal, diet_soft, diet_liquid_clear, diet_liquid_full,
        diet_bland, diet_diabetic, diet_renal, diet_cardiac, diet_low_salt,
        diet_npo, diet_enteral, diet_tpn, diet_others,
        other_diet_note, feed_rate, nutrient_requirements, attachment_path, dietitian_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        IPNo, HospNo, name, ward, date, age, gender, blood_group,
        height, weight, bmi, diagnosis, food_allergies, dietary_advice,
        diet.diet_normal, diet.diet_soft, diet.diet_liquid_clear,
        diet.diet_liquid_full, diet.diet_bland, diet.diet_diabetic,
        diet.diet_renal, diet.diet_cardiac, diet.diet_low_salt,
        diet.diet_npo, diet.diet_enteral, diet.diet_tpn, diet.diet_others,
        other_diet_note, feed_rate, nutrient_requirements,
        req.file ? req.file.path : null, dietitian_name || null
      ]
    );

    const screening_id = result.insertId;

    // Process custom fields
    if (Array.isArray(customFields) && customFields.length > 0) {
      const reservedFields = [
        'IPNo', 'HospNo', 'name', 'ward', 'date', 'age', 'gender', 'blood_group',
        'height', 'weight', 'bmi', 'diagnosis', 'food_allergies', 'dietary_advice',
        'feed_rate', 'nutrient_requirements', 'attachment_path', 'dietitian_name',
        'other_diet_note', 'therapeutic_diet'
      ];

      const validFields = customFields.filter(field => 
        field && 
        typeof field === 'object' &&
        field.field_name &&
        !reservedFields.includes(field.field_name.trim())
      );

      if (validFields.length > 0) {
        const fieldInserts = validFields.map(field => [
          screening_id,
          field.field_name.trim(),
          field.field_value || ''
        ]);

        await db.query(
          `INSERT INTO ip_custom_fields (screening_id, field_name, field_value) VALUES ?`,
          [fieldInserts]
        );
      }
    }

    res.status(201).json({ 
      success: true,
      message: "IP Nutritional Screening saved successfully",
      screening_id
    });

  } catch (err) {
    console.error('IP Screening submission error:', {
      message: err.message,
      stack: err.stack,
      body: req.body
    });

    res.status(500).json({ 
      success: false,
      error: 'Failed to save IP Screening',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET route to fetch IP Nutritional Screening data by IPNo
router.get('/:IPNo', async (req, res) => {
  try {
    const { IPNo } = req.params;

    // Fetch main screening data
    const [screeningRows] = await db.query(
      'SELECT * FROM ip_nutritional_screening WHERE IPNo = ? ORDER BY screening_id DESC LIMIT 1',
      [IPNo]
    );

    if (!screeningRows.length) {
      return res.status(404).json({ 
        success: false,
        error: 'No screening data found for this IPNo.' 
      });
    }

    const screening = screeningRows[0];

    // Transform diet fields to camelCase for frontend
    const therapeuticDiet = {
  normal: !!screening.diet_normal,
  soft: !!screening.diet_soft,
  liquidClear: !!screening.diet_liquid_clear,
  liquidFull: !!screening.diet_liquid_full,
  bland: !!screening.diet_bland,
  diabetic: !!screening.diet_diabetic,
  renal: !!screening.diet_renal,
  cardiac: !!screening.diet_cardiac,
  lowSalt: !!screening.diet_low_salt,
  npo: !!screening.diet_npo,
  enteral: !!screening.diet_enteral,
  tpn: !!screening.diet_tpn,
  others: !!screening.diet_others
};



    // Fetch custom fields
    const [customFieldRows] = await db.query(
      'SELECT field_name, field_value FROM ip_custom_fields WHERE screening_id = ?',
      [screening.screening_id]
    );

    // Remove diet_ fields from the main screening object
    const { 
      diet_normal, diet_soft, diet_liquid_clear, diet_liquid_full,
      diet_bland, diet_diabetic, diet_renal, diet_cardiac,
      diet_low_salt, diet_npo, diet_enteral, diet_tpn, diet_others,
      ...screeningData 
    } = screening;

    res.json({
      success: true,
      screening: {
        ...screeningData,
        therapeuticDiet
      },
      customFields: customFieldRows
    });

  } catch (error) {
    console.error('Error fetching IP screening data:', {
      message: error.message,
      stack: error.stack,
      IPNo: req.params.IPNo
    });

    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch IP screening data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;