import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  tags: { type: [String], default: [] },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  readTime: { type: Number, default: 0 },
  isBookmarked: { type: Boolean, default: false },
  bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  state: { type: String, required: true },
  district: { type: String, required: true },
  media: { type: [String], default: [] },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  publishedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  translations: {
    en: {
      title: { type: String, default: '' },
      content: { type: String, default: '' },
    },
    ta: {
      title: { type: String, default: '' },
      content: { type: String, default: '' },
    },
  },
  reports: [
    {
      reason: { type: String, required: true },
      comment: { type: String, default: '' },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  readingProgress: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 },
  folder: { type: String, default: 'default' }
});

export default mongoose.model('News', newsSchema);