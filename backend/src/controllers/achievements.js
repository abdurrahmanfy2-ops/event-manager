import Achievement from '../models/Achievement.js';
import User from '../models/User.js';

/**
 * Get all achievements
 */
export const getAllAchievements = async (req, res) => {
  try {
    const achievements = await Achievement.find({})
      .sort({ points: 1, key: 1 });

    res.json({
      achievements,
      count: achievements.length
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      message: 'Failed to get achievements',
      error: error.message
    });
  }
};

/**
 * Get user gamification stats
 */
export const getGamificationStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('achievements', 'title description points key');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Calculate level based on points
    const level = Math.floor(user.points / 100) + 1;
    const pointsToNext = (level * 100) - user.points;

    // Get next level points
    const nextLevelPoints = level * 100;
    const progressToNext = ((user.points % 100) / 100) * 100;

    // Calculate streak (assuming streak is stored or calculated)
    // For now, use a simple streak calculation based on recent activity
    const streak = user.streak || 0;

    res.json({
      points: user.points,
      level: level,
      streak: streak,
      next_level_points: nextLevelPoints,
      progress_to_next: Math.round(progressToNext * 100) / 100, // Round to 2 decimal places
      achievements: user.achievements,
      total_achievements: user.achievements.length
    });
  } catch (error) {
    console.error('Get gamification stats error:', error);
    res.status(500).json({
      message: 'Failed to get gamification stats',
      error: error.message
    });
  }
};

/**
 * Award achievement to user (admin only)
 */
export const awardAchievement = async (req, res) => {
  try {
    const { achievementId, userId } = req.body;

    // Check if achievement exists
    const achievement = await Achievement.findById(achievementId);
    if (!achievement) {
      return res.status(404).json({
        message: 'Achievement not found'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Check if user already has this achievement
    const existingAchievement = user.achievements.find(a =>
      a.toString() === achievementId
    );

    if (existingAchievement) {
      return res.status(400).json({
        message: 'User already has this achievement'
      });
    }

    // Award the achievement
    user.achievements.push(achievementId);
    user.points += achievement.points;
    await user.save();

    // Populate for response
    await user.populate('achievements');

    res.json({
      message: 'Achievement awarded successfully',
      user: {
        ...user.toObject(),
        password: undefined
      },
      awardedAchievement: achievement
    });
  } catch (error) {
    console.error('Award achievement error:', error);
    res.status(500).json({
      message: 'Failed to award achievement',
      error: error.message
    });
  }
};
