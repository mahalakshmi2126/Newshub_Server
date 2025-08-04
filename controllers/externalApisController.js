import axios from 'axios';
import dotenv from 'dotenv';
import xml2js from 'xml2js';
dotenv.config();

const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });

const rssFeeds = [
  { name: 'BBC Tamil', url: 'https://feeds.bbci.co.uk/tamil/rss.xml' },
  { name: 'NDTV', url: 'http://feeds.feedburner.com/ndtvnews-top-stories' },
  // { name: 'The Hindu', url: 'https://www.thehindu.com/news/national/feeder/default.rss' },
  // { name: 'India Today', url: 'https://www.indiatoday.in/rss/home' },
  { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms' },
  { name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
  // { name: 'Google News India (EN)', url: 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en' },
  // { name: 'Google News Tamil', url: 'https://news.google.com/rss?hl=ta&gl=IN&ceid=IN:ta' },
  { name: 'Business Standard', url: 'https://www.business-standard.com/rss/home_page_top_stories.rss' },
  // { name: 'Moneycontrol', url: 'https://www.moneycontrol.com/rss/latestnews.xml' },
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/90.0.4430.212 Safari/537.36'
          }
        });

        const parsed = await parser.parseStringPromise(response.data);

        const items = parsed?.rss?.channel?.item || [];
        const articles = Array.isArray(items) ? items : [items];

        function extractImageFromDescription(description) {
          if (!description || typeof description !== 'string') return null;
          const match = description.match(/<img[^>]+src=["'](.*?)["']|src=(.*?)(?:\s|>)/i);
          return match ? (match[1] || match[2] || null) : null;
        }

        function getImage(item, channelImage = '') {
          return (
            item.enclosure?.url ||
            item["media:content"]?.$.url ||
            item["media:group"]?.["media:content"]?.$.url ||
            item["media:thumbnail"]?.$.url ||
            item.description?.match(/<img[^>]+src="([^">]+)"/)?.[1] ||
            channelImage ||
            'https://placehold.co/800x600?text=No+Image'
          );
        }

        // allNews.push({
        //   channel: feed.name,
        //   articles: articles.slice(0, 5).map(item => ({

        //     title: item.title,
        //     link: item.link,
        //     pubDate: item.pubDate,
        //     description: item.description,
        //     image: item["media:content"]?.$.url
        //   }))
        // });

        allNews.push({
          channel: feed.name,
          articles: articles.slice(0, 5).map(item => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            description: item.description,
            image: getImage(item, feed.image?.url),
          })),
          image: getImage(articles[0], feed.image?.url)
        });
      } catch (err) {
        console.error(`❌ Failed parsing RSS for ${feed.name}:`, err.message);
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

const fetchWeather = async (req, res) => {
  try {
    const { taluk, district, state } = req.query;

    // Prioritize more specific location (taluk > district > state)
    const location =
      taluk?.trim() || district?.trim() || state?.trim() || 'Chennai';

    const resp = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: location,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric'
      }
    });

    res.json(resp.data);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch weather' });
  }
};

const fetchLocationFromCoordinates = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon,
        format: 'json'
      },
      headers: {
        'User-Agent': 'NewsHub/1.0 (your_email@example.com)' // Replace with your email (important for OSM)
      }
    });

    res.json({
      success: true,
      location: response.data,
    });
  } catch (error) {
    console.error('❌ OpenStreetMap Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch location from OpenStreetMap' });
  }
};



export {
  fetchMarketData,
  fetchWeather,
  fetchTopNews,
  fetchLocationFromCoordinates,
};