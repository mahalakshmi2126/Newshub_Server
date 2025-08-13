import express from "express";
import { saveFcmToken } from "../controllers/notificationController.js";

const router = express.Router();


router.post("/save-token", saveFcmToken);

export default router;