import { body, validationResult } from 'express-validator';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Club from '../models/Club.js';
import { checkAchievementsOnAction } from '../utils/achievements.js';

// Validation rules
export const validateCreateEvent = [
  body('title').isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be max 1000 characters'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('venue').notEmpty().withMessage('Venue is required'),
  body('club').isMongoId().withMessage('Valid club ID required'),
  body('capacity').isInt({ min: 1, max: 1000 }).withMessage('Capacity must be 1-1000')
];

export const validateUpdateEvent = [
  body('title').optional().isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be max 1000 characters'),
  body('date').optional().isISO8601().withMessage('Valid date required'),
  body('venue').optional().notEmpty().withMessage('Venue is required'),
  body('capacity').optional().isInt({ min: 1, max: 1000 }).withMessage('Capacity must be 1-1000')
];

/**
 * Get all events with optional filters
 */
export const getAllEvents = async (req, res) => {
  try {
    const { club, dateFrom, dateTo, isActive = true, search } = req.query;
    const query = { isActive };

    if (club) query.club = club;

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(query)
      .populate('club', 'name description college')
      .populate('attendees', 'name email')
      .sort({ date: 1 });

    res.json({
      events,
      count: events.length
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      message: 'Failed to get events',
      error: error.message
    });
  }
};

/**
 * Get single event by ID
 */
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('club', 'name description college members')
      .populate('attendees', 'name email');

    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    res.json({
      event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      message: 'Failed to get event',
      error: error.message
    });
  }
};

/**
 * Create new event (club members only)
 */
export const createEvent = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description, date, venue, club: clubId, capacity, imageUrl = '' } = req.body;
    const userId = req.user._id;

    // Check if club exists and user is a member
    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({
        message: 'Club not found'
      });
    }

    // Only club members can create events for their club
    if (!club.members.includes(userId)) {
      return res.status(403).json({
        message: 'You must be a member of the club to create events'
      });
    }

    const event = new Event({
      title,
      description,
      date,
      venue,
      club: clubId,
      capacity,
      imageUrl,
      attendees: [],
      isActive: true
    });

    await event.save();

    // Add event to club
    club.events.push(event._id);
    await club.save();

    // Populate for response
    await event.populate('club', 'name description');
    await event.populate('attendees', 'name email');

    // Award achievement for creating event
    const user = await User.findById(userId);
    await checkAchievementsOnAction(user, 'create_event');

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      message: 'Failed to create event',
      error: error.message
    });
  }
};

/**
 * Update event (creators only)
 */
export const updateEvent = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    // Check if user is the creator (first attendee could be creator, but better to store createdBy in schema)
    // For now, assume club members can update, but admin can override
    const club = await Club.findById(event.club);
    if (!club.members.includes(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Not authorized to update this event'
      });
    }

    // Update fields
    const updateFields = ['title', 'description', 'date', 'venue', 'capacity', 'imageUrl', 'isActive'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });

    await event.save();

    // Populate for response
    await event.populate('club', 'name description');
    await event.populate('attendees', 'name email');

    res.json({
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      message: 'Failed to update event',
      error: error.message
    });
  }
};

/**
 * Delete event (admin only)
 */
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    // Remove event from club
    await Club.findByIdAndUpdate(event.club, { $pull: { events: event._id } });

    // Remove event from users' attending events
    await User.updateMany({ attendingEvents: event._id }, { $pull: { attendingEvents: event._id } });

    // Delete event
    await Event.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      message: 'Failed to delete event',
      error: error.message
    });
  }
};

/**
 * Join event
 */
export const joinEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    const user = await User.findById(req.user._id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    if (!event.isActive) {
      return res.status(400).json({
        message: 'Event is not active'
      });
    }

    // Check if already attending
    if (event.attendees.includes(user._id)) {
      return res.status(400).json({
        message: 'Already attending this event'
      });
    }

    // Check capacity
    if (event.attendees.length >= event.capacity) {
      return res.status(400).json({
        message: 'Event is at full capacity'
      });
    }

    // Add attendee
    event.attendees.push(user._id);
    await event.save();

    // Update user
    user.attendingEvents.push(event._id);
    await user.save();

    // Award achievement
    await checkAchievementsOnAction(user, 'join_event');

    await event.populate('attendees', 'name email');

    res.json({
      message: 'Successfully joined the event',
      event
    });
  } catch (error) {
    console.error('Join event error:', error);
    res.status(500).json({
      message: 'Failed to join event',
      error: error.message
    });
  }
};

/**
 * Leave event
 */
export const leaveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    const user = await User.findById(req.user._id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    // Check if attending
    if (!event.attendees.includes(user._id)) {
      return res.status(400).json({
        message: 'Not attending this event'
      });
    }

    // Remove attendee
    event.attendees = event.attendees.filter(id => id.toString() !== user._id.toString());
    await event.save();

    // Update user
    user.attendingEvents = user.attendingEvents.filter(id => id.toString() !== event._id.toString());
    await user.save();

    await event.populate('attendees', 'name email');

    res.json({
      message: 'Successfully left the event',
      event
    });
  } catch (error) {
    console.error('Leave event error:', error);
    res.status(500).json({
      message: 'Failed to leave event',
      error: error.message
    });
  }
};

/**
 * Add comment to event
 */
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const user = await User.findById(req.user._id);

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        message: 'Comment text is required'
      });
    }

    if (text.length > 500) {
      return res.status(400).json({
        message: 'Comment must be less than 500 characters'
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    const comment = {
      author: user.name,
      text: text.trim(),
      timestamp: new Date()
    };

    event.comments.push(comment);
    await event.save();

    // Award achievement for commenting
    await checkAchievementsOnAction(user, 'add_comment');

    res.json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      message: 'Failed to add comment',
      error: error.message
    });
  }
};

/**
 * Rate event
 */
export const rateEvent = async (req, res) => {
  try {
    const { rating } = req.body;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: 'Rating must be between 1 and 5'
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        message: 'Event not found'
      });
    }

    // Check if user has already rated this event
    const existingRating = event.ratings.find(r => r.user.toString() === userId.toString());

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.createdAt = new Date();
    } else {
      // Add new rating
      event.ratings.push({
        user: userId,
        rating: rating,
        createdAt: new Date()
      });
    }

    await event.save();

    // Calculate average rating for response
    const totalRating = event.ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / event.ratings.length;

    // Award achievement for rating
    const user = await User.findById(userId);
    await checkAchievementsOnAction(user, 'rate_event');

    res.json({
      message: 'Event rated successfully',
      rating: rating,
      averageRating: Math.round(averageRating * 10) / 10 // Round to 1 decimal place
    });
  } catch (error) {
    console.error('Rate event error:', error);
    res.status(500).json({
      message: 'Failed to rate event',
      error: error.message
    });
  }
};
