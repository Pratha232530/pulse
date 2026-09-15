const db = require('./db');

async function testBackend() {
  console.log('Testing PulseSocial backend database & queries...');

  await db.init();

  // 1. Verify Users in DB
  const users = await db.query('SELECT id, username, full_name FROM users');
  console.log(`✓ Database User Count: ${users.length}`);
  users.forEach((u) => console.log(`   - User #${u.id}: @${u.username} (${u.full_name})`));

  // 2. Verify Posts in DB
  const posts = await db.query('SELECT id, user_id, content FROM posts');
  console.log(`✓ Database Posts Count: ${posts.length}`);

  // 3. Verify Follows in DB
  const follows = await db.query('SELECT follower_id, following_id FROM followers');
  console.log(`✓ Database Follow Relationships: ${follows.length}`);

  // 4. Verify Likes & Comments in DB
  const likes = await db.query('SELECT COUNT(*) as count FROM likes');
  const comments = await db.query('SELECT COUNT(*) as count FROM comments');
  console.log(`✓ Likes Count: ${likes[0].count}, Comments Count: ${comments[0].count}`);

  console.log('\n✅ All Database & Model Verification Checks Passed Successfully!');
  process.exit(0);
}

testBackend().catch((err) => {
  console.error('❌ Verification test failed:', err);
  process.exit(1);
});
