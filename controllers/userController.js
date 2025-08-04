import User from '../models/User.js';
import ReporterRequest from '../models/ReporterRequest.js';

export const submitReporterForm = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (user.role === 'reporter' && user.isApproved) {
      return res.status(400).json({ message: 'You are already an approved reporter.' });
    }

    if (!user || user.role !== 'user') {
      return res.status(403).json({ message: 'Only general users can request reporter access' });
    }

    if (user.reporterFormSubmitted) {
      return res.status(400).json({ message: 'Reporter request already submitted' });
    }

    const { name, location, bio, phone, avatar } = req.body;
    if (!name || !location?.state || !location?.district) {
      return res.status(400).json({ message: 'Name, state, and district are required' });
    }

    // Update user
    user.name = name || user.name;
    user.location = location || user.location;
    user.bio = bio || user.bio;
    user.phone = phone || user.phone;
    user.avatar = avatar || user.avatar;
    user.reporterFormSubmitted = true;
    user.isApproved = false;
    user.appliedDate = new Date();

    await user.save();

    // Create reporter request
    const request = new ReporterRequest({
      userId: user._id,
      name,
      location,
      bio,
      phone,
      avatar,
      status: 'pending',
      submittedAt: new Date(),
    });
    await request.save();

    res.json({
      success: true,
      message: 'Reporter request submitted. Awaiting admin approval.',
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        bio: user.bio,
        phone: user.phone,
        avatar: user.avatar,
        reporterFormSubmitted: user.reporterFormSubmitted,
        isApproved: user.isApproved,
        appliedDate: user.appliedDate,
      },
    });
  } catch (err) {
    console.error('submitReporterForm error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};