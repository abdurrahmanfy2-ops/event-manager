import User from '../models/User.js';
import Event from '../models/Event.js';
import College from '../models/College.js';
import Partner from '../models/Partner.js';
import Club from '../models/Club.js';

/**
 * Get dashboard statistics (admin only)
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Get date ranges
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Basic counts
    const totalUsers = await User.countDocuments();
    const totalEvents = await Event.countDocuments({ isActive: true });
    const totalClubs = await Club.countDocuments();
    const totalColleges = await College.countDocuments();
    const totalPartners = await Partner.countDocuments();

    // Active users - users who joined in the last month
    const activeUsers = await User.countDocuments({
      joined_date: { $gte: monthAgo }
    });

    // Events this week
    const eventsThisWeek = await Event.countDocuments({
      date: { $gte: weekAgo },
      isActive: true
    });

    // Partner universities - colleges with partners
    const partnerUniversities = await College.countDocuments({
      partners: { $exists: true, $ne: [] }
    });

    // Engagement rate - percentage of users who have joined events or clubs
    const engagedUsers = await User.countDocuments({
      $or: [
        { joinedClubs: { $exists: true, $ne: [] } },
        { attendingEvents: { $exists: true, $ne: [] } }
      ]
    });

    const engagementRate = totalUsers > 0 ? (engagedUsers / totalUsers * 100).toFixed(2) : 0;

    // Monthly attendance trend for past 12 months
    const monthlyAttendanceTrend = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthAttendance = await User.aggregate([
        {
          $lookup: {
            from: 'events',
            localField: 'attendingEvents',
            foreignField: '_id',
            as: 'events'
          }
        },
        {
          $unwind: {
            path: '$events',
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            'events.date': { $gte: monthStart, $lt: monthEnd },
            'events.isActive': true
          }
        },
        {
          $group: {
            _id: null,
            totalAttendance: { $sum: 1 }
          }
        }
      ]);

      monthlyAttendanceTrend.push(monthAttendance.length > 0 ? monthAttendance[0].totalAttendance : 0);
    }

    // Additional stats
    const upcomingEvents = await Event.countDocuments({
      date: { $gte: now },
      isActive: true
    });

    const totalAttendees = await User.aggregate([
      { $unwind: '$attendingEvents' },
      { $group: { _id: null, total: { $sum: 1 } } }
    ]);

    const totalEventAttendees = totalAttendees.length > 0 ? totalAttendees[0].total : 0;

    // Average event attendance
    const averageAttendance = totalEvents > 0 ? (totalEventAttendees / totalEvents).toFixed(2) : 0;

    // Most popular club types
    const clubStats = await Club.aggregate([
      {
        $group: {
          _id: '$college',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'colleges',
          localField: '_id',
          foreignField: '_id',
          as: 'college'
        }
      },
      {
        $unwind: '$college'
      },
      {
        $project: {
          college: '$college.name',
          clubCount: '$count'
        }
      },
      { $sort: { clubCount: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      activeUsers,
      eventsThisWeek,
      partnerUniversities,
      engagementRate: parseFloat(engagementRate),
      monthlyAttendanceTrend,
      generatedAt: now.toISOString()
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      message: 'Failed to get dashboard statistics',
      error: error.message
    });
  }
};
