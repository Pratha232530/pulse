const express = require('express');
const db = require('../db');
const { authenticateToken, optionalToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/suggested/list - Get suggested users to follow
router.get('/suggested/list', optionalToken, async (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : null;
    let query = `
      SELECT u.id, u.username, u.full_name, u.bio, u.avatar_url,
      (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as follower_count
      FROM users u
    `;
    let params = [];

    if (currentUserId) {
      query += `
        WHERE u.id != ? 
        AND u.id NOT IN (SELECT following_id FROM followers WHERE follower_id = ?)
      `;
      params = [currentUserId, currentUserId];
    }

    query += ` ORDER BY follower_count DESC, RANDOM() LIMIT 5`;

    const users = await db.query(query, params);
    res.json({ users });
  } catch (error) {
    console.error('Error fetching suggested users:', error);
    res.status(500).json({ error: 'Failed to fetch suggested users.' });
  }
});

// GET /api/users/:username - Get user profile details
router.get('/:username', optionalToken, async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    const user = await db.getOne(
      'SELECT id, username, email, full_name, bio, avatar_url, cover_url, created_at FROM users WHERE LOWER(username) = LOWER(?)',
      [username]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const postsCount = await db.getOne('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [user.id]);
    const followersCount = await db.getOne('SELECT COUNT(*) as count FROM followers WHERE following_id = ?', [
      user.id,
    ]);
    const followingCount = await db.getOne('SELECT COUNT(*) as count FROM followers WHERE follower_id = ?', [
      user.id,
    ]);

    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const followCheck = await db.getOne(
        'SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?',
        [currentUserId, user.id]
      );
      isFollowing = !!followCheck;
    }

    user.stats = {
      posts: postsCount.count,
      followers: followersCount.count,
      following: followingCount.count,
    };
    user.isFollowing = isFollowing;
    user.isSelf = currentUserId === user.id;

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// POST /api/users/:id/follow - Toggle follow/unfollow
router.post('/:id/follow', authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const currentUserId = req.user.id;

    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }

    const targetUser = await db.getOne('SELECT id FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User to follow not found.' });
    }

    const existingFollow = await db.getOne(
      'SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?',
      [currentUserId, targetUserId]
    );

    let isFollowing = false;
    if (existingFollow) {
      // Unfollow
      await db.runCmd('DELETE FROM followers WHERE follower_id = ? AND following_id = ?', [
        currentUserId,
        targetUserId,
      ]);
      isFollowing = false;
    } else {
      // Follow
      await db.runCmd('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)', [
        currentUserId,
        targetUserId,
      ]);
      isFollowing = true;
    }

    const updatedFollowersCount = await db.getOne(
      'SELECT COUNT(*) as count FROM followers WHERE following_id = ?',
      [targetUserId]
    );

    res.json({
      message: isFollowing ? 'User followed successfully.' : 'User unfollowed successfully.',
      isFollowing,
      followerCount: updatedFollowersCount.count,
    });
  } catch (error) {
    console.error('Follow toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle follow status.' });
  }
});

// GET /api/users/:id/followers - Get list of followers
router.get('/:id/followers', optionalToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const followers = await db.query(
      `SELECT u.id, u.username, u.full_name, u.bio, u.avatar_url
       FROM followers f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ followers });
  } catch (error) {
    console.error('Fetch followers error:', error);
    res.status(500).json({ error: 'Failed to fetch followers.' });
  }
});

// GET /api/users/:id/following - Get list of following users
router.get('/:id/following', optionalToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const following = await db.query(
      `SELECT u.id, u.username, u.full_name, u.bio, u.avatar_url
       FROM followers f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ following });
  } catch (error) {
    console.error('Fetch following error:', error);
    res.status(500).json({ error: 'Failed to fetch following users.' });
  }
});

module.exports = router;
