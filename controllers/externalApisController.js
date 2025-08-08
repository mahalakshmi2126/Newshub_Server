import axios from 'axios';
import dotenv from 'dotenv';
import xml2js from 'xml2js';
dotenv.config();

const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });

const rssFeeds = [
  { name: 'BBC Tamil', url: 'https://feeds.bbci.co.uk/tamil/rss.xml' },
  { name: 'NDTV', url: 'http://feeds.feedburner.com/ndtvnews-top-stories' },
  { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms' },
  { name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
  { name: 'Business Standard', url: 'https://www.business-standard.com/rss/home_page_top_stories.rss' },
  { name: 'News18 India', url: 'https://www.news18.com/rss/india.xml' },
  { name: 'Reuters World News', url: 'http://feeds.reuters.com/Reuters/worldNews' },
  { name: 'India TV News', url: 'https://www.indiatvnews.com/rssnews/topstory.xml' },
];

const fetchTopNews = async (req, res) => {
  try {
    const allNews = [];

    for (const feed of rssFeeds) {
      try {
        const response = await axios.get(feed.url, {
          responseType: 'text',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/90.0.4430.212 Safari/537.36',
          },
        });

        const parsed = await parser.parseStringPromise(response.data);
        const items = parsed?.rss?.channel?.item || [];
        const articles = Array.isArray(items) ? items : [items];

        function getImage(item, channelImage = '') {
          return (
            item.enclosure?.url ||
            item['media:content']?.$.url ||
            item['media:group']?.['media:content']?.$.url ||
            item['media:thumbnail']?.$.url ||
            item.description?.match(/<img[^>]+src="([^">]+)"/)?.[1] ||
            channelImage ||
            'https://placehold.co/800x600?text=No+Image'
          );
        }

        const mappedArticles = articles.slice(0, 5).map((item) => ({
          title: item.title || 'No Title',
          link: item.link,
          pubDate: item.pubDate,
          description: item.description || 'No Content',
          image: getImage(item, feed.image?.url),
          category: feed.name || 'general',
          sourceUrl: item.link || '#',
        }));


        // Save articles to the database
        const savedArticles = await Promise.all(
          mappedArticles.map(async (article) => {
            const existingArticle = await { link: article.link };
            if (!existingArticle) {
              const newArticle = new News({
                _id: uuidv4(), // Generate unique ID
                title: article.title,
                content: article.description,
                media: [article.image],
                category: article.category,
                sourceUrl: article.sourceUrl,
                isFromRSS: true, // Flag to identify RSS articles
                views: 0,
                comments: 0,
                shares: 0,
                readTime: Math.ceil((article.description?.split(/\s+/).length || 200) / 200) || 3,
                createdAt: new Date(article.pubDate || Date.now()),
              });
              console.log("savedArticles",savedArticles);
              
              await newArticle.save();
              return { ...article, id: newArticle._id };
            }
            return { ...article, id: existingArticle._id };
          })
        );

        allNews.push({
          channel: feed.name,
          articles: savedArticles,
        });
      } catch (err) {
        // console.error(`❌ ${feed.name}:`, err.message);
        console.error(err);
      }
    }

    res.json({ success: true, data: allNews });
  } catch (error) {
    console.error('RSS Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch RSS news' });
  }
};

