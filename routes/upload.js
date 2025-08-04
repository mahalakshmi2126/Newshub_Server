import express from 'express';
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'your_cloud_name',
  api_key: 'your_api_key',
  api_secret: 'your_api_secret',
});

// Configure multer for file upload
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage: storage });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
      upload_preset: 'your_upload_preset', // Use your upload preset
    });
    res.json({ url: uploadResponse.secure_url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

module.exports = router;