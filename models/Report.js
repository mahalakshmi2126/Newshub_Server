// models/Report.js
import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  articleId: { type: String, required: true },
  reason: { type: String, required: true },
  comment: { type: String, default: '' },
  userId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});
const Report = mongoose.model('Report', reportSchema);

export default Report;