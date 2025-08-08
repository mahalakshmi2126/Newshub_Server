// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema({
//   name: String,
//   email: { type: String, required: true, unique: true },
//   bio: String,
//   location: String,
//   avatar: String,
//   initials: String,
//   joinDate: { type: Date, default: Date.now },
//     stats: {
//     articlesRead: { type: Number, default: 0 },
//     bookmarks: { type: Number, default: 0 },
//     comments: { type: Number, default: 0 }
//   },
//   password: { type: String, required: true },
//   userType: { type: String, enum: ['admin', 'reporter'], required: true },
//   preferredLanguages: [String], // ✅ already added
//   resetToken: String,
//   resetTokenExpiry: Date
// });

// export default mongoose.model("User", userSchema);



// models/user.model.js
// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   name: String,
//   email: String,
//   bio: String,
//   location: String,
//   avatar: String,
//   initials: String,
//   joinDate: String,
//   stats: {
//     articlesRead: Number,
//     bookmarks: Number,
//     comments: Number
//   },
//   languageSettings: {
//     interfaceLanguage: String,
//     contentLanguages: [String],
//     autoTranslate: Boolean,
//     showOriginalText: Boolean,
//     rtlSupport: Boolean
//   },
//   contentPreferences: {
//     categories: [String],
//     sources: [String],
//     hideReadArticles: Boolean,
//     showImages: Boolean,
//     adultContentFilter: Boolean
//   },
//   notificationSettings: {
//     notifications: {
//       breakingNews: Boolean,
//       personalizedRecommendations: Boolean,
//       commentReplies: Boolean,
//       weeklyDigest: Boolean,
//       trendingTopics: Boolean,
//       followedSources: Boolean
//     },
//     deliveryMethods: [String],
//     quietHours: String,
//     soundEnabled: Boolean,
//     vibrationEnabled: Boolean,
//     groupNotifications: Boolean
//   },
//   privacySettings: {
//     profileVisibility: Boolean,
//     showReadingHistory: Boolean,
//     showBookmarks: Boolean,
//     allowComments: Boolean,
//     shareReadingStats: Boolean,
//     allowFollowers: Boolean,
//     personalizedAds: Boolean,
//     analyticsTracking: Boolean,
//     locationTracking: Boolean,
//     socialMediaIntegration: Boolean
//   },
//   appearanceSettings: {
//     theme: String,
//     fontSize: String,
//     layout: String,
//     highContrast: Boolean,
//     reduceMotion: Boolean,
//     screenReaderOptimized: Boolean,
//     showThumbnails: Boolean,
//     showReadingTime: Boolean,
//     compactCards: Boolean
//   },
//   securitySettings: {
//     twoFactorEnabled: Boolean,
//     loginAlerts: Boolean,
//     suspiciousActivityAlerts: Boolean
//   },

//   password: { type: String, required: true },
//   userType: { type: String, enum: ['admin', 'reporter'], required: true },
//   preferredLanguages: [String], // ✅ already added
//   resetToken: String,
//   resetTokenExpiry: Date
// }, {
//   timestamps: true
// });

// module.exports = mongoose.model('User', userSchema);


import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'User name is required'], trim: true },
  email: { type: String, required: [true, 'Email is required'], unique: true, trim: true },
  password: { type: String, required: [true, 'Password is required'] },
  originalPassword: { type: String },
  location: {
    state: { type: String, default: '' },
    district: { type: String, default: '' },
    taluk: { type: String, default: '' },
  },
  role: { type: String, enum: ['user', 'reporter', 'admin'], default: 'user' },
  articlesCount: { type: Number, default: 0 },
  joinDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'inactive', 'rejected'], default: 'active' },
  preferredLanguages: { type: [String], default: [] },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  isApproved: { type: Boolean, default: false },
  reporterFormSubmitted: { type: Boolean, default: false },
  bio: { type: String, default: '' },
  phone: { type: String, default: '' },
  avatar: { type: String, default: '/assets/images/no_image.png' },
  initials: { type: String, default: '' },
  appliedDate: { type: Date },
  stats: {
    articlesRead: { type: Number, default: 0 },
    bookmarks: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
  },
  settings: {
    contentPreferences: {
      categories: { type: [String], default: [] },
      sources: { type: [String], default: [] },
    },
    notificationSettings: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
    },
    privacySettings: {
      showReadingHistory: { type: Boolean, default: false },
      showBookmarks: { type: Boolean, default: false },
      allowComments: { type: Boolean, default: true },
      shareReadingStats: { type: Boolean, default: false },
      allowFollowers: { type: Boolean, default: true },
    },
    appearanceSettings: {
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
      fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    },
  },
});

userSchema.pre('save', function (next) {
  if (!this.name || this.name.trim().length === 0) {
    return next(new Error('User name cannot be empty'));
  }
  if (this.isModified('name') || !this.initials) {
    this.initials = this.name.trim().slice(0, 2).toUpperCase() || 'U';
  }
  next();
});

export default mongoose.model('User', userSchema);