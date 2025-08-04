// controllers/reportController.js
import Report from '../models/Report.js';

export const submitReport = async (req, res) => {
  const { articleId, reason, comment } = req.body;
  if (!articleId || !reason) {
    return res.status(400).json({ message: 'articleId and reason are required' });
  }
  try {
    const report = new Report({
      articleId,
      reason,
      comment: comment || '',
      userId: req.headers.authorization ? 'user-id-placeholder' : null, // Replace with actual user ID if authenticated
    });
    const savedReport = await report.save();
    console.log('Report saved:', savedReport); // Debug log
    res.status(201).json({ message: 'Report submitted successfully' });
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ message: 'Failed to save report' });
  }
};

// controllers/reportController.js
export const getReports = async (req, res) => {
  try {
    const reports = await Report.find();
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

