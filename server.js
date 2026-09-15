const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// Fallback for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server after DB initialization
db.init()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`  🚀 PulseSocial Application is Live & Running!   `);
      console.log(`  🌐 Local Server: http://localhost:${PORT}        `);
      console.log(`=================================================`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        const ALT_PORT = 3002;
        console.log(`Port ${PORT} in use, attempting fallback to ${ALT_PORT}...`);
        app.listen(ALT_PORT, () => {
          console.log(`=================================================`);
          console.log(`  🚀 PulseSocial Application is Live & Running!   `);
          console.log(`  🌐 Local Server: http://localhost:${ALT_PORT}    `);
          console.log(`=================================================`);
        });
      }
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
  });
