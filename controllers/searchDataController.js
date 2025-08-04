import RecentSearch from '../models/RecentSearch.js';
import TrendingQuery from '../models/TrendingQuery.js';
import SavedSearch from '../models/SavedSearch.js';

export const getSearchData = async (req, res) => {
  try {
    const [recentSearches, trendingQueries, savedSearches] = await Promise.all([
      RecentSearch.find().sort({ createdAt: -1 }).limit(10),
      TrendingQuery.find().sort({ searchCount: -1 }).limit(10),
      SavedSearch.find().sort({ createdAt: -1 }).limit(10)
    ]);
    res.status(200).json({
      success: true,
      recentSearches,
      trendingQueries,
      savedSearches
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};