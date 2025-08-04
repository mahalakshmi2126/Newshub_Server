import mongoose from 'mongoose';

const reporterRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  location: {
    state: { type: String, required: true },
    district: { type: String, required: true },
    taluk: { type: String },
  },
  bio: { type: String },
  phone: { type: String },
  avatar: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  submittedAt: { type: Date, default: Date.now },
});

export default mongoose.model('ReporterRequest', reporterRequestSchema);