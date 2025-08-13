// import { Translate } from '@google-cloud/translate/build/src/v2/index.js';
// import path from 'path';

// // Initialize Google Translate client
// const translate = new Translate({
//   keyFilename: path.resolve('./google-translate-key.json'),
// });

// export const translateText = async (text, from, to) => {
//   try {
//     if (!text || typeof text !== 'string') return '';

//     const [translatedText] = await translate.translate(text, {
//       from,
//       to,
//     });

//     return translatedText;
//   } catch (error) {
//     console.error(`Translation Error from ${from} to ${to}:`, error.message);
//     return text; // fallback to original if translation fails
//   }
// };


// export default translateText;


import fetch from "node-fetch";

const detectLanguage = (language) => {
  if (language === 'en') return 'en';
  if (language === 'ta') return 'ta';
  // fallback or extend if needed
  return 'en'; 
};

const translateText = async (text, to, from) => {
  try {
    if (!text || typeof text !== 'string') return '';

    // MyMemory max 500 chars limit - split if longer
    const maxLen = 500;
    if (text.length > maxLen) {
      const chunks = [];
      for (let i = 0; i < text.length; i += maxLen) {
        chunks.push(text.slice(i, i + maxLen));
      }
      const translatedChunks = [];
      for (const chunk of chunks) {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${from}|${to}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Translation API error: ${res.status}`);
        const data = await res.json();
        translatedChunks.push(data?.responseData?.translatedText || chunk);
      }
      return translatedChunks.join(' ');
    } else {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Translation API error: ${res.status}`);
      const data = await res.json();
      return data?.responseData?.translatedText || text;
    }
  } catch (error) {
    console.error(`Translation error (${from} → ${to}):`, error.message);
    return text;
  }
};

export default translateText;