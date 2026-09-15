const express = require('express');
const db = require('../db');
const { authenticateToken, optionalToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/posts - Fetch posts feed with filters
router.get('/', optionalToken, async (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const { feed, username, search } = req.query;

    let query = `
      SELECT 
        p.id, p.content, p.image_url, p.created_at, p.user_id,
        u.username, u.full_name, u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    `;

    if (currentUserId) {
      query += `, (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ${parseInt(currentUserId, 10)}) as is_liked`;
    } else {
      query += `, 0 as is_liked`;
    }

    query += ` FROM posts p JOIN users u ON p.user_id = u.id `;

    const whereClauses = [];
    const params = [];

    if (feed === 'following' && currentUserId) {
      whereClauses.push(
        `p.user_id IN (SELECT following_id FROM followers WHERE follower_id = ?)`
      );
      params.push(currentUserId);
    } else if (username) {
      whereClauses.push(`LOWER(u.username) = LOWER(?)`);
      params.push(username.trim());
    }

    if (search) {
      whereClauses.push(`(p.content LIKE ? OR u.full_name LIKE ? OR u.username LIKE ?)`);
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY p.created_at DESC LIMIT 50`;

    const posts = await db.query(query, params);

    const formattedPosts = posts.map((p) => ({
      id: p.id,
      content: p.content,
      image_url: p.image_url,
      created_at: p.created_at,
      author: {
        id: p.user_id,
        username: p.username,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
      },
      like_count: p.like_count,
      comment_count: p.comment_count,
      isLiked: !!p.is_liked,
      isOwner: currentUserId === p.user_id,
    }));

    res.json({ posts: formattedPosts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts feed.' });
  }
});

// POST /api/posts - Create a new post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, image_url } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content cannot be empty.' });
    }

    const result = await db.runCmd(
      `INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)`,
      [req.user.id, content.trim(), image_url ? image_url.trim() : '']
    );

    const post = await db.getOne(
      `SELECT p.id, p.content, p.image_url, p.created_at, p.user_id,
              u.username, u.full_name, u.avatar_url
       FROM posts p JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [result.lastID]
    );

    const formattedPost = {
      id: post.id,
      content: post.content,
      image_url: post.image_url,
      created_at: post.created_at,
      author: {
        id: post.user_id,
        username: post.username,
        full_name: post.full_name,
        avatar_url: post.avatar_url,
      },
      like_count: 0,
      comment_count: 0,
      isLiked: false,
      isOwner: true,
    };

    res.status(201).json({
      message: 'Post created successfully!',
      post: formattedPost,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// DELETE /api/posts/:id - Delete post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const post = await db.getOne('SELECT user_id FROM posts WHERE id = ?', [postId]);

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this post.' });
    }

    await db.runCmd('DELETE FROM posts WHERE id = ?', [postId]);

    res.json({ message: 'Post deleted successfully.' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

// POST /api/posts/:id/like - Toggle like/unlike
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const post = await db.getOne('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const existingLike = await db.getOne(
      'SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );

    let isLiked = false;
    if (existingLike) {
      await db.runCmd('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
      isLiked = false;
    } else {
      await db.runCmd('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
      isLiked = true;
    }

    const likeCountRes = await db.getOne('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);

    res.json({
      message: isLiked ? 'Post liked.' : 'Post unliked.',
      isLiked,
      likeCount: likeCountRes.count,
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like.' });
  }
});

// GET /api/posts/:id/comments - Fetch comments for a post
router.get('/:id/comments', optionalToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.user ? req.user.id : null;

    const comments = await db.query(
      `SELECT c.id, c.content, c.created_at, c.user_id,
              u.username, u.full_name, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );

    const formattedComments = comments.map((c) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      author: {
        id: c.user_id,
        username: c.username,
        full_name: c.full_name,
        avatar_url: c.avatar_url,
      },
      isOwner: currentUserId === c.user_id,
    }));

    res.json({ comments: formattedComments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

// POST /api/posts/:id/comments - Add comment to post
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty.' });
    }

    const post = await db.getOne('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const result = await db.runCmd(
      `INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`,
      [postId, req.user.id, content.trim()]
    );

    const comment = await db.getOne(
      `SELECT c.id, c.content, c.created_at, c.user_id,
              u.username, u.full_name, u.avatar_url
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.lastID]
    );

    const commentCountRes = await db.getOne('SELECT COUNT(*) as count FROM comments WHERE post_id = ?', [postId]);

    const formattedComment = {
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      author: {
        id: comment.user_id,
        username: comment.username,
        full_name: comment.full_name,
        avatar_url: comment.avatar_url,
      },
      isOwner: true,
    };

    res.status(201).json({
      message: 'Comment added successfully!',
      comment: formattedComment,
      commentCount: commentCountRes.count,
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment.' });
  }
});

// DELETE /api/comments/:id - Delete comment
router.delete('/comments/:id', authenticateToken, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    const comment = await db.getOne('SELECT user_id, post_id FROM comments WHERE id = ?', [commentId]);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment.' });
    }

    await db.runCmd('DELETE FROM comments WHERE id = ?', [commentId]);

    const commentCountRes = await db.getOne('SELECT COUNT(*) as count FROM comments WHERE post_id = ?', [
      comment.post_id,
    ]);

    res.json({
      message: 'Comment deleted successfully.',
      commentCount: commentCountRes.count,
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

module.exports = router;
