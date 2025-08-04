import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  value: String,
  label: String
}, { _id: false });

const filterOptionSchema = new mongoose.Schema({
  dateRangeOptions: [optionSchema],
  contentTypes: [optionSchema],
  languages: [optionSchema],
  credibilityLevels: [optionSchema],
  sortOptions: [optionSchema]
}, { timestamps: true });

export default mongoose.model('FilterOption', filterOptionSchema);