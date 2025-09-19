import Club from '../models/Club.js';
import User from '../models/User.js';
import { checkAchievementsOnAction } from '../utils/achievements.js';

/**
 * Get all clubs with optional filters
 */
export const getAllClubs = async (req, res) => {
  try {
    const { college, name } = req.query;
    const query = {};

    if (college) query.college = college;
    if (name) query.name = { $regex: name, $options: 'i' };

    const clubs = await Club.find(query)
      .populate('college', 'name location')
      .populate('members', 'name email')
      .populate('events', 'title date venue');

    res.json({
      clubs,
      count: clubs.length
    });
  } catch (error) {
    console.error('Get clubs error:', error);
    res.status(500).json({
      message: 'Failed to get clubs',
      error: error.message
    });
  }
};

/**
 * Get club by ID
 */
export const getClubById = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id)
      .populate('college', 'name location description')
      .populate('members', 'name email')
      .populate('events', 'title description date venue capacity attendees isActive');

    if (!club) {
      return res.status(404).json({
        message: 'Club not found'
      });
    }

    res.json({
      club
    });
  } catch (error) {
    console.error('Get club error:', error);
    res.status(500).json({
      message: 'Failed to get club',
      error: error.message
    });
  }
};

/**
 * Create new club (admin only)
 */
export const createClub = async (req, res) => {
  try {
    const { name, description, college } = req.body;
    const user = await User.findById(req.user._id);

    const club = new Club({
      name,
      description,
      college
    });

    await club.save();

    // Award achievement to club creator
    await checkAchievementsOnAction(user, 'create_club');

    res.status(201).json({
      message: 'Club created successfully',
      club
    });
  } catch (error) {
    console.error('Create club error:', error);
    if (error.code === 11000) {
      res.status(409).json({
        message: 'Club name already exists for this college'
      });
    } else {
      res.status(500).json({
        message: 'Failed to create club',
        error: error.message
      });
    }
  }
};

/**
 * Update club
 */
export const updateClub = async (req, res) => {
  try {
    const club = await Club.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('college', 'name location')
      .populate('members', 'name email');

    if (!club) {
      return res.status(404).json({
        message: 'Club not found'
      });
    }

    res.json({
      message: 'Club updated successfully',
      club
    });
  } catch (error) {
    console.error('Update club error:', error);
    res.status(500).json({
      message: 'Failed to update club',
      error: error.message
    });
  }
};

/**
 * Join club
 */
export const joinClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    const user = await User.findById(req.user._id);

    if (!club) {
      return res.status(404).json({
        message: 'Club not found'
      });
    }

    // Check if already joined
    if (club.members.includes(user._id)) {
      return res.status(400).json({
        message: 'Already a member of this club'
      });
    }

    // Add member
    club.members.push(user._id);
    await club.save();

    // Update user
    user.joinedClubs.push(club._id);
    await user.save();

    // Check achievements
    await checkAchievementsOnAction(user, 'join_club');

    res.json({
      message: 'Successfully joined the club',
      club
    });
  } catch (error) {
    console.error('Join club error:', error);
    res.status(500).json({
      message: 'Failed to join club',
      error: error.message
    });
  }
};

/**
 * Leave club
 */
export const leaveClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    const user = await User.findById(req.user._id);

    if (!club) {
      return res.status(404).json({
        message: 'Club not found'
      });
    }

    // Check if member
    if (!club.members.includes(user._id)) {
      return res.status(400).json({
        message: 'Not a member of this club'
      });
    }

    // Remove member
    club.members = club.members.filter(id => id.toString() !== user._id.toString());
    await club.save();

    // Update user
    user.joinedClubs = user.joinedClubs.filter(id => id.toString() !== club._id.toString());
    await user.save();

    res.json({
      message: 'Successfully left the club',
      club
    });
  } catch (error) {
    console.error('Leave club error:', error);
    res.status(500).json({
      message: 'Failed to leave club',
      error: error.message
    });
  }
};
