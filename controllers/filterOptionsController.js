import FilterOption from '../models/FilterOption.js';

export const getFilterOptions = async (req, res) => {
  try {
    const options = await FilterOption.findOne();
    res.status(200).json({ success: true, options });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};