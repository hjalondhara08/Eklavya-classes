// scripts/ensure-indexes.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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
  console.log('Connecting to MongoDB to build indexes...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;

  console.log('Building index on branches collection...');
  await db.collection('branches').createIndex({ isActive: 1 });

  console.log('Building indexes on batches collection...');
  await db.collection('batches').createIndex({ branchId: 1, isActive: 1 });
  await db.collection('batches').createIndex({ isActive: 1 });

  console.log('Building indexes on students collection...');
  await db.collection('students').createIndex({ branchId: 1 });
  await db.collection('students').createIndex({ batchId: 1 });
  await db.collection('students').createIndex({ isActive: 1 });
  await db.collection('students').createIndex({ standard: 1 });
  await db.collection('students').createIndex({ name: 1 });

  console.log('Building indexes on feepayments collection...');
  await db.collection('feepayments').createIndex({ transactionDate: 1 });
  await db.collection('feepayments').createIndex({ studentId: 1 });

  console.log('Building indexes on expenses collection...');
  await db.collection('expenses').createIndex({ transactionDate: 1 });
  await db.collection('expenses').createIndex({ branchId: 1 });

  console.log('\n========================================');
  console.log('Database indexes built successfully!');
  console.log('========================================');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error creating indexes:', err);
  process.exit(1);
});
