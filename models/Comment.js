import mongoose from 'mongoose';

// Function to create replySchema with deferred recursive reference
const createReplySchema = () => {
  const replySchema = new mongoose.Schema({
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: [1, 'Reply content cannot be empty'],
    },
    author: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      avatar: { type: String, default: '/assets/images/avatar-placeholder.jpg' },
      initials: { type: String },
    },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likes: { type: Number, default: 0 },
    isLiked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  }, { _id: true});

  // Add replies field after schema is defined
  replySchema.add({
    replies: [replySchema], // Self-reference after schema is initialized
  });

  return replySchema;
};

// Create replySchema instance
const replySchema = createReplySchema();

// Define CommentSchema
const commentSchema = new mongoose.Schema({
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'News', required: true },
  content: { type: String, required: true, trim: true },
  author: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    avatar: { type: String, default: '/assets/images/avatar-placeholder.jpg' },
    initials: { type: String },
  },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likes: { type: Number, default: 0 },
  isLiked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  replies: [replySchema], // Use the defined replySchema
});

// Add index for articleId to optimize queries
commentSchema.index({ articleId: 1 });

export default mongoose.model('Comment', commentSchema);