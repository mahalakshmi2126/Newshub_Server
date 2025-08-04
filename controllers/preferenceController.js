// controllers/preferencesController.js
import Preferences from '../models/Preferences.js';

export const getPreferences = async (req, res) => {
  try {
    const prefs = await Preferences.findOne({ userId: req.params.userId });

    if (!prefs) {
      return res.status(404).json({ success: false, message: 'Preferences not found' });
    }

    res.json({ success: true, preferences: prefs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching preferences', error: err.message });
  }
};

export const updatePreferences = async (req, res) => {
  const { userId } = req.params;
  const newPrefs = req.body;

  try {
    const prefs = await Preferences.findOneAndUpdate(
      { userId },
      { $set: newPrefs },
      { new: true, upsert: true }
    );

    res.json({ success: true, preferences: prefs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating preferences', error: err.message });
  }
};