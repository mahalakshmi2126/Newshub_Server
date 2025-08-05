import News from '../models/News.js';
import User from '../models/User.js';
import Comment from '../models/Comment.js';
import ReporterRequest from '../models/ReporterRequest.js';
import dotenv from 'dotenv';
dotenv.config();
import translateText from '../utils/translateText.js';


export const createNews = async (req, res) => {
  try {
    const reporter = await User.findById(req.user._id);
    if (!reporter || reporter.role !== 'reporter' || !reporter.isApproved) {
      return res.status(403).json({ success: false, message: 'Only approved reporters can post news' });
    }

    const { title, content, category, tags, state, district, mediaUrls, status = 'pending', language = 'en' } = req.body;

    if (!title || !content || !category || !state || !district) {
      return res.status(400).json({ success: false, message: 'Title, content, category, state, and district are required' });
    }

    let mediaFiles = [];
    if (mediaUrls) {
      const urls = Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls];
      mediaFiles = urls.filter(url => typeof url === 'string' && url.trim() !== '');
    }
    if (mediaFiles.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one valid media URL is required' });
    }

    const processedTags = Array.isArray(tags)
      ? tags.map(t => t.trim()).filter(t => t !== '')
      : typeof tags === 'string'
        ? tags.split(',').map(t => t.trim()).filter(t => t !== '')
        : [];

    // Translate to English & Tamil
    const titleEn = language === 'en' ? title : await translateText(title, language, 'en');
    const contentEn = language === 'en' ? content : await translateText(content, language, 'en');

    const titleTa = language === 'ta' ? title : await translateText(title, language, 'ta');
    const contentTa = language === 'ta' ? content : await translateText(content, language, 'ta');

    const newNews = new News({
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      tags: processedTags,
      state: state.trim(),
      district: district.trim(),
      media: mediaFiles,
      reporter: reporter._id,
      status,
      translations: {
        en: { title: titleEn, content: contentEn },
        ta: { title: titleTa, content: contentTa }
      }
    });

    await newNews.save();

    // Increment articlesCount if status is 'approved'
    if (status === 'approved') {
      await User.updateOne(
        { _id: reporter._id },
        { $inc: { articlesCount: 1 } }
      );
    }

    return res.status(201).json({ success: true, message: 'News posted successfully', news: newNews });
  } catch (err) {
    console.error('Error posting news:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const getFilteredNews = async (req, res) => {
  try {
    const { state, district, taluk, category } = req.query;
    const query = { status: 'approved' };

    if (state) query.state = state;
    if (district) query.district = district;
    if (taluk) query.taluk = taluk;
    if (category) query.category = category;

    const news = await News.find(query)
      .populate('reporter', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, articles: news });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

export const getMyNews = async (req, res) => {
  try {
    const reporterId = req.user._id;
    const myNews = await News.find({ reporter: reporterId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, news: myNews });
  } catch (err) {
    console.error('Error getting my news:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAllNews = async (req, res) => {
  try {
    const { state, district, category } = req.query;
    const userId = req.user?._id;

    const query = { };

    if (state) query.state = { $regex: new RegExp(`^${state}$`, 'i') };
    if (district) query.district = { $regex: new RegExp(`^${district}$`, 'i') };
    if (category) query.category = { $regex: new RegExp(`^${category}$`, 'i') };

    const news = await News.find(query)
      .populate('reporter', 'name email')
      .sort({ createdAt: -1 });

    const articles = news.map(n => {
      const isBookmarked = userId && n.bookmarkedBy?.some(id => id.toString() === userId.toString());
      return {
        ...n.toObject(),
        isBookmarked,
      };
    });

    res.status(200).json({ success: true, articles });
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

export const getBreakingNews = async (req, res) => {
  try {
    const { state, district, taluk } = req.query;

    const query = {
      category: 'breaking',
      status: 'approved'
    };

    if (state) query.state = { $regex: new RegExp(`^${state}$`, 'i') };
    if (district) query.district = { $regex: new RegExp(`^${district}$`, 'i') };
    if (taluk) query.taluk = { $regex: new RegExp(`^${taluk}$`, 'i') };

    const breakingNews = await News.find(query)
      .populate('reporter', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, articles: breakingNews });
  } catch (err) {
    console.error('Error fetching breaking news:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

export const getApprovedNewsOnly = async (req, res) => {
  try {
    const approvedNews = await News.find({ status: 'approved' }).sort({ createdAt: -1 });
    res.json(approvedNews);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch approved news' });
  }
};

export const approveReporterRequest = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role: 'reporter', isApproved: true },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await ReporterRequest.findOneAndUpdate(
      { userId: req.params.userId },
      { status: 'accepted' },
      { new: true }
    );
    res.json({ success: true, message: 'Reporter approved successfully', reporter: user });
  } catch (err) {
    console.error('Error approving reporter:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const rejectReporterRequest = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const request = await ReporterRequest.findOneAndUpdate(
      { userId: req.params.userId },
      { status: 'rejected' },
      { new: true }
    );
    if (!request) {
      return res.status(404).json({ success: false, message: 'Reporter request not found' });
    }
    res.json({ success: true, message: 'Reporter request rejected', request });
  } catch (err) {
    console.error('Error rejecting reporter:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteReporter = async (req, res) => {
  try {
    const { id } = req.params;
    const reporter = await User.findById(id);
    if (!reporter || reporter.role !== 'reporter') {
      return res.status(404).json({ message: 'Reporter not found' });
    }
    await User.findByIdAndDelete(id);
    res.json({ success: true, message: 'Reporter deleted successfully' });
  } catch (err) {
    console.error('Delete reporter error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAllReporters = async (req, res) => {
  try {
    console.log("✅ /get-all-reporters hit");

    const reporters = await User.find({ role: 'reporter', isApproved: true }).select('+password');
    res.json(reporters);
  } catch (err) {
    console.error('getAllReporters error:', err);
    res.status(500).json({ message: 'Server error while fetching reporters' });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const requests = await ReporterRequest.find({ status: 'pending' }).populate('userId', 'name email location appliedDate');
    res.json({ success: true, requests });
  } catch (err) {
    console.error('Failed to get reporter requests:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateNewsStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    const oldStatus = news.status;
    news.status = status;
    await news.save();

    // Update articlesCount
    if (status === 'approved' && oldStatus !== 'approved') {
      await User.updateOne(
        { _id: news.reporter },
        { $inc: { articlesCount: 1 } }
      );
    } else if (status !== 'approved' && oldStatus === 'approved') {
      await User.updateOne(
        { _id: news.reporter },
        { $inc: { articlesCount: -1 } }
      );
    }

    res.json({ success: true, news });
  } catch (err) {
    console.error('Update news status error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteNews = async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);
    if (!news) return res.status(404).json({ message: 'News not found' });

    res.json({ success: true, message: 'News deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getNewsById = async (req, res) => {
  try {
    // Use findByIdAndUpdate to increment the views and return updated doc
    const news = await News.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('reporter', 'name email');

    if (!news) return res.status(404).json({ message: 'News not found' });

    res.json(news);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


export const incrementViewCount = async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!news) return res.status(404).json({ message: 'News not found' });
    res.json({ success: true, message: 'View count updated', views: news.views });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PATCH /api/news/:id/share
export const incrementShareCount = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedArticle = await News.findByIdAndUpdate(
      id,
      { $inc: { shares: 1 } },
      { new: true }
    );

    if (!updatedArticle) {
      return res.status(404).json({ message: 'Article not found' });
    }

    res.json({ message: 'Share count updated', shares: updatedArticle.shares });
  } catch (err) {
    console.error('Share count error:', err);
    res.status(500).json({ message: 'Failed to update share count' });
  }
};


export const updateNews = async (req, res) => {
  try {
    const updatedNews = await News.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedNews);
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

export const searchNews = async (req, res) => {
  try {
    const { query, category } = req.query;
    const userId = req.user?._id;

    if (!query && !category) {
      return res.status(400).json({ success: false, message: 'Query or category is required' });
    }

    const searchQuery = { status: 'approved' };

    // Handle keyword search
    if (query) {
      const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      searchQuery.$or = [
        { title: regex },
        { content: regex },
        { tags: regex },
      ];
    }

    // Handle category filter
    if (category && category !== 'All Categories') {
      searchQuery.category = { $regex: new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    }

    const news = await News.find(searchQuery)
      .populate('reporter', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const articles = await Promise.all(
      news.map(async (n) => {
        const comments = await Comment.find({ articleId: n._id }).lean();
        const totalComments = comments.reduce((acc, comment) => {
          const replyCount = comment.replies ? comment.replies.length : 0;
          return acc + 1 + replyCount;
        }, 0);
        return {
          ...n,
          comments: totalComments,
          isBookmarked: userId ? n.bookmarkedBy?.some(id => id.toString() === userId.toString()) : false,
        };
      })
    );

    res.status(200).json({ success: true, articles });
  } catch (err) {
    console.error('searchNews error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// // For share preview (HTML)
// export const renderArticlePreview = async (req, res) => {
//   try {
//     const articleId = req.params.id;
//     const article = await News.findById(articleId); // assuming mongoose model

//     if (!article) {
//       return res.status(404).send('Article not found');
//     }

//     const imageUrl = article.media?.[0] || 'https://placehold.co/600x400?text=No+Image';

//     res.send(`
//       <!DOCTYPE html>
//       <html lang="en">
//       <head>
//         <meta charset="UTF-8" />
//         <meta name="viewport" content="width=device-width, initial-scale=1.0" />

//         <!-- OG Meta Tags -->
//         <meta property="og:title" content="${article.title}" />
//         <meta property="og:description" content="${article.content?.slice(0, 100)}" />
//         <meta property="og:image" content="${imageUrl}" />
//         <meta property="og:url" content="https://news-client-pearl.vercel.app/article-reading-view?id=${article._id}" />
//         <meta property="og:type" content="article" />
//         <title>${article.title}</title>
//       </head>
//       <body>
//         <h1>${article.title}</h1>
//         <p>${article.content}</p>
//         <img src="${imageUrl}" alt="${article.title}" style="max-width:100%;" />
//         <p>Click to read full article: <a href="https://news-client-pearl.vercel.app/article-reading-view?id=${article._id}">View</a></p>
//       </body>
//       </html>
//     `);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Something went wrong');
//   }
// };


// // For JSON (API)
// export const getArticlePreviewJSON = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const article = await News.findById(id);
//     if (!article) return res.status(404).json({ message: 'Article not found' });

//     res.json({
//       id: article._id,
//       title: article.title,
//       description: article.content?.slice(0, 100),
//       image: article.media?.[0],
//       url: `https://news-client-pearl.vercel.app/article-reading-view?id=${id}`
//     });
//   } catch (err) {
//     res.status(500).json({ message: 'Error loading article', error: err.message });
//   }
// };
