import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import College from '../src/models/College.js';
import Club from '../src/models/Club.js';
import Event from '../src/models/Event.js';
import Partner from '../src/models/Partner.js';
import Achievement from '../src/models/Achievement.js';
import { hashPassword, generateAccessToken } from '../src/utils/auth.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB for seeding');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const adminCredentials = {
  email: 'admin@university.edu',
  password: 'admin123',
  name: 'Admin User',
  role: 'admin'
};

const sampleUsers = [
  {
    name: 'John Smith',
    email: 'john@university.edu',
    password: 'password123',
    role: 'student'
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah@university.edu',
    password: 'password123',
    role: 'student'
  },
  {
    name: 'Mike Wilson',
    email: 'mike@university.edu',
    password: 'password123',
    role: 'student'
  }
];

const sampleColleges = [
  {
    name: 'State University',
    location: 'Springfield, IL',
    description: 'A leading public research university'
  },
  {
    name: 'Tech College',
    location: 'Silicon Valley, CA',
    description: 'Focused on technology and innovation'
  }
];

const sampleClubs = [
  {
    name: 'Computer Science Club',
    description: 'Students passionate about programming and tech'
  },
  {
    name: 'Drama Society',
    description: 'Bringing theatre and performing arts to campus'
  },
  {
    name: 'Sports Club',
    description: 'Organizing various sports activities'
  }
];

const samplePartners = [
  {
    name: 'Local Tech Startup',
    type: 'sponsor',
    contact: {
      email: 'contact@startup.com',
      phone: '555-1234'
    },
    description: 'Supporting student tech initiatives'
  },
  {
    name: 'City Library',
    type: 'community',
    contact: {
      email: 'info@citylibrary.org'
    },
    description: 'Providing educational resources'
  }
];

async function clearData() {
  try {
    await Promise.all([
      User.deleteMany({}),
      College.deleteMany({}),
      Club.deleteMany({}),
      Event.deleteMany({}),
      Partner.deleteMany({}),
      Achievement.deleteMany({})
    ]);
    console.log('Cleared existing data');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

async function seedAchievements() {
  try {
    const achievements = [
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
      }
    ];

    const savedAchievements = await Achievement.insertMany(achievements);
    console.log(`Seeded ${savedAchievements.length} achievements`);
    return savedAchievements;
  } catch (error) {
    console.error('Error seeding achievements:', error);
    return [];
  }
}

async function seedColleges() {
  try {
    const savedColleges = await College.insertMany(sampleColleges);
    console.log(`Seeded ${savedColleges.length} colleges`);
    return savedColleges;
  } catch (error) {
    console.error('Error seeding colleges:', error);
    return [];
  }
}

async function seedUsers(colleges) {
  try {
    const usersToCreate = [adminCredentials, ...sampleUsers];

    for (let i = 0; i < usersToCreate.length; i++) {
      const userData = usersToCreate[i];
      const hashedPassword = await hashPassword(userData.password);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
    }

    console.log(`Seeded ${usersToCreate.length} users`);

    // Get created users for reference
    const users = await User.find({});
    return users;
  } catch (error) {
    console.error('Error seeding users:', error);
    return [];
  }
}

async function seedClubs(colleges, users) {
  try {
    const clubsToCreate = sampleClubs.map((clubData, index) => ({
      ...clubData,
      college: colleges[index % colleges.length]._id
    }));

    const savedClubs = await Club.insertMany(clubsToCreate);

    // Add some members to clubs
    for (let i = 0; i < savedClubs.length; i++) {
      savedClubs[i].members.push(users[i % users.length]._id);
      await savedClubs[i].save();
    }

    console.log(`Seeded ${savedClubs.length} clubs`);
    return savedClubs;
  } catch (error) {
    console.error('Error seeding clubs:', error);
    return [];
  }
}

async function seedEvents(clubs, users) {
  try {
    const eventsToCreate = [
      {
        title: 'CS Hackathon 2025',
        description: 'Annual coding competition',
        date: new Date('2025-10-15T10:00:00Z'),
        venue: 'Tech Building Auditorium',
        club: clubs[0]._id,
        capacity: 50,
        imageUrl: '/uploads/hackathon.jpg'
      },
      {
        title: 'Spring Drama Show',
        description: 'Student performed plays',
        date: new Date('2025-05-20T18:00:00Z'),
        venue: 'Campus Theater',
        club: clubs[1]._id,
        capacity: 100,
        imageUrl: '/uploads/drama.jpg'
      },
      {
        title: 'Inter-University Basketball Tournament',
        description: 'Tournament involving multiple colleges',
        date: new Date('2025-11-10T14:00:00Z'),
        venue: 'Sports Complex',
        club: clubs[2]._id,
        capacity: 200
      }
    ];

    const savedEvents = await Event.insertMany(eventsToCreate);

    // Add some attendees to events
    for (let i = 0; i < savedEvents.length; i++) {
      savedEvents[i].attendees.push(users[i % users.length]._id);
      await savedEvents[i].save();
    }

    console.log(`Seeded ${savedEvents.length} events`);
    return savedEvents;
  } catch (error) {
    console.error('Error seeding events:', error);
    return [];
  }
}

async function seedPartners() {
  try {
    const savedPartners = await Partner.insertMany(samplePartners);
    console.log(`Seeded ${savedPartners.length} partners`);
    return savedPartners;
  } catch (error) {
    console.error('Error seeding partners:', error);
    return [];
  }
}

async function seed() {
  try {
    await clearData();

    const achievements = await seedAchievements();
    const colleges = await seedColleges();
    const users = await seedUsers(colleges);
    const clubs = await seedClubs(colleges, users);
    const events = await seedEvents(clubs, users);
    const partners = await seedPartners();

    console.log('\n=== Seeding Complete ===');
    console.log('Admin Credentials:');
    console.log(`Email: ${adminCredentials.email}`);
    console.log(`Password: ${adminCredentials.password}`);
    console.log('\nTest User Credentials (change password in production):');
    sampleUsers.forEach(user => {
      console.log(`${user.name}: ${user.email} / ${user.password}`);
    });
    console.log('\nRun "npm run dev" to start the server.');

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

seed();
