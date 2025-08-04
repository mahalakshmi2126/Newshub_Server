import News from '../models/News.js';

// GET /api/bookmark
export const getBookmarkedNews = async (req, res) => {
  try {
    const news = await News.find({
      bookmarkedBy: req.user.id,
      isBookmarked: true
    }).populate('reporter', 'name');

    res.status(200).json({ success: true, news });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookmarks', error: err.message });
  }
};


// POST /api/bookmark/:id (toggle)
export const toggleBookmark = async (req, res) => {
  try {
    const newsId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(newsId)) {
      return res.status(400).json({ message: 'Invalid news ID' });
    }

    const news = await News.findById(newsId);
    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    const isBookmarked = news.bookmarkedBy.includes(userId);
    if (isBookmarked) {
      news.bookmarkedBy = news.bookmarkedBy.filter(id => id.toString() !== userId.toString());
      news.isBookmarked = false;
    } else {
      news.bookmarkedBy.push(userId);
      news.isBookmarked = true;
    }

    await news.save();

    // Update user's bookmark count
    await User.findByIdAndUpdate(
      userId,
      { $inc: { 'stats.bookmarks': isBookmarked ? -1 : 1 } },
      { new: true }
    );

    res.json({
      success: true,
      message: isBookmarked ? 'Bookmark removed' : 'Bookmark added',
      isBookmarked: news.isBookmarked,
      bookmarks: news.bookmarkedBy.length,
    });
  } catch (err) {
    console.error('toggleBookmark error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// PATCH /api/bookmark/:id/folder
export const moveToFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });

    news.folder = name;
    await news.save();

    res.status(200).json({ success: true, message: 'Moved to folder' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error moving to folder', error: err.message });
  }
};
