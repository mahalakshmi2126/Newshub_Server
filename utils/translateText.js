// utils/translateText.js
import axios from 'axios';

const translateText = async (text, from, to) => {
  try {
    const response = await axios.post('https://libretranslate.de/translate', {
      q: text,
      source: from,
      target: to,
      format: "text"
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data.translatedText;
  } catch (err) {
    console.error('Translation error:', err.message);
    return text; // fallback
  }
};

export default translateText;