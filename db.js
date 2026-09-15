const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'social.db');
const db = new sqlite3.Database(dbPath);

// Promisified helper methods for clean async/await code
db.query = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

db.getOne = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.runCmd = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

let initPromise = null;

db.init = function () {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await db.runCmd(`PRAGMA foreign_keys = ON;`);

    // Create Users table
    await db.runCmd(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        bio TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '',
        cover_url TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Posts table
    await db.runCmd(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Create Comments table
    await db.runCmd(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Create Likes table
    await db.runCmd(`
      CREATE TABLE IF NOT EXISTS likes (
        user_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, post_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
      );
    `);

    // Create Followers table
    await db.runCmd(`
      CREATE TABLE IF NOT EXISTS followers (
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Seed default data if database is empty
    const userCount = await db.getOne(`SELECT COUNT(*) as count FROM users`);
    if (userCount.count === 0) {
      console.log('Seeding initial demo database...');
      const hashedPw = await bcrypt.hash('password123', 10);

      // Insert Demo Users
      const u1 = await db.runCmd(
        `INSERT INTO users (username, email, password_hash, full_name, bio, avatar_url, cover_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'alex_design',
          'alex@example.com',
          hashedPw,
          'Alex Rivera',
          'UI/UX Designer & Creative Technologist 🎨 Building the future of social interfaces.',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        ]
      );

      const u2 = await db.runCmd(
        `INSERT INTO users (username, email, password_hash, full_name, bio, avatar_url, cover_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'sophia_tech',
          'sophia@example.com',
          hashedPw,
          'Sophia Chen',
          'AI Researcher & Open Source enthusiast 🚀 Coffee, code & deep learning models.',
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
        ]
      );

      const u3 = await db.runCmd(
        `INSERT INTO users (username, email, password_hash, full_name, bio, avatar_url, cover_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'marcus_dev',
          'marcus@example.com',
          hashedPw,
          'Marcus Vance',
          'Full Stack Engineer | React, Express & SQLite ✨ Crafting clean, scalable APIs.',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
        ]
      );

      const u4 = await db.runCmd(
        `INSERT INTO users (username, email, password_hash, full_name, bio, avatar_url, cover_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'elena_pixels',
          'elena@example.com',
          hashedPw,
          'Elena Rostova',
          'Digital Artist & Photographer 📸 Exploring light, shadow and urban architectural aesthetics.',
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
        ]
      );

      // Insert Sample Posts
      const p1 = await db.runCmd(
        `INSERT INTO posts (user_id, content, image_url, created_at)
         VALUES (?, ?, ?, datetime('now', '-2 hours'))`,
        [
          u1.lastID,
          'Just finished redesigning our main dashboard layout! Using dark glassmorphism with neon accents and subtle ambient glows. What do you think of this aesthetic? ✨ #UIUX #DesignSystem #WebDesign',
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
        ]
      );

      const p2 = await db.runCmd(
        `INSERT INTO posts (user_id, content, image_url, created_at)
         VALUES (?, ?, ?, datetime('now', '-5 hours'))`,
        [
          u2.lastID,
          'Trained a new multi-modal vision transformer today. Amazing performance on zero-shot image understanding! The speed of open-source AI progress in 2026 is truly incredible 🤖💻 #ArtificialIntelligence #MachineLearning',
          'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1000&auto=format&fit=crop&q=80',
        ]
      );

      const p3 = await db.runCmd(
        `INSERT INTO posts (user_id, content, image_url, created_at)
         VALUES (?, ?, ?, datetime('now', '-1 day'))`,
        [
          u4.lastID,
          'Early morning golden hour reflection in Tokyo. Sunset colors reflecting off modern architecture glass façades 🌅📸 #Photography #Tokyo #UrbanArt',
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop&q=80',
        ]
      );

      const p4 = await db.runCmd(
        `INSERT INTO posts (user_id, content, image_url, created_at)
         VALUES (?, ?, ?, datetime('now', '-2 days'))`,
        [
          u3.lastID,
          'Pro tip for Express & SQLite developers: use index constraints on foreign keys and composite primary keys for like/follow tables. Keeps your queries under 2ms effortlessly! ⚡ #NodeJS #Database #Backend',
          '',
        ]
      );

      // Insert Sample Likes
      await db.runCmd(`INSERT INTO likes (user_id, post_id) VALUES (?, ?)`, [u2.lastID, p1.lastID]);
      await db.runCmd(`INSERT INTO likes (user_id, post_id) VALUES (?, ?)`, [u3.lastID, p1.lastID]);
      await db.runCmd(`INSERT INTO likes (user_id, post_id) VALUES (?, ?)`, [u4.lastID, p1.lastID]);
      await db.runCmd(`INSERT INTO likes (user_id, post_id) VALUES (?, ?)`, [u1.lastID, p2.lastID]);
      await db.runCmd(`INSERT INTO likes (user_id, post_id) VALUES (?, ?)`, [u3.lastID, p2.lastID]);
      await db.runCmd(`INSERT INTO likes (user_id, post_id) VALUES (?, ?)`, [u1.lastID, p3.lastID]);

      // Insert Sample Comments
      await db.runCmd(
        `INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, datetime('now', '-1 hour'))`,
        [p1.lastID, u2.lastID, 'This glassmorphism layout is incredibly clean! Loving the color contrast. 🔥']
      );
      await db.runCmd(
        `INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, datetime('now', '-30 mins'))`,
        [p1.lastID, u3.lastID, 'Awesome work Alex! Is this pure vanilla CSS or styled-components?']
      );
      await db.runCmd(
        `INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, datetime('now', '-4 hours'))`,
        [p2.lastID, u1.lastID, 'Would love to read the technical paper on your transformer model once published!']
      );

      // Insert Sample Follows
      await db.runCmd(`INSERT INTO followers (follower_id, following_id) VALUES (?, ?)`, [u1.lastID, u2.lastID]);
      await db.runCmd(`INSERT INTO followers (follower_id, following_id) VALUES (?, ?)`, [u1.lastID, u3.lastID]);
      await db.runCmd(`INSERT INTO followers (follower_id, following_id) VALUES (?, ?)`, [u1.lastID, u4.lastID]);
      await db.runCmd(`INSERT INTO followers (follower_id, following_id) VALUES (?, ?)`, [u2.lastID, u1.lastID]);
      await db.runCmd(`INSERT INTO followers (follower_id, following_id) VALUES (?, ?)`, [u2.lastID, u3.lastID]);
      await db.runCmd(`INSERT INTO followers (follower_id, following_id) VALUES (?, ?)`, [u3.lastID, u1.lastID]);

      console.log('Database seeded successfully.');
    }
  })();

  return initPromise;
};

module.exports = db;
