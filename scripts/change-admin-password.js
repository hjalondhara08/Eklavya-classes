// scripts/change-admin-password.js
// One-off utility to (re)set the system administrator's password.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const ADMIN_EMAIL = 'admin@eklavya.in';
const NEW_PASSWORD = 'Vidisha1145@#';

let MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  try {
    const envPath = path.join(__dirname, '../.env.local');
    const envFile = fs.readFileSync(envPath, 'utf-8');
    const match = envFile.match(/MONGODB_URI=(.+)/);
    if (match) MONGODB_URI = match[1].trim();
  } catch (err) {
    console.error('Failed to read .env.local:', err.message);
  }
}
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found!');
  process.exit(1);
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const hashed = await bcrypt.hash(NEW_PASSWORD, 10);
  const result = await mongoose.connection.db
    .collection('users')
    .updateOne({ email: ADMIN_EMAIL }, { $set: { password: hashed } });

  if (result.matchedCount === 0) {
    console.error(`No user found with email ${ADMIN_EMAIL}. Password NOT changed.`);
  } else {
    console.log(`Password for ${ADMIN_EMAIL} updated successfully.`);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error changing admin password:', err);
  process.exit(1);
});
