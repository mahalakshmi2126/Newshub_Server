import mongoose from 'mongoose';

const DataSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., 'market', 'weather', 'news'
  data: { type: Object, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
});

module.exports = mongoose.model('Data', DataSchema);