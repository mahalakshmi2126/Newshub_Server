import District from '../models/District.js';

// Get all districts
export const getDistricts = async (req, res) => {
  try {
    const { state } = req.query;

    let districts;
    if (state) {
      districts = await District.find({ state }).select('name');
    } else {
      districts = await District.find();
    }

    res.json({
      success: true,
      districts
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a new district
export const addDistrict = async (req, res) => {
  try {
    const { name, state } = req.body;
    console.log('Incoming data:', name, state); // ✅ check input

    if (!name || !state) {
      return res.status(400).json({ message: 'Name and state are required' });
    }

    const exists = await District.findOne({ name });
    if (exists) {
      return res.status(400).json({ message: 'District already exists' });
    }

    const district = new District({ name, state });
    await district.save();
    res.status(201).json(district);
  } catch (err) {
    console.error('Error while adding district:', err); // ✅ real error log
    res.status(500).json({ message: 'Failed to add district' });
  }
};

// Get unique states
export const getStates = async (req, res) => {
  try {
    const states = await District.distinct('state');
    res.json({
      success: true,
      states: states.map(state => ({ state }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch states' });
  }
};


// Delete district
export const deleteDistrict = async (req, res) => {
  try {
    await District.findByIdAndDelete(req.params.id);
    res.json({ message: 'District deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Delete failed' });
  }
};

// Add taluk to a district
export const addTaluk = async (req, res) => {
  try {
    const { taluk } = req.body;
    const district = await District.findById(req.params.id);

    if (!district) return res.status(404).json({ message: 'District not found' });

    district.taluks.push(taluk);
    await district.save();
    res.json(district);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add taluk' });
  }
};

// Delete taluk from a district
export const deleteTaluk = async (req, res) => {
  try {
    const { districtId, talukName } = req.params;
    const district = await District.findById(districtId);

    if (!district) return res.status(404).json({ message: 'District not found' });

    district.taluks = district.taluks.filter(t => t !== talukName);
    await district.save();
    res.json(district);
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete taluk' });
  }
};