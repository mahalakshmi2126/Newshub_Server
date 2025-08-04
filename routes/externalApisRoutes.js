// // routes/externalApisRoutes.js
// import express from 'express';
// import {
//   fetchTopNews,
//   fetchWeather,
//   fetchSelectedMarketData,
//   translateText
// } from '../controllers/externalApisController.js';

// const router = express.Router();

// // ✅ All routes
// router.get('/top-news', fetchTopNews);
// router.get('/weather', fetchWeather);
// router.get('/market-data', fetchSelectedMarketData);
// router.post('/translate', translateText);

// export default router;


import express from 'express';
const router = express.Router();
import {
  fetchMarketData,
  fetchWeather,
  fetchTopNews,
  fetchLocationFromCoordinates
  // getStoredData,
} from '../controllers/externalApisController.js';

router.get('/market', fetchMarketData);
router.get('/weather', fetchWeather);
router.get('/top-news', fetchTopNews);
router.get('/location', fetchLocationFromCoordinates);
 
export default router;