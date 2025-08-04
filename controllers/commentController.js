// import Comment from '../models/Comment.js';
// import User from '../models/User.js';

// // GET /api/comments/:articleId
// export const getComments = async (req, res) => {
//   try {
//     const comments = await Comment.find({ articleId: req.params.articleId });
//     res.json({ comments });
//   } catch (err) {
//     res.status(500).json({ message: 'Failed to fetch comments' });
//   }
// };

// // POST /api/comments/:articleId

// export const postComment = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     const comment = await Comment.create({
//       articleId: req.params.articleId,
//       content: req.body.content,
//       author: {
//         id: user._id,
//         name: user.name,
//         avatar: user.avatar || '/assets/images/avatar-placeholder.jpg'
//       }
//     });

//     res.status(201).json({ comment });
//   } catch (err) {
//     console.error('postComment error:', err);
//     res.status(500).json({ message: 'Failed to post comment' });
//   }
// };


// // POST /api/comments/:articleId/reply/:commentId
// export const postReply = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     const comment = await Comment.findById(req.params.commentId);
//     if (!comment) return res.status(404).json({ message: 'Comment not found' });

//     const reply = {
//       content: req.body.content,
//       author: {
//         id: user._id,
//         name: user.name,
//         avatar: user.avatar || '/assets/images/avatar-placeholder.jpg'
//       }
//     };

//     comment.replies.push(reply);
//     await comment.save();

//     res.status(201).json({ reply });
//   } catch (err) {
//     console.error('postReply error:', err);
//     res.status(500).json({ message: 'Failed to post reply' });
//   }
// };


// // PATCH /api/comments/:articleId/like/:commentId
// export const likeComment = async (req, res) => {
//   try {
//     const { isReply } = req.body;
//     const comment = await Comment.findById(req.params.commentId);
//     if (!comment) return res.status(404).json({ message: 'Comment not found' });

//     if (!isReply) {
//       comment.isLiked = !comment.isLiked;
//       comment.likes += comment.isLiked ? 1 : -1;
//     } else {
//       const reply = comment.replies.id(req.params.commentId);
//       if (!reply) return res.status(404).json({ message: 'Reply not found' });

//       reply.isLiked = !reply.isLiked;
//       reply.likes += reply.isLiked ? 1 : -1;
//     }

//     await comment.save();
//     res.json({ message: 'Updated like status' });
//   } catch (err) {
//     res.status(500).json({ message: 'Failed to like comment' });
//   }
// };



import mongoose from 'mongoose';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import News from '../models/News.js';

export const postComment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { articleId } = req.params;
    const { content } = req.body;

    // Validate articleId
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      console.error(`Invalid articleId: ${articleId}`);
      return res.status(400).json({ message: 'Invalid article ID' });
    }

    // Check if article exists
    const article = await News.findById(articleId).session(session);
    if (!article) {
      console.error(`Article not found: ${articleId}`);
      await session.abortTransaction();
      return res.status(404).json({ message: 'Article not found' });
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      console.error('Comment content is empty');
      await session.abortTransaction();
      return res.status(400).json({ message: 'Comment content cannot be empty' });
    }

    // Fetch user
    console.log(`Fetching user with ID: ${req.user.id}`);
    const user = await User.findById(req.user.id).select('name avatar initials stats').session(session);
    if (!user) {
      console.error(`User not found for ID: ${req.user.id}`);
      await session.abortTransaction();
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure user has a name
    if (!user.name || user.name.trim().length === 0) {
      console.error(`User ${req.user.id} has invalid name: ${user.name}`);
      await session.abortTransaction();
      return res.status(400).json({ message: 'User name is required to post a comment' });
    }

    const comment = await Comment.create([
      {
        articleId,
        content: content.trim(),
        author: {
          id: user._id,
          name: user.name,
          avatar: user.avatar || '/assets/images/avatar-placeholder.jpg',
          initials: user.initials || user.name.slice(0, 2).toUpperCase() || 'U',
        },
        likedBy: [],
      },
    ], { session });

    // Update user's comment count
    user.stats.comments = (user.stats.comments || 0) + 1;
    await user.save({ session, validateBeforeSave: false });

    // Update News document with incremented comments count
    const updatedArticle = await News.findByIdAndUpdate(
      articleId,
      { $inc: { comments: 1 } },
      { new: true, session }
    );
    console.log(`Updated article comments count: ${updatedArticle.comments}`);

    await session.commitTransaction();
    session.endSession();

    console.log(`Comment posted by user ${user._id} for article ${articleId}`);
    res.status(201).json({ comment: comment[0] });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('postComment error:', err.message, err.stack);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', error: err.message });
    }
    res.status(500).json({ message: 'Failed to post comment', error: err.message });
  }
};  
export const getComments = async (req, res) => {
  try {
    const { articleId } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID' });
    }

    const article = await News.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const comments = await Comment.find({ articleId })
      .populate('author.id', 'name avatar initials')
      .lean();

    const formattedComments = comments.map((comment) => ({
      ...comment,
      isLiked: userId ? comment.likedBy.some(id => id && id.toString() === userId) : false,
      author: {
        id: comment.author.id._id,
        name: comment.author.id.name || 'Unknown User',
        avatar: comment.author.id.avatar || '/assets/images/avatar-placeholder.jpg',
        initials: comment.author.id.initials || comment.author.id.name?.slice(0, 2).toUpperCase() || 'U',
      },
      replies: comment.replies.map((reply) => ({
        ...reply,
        isLiked: userId ? reply.likedBy.some(id => id && id.toString() === userId) : false,
        author: {
          id: reply.author.id,
          name: reply.author.name || 'Unknown User',
          avatar: reply.author.avatar || '/assets/images/avatar-placeholder.jpg',
          initials: reply.author.initials || reply.author.name?.slice(0, 2).toUpperCase() || 'U',
        },
      })),
    }));

    res.json({
      comments: formattedComments,
      totalComments: formattedComments.length,
      totalReplies: formattedComments.reduce((acc, c) => acc + (c.replies?.length || 0), 0),
    });
  } catch (err) {
    console.error('getComments error:', err);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
};

export const postReply = async (req, res) => {
  try {
    const { articleId, commentId } = req.params;
    const { content, parentReplyId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }

    const article = await News.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Reply content cannot be empty' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const reply = {
      content: content.trim(),
      author: {
        id: user._id,
        name: user.name,
        avatar: user.avatar || '/assets/images/avatar-placeholder.jpg',
        initials: user.initials || user.name.slice(0, 2).toUpperCase() || 'U',
      },
      likedBy: [],
    };

    if (parentReplyId) {
      const updateReplies = (replies) => {
        return replies.map(r => {
          if (r._id.toString() === parentReplyId) {
            return { ...r, replies: [...r.replies, reply] };
          }
          if (r.replies) {
            return { ...r, replies: updateReplies(r.replies) };
          }
          return r;
        });
      };
      comment.replies = updateReplies(comment.replies);
    } else {
      comment.replies.push(reply);
    }

    await comment.save();
    user.stats.comments = (user.stats.comments || 0) + 1;
    await user.save();

    res.status(201).json({ reply });
  } catch (err) {
    console.error('postReply error:', err);
    res.status(500).json({ message: 'Failed to post reply', error: err.message });
  }
};

export const likeComment = async (req, res) => {
  try {
    const { articleId, commentId } = req.params;
    const { isReply, parentId, parentReplyId } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(articleId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'Invalid article or comment ID' });
    }

    const article = await News.findById(articleId);
    if (!article) return res.status(404).json({ message: 'Article not found' });

    if (isReply) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment) return res.status(404).json({ message: 'Parent comment not found' });

      const updateNestedReplyLikes = (replies) => {
        return replies.map(reply => {
          if (reply._id.toString() === commentId) {
            const alreadyLiked = reply.likedBy?.some(id => id && id.toString() === userId);
            reply.likedBy = alreadyLiked
              ? reply.likedBy.filter(id => id && id.toString() !== userId)
              : [...(reply.likedBy || []), userId];
            reply.likes = alreadyLiked ? Math.max(0, reply.likes - 1) : (reply.likes || 0) + 1;
            reply.isLiked = !alreadyLiked; // Update isLiked for the reply
          } else if (reply.replies?.length) {
            reply.replies = updateNestedReplyLikes(reply.replies);
          }
          return reply;
        });
      };

      parentComment.replies = updateNestedReplyLikes(parentComment.replies);
      await parentComment.save();
      return res.json({
        message: 'Reply like updated',
        updatedComment: parentComment,
        isReply: true,
        commentId,
        likes: parentComment.replies.find(r => r._id.toString() === commentId)?.likes || 0,
        isLiked: parentComment.replies.find(r => r._id.toString() === commentId)?.isLiked || false,
      });
    }

    // Top-level comment
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const alreadyLiked = comment.likedBy.some(id => id && id.toString() === userId);
    comment.likedBy = alreadyLiked
      ? comment.likedBy.filter(id => id && id.toString() !== userId)
      : [...comment.likedBy, userId];
    comment.likes = alreadyLiked ? Math.max(0, comment.likes - 1) : (comment.likes || 0) + 1;
    comment.isLiked = !alreadyLiked; // Update isLiked for the comment

    await comment.save();
    res.json({
      message: 'Comment like updated',
      updatedComment: comment,
      isReply: false,
      commentId,
      likes: comment.likes,
      isLiked: comment.isLiked,
    });
  } catch (err) {
    console.error('likeComment error:', err);
    res.status(500).json({ message: 'Failed to like comment', error: err.message });
  }
};
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    await Comment.findByIdAndDelete(commentId);

    // Decrease comment count in News
    await News.findByIdAndUpdate(comment.articleId, {
      $inc: { comments: -1 }
    });

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete comment', error: err.message });
  }
};

export const deleteReply = async (req, res) => {
  try {
    const { articleId, commentId, replyId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Recursive delete helper
    const deleteReplyRecursive = (replies, replyIdToDelete) => {
      return replies
        .map(r => {
          if (r._id.toString() === replyIdToDelete) return null; // delete it
          if (r.replies?.length) {
            r.replies = deleteReplyRecursive(r.replies, replyIdToDelete);
          }
          return r;
        })
        .filter(Boolean);
    };

    const originalLength = comment.replies.length;
    comment.replies = deleteReplyRecursive(comment.replies, replyId);

    if (comment.replies.length === originalLength) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    await comment.save();
    res.json({ message: 'Reply deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete reply', error: err.message });
  }
};

const updateReplies = (replies, parentReplyId, newReply) => {
  return replies.map(r => {
    if (r._id.toString() === parentReplyId) {
      r.replies.push(newReply);
    } else if (r.replies?.length) {
      r.replies = updateReplies(r.replies, parentReplyId, newReply);
    }
    return r;
  });
};