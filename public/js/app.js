/**
 * PulseSocial Client Application Logic
 * Pure Vanilla JavaScript SPA Architecture
 */

(function () {
  'use strict';

  // --- STATE MANAGEMENT ---
  const state = {
    token: localStorage.getItem('pulse_token') || null,
    user: JSON.parse(localStorage.getItem('pulse_user') || 'null'),
    currentView: 'feed', // 'feed' | 'explore' | 'following' | 'profile'
    activeFeedTab: 'all', // 'all' | 'following'
    profileUsername: null,
    searchQuery: '',
    expandedComments: new Set(),
  };

  // --- DOM ELEMENTS ---
  const elements = {
    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    navHome: document.getElementById('nav-home'),
    navExplore: document.getElementById('nav-explore'),
    navFollowing: document.getElementById('nav-following'),
    navProfile: document.getElementById('nav-profile'),
    sidebarPostBtn: document.getElementById('sidebar-post-btn'),
    
    // User Card
    userNavCard: document.getElementById('user-nav-card'),
    navUserAvatar: document.getElementById('nav-user-avatar'),
    navUserName: document.getElementById('nav-user-name'),
    navUserHandle: document.getElementById('nav-user-handle'),
    authActionBtn: document.getElementById('auth-action-btn'),

    // Main Header
    pageTitle: document.getElementById('page-title'),
    pageSubtitle: document.getElementById('page-subtitle'),
    feedSearchInput: document.getElementById('feed-search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    feedTabs: document.getElementById('feed-tabs'),
    feedTabBtns: document.querySelectorAll('.feed-tab'),

    // Composer
    composerCard: document.getElementById('composer-card'),
    composerUserAvatar: document.getElementById('composer-user-avatar'),
    postInputText: document.getElementById('post-input-text'),
    addImageBtn: document.getElementById('add-image-btn'),
    imageUrlRow: document.getElementById('image-url-row'),
    postImageUrl: document.getElementById('post-image-url'),
    removeImageUrl: document.getElementById('remove-image-url'),
    composerImagePreview: document.getElementById('composer-image-preview'),
    previewImg: document.getElementById('preview-img'),
    publishPostBtn: document.getElementById('publish-post-btn'),

    // Views Container
    profileContainer: document.getElementById('profile-container'),
    postsFeed: document.getElementById('posts-feed'),
    suggestedUsersList: document.getElementById('suggested-users-list'),

    // Auth Modal
    authModal: document.getElementById('auth-modal'),
    authModalClose: document.getElementById('auth-modal-close'),
    tabLoginBtn: document.getElementById('tab-login-btn'),
    tabSignupBtn: document.getElementById('tab-signup-btn'),
    loginForm: document.getElementById('login-form'),
    signupForm: document.getElementById('signup-form'),
    loginError: document.getElementById('login-error'),
    signupError: document.getElementById('signup-error'),

    // Edit Profile Modal
    editProfileModal: document.getElementById('edit-profile-modal'),
    editProfileClose: document.getElementById('edit-profile-close'),
    editProfileForm: document.getElementById('edit-profile-form'),
    editFullname: document.getElementById('edit-fullname'),
    editBio: document.getElementById('edit-bio'),
    editAvatar: document.getElementById('edit-avatar'),
    editCover: document.getElementById('edit-cover'),
    editProfileCancel: document.getElementById('edit-profile-cancel'),
    editProfileError: document.getElementById('edit-profile-error'),

    // User List Modal
    userListModal: document.getElementById('user-list-modal'),
    userListClose: document.getElementById('user-list-close'),
    userListTitle: document.getElementById('user-list-title'),
    userListContent: document.getElementById('user-list-content'),

    // Toast Container
    toastContainer: document.getElementById('toast-container'),
  };

  // --- API SERVICE WRAPPER ---
  async function apiRequest(endpoint, method = 'GET', data = null) {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    const config = {
      method,
      headers,
    };
    if (data) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(endpoint, config);
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'An error occurred.');
      }
      return resData;
    } catch (err) {
      console.error(`API Error [${method} ${endpoint}]:`, err);
      throw err;
    }
  }

  // --- INITIALIZATION ---
  function init() {
    updateUserNavUI();
    setupEventListeners();
    loadSuggestedUsers();
    renderCurrentView();
  }

  // --- UI RENDER ENGINE ---
  function updateUserNavUI() {
    if (state.user) {
      elements.navUserAvatar.src = state.user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80';
      elements.navUserName.textContent = state.user.full_name;
      elements.navUserHandle.textContent = `@${state.user.username}`;
      elements.composerUserAvatar.src = state.user.avatar_url || elements.navUserAvatar.src;
      elements.authActionBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket" title="Log Out"></i>';
    } else {
      elements.navUserAvatar.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80';
      elements.navUserName.textContent = 'Guest User';
      elements.navUserHandle.textContent = 'Click to log in';
      elements.composerUserAvatar.src = elements.navUserAvatar.src;
      elements.authActionBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket" title="Log In"></i>';
    }
  }

  function renderCurrentView() {
    // Hide or show composer and profile container based on view
    if (state.currentView === 'profile') {
      elements.feedTabs.classList.add('hidden');
      elements.composerCard.classList.add('hidden');
      elements.profileContainer.classList.remove('hidden');
      loadUserProfile(state.profileUsername || (state.user ? state.user.username : 'alex_design'));
    } else {
      elements.profileContainer.classList.add('hidden');
      elements.composerCard.classList.remove('hidden');
      elements.feedTabs.classList.remove('hidden');

      if (state.currentView === 'explore') {
        elements.pageTitle.textContent = 'Explore Community';
        elements.pageSubtitle.textContent = 'Trending posts and popular creators across Pulse';
      } else if (state.currentView === 'following') {
        elements.pageTitle.textContent = 'Following Feed';
        elements.pageSubtitle.textContent = 'Updates exclusively from creators you follow';
      } else {
        elements.pageTitle.textContent = 'Home Feed';
        elements.pageSubtitle.textContent = 'Latest thoughts, stories & images from everyone';
      }

      loadPosts();
    }
  }

  // --- POSTS FEED LOADING & RENDERING ---
  async function loadPosts() {
    elements.postsFeed.innerHTML = `
      <div class="feed-loading">
        <div class="spinner"></div>
        <p>Fetching community posts...</p>
      </div>
    `;

    try {
      let url = '/api/posts?';
      if (state.currentView === 'following' || state.activeFeedTab === 'following') {
        url += 'feed=following&';
      } else if (state.currentView === 'explore') {
        url += 'feed=all&';
      }

      if (state.searchQuery) {
        url += `search=${encodeURIComponent(state.searchQuery)}&`;
      }

      const response = await apiRequest(url);
      const posts = response.posts || [];

      if (posts.length === 0) {
        elements.postsFeed.innerHTML = `
          <div class="post-card text-center" style="padding: 40px;">
            <i class="fa-regular fa-folder-open" style="font-size: 36px; color: var(--text-muted); margin-bottom: 12px;"></i>
            <h3 style="margin-bottom: 6px;">No posts found</h3>
            <p style="color: var(--text-muted); font-size: 14px;">
              ${state.currentView === 'following' ? 'Follow creators to see their posts here!' : 'Be the first to create a post!'}
            </p>
          </div>
        `;
        return;
      }

      elements.postsFeed.innerHTML = posts.map(post => createPostHTML(post)).join('');
      
      // Load expanded comments if any
      posts.forEach(post => {
        if (state.expandedComments.has(post.id)) {
          loadComments(post.id);
        }
      });
    } catch (err) {
      elements.postsFeed.innerHTML = `
        <div class="post-card text-center error-card" style="padding: 30px;">
          <p style="color: var(--text-danger);">Failed to load feed. Please check your server connection.</p>
        </div>
      `;
    }
  }

  // Generate Post Card HTML
  function createPostHTML(post) {
    const formattedDate = formatRelativeTime(post.created_at);
    const formattedBody = escapeHTML(post.content).replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
    const isLiked = post.isLiked;

    return `
      <article class="post-card" id="post-${post.id}" data-id="${post.id}">
        <div class="post-header">
          <div class="post-author" onclick="PulseApp.navigateToProfile('${post.author.username}')" style="cursor: pointer;">
            <img src="${post.author.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'}" alt="${post.author.full_name}" class="avatar-sm">
            <div class="author-meta">
              <span class="author-name">${escapeHTML(post.author.full_name)}</span>
              <span class="author-handle">@${escapeHTML(post.author.username)}</span>
            </div>
          </div>
          <div class="post-right-meta">
            <span class="post-time">${formattedDate}</span>
            ${post.isOwner ? `
              <button class="delete-btn" onclick="PulseApp.deletePost(${post.id})" title="Delete post">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <div class="post-body">${formattedBody}</div>

        ${post.image_url ? `
          <div class="post-media">
            <img src="${escapeHTML(post.image_url)}" alt="Post Attachment" loading="lazy" />
          </div>
        ` : ''}

        <div class="post-footer">
          <div class="action-group">
            <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" onclick="PulseApp.toggleLike(${post.id})">
              <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
              <span class="like-count">${post.like_count}</span>
            </button>
            <button class="action-btn comment-btn" onclick="PulseApp.toggleComments(${post.id})">
              <i class="fa-regular fa-comment"></i>
              <span class="comment-count-${post.id}">${post.comment_count}</span>
            </button>
            <button class="action-btn share-btn" onclick="PulseApp.copyPostLink(${post.id})">
              <i class="fa-regular fa-paper-plane"></i>
            </button>
          </div>
        </div>

        <div id="comments-container-${post.id}" class="comments-section ${state.expandedComments.has(post.id) ? '' : 'hidden'}">
          <div class="comments-list" id="comments-list-${post.id}">
            <div class="spinner-sm">Loading comments...</div>
          </div>
          <div class="comment-composer">
            <input type="text" id="comment-input-${post.id}" placeholder="Write a comment..." onkeydown="if(event.key==='Enter') PulseApp.submitComment(${post.id})" />
            <button class="btn btn-primary btn-sm" onclick="PulseApp.submitComment(${post.id})">Send</button>
          </div>
        </div>
      </article>
    `;
  }

  // --- COMMENTS ENGINE ---
  async function toggleComments(postId) {
    const container = document.getElementById(`comments-container-${postId}`);
    if (!container) return;

    if (state.expandedComments.has(postId)) {
      state.expandedComments.delete(postId);
      container.classList.add('hidden');
    } else {
      state.expandedComments.add(postId);
      container.classList.remove('hidden');
      await loadComments(postId);
    }
  }

  async function loadComments(postId) {
    const listEl = document.getElementById(`comments-list-${postId}`);
    if (!listEl) return;

    try {
      const res = await apiRequest(`/api/posts/${postId}/comments`);
      const comments = res.comments || [];

      if (comments.length === 0) {
        listEl.innerHTML = `<p style="font-size: 12px; color: var(--text-muted); padding: 4px 0;">No comments yet. Start the conversation!</p>`;
        return;
      }

      listEl.innerHTML = comments.map(c => `
        <div class="comment-item">
          <img src="${c.author.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'}" class="avatar-sm" style="width:28px; height:28px;" />
          <div class="comment-content-box">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="comment-author-name">${escapeHTML(c.author.full_name)}</span>
              ${c.isOwner ? `<button class="delete-btn" style="padding:2px;" onclick="PulseApp.deleteComment(${c.id}, ${postId})"><i class="fa-solid fa-xmark"></i></button>` : ''}
            </div>
            <p class="comment-text">${escapeHTML(c.content)}</p>
            <span class="comment-meta">${formatRelativeTime(c.created_at)}</span>
          </div>
        </div>
      `).join('');
    } catch (err) {
      listEl.innerHTML = `<p style="font-size: 12px; color: var(--text-danger);">Failed to load comments.</p>`;
    }
  }

  async function submitComment(postId) {
    if (!state.token) {
      showAuthModal('log in');
      return;
    }

    const input = document.getElementById(`comment-input-${postId}`);
    if (!input || !input.value.trim()) return;

    const content = input.value.trim();
    input.value = '';

    try {
      const res = await apiRequest(`/api/posts/${postId}/comments`, 'POST', { content });
      showToast('Comment added!');

      // Update comment counter
      const countEl = document.querySelector(`.comment-count-${postId}`);
      if (countEl) countEl.textContent = res.commentCount;

      await loadComments(postId);
    } catch (err) {
      showToast(err.message || 'Failed to add comment');
    }
  }

  async function deleteComment(commentId, postId) {
    try {
      const res = await apiRequest(`/api/posts/comments/${commentId}`, 'DELETE');
      showToast('Comment deleted');

      const countEl = document.querySelector(`.comment-count-${postId}`);
      if (countEl) countEl.textContent = res.commentCount;

      await loadComments(postId);
    } catch (err) {
      showToast(err.message || 'Failed to delete comment');
    }
  }

  // --- LIKE ENGINE ---
  async function toggleLike(postId) {
    if (!state.token) {
      showAuthModal('like posts');
      return;
    }

    const postCard = document.getElementById(`post-${postId}`);
    const likeBtn = postCard ? postCard.querySelector('.like-btn') : null;
    const likeCountSpan = postCard ? postCard.querySelector('.like-count') : null;

    try {
      const res = await apiRequest(`/api/posts/${postId}/like`, 'POST');
      
      if (likeBtn && likeCountSpan) {
        likeCountSpan.textContent = res.likeCount;
        if (res.isLiked) {
          likeBtn.classList.add('liked');
          likeBtn.querySelector('i').className = 'fa-solid fa-heart';
        } else {
          likeBtn.classList.remove('liked');
          likeBtn.querySelector('i').className = 'fa-regular fa-heart';
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to toggle like');
    }
  }

  // --- DELETE POST ENGINE ---
  async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await apiRequest(`/api/posts/${postId}`, 'DELETE');
      showToast('Post deleted successfully');
      const card = document.getElementById(`post-${postId}`);
      if (card) card.remove();
    } catch (err) {
      showToast(err.message || 'Failed to delete post');
    }
  }

  // --- USER PROFILE ENGINE ---
  async function loadUserProfile(username) {
    elements.profileContainer.innerHTML = `
      <div class="feed-loading">
        <div class="spinner"></div>
        <p>Loading creator profile...</p>
      </div>
    `;

    try {
      const res = await apiRequest(`/api/users/${username}`);
      const user = res.user;

      elements.pageTitle.textContent = user.full_name;
      elements.pageSubtitle.textContent = `@${user.username}`;

      const isSelf = user.isSelf;
      const isFollowing = user.isFollowing;

      elements.profileContainer.innerHTML = `
        <div class="profile-card">
          <div class="profile-cover">
            <img src="${user.cover_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'}" alt="Cover">
          </div>
          <div class="profile-info-bar">
            <div class="profile-avatar-row">
              <img src="${user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'}" alt="${user.full_name}" class="avatar-lg">
              <div>
                ${isSelf ? `
                  <button class="btn btn-secondary" onclick="PulseApp.openEditProfileModal()">
                    <i class="fa-solid fa-user-pen"></i> Edit Profile
                  </button>
                ` : `
                  <button class="btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}" onclick="PulseApp.toggleFollowUser(${user.id}, '${user.username}')">
                    <i class="fa-solid ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}"></i>
                    <span>${isFollowing ? 'Following' : 'Follow'}</span>
                  </button>
                `}
              </div>
            </div>

            <div class="profile-details">
              <h2>${escapeHTML(user.full_name)}</h2>
              <span class="profile-handle">@${escapeHTML(user.username)}</span>
              <p class="profile-bio">${user.bio ? escapeHTML(user.bio) : 'No bio added yet.'}</p>
            </div>

            <div class="profile-stats-row">
              <div class="stat-box">
                <span class="stat-value">${user.stats.posts}</span>
                <span class="stat-label">Posts</span>
              </div>
              <div class="stat-box" onclick="PulseApp.openUserListModal(${user.id}, 'followers', '${escapeHTML(user.full_name)}')">
                <span class="stat-value" id="profile-follower-count">${user.stats.followers}</span>
                <span class="stat-label">Followers</span>
              </div>
              <div class="stat-box" onclick="PulseApp.openUserListModal(${user.id}, 'following', '${escapeHTML(user.full_name)}')">
                <span class="stat-value">${user.stats.following}</span>
                <span class="stat-label">Following</span>
              </div>
            </div>
          </div>
        </div>
      `;

      // Load user's posts in timeline below profile card
      loadUserPosts(username);
    } catch (err) {
      elements.profileContainer.innerHTML = `
        <div class="profile-card text-center" style="padding: 40px;">
          <p style="color: var(--text-danger);">User profile not found.</p>
        </div>
      `;
    }
  }

  async function loadUserPosts(username) {
    try {
      const response = await apiRequest(`/api/posts?username=${encodeURIComponent(username)}`);
      const posts = response.posts || [];

      if (posts.length === 0) {
        elements.postsFeed.innerHTML = `
          <div class="post-card text-center" style="padding: 30px;">
            <p style="color: var(--text-muted);">No posts published by this creator yet.</p>
          </div>
        `;
        return;
      }

      elements.postsFeed.innerHTML = posts.map(post => createPostHTML(post)).join('');
    } catch (err) {
      elements.postsFeed.innerHTML = `<p class="text-center">Failed to load user posts.</p>`;
    }
  }

  // --- FOLLOW SYSTEM ENGINE ---
  async function toggleFollowUser(targetUserId, username) {
    if (!state.token) {
      showAuthModal('follow creators');
      return;
    }

    try {
      const res = await apiRequest(`/api/users/${targetUserId}/follow`, 'POST');
      showToast(res.message);

      // Refresh profile view if currently open
      if (state.currentView === 'profile') {
        const followerCountEl = document.getElementById('profile-follower-count');
        if (followerCountEl) followerCountEl.textContent = res.followerCount;
        loadUserProfile(username);
      }

      // Refresh suggested users sidebar
      loadSuggestedUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update follow status');
    }
  }

  // --- SUGGESTED CREATORS SIDEBAR WIDGET ---
  async function loadSuggestedUsers() {
    try {
      const res = await apiRequest('/api/users/suggested/list');
      const users = res.users || [];

      if (users.length === 0) {
        elements.suggestedUsersList.innerHTML = `<p style="font-size:12px; color:var(--text-muted);">No new creator suggestions.</p>`;
        return;
      }

      elements.suggestedUsersList.innerHTML = users.map(u => `
        <div class="suggested-user-item">
          <div class="suggested-user-info" onclick="PulseApp.navigateToProfile('${u.username}')" style="cursor:pointer;">
            <img src="${u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'}" class="avatar-sm">
            <div class="suggested-user-meta">
              <span class="chip-name">${escapeHTML(u.full_name)}</span>
              <span class="chip-handle">@${escapeHTML(u.username)}</span>
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="PulseApp.toggleFollowUser(${u.id}, '${u.username}')">Follow</button>
        </div>
      `).join('');
    } catch (err) {
      elements.suggestedUsersList.innerHTML = `<p style="font-size:12px; color:var(--text-muted);">Failed to load creators.</p>`;
    }
  }

  // --- PUBLISH POST ENGINE ---
  async function handlePublishPost() {
    if (!state.token) {
      showAuthModal('create a post');
      return;
    }

    const content = elements.postInputText.value.trim();
    const imageUrl = elements.postImageUrl.value.trim();

    if (!content) {
      showToast('Please type some content for your post.');
      return;
    }

    try {
      elements.publishPostBtn.disabled = true;
      elements.publishPostBtn.textContent = 'Posting...';

      await apiRequest('/api/posts', 'POST', { content, image_url: imageUrl });
      
      showToast('Post published to feed! 🚀');
      
      // Reset composer
      elements.postInputText.value = '';
      elements.postImageUrl.value = '';
      elements.imageUrlRow.classList.add('hidden');
      elements.composerImagePreview.classList.add('hidden');
      elements.previewImg.src = '';

      // Reload feed
      loadPosts();
    } catch (err) {
      showToast(err.message || 'Failed to publish post');
    } finally {
      elements.publishPostBtn.disabled = false;
      elements.publishPostBtn.innerHTML = '<span>Post</span> <i class="fa-solid fa-paper-plane"></i>';
    }
  }

  // --- QUICK DEMO LOGIN ---
  async function handleDemoLogin(username) {
    try {
      showToast(`Logging in as @${username}...`);
      const res = await apiRequest('/api/auth/login', 'POST', {
        username,
        password: 'password123',
      });

      state.token = res.token;
      state.user = res.user;
      localStorage.setItem('pulse_token', res.token);
      localStorage.setItem('pulse_user', JSON.stringify(res.user));

      updateUserNavUI();
      showToast(`Welcome back, ${res.user.full_name}! 👋`);
      loadSuggestedUsers();
      renderCurrentView();
    } catch (err) {
      showToast(err.message || 'Demo login failed');
    }
  }

  // --- AUTH MODAL FLOWS ---
  function showAuthModal(reason = '') {
    if (reason) {
      elements.loginError.textContent = `Please log in to ${reason}.`;
      elements.loginError.classList.remove('hidden');
    } else {
      elements.loginError.classList.add('hidden');
    }
    elements.authModal.classList.remove('hidden');
  }

  function hideAuthModal() {
    elements.authModal.classList.add('hidden');
    elements.loginError.classList.add('hidden');
    elements.signupError.classList.add('hidden');
  }

  async function handleLoginFormSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const res = await apiRequest('/api/auth/login', 'POST', { username, password });
      state.token = res.token;
      state.user = res.user;
      localStorage.setItem('pulse_token', res.token);
      localStorage.setItem('pulse_user', JSON.stringify(res.user));

      updateUserNavUI();
      hideAuthModal();
      showToast(`Welcome back, ${res.user.full_name}! 👋`);
      loadSuggestedUsers();
      renderCurrentView();
    } catch (err) {
      elements.loginError.textContent = err.message;
      elements.loginError.classList.remove('hidden');
    }
  }

  async function handleSignupFormSubmit(e) {
    e.preventDefault();
    const full_name = document.getElementById('signup-fullname').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const bio = document.getElementById('signup-bio').value.trim();

    try {
      const res = await apiRequest('/api/auth/register', 'POST', {
        full_name,
        username,
        email,
        password,
        bio,
      });

      state.token = res.token;
      state.user = res.user;
      localStorage.setItem('pulse_token', res.token);
      localStorage.setItem('pulse_user', JSON.stringify(res.user));

      updateUserNavUI();
      hideAuthModal();
      showToast(`Account created! Welcome to PulseSocial 🎉`);
      loadSuggestedUsers();
      renderCurrentView();
    } catch (err) {
      elements.signupError.textContent = err.message;
      elements.signupError.classList.remove('hidden');
    }
  }

  function handleLogout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('pulse_token');
    localStorage.removeItem('pulse_user');
    updateUserNavUI();
    showToast('Logged out safely.');
    loadSuggestedUsers();
    renderCurrentView();
  }

  // --- EDIT PROFILE FLOW ---
  function openEditProfileModal() {
    if (!state.user) return;
    elements.editFullname.value = state.user.full_name;
    elements.editBio.value = state.user.bio || '';
    elements.editAvatar.value = state.user.avatar_url || '';
    elements.editCover.value = state.user.cover_url || '';
    elements.editProfileError.classList.add('hidden');
    elements.editProfileModal.classList.remove('hidden');
  }

  async function handleEditProfileSubmit(e) {
    e.preventDefault();
    const full_name = elements.editFullname.value.trim();
    const bio = elements.editBio.value.trim();
    const avatar_url = elements.editAvatar.value.trim();
    const cover_url = elements.editCover.value.trim();

    try {
      const res = await apiRequest('/api/auth/profile', 'PUT', {
        full_name,
        bio,
        avatar_url,
        cover_url,
      });

      state.user = res.user;
      localStorage.setItem('pulse_user', JSON.stringify(res.user));

      updateUserNavUI();
      elements.editProfileModal.classList.add('hidden');
      showToast('Profile updated!');
      loadUserProfile(state.user.username);
    } catch (err) {
      elements.editProfileError.textContent = err.message;
      elements.editProfileError.classList.remove('hidden');
    }
  }

  // --- USER LIST MODAL (Followers / Following) ---
  async function openUserListModal(userId, type, name) {
    elements.userListTitle.textContent = `${name}'s ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    elements.userListContent.innerHTML = `<div class="spinner-sm">Loading users...</div>`;
    elements.userListModal.classList.remove('hidden');

    try {
      const res = await apiRequest(`/api/users/${userId}/${type}`);
      const list = res[type] || [];

      if (list.length === 0) {
        elements.userListContent.innerHTML = `<p style="font-size:13px; color:var(--text-muted); text-align:center;">No users found.</p>`;
        return;
      }

      elements.userListContent.innerHTML = list.map(u => `
        <div class="suggested-user-item" style="padding: 6px 0;">
          <div class="suggested-user-info" onclick="PulseApp.navigateToProfile('${u.username}'); PulseApp.closeUserListModal();" style="cursor:pointer;">
            <img src="${u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'}" class="avatar-sm">
            <div class="suggested-user-meta">
              <span class="chip-name">${escapeHTML(u.full_name)}</span>
              <span class="chip-handle">@${escapeHTML(u.username)}</span>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      elements.userListContent.innerHTML = `<p style="color:var(--text-danger);">Failed to load user list.</p>`;
    }
  }

  // --- NAVIGATION CONTROLLER ---
  function navigateToView(viewName, username = null) {
    state.currentView = viewName;
    if (username) state.profileUsername = username;

    elements.navItems.forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    renderCurrentView();
  }

  function navigateToProfile(username) {
    navigateToView('profile', username);
  }

  // --- TOAST NOTIFICATION UTILITY ---
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${escapeHTML(message)}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function copyPostLink(postId) {
    navigator.clipboard.writeText(window.location.origin + `#post-${postId}`);
    showToast('Post link copied to clipboard!');
  }

  // Helper Utilities
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  function formatRelativeTime(dateString) {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }

  // --- EVENT LISTENERS BINDING ---
  function setupEventListeners() {
    // Navigation items
    elements.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        if (view === 'profile' && state.user) {
          navigateToView('profile', state.user.username);
        } else {
          navigateToView(view);
        }
      });
    });

    elements.sidebarPostBtn.addEventListener('click', () => {
      if (!state.token) {
        showAuthModal('create a post');
        return;
      }
      elements.postInputText.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Auth Action (Login/Logout)
    elements.authActionBtn.addEventListener('click', () => {
      if (state.user) {
        handleLogout();
      } else {
        showAuthModal();
      }
    });

    // Feed Tabs
    elements.feedTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.feedTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeFeedTab = btn.dataset.tab;
        loadPosts();
      });
    });

    // Search bar
    elements.feedSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (state.searchQuery) {
        elements.clearSearchBtn.classList.remove('hidden');
      } else {
        elements.clearSearchBtn.classList.add('hidden');
      }
      loadPosts();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
      elements.feedSearchInput.value = '';
      state.searchQuery = '';
      elements.clearSearchBtn.classList.add('hidden');
      loadPosts();
    });

    // Composer Image Toggle
    elements.addImageBtn.addEventListener('click', () => {
      elements.imageUrlRow.classList.toggle('hidden');
      elements.postImageUrl.focus();
    });

    elements.removeImageUrl.addEventListener('click', () => {
      elements.postImageUrl.value = '';
      elements.imageUrlRow.classList.add('hidden');
      elements.composerImagePreview.classList.add('hidden');
      elements.previewImg.src = '';
    });

    elements.postImageUrl.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url) {
        elements.previewImg.src = url;
        elements.composerImagePreview.classList.remove('hidden');
      } else {
        elements.composerImagePreview.classList.add('hidden');
      }
    });

    elements.publishPostBtn.addEventListener('click', handlePublishPost);

    // Demo user quick login chips
    document.querySelectorAll('.demo-user-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const username = chip.dataset.user;
        handleDemoLogin(username);
      });
    });

    // Auth Modal tab switching
    elements.tabLoginBtn.addEventListener('click', () => {
      elements.tabLoginBtn.classList.add('active');
      elements.tabSignupBtn.classList.remove('active');
      elements.loginForm.classList.remove('hidden');
      elements.signupForm.classList.add('hidden');
    });

    elements.tabSignupBtn.addEventListener('click', () => {
      elements.tabSignupBtn.classList.add('active');
      elements.tabLoginBtn.classList.remove('active');
      elements.signupForm.classList.remove('hidden');
      elements.loginForm.classList.add('hidden');
    });

    elements.authModalClose.addEventListener('click', hideAuthModal);
    elements.loginForm.addEventListener('submit', handleLoginFormSubmit);
    elements.signupForm.addEventListener('submit', handleSignupFormSubmit);

    // Edit Profile Modal
    elements.editProfileClose.addEventListener('click', () => elements.editProfileModal.classList.add('hidden'));
    elements.editProfileCancel.addEventListener('click', () => elements.editProfileModal.classList.add('hidden'));
    elements.editProfileForm.addEventListener('submit', handleEditProfileSubmit);

    // User List Modal
    elements.userListClose.addEventListener('click', () => elements.userListModal.classList.add('hidden'));
  }

  // --- EXPOSE PUBLIC APP API FOR INLINE HANDLERS ---
  window.PulseApp = {
    navigateToProfile,
    toggleLike,
    toggleComments,
    submitComment,
    deleteComment,
    deletePost,
    toggleFollowUser,
    openEditProfileModal,
    openUserListModal,
    closeUserListModal: () => elements.userListModal.classList.add('hidden'),
    copyPostLink,
  };

  // Initialize application on DOM ready
  document.addEventListener('DOMContentLoaded', init);
})();
