import News from "../models/News.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
import ReporterRequest from "../models/ReporterRequest.js";
import dotenv from "dotenv";
dotenv.config();
import translateText from "../utils/translateText.js";
import admin from "../firebase.js";

export const createNews = async (req, res) => {
  try {
    const reporter = await User.findById(req.user._id);
    if (!reporter || reporter.role !== "reporter" || !reporter.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Only approved reporters can post news",
      });
    }

    const {
      title,
      content,
      category,
      tags,
      state,
      district,
      mediaUrls,
      status = "pending",
      language = "en",
    } = req.body;

    if (!title || !content || !category || !state || !district) {
      return res.status(400).json({
        success: false,
        message: "Title, content, category, state, and district are required",
      });
    }

    let mediaFiles = [];
    if (mediaUrls) {
      const urls = Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls];
      mediaFiles = urls.filter(
        (url) => typeof url === "string" && url.trim() !== ""
      );
    }
    if (mediaFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one valid media URL is required",
      });
    }

    const processedTags = Array.isArray(tags)
      ? tags.map((t) => t.trim()).filter((t) => t !== "")
      : typeof tags === "string"
      ? tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t !== "")
      : [];

    // Validate language
    if (!["en", "ta"].includes(language)) {
      return res
        .status(400)
        .json({ success: false, message: "Language must be 'en' or 'ta'" });
    }

    const safeTranslate = async (text, to) => {
      try {
        const translated = await translateText(text, to);
        return translated && translated.trim() ? translated : text;
      } catch (err) {
        console.error(`Translation error to ${to}:`, err.message);
        return text;
      }
    };

    const titleEn =
      language === "en" ? title : await safeTranslate(title, "en");
    const contentEn =
      language === "en" ? content : await safeTranslate(content, "en");

    const titleTa =
      language === "ta" ? title : await safeTranslate(title, "ta");
    const contentTa =
      language === "ta" ? content : await safeTranslate(content, "ta");

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
      language,
      translations: {
        en: { title: titleEn, content: contentEn },
        ta: { title: titleTa, content: contentTa },
      },
    });

    await newNews.save();

    // Increment articlesCount if approved
    if (status === "approved") {
      await User.updateOne(
        { _id: reporter._id },
        { $inc: { articlesCount: 1 } }
      );
    }

    return res.status(201).json({
      success: true,
      message: "News posted successfully",
      news: newNews,
    });
  } catch (err) {
    console.error("Error posting news:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const getFilteredNews = async (req, res) => {
  try {
    const { state, district, taluk, category } = req.query;
    const query = { status: "approved" };

    if (state) query.state = state;
    if (district) query.district = district;
    if (taluk) query.taluk = taluk;
    if (category) query.category = category;

    const news = await News.find(query)
      .populate("reporter", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, articles: news });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

export const getMyNews = async (req, res) => {
  try {
    const reporterId = req.user._id;
    const myNews = await News.find({ reporter: reporterId }).sort({
      createdAt: -1,
    });

    res.status(200).json({ success: true, news: myNews });
  } catch (err) {
    console.error("Error getting my news:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllNews = async (req, res) => {
  try {
    const { state, district, category } = req.query;
    const userId = req.user?._id;

    const query = {};

    if (state) query.state = { $regex: new RegExp(`^${state}$`, "i") };
    if (district) query.district = { $regex: new RegExp(`^${district}$`, "i") };
    if (category) query.category = { $regex: new RegExp(`^${category}$`, "i") };

    const news = await News.find(query)
      .populate("reporter", "name email")
      .sort({ createdAt: -1 });

    const articles = news.map((n) => {
      const isBookmarked =
        userId &&
        n.bookmarkedBy?.some((id) => id.toString() === userId.toString());
      return {
        ...n.toObject(),
        isBookmarked,
      };
    });

    res.status(200).json({ success: true, articles });
  } catch (err) {
    console.error("Error fetching news:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

export const getBreakingNews = async (req, res) => {
  try {
    const { state, district, taluk } = req.query;

    const query = {
      category: "breaking",
      status: "approved",
    };

    if (state) query.state = { $regex: new RegExp(`^${state}$`, "i") };
    if (district) query.district = { $regex: new RegExp(`^${district}$`, "i") };
    if (taluk) query.taluk = { $regex: new RegExp(`^${taluk}$`, "i") };

    const breakingNews = await News.find(query)
      .populate("reporter", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, articles: breakingNews });
  } catch (err) {
    console.error("Error fetching breaking news:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

export const getApprovedNewsOnly = async (req, res) => {
  try {
    const approvedNews = await News.find({ status: "approved" }).sort({
      createdAt: -1,
    });
    res.json(approvedNews);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch approved news" });
  }
};

export const approveReporterRequest = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });
    }
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role: "reporter", isApproved: true },
      { new: true }
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    await ReporterRequest.findOneAndUpdate(
      { userId: req.params.userId },
      { status: "accepted" },
      { new: true }
    );
    res.json({
      success: true,
      message: "Reporter approved successfully",
      reporter: user,
    });
  } catch (err) {
    console.error("Error approving reporter:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const rejectReporterRequest = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });
    }
    const request = await ReporterRequest.findOneAndUpdate(
      { userId: req.params.userId },
      { status: "rejected" },
      { new: true }
    );
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Reporter request not found" });
    }
    res.json({ success: true, message: "Reporter request rejected", request });
  } catch (err) {
    console.error("Error rejecting reporter:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteReporter = async (req, res) => {
  try {
    const { id } = req.params;
    const reporter = await User.findById(id);
    if (!reporter || reporter.role !== "reporter") {
      return res.status(404).json({ message: "Reporter not found" });
    }
    await User.findByIdAndDelete(id);
    res.json({ success: true, message: "Reporter deleted successfully" });
  } catch (err) {
    console.error("Delete reporter error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllReporters = async (req, res) => {
  try {
    console.log("✅ /get-all-reporters hit");

    const reporters = await User.find({
      role: "reporter",
      isApproved: true,
    }).select("+password");
    res.json(reporters);
  } catch (err) {
    console.error("getAllReporters error:", err);
    res.status(500).json({ message: "Server error while fetching reporters" });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });
    }
    const requests = await ReporterRequest.find({ status: "pending" }).populate(
      "userId",
      "name email location appliedDate"
    );
    res.json({ success: true, requests });
  } catch (err) {
    console.error("Failed to get reporter requests:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const updateNewsStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 1️⃣ Validate status
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    // 2️⃣ Find the news and populate reporter info
    const news = await News.findById(id).populate("reporter");
    if (!news) {
      return res.status(404).json({ success: false, message: "Article not found" });
    }

    const oldStatus = news.status;
    news.status = status;
    await news.save();

    // 3️⃣ Update reporter's article count
    if (status === "approved" && oldStatus !== "approved") {
      await User.updateOne(
        { _id: news.reporter._id },
        { $inc: { articlesCount: 1 } }
      );

      // 4️⃣ Send push notifications to all opted-in users
      const users = await User.find({
        "settings.notificationSettings.pushNotifications": true,
        fcmToken: { $exists: true, $ne: "" }
      });

      const tokens = users.map(u => u.fcmToken).filter(Boolean);

      if (tokens.length > 0) {
        const message = {
          notification: {
            title: news.title,
            body: (news.summary || news.content?.slice(0, 100) + "...") || "Click to read more",
          },
          webpush: {
            fcmOptions: {
              link: `${process.env.FRONTEND_URL}/news/${news._id}`
            }
          },
          tokens
        };

        await admin.messaging().sendMulticast(message);
      }

    } else if (status !== "approved" && oldStatus === "approved") {
      await User.updateOne(
        { _id: news.reporter._id },
        { $inc: { articlesCount: -1 } }
      );
    }

    res.json({ success: true, news });
  } catch (err) {
    console.error("Update news status error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const deleteNews = async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);
    if (!news) return res.status(404).json({ message: "News not found" });

    res.json({ success: true, message: "News deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const getNewsById = async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate("reporter", "name email")
      .select("+translations"); // Include translations

    if (!news) return res.status(404).json({ message: "News not found" });

    res.json(news);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const incrementViewCount = async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!news) return res.status(404).json({ message: "News not found" });
    res.json({
      success: true,
      message: "View count updated",
      views: news.views,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const incrementShareCount = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedArticle = await News.findByIdAndUpdate(
      id,
      { $inc: { shares: 1 } },
      { new: true }
    );

    if (!updatedArticle) {
      return res.status(404).json({ message: "Article not found" });
    }

    res.json({ message: "Share count updated", shares: updatedArticle.shares });
  } catch (err) {
    console.error("Share count error:", err);
    res.status(500).json({ message: "Failed to update share count" });
  }
};

export const updateNews = async (req, res) => {
  try {
    const updatedNews = await News.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updatedNews);
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};

export const searchNews = async (req, res) => {
  try {
    const { query, category } = req.query;
    const userId = req.user?._id;

    if (!query && !category) {
      return res
        .status(400)
        .json({ success: false, message: "Query or category is required" });
    }

    const searchQuery = { status: "approved" };

    // Handle keyword search
    if (query) {
      const regex = new RegExp(
        query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      searchQuery.$or = [{ title: regex }, { content: regex }, { tags: regex }];
    }

    // Handle category filter
    if (category && category !== "All Categories") {
      searchQuery.category = {
        $regex: new RegExp(
          `^${category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i"
        ),
      };
    }

    const news = await News.find(searchQuery)
      .populate("reporter", "name email")
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
          isBookmarked: userId
            ? n.bookmarkedBy?.some((id) => id.toString() === userId.toString())
            : false,
        };
      })
    );

    res.status(200).json({ success: true, articles });
  } catch (err) {
    console.error("searchNews error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

export const translateNews = async (req, res) => {  
  try {
    const { id } = req.params;
    const { targetLang } = req.body;

    // Validate target language
    if (!["en", "ta"].includes(targetLang)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target language. Use "en" or "ta".',
      });
    }

    // Find news article
    const news = await News.findById(id);
    if (!news) {
      return res
        .status(404)
        .json({ success: false, message: "News not found" });
    }

    // Return pre-translated content if available
    if (
      news.translations?.[targetLang]?.title &&
      news.translations?.[targetLang]?.content
    ) {
      return res.status(200).json({
        success: true,
        translations: {
          [targetLang]: {
            title: news.translations[targetLang].title,
            content: news.translations[targetLang].content,
          },
        },
      });
    }

    // Generate translations if not available
    const sourceLang =
      news.language || (news.translations.en.title ? "en" : "ta");
    const title = await translateText(news.title, sourceLang, targetLang);
    const content = await translateText(news.content, sourceLang, targetLang);

    if (!title || !content) {
      return res
        .status(500)
        .json({ success: false, message: "Translation failed" });
    }

    // Update the news document with new translations
    news.translations[targetLang] = { title, content };
    await news.save();

    return res.status(200).json({
      success: true,
      translations: {
        [targetLang]: { title, content },
      },
    });
  } catch (err) {
    console.error("Translate news error:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};