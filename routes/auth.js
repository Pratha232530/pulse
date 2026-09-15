const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper to format user response safely
function formatUser(user) {
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name, bio, avatar_url, cover_url } = req.body;

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'Username, email, password, and full name are required.' });
    }

    // Check if username or email already exists
    const existingUser = await db.getOne(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email is already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultAvatar =
      avatar_url ||
      `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80`;
    const defaultCover =
      cover_url ||
      `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80`;

    const result = await db.runCmd(
      `INSERT INTO users (username, email, password_hash, full_name, bio, avatar_url, cover_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username.trim(), email.trim(), hashedPassword, full_name.trim(), bio || '', defaultAvatar, defaultCover]
    );

    const newUser = await db.getOne('SELECT * FROM users WHERE id = ?', [result.lastID]);
    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: formatUser(newUser),
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await db.getOne(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
      [username.trim(), username.trim()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful!',
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const postsCount = await db.getOne('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [req.user.id]);
    const followersCount = await db.getOne('SELECT COUNT(*) as count FROM followers WHERE following_id = ?', [
      req.user.id,
    ]);
    const followingCount = await db.getOne('SELECT COUNT(*) as count FROM followers WHERE follower_id = ?', [
      req.user.id,
    ]);

    const formatted = formatUser(user);
    formatted.stats = {
      posts: postsCount.count,
      followers: followersCount.count,
      following: followingCount.count,
    };

    res.json({ user: formatted });
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { full_name, bio, avatar_url, cover_url } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    await db.runCmd(
      `UPDATE users 
       SET full_name = ?, bio = ?, avatar_url = ?, cover_url = ?
       WHERE id = ?`,
      [full_name.trim(), bio || '', avatar_url || '', cover_url || '', req.user.id]
    );

    const updatedUser = await db.getOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json({
      message: 'Profile updated successfully!',
      user: formatUser(updatedUser),
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error during profile update.' });
  }
});

module.exports = router;
