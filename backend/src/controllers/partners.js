import Partner from '../models/Partner.js';

/**
 * Get all partners with optional filters
 */
export const getAllPartners = async (req, res) => {
  try {
    const { name, type } = req.query;
    const query = {};

    if (name) query.name = { $regex: name, $options: 'i' };
    if (type) query.type = type;

    const partners = await Partner.find(query)
      .populate('colleges', 'name location');

    res.json({
      partners,
      count: partners.length
    });
  } catch (error) {
    console.error('Get partners error:', error);
    res.status(500).json({
      message: 'Failed to get partners',
      error: error.message
    });
  }
};

/**
 * Create new partner (admin only)
 */
export const createPartner = async (req, res) => {
  try {
    const { name, description, type, website, contactInfo } = req.body;

    // Check if partner name already exists
    const existingPartner = await Partner.findOne({ name });
    if (existingPartner) {
      return res.status(409).json({
        message: 'Partner name already exists'
      });
    }

    const partner = new Partner({
      name,
      description,
      type: type || 'company',
      website,
      contactInfo
    });

    await partner.save();

    res.status(201).json({
      message: 'Partner created successfully',
      partner
    });
  } catch (error) {
    console.error('Create partner error:', error);
    if (error.code === 11000) {
      res.status(409).json({
        message: 'Partner name already exists'
      });
    } else {
      res.status(500).json({
        message: 'Failed to create partner',
        error: error.message
      });
    }
  }
};
