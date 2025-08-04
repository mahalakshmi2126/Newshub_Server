// server/controllers/analyticsController.js
import News from '../models/News.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';

const CATEGORY_COLORS = [
  '#3182CE',
  '#E53E3E',
  '#38A169',
  '#D69E2E',
  '#805AD5',
  '#2B6CB0',
  '#C53030',
  '#2F855A',
  '#B7791F',
  '#6B46C1',
];

export const getAnalytics = async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { range } = req.query; // '7days', '30days', '90days'
    const days = range === '90days' ? 90 : range === '30days' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // News per day
    const news = await News.find({ createdAt: { $gte: startDate } });
    const newsPerDay = {};
    news.forEach((n) => {
      const day = n.createdAt.toISOString().split('T')[0];
      newsPerDay[day] = (newsPerDay[day] || 0) + 1;
    });
    const newsPerDayData = Object.entries(newsPerDay).map(([date, count]) => ({
      date,
      count,
    }));

    // Top contributors
    const reporterStats = await News.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$reporter',
          articles: { $sum: 1 },
          views: { $sum: '$views' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'reporter',
        },
      },
      { $unwind: '$reporter' },
      {
        $project: {
          name: '$reporter.name',
          articles: 1,
          views: 1,
          _id: 0,
        },
      },
      { $sort: { articles: -1 } }, // Sort by articles, not views
      { $limit: 5 },
    ]);

    // Category distribution
    const categoryStats = await News.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$category',
          value: { $sum: 1 },
        },
      },
    ]);
    const categoryData = categoryStats.map((cat, index) => ({
      name: cat._id || 'Unknown',
      value: cat.value,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

    // Overview stats
    const totalArticles = await News.countDocuments({
      createdAt: { $gte: startDate },
    });
    const totalViews = await News.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: '$views' } } },
    ]);
    const pendingApprovals = await News.countDocuments({
      status: 'pending',
      createdAt: { $gte: startDate },
    });
    const activeReporters = await User.countDocuments({
      role: 'reporter',
      isApproved: true,
    });

    res.json({
      success: true,
      overviewStats: [
        {
          title: 'Total Articles',
          value: totalArticles,
          change: '+12%', // Dynamic calculation later
          changeType: 'positive',
          icon: 'FileText',
        },
        {
          title: 'Total Views',
          value: totalViews[0]?.total || 0,
          change: '+18%',
          changeType: 'positive',
          icon: 'Eye',
        },
        {
          title: 'Pending Approvals',
          value: pendingApprovals,
          change: '-5%',
          changeType: 'negative',
          icon: 'Clock',
        },
        {
          title: 'Active Reporters',
          value: activeReporters,
          change: '+3',
          changeType: 'positive',
          icon: 'Users',
        },
      ],
      newsPerDay: newsPerDayData, // Match frontend
      topContributors: reporterStats,
      categoryData,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({
      success: false,
      message: 'Analytics fetch failed',
      error: err.message,
    });
  }
};



export const sendReport = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { range } = req.query;
    const days = range === '90days' ? 90 : range === '30days' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const topContributors = await News.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: 'approved' } },
      { $group: { _id: '$reporter', articles: { $sum: 1 }, views: { $sum: '$views' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'reporter' } },
      { $unwind: '$reporter' },
      { $project: { name: '$reporter.name', articles: 1, views: 1, _id: 0 } },
      { $sort: { articles: -1 } },
      { $limit: 5 },
    ]);

    const totalArticles = await News.countDocuments({
      createdAt: { $gte: startDate }, status: 'approved',
    });
    const totalViews = await News.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$views' } } },
    ]);

    const reportText = `
      Analytics Report (Last ${days} Days)
      Total Articles: ${totalArticles}
      Total Views: ${totalViews[0]?.total || 0}
      Top Contributors:
      ${topContributors.map(c => `- ${c.name}: ${c.articles} articles, ${c.views} views`).join('\n')}
    `;

    await sendEmail({
      to: req.user.email,
      subject: `Analytics Report - Last ${days} Days`,
      text: reportText,
    });

    res.json({ success: true, message: 'Report sent successfully' });
  } catch (err) {
    console.error('Send report error:', err);
    res.status(500).json({ success: false, message: 'Failed to send report' });
  }
};