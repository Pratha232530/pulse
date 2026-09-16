# ⚡ NEXUS (PulseSocial)

> A modern, full-stack, glassmorphic social media platform built with Express.js, SQLite3, JWT Authentication, and Vanilla JS/CSS.

![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)
![Express.js](https://img.shields.io/badge/Express.js-4.21.2-blue.svg)
![SQLite3](https://img.shields.io/badge/SQLite3-5.1.7-lightgrey.svg)
![JWT](https://img.shields.io/badge/JWT-Authentication-orange.svg)
![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)

---

## 🌟 Overview

**NEXUS** (PulseSocial) is a lightweight, high-performance social networking platform featuring a dark-themed glassmorphic user interface, real-time feed filtering, user follow relationships, post creation with rich media, interactive likes, and comment threads. 

The application requires zero external database configuration — powered by an embedded SQLite3 database that initializes and seeds rich demonstration data automatically upon first startup.

---

## ✨ Key Features

- **🔐 Robust Authentication & Security**
  - Secure user registration and login powered by `bcryptjs` password hashing.
  - Stateless authentication using JSON Web Tokens (JWT) with 7-day session persistence.
  - Automatic authentication token verification middleware with route protection.

- **📰 Interactive Feeds & Search**
  - **Explore Feed:** View all posts from the global network in reverse chronological order.
  - **Following Feed:** Filter post feed to show updates exclusively from accounts you follow.
  - **Instant Search:** Search posts dynamically by keyword, user's full name, or handle.

- **📝 Post Creation & Management**
  - Publish rich content posts with support for embedded image URLs.
  - Dynamic user action controls allowing authors to delete their own posts.

- **💬 Social Engagement & Threading**
  - **Like System:** One-click like/unlike toggle with live counter updates.
  - **Comments System:** Threaded comments on posts with author-level comment deletion.

- **👥 Social Graph & User Discovery**
  - Follow and unfollow users across the platform.
  - **Suggested Accounts:** Smart recommendations showcasing active users with high follower counts.
  - View detailed follower and following lists for any member.

- **👤 Custom User Profiles**
  - Customizable profile cards with avatar URLs, header cover banners, and bio details.
  - Real-time profile statistics (Post Count, Followers, Following).
  - Profile edit modal allowing logged-in users to update their identity seamlessly.

- **🎨 Modern Aesthetic Design**
  - Built with pure Vanilla HTML5, CSS3, and JavaScript (no heavy frontend framework overhead).
  - Premium dark glassmorphism styling, ambient radial glows, micro-interactions, and full responsiveness.

---

## 🛠️ Tech Stack

| Component | Technology / Library |
| :--- | :--- |
| **Backend Runtime** | Node.js |
| **Web Framework** | Express.js (v4.21.2) |
| **Database** | SQLite3 (v5.1.7) |
| **Authentication** | JSON Web Tokens (`jsonwebtoken` v9.0.2) |
| **Security** | `bcryptjs` (v2.4.3) password hashing |
| **CORS Middleware** | `cors` (v2.8.5) |
| **Frontend** | HTML5, CSS3 (Vanilla Glassmorphism), Modern JavaScript (ES6+) |

---

## 📁 Project Structure

```text
task2/
├── db.js                # SQLite database connection, promise wrappers & auto-seeder
├── server.js            # Express server initialization, fallback port handling & static routes
├── test_api.js          # CLI test script to verify DB tables, seeds & queries
├── package.json         # Project dependencies and script declarations
├── middleware/
│   └── auth.js          # JWT authentication and optional token resolution middleware
├── routes/
│   ├── auth.js          # Endpoints for login, register, profile fetching & updates
│   ├── users.js         # Endpoints for profile discovery, follow actions & network lists
│   └── posts.js         # Endpoints for feeds, post creation, likes & comment threads
└── public/
    ├── index.html       # Single Page Application (SPA) container
    ├── css/
    │   └── styles.css   # Dark glassmorphic design system & layout styles
    └── js/
        └── app.js       # SPA client router, state manager, API client & UI renderer
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v16 or higher) installed on your system.

### 2. Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/Pratha232530/pulse.git
cd pulse
npm install
```

### 3. Run the Application

Start the Express development server:

```bash
npm start
```

The application will initialize the SQLite database (`social.db`), automatically seed demo data on first run, and go live at:
👉 **`http://localhost:3001`** *(or fallback port `http://localhost:3002` if port 3001 is busy)*.

---

## 🔑 Pre-seeded Demo Accounts

When started for the first time, the database is pre-seeded with 4 test user accounts for immediate testing. You can sign in using any of the following credentials:

| Username | Email | Password | Role / Bio |
| :--- | :--- | :--- | :--- |
| `alex_design` | `alex@example.com` | `password123` | UI/UX Designer & Creative Technologist |
| `sophia_tech` | `sophia@example.com` | `password123` | AI Researcher & Open Source enthusiast |
| `marcus_dev` | `marcus@example.com` | `password123` | Full Stack Engineer (React, Express & SQLite) |
| `elena_pixels` | `elena@example.com` | `password123` | Digital Artist & Photographer |

---

## 📡 API Reference

### 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new user account |
| `POST` | `/api/auth/login` | Public | Authenticate user & receive JWT token |
| `GET` | `/api/auth/me` | Protected | Get currently authenticated user details & stats |
| `PUT` | `/api/auth/profile` | Protected | Update profile name, bio, avatar, and cover image |

### 👥 Users & Relationships (`/api/users`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/suggested/list` | Optional | Fetch recommended users to follow |
| `GET` | `/api/users/:username` | Optional | Get profile details and stats by username |
| `POST` | `/api/users/:id/follow` | Protected | Toggle follow / unfollow on target user ID |
| `GET` | `/api/users/:id/followers` | Optional | Get list of followers for a user |
| `GET` | `/api/users/:id/following` | Optional | Get list of accounts followed by a user |

### 📝 Posts & Engagement (`/api/posts`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/posts` | Optional | Fetch post feed (supports `?feed=following`, `?username=...`, `?search=...`) |
| `POST` | `/api/posts` | Protected | Create a new post with optional image URL |
| `DELETE` | `/api/posts/:id` | Protected | Delete post owned by the logged-in user |
| `POST` | `/api/posts/:id/like` | Protected | Toggle like / unlike status for a post |
| `GET` | `/api/posts/:id/comments` | Optional | Fetch all comments for a post |
| `POST` | `/api/posts/:id/comments` | Protected | Add a comment to a post |
| `DELETE` | `/api/posts/comments/:id` | Protected | Delete comment owned by the logged-in user |

---

## 🧪 Testing & Database Verification

A built-in backend test script is included to quickly test and verify database connections, tables, and seeded queries:

```bash
node test_api.js
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
