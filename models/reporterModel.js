import mongoose from 'mongoose';

const ReporterSchema = new mongoose.Schema({
  name: String,
  email: String,
  location: String,
  joinDate: { type: Date, default: Date.now }
});

export default mongoose.model('Reporter', ReporterSchema);