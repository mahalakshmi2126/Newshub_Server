import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import filterOptionsRoutes from "./routes/filterOptionsRoutes.js";
import adminRoutes from './routes/adminRoutes.js';
import externalApisRoutes from './routes/externalApisRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import bookmarkRoutes from './routes/bookmarkRoutes.js';
const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();


// Routes
app.use("/api/auth", authRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/user', userRoutes);
app.use('/api/news', newsRoutes);
app.use("/api", analyticsRoutes);
app.use('/api/comments', commentRoutes);
app.use("/api/category", categoryRoutes);
app.use('/api/filter-options', filterOptionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/external-apis', externalApisRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/bookmark', bookmarkRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(5000, () => console.log('🚀 Server running on port 5000'));
  })
  .catch((err) => console.error('❌ MongoDB Error:', err));