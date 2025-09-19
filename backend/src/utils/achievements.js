import User from '../models/User.js';
import Achievement from '../models/Achievement.js';

/**
 * Check if user has achievement, if not, award it
 * @param {Object} user - User object
 * @param {string} achievementKey - Achievement key
 * @returns {Object|null} - Achievement object if awarded, null if already have
 */
export const checkAndAwardAchievement = async (user, achievementKey) => {
  try {
    const achievement = await Achievement.findOne({ key: achievementKey });
    if (!achievement) {
      console.warn(`Achievement with key '${achievementKey}' not found`);
      return null;
    }

    // Check if user already has this achievement
    if (user.achievements.includes(achievement._id)) {
      return null; // Already earned
    }

    // Award achievement
    user.achievements.push(achievement._id);
    user.points += achievement.points;
    await user.save();

    console.log(`User ${user.email} earned achievement: ${achievement.title}`);
    return achievement;
  } catch (error) {
    console.error('Error awarding achievement:', error);
    return null;
  }
};

/**
 * Check various achievement conditions based on user actions
 * @param {Object} user - User object
 * @param {string} action - Action type ('join_event', 'create_event', 'join_club')
 */
export const checkAchievementsOnAction = async (user, action) => {
  try {
    const awarded = [];

    switch (action) {
      case 'join_event':
        // Check if first event join
        if (user.attendingEvents.length === 1) {
          const achievement = await checkAndAwardAchievement(user, 'first_event_join');
          if (achievement) awarded.push(achievement);
        }

        // Check if attended 5 events
        const updatedUser = await User.findById(user._id);
        if (updatedUser && updatedUser.attendingEvents.length === 5) {
          const achievement = await checkAndAwardAchievement(updatedUser, 'event_attendee');
          if (achievement) awarded.push(achievement);
        }
        break;

      case 'create_event':
        // Check if first event created - actually check total events created, but for now use points
        const eventCreator = await checkAndAwardAchievement(user, 'event_creator');
        if (eventCreator) awarded.push(eventCreator);
        break;

      case 'create_club':
        // Check if first club created
        const clubLeader = await checkAndAwardAchievement(user, 'club_leader');
        if (clubLeader) awarded.push(clubLeader);
        break;

      case 'join_club':
        // Check if first club join
        if (user.joinedClubs.length === 1) {
          const achievement = await checkAndAwardAchievement(user, 'first_club_join');
          if (achievement) awarded.push(achievement);
        }
        break;

      default:
        break;
    }

    return awarded;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
};

/**
 * Initialize default achievements in database
 */
export const initializeAchievements = async () => {
  const defaultAchievements = [
    {
      key: 'first_club_join',
      title: 'Club Member',
      description: 'Joined your first club',
      points: 10
    },
    {
      key: 'first_event_join',
      title: 'Event Attendee',
      description: 'Attended your first event',
      points: 15
    },
    {
      key: 'event_attendee',
      title: 'Regular Attendee',
      description: 'Attended 5 events',
      points: 25
    },
    {
      key: 'event_creator',
      title: 'Event Organizer',
      description: 'Created your first event',
      points: 20
    },
    {
      key: 'club_leader',
      title: 'Club Leader',
      description: 'Created your first club',
      points: 30
    },
    {
      key: 'loyal_member',
      title: 'Loyal Member',
      description: 'Earned 100+ points',
      points: 50
    }
  ];

  try {
    for (const achievement of defaultAchievements) {
      await Achievement.findOneAndUpdate(
        { key: achievement.key },
        achievement,
        { upsert: true, new: true }
      );
    }
    console.log('Achievements initialized successfully');
  } catch (error) {
    console.error('Error initializing achievements:', error);
  }
};