const fetchMarketData = async (req, res) => {
  try {
    const rapidKey = process.env.RAPIDAPI_KEY;
    console.log('✅ Started fetching market data');

    const symbols = ['^NSEI', '^BSESN', 'GC=F', 'SI=F', 'INR=X', '^NSEBANK', '^NSEMDCP50'];

    const options = {
      method: 'GET',
      url: `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes`,
      params: { symbols: symbols.join(','), region: 'IN' },
      headers: {
        'x-rapidapi-key': rapidKey,
        'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
      },
    };

    const resp = await axios.request(options);
    const quotes = resp.data?.quoteResponse?.result || [];

    console.log('✅ Response received:', quotes.map(q => q.symbol));

    const fx = quotes.find(item => item.symbol === 'INR=X')?.regularMarketPrice;
    const goldUsd = quotes.find(item => item.symbol === 'GC=F')?.regularMarketPrice;
    const silverUsd = quotes.find(item => item.symbol === 'SI=F')?.regularMarketPrice;
    const sensex = quotes.find(item => item.symbol === '^BSESN');
    const nifty = quotes.find(item => item.symbol === '^NSEI');
    const niftyBank = quotes.find(item => item.symbol === '^NSEBANK');
    const niftyMidCap = quotes.find(item => item.symbol === '^NSEMDCP50');

    const convert = usd => (usd && fx) ? ((usd * fx) / 31.1035) : 0;

    res.json({
      market: [
        {
          name: "NIFTY",
          symbol: "^NSEI",
          price: nifty?.regularMarketPrice,
          change: nifty?.regularMarketChange,
          changePct: nifty?.regularMarketChangePercent
        },
        {
          name: "SENSEX",
          symbol: "^BSESN",
          price: sensex?.regularMarketPrice,
          change: sensex?.regularMarketChange,
          changePct: sensex?.regularMarketChangePercent
        },
        {
          name: "Gold",
          symbol: "GC=F",
          price: convert(goldUsd).toFixed(2),
          change: goldUsd,
          changePct: goldUsd
        },
        {
          name: "Silver",
          symbol: "SI=F",
          price: convert(silverUsd).toFixed(2),
          change: silverUsd,
          changePct: silverUsd
        },
        {
          name: "USD/INR",
          symbol: "INR=X",
          price: fx,
          change: 0,
          changePct: 0
        },
        {
          name: "Nifty Bank",
          symbol: "^NSEBANK",
          price: niftyBank?.regularMarketPrice,
          change: niftyBank?.regularMarketChange,
          changePct: niftyBank?.regularMarketChangePercent
        },
        {
          name: "Nifty MidCap",
          symbol: "^NSEMDCP50",
          price: niftyMidCap?.regularMarketPrice,
          change: niftyMidCap?.regularMarketChange,
          changePct: niftyMidCap?.regularMarketChangePercent
        }
      ]
    });

  } catch (err) {
    console.error("❌ Market data fetch error:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch market data', details: err.message });
  }
};

// const getLocationName = async (lat, lon) => {
//   try {
//     const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`;
//     const res = await axios.get(url);

//     if (res.data.results.length > 0) {
//       const components = res.data.results[0].address_components;

//       const locality = components.find(c => c.types.includes("locality"))?.long_name;
//       const sublocality = components.find(c => c.types.includes("sublocality"))?.long_name;
//       const village = components.find(c => c.types.includes("administrative_area_level_4"))?.long_name;
//       const district = components.find(c => c.types.includes("administrative_area_level_2"))?.long_name;

//       return locality || sublocality || village || district || "Unknown location";
//     }
//     return "Unknown location";
//   } catch (err) {
//     console.error("Reverse geocode failed:", err.message);
//     return "Unknown location";
//   }
// };

// // Main Controller
// const getWeatherByLocation = async (req, res) => {
//   const { lat, lon } = req.body;

//   if (!lat || !lon) {
//     return res.status(400).json({ error: 'Latitude and longitude required' });
//   }

//   try {
//     const locationName = await getLocationName(lat, lon);

//     const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
//     const weatherRes = await axios.get(weatherUrl);

//     const { temp } = weatherRes.data.main;
//     const condition = weatherRes.data.weather[0].main;
//     const icon = weatherRes.data.weather[0].icon;

//     res.json({
//       location: locationName,
//       temperature: Math.round(temp),
//       condition,
//       iconUrl: `https://openweathermap.org/img/wn/${icon}@2x.png`
//     });
//   } catch (err) {
//     console.error("Weather fetch error:", err.message);
//     res.status(500).json({ error: 'Something went wrong' });
//   }
// };


const fetchWeather = async (req, res) => {
  try {
    const { taluk, district, state } = req.query;

    const location = taluk?.trim() || district?.trim() || state?.trim() || 'Chennai';

    const weatherResp = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: location,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric',
      },
    });

    const weather = weatherResp.data;

    res.json({
      success: true,
      location: {
        city: weather.name,
        state: state || '',
        district: district || '',
        taluk: taluk || '',
        country: weather.sys.country,
      },
      weather: {
        temp: weather.main.temp,
        humidity: weather.main.humidity,
        wind: weather.wind.speed,
        condition: weather.weather[0].main,
        description: weather.weather[0].description,
        icon: `https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`,
        sunrise: weather.sys.sunrise,
        sunset: weather.sys.sunset,
      },
    });
  } catch (e) {
    console.error('❌ Weather Fetch Error:', e.message);
    res.status(500).json({ success: false, message: 'Failed to fetch weather' });
  }
};


const fetchLocationFromCoordinates = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon,
        format: 'json',
      },
      headers: {
        'User-Agent': 'NewsHub/1.0 (your_email@example.com)', // ✅ REQUIRED BY OSM
      },
    });

    const { address } = response.data;

    const taluk = address.village || address.town || address.hamlet || '';
    const district = address.county || address.suburb || '';
    const state = address.state || '';
    const city = address.city || address.town || address.village || '';
    const country = address.country || '';

    res.json({
      success: true,
      location: {
        city,
        taluk,
        district,
        state,
        country,
        lat,
        lon,
      },
    });
  } catch (error) {
    console.error('❌ OpenStreetMap Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch location from coordinates' });
  }
};



export {
  fetchMarketData,
  fetchWeather,
  fetchTopNews,
  fetchLocationFromCoordinates
  // getWeatherByLocation
};