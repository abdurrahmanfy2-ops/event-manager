import College from '../models/College.js';

/**
 * Get all colleges with optional filters
 */
export const getAllColleges = async (req, res) => {
  try {
    const { name, location } = req.query;
    const query = {};

    if (name) query.name = { $regex: name, $options: 'i' };
    if (location) query.location = { $regex: location, $options: 'i' };

    const colleges = await College.find(query)
      .populate('partners', 'name description')
      .populate('clubs', 'name description');

    res.json({
      colleges,
      count: colleges.length
    });
  } catch (error) {
    console.error('Get colleges error:', error);
    res.status(500).json({
      message: 'Failed to get colleges',
      error: error.message
    });
  }
};

/**
 * Create new college (admin only)
 */
export const createCollege = async (req, res) => {
  try {
    const { name, location, description, type } = req.body;

    // Check if college name already exists
    const existingCollege = await College.findOne({ name });
    if (existingCollege) {
      return res.status(409).json({
        message: 'College name already exists'
      });
    }

    const college = new College({
      name,
      location,
      description,
      type: type || 'university'
    });

    await college.save();

    res.status(201).json({
      message: 'College created successfully',
      college
    });
  } catch (error) {
    console.error('Create college error:', error);
    if (error.code === 11000) {
      res.status(409).json({
        message: 'College name already exists'
      });
    } else {
      res.status(500).json({
        message: 'Failed to create college',
        error: error.message
      });
    }
  }
};
