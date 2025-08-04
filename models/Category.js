// models/Category.js
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  icon: { type: String, required: true },
  articleCount: { type: Number, default: 0 } // ✅ Add this line
});

export default mongoose.model('Category', categorySchema);
