import Language from '../models/Language.js';

// GET all languages
export const getLanguages = async (req, res) => {
  try {
    const languages = await Language.find();
    res.json(languages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch languages' });
  }
};

// POST add new language
export const addLanguage = async (req, res) => {
  const { code, name, nativeName, flag } = req.body;
  try {
    const language = new Language({ code, name, nativeName, flag });
    await language.save();
    res.status(201).json({ message: 'Language added', language });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add language' });
  }
};

// DELETE a language by code
export const deleteLanguage = async (req, res) => {
  const { code } = req.params;
  try {
    const result = await Language.findOneAndDelete({ code });
    if (!result) return res.status(404).json({ error: 'Language not found' });
    res.json({ message: 'Language deleted', result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete language' });
  }
};