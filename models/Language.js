import mongoose from 'mongoose';

const languageSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g., 'ta'
  name: { type: String, required: true },               // e.g., 'Tamil'
  nativeName: { type: String, required: true },         // e.g., 'தமிழ்'
  flag: { type: String, required: true }                // e.g., '🇮🇳'
});

export default mongoose.model('Language', languageSchema);