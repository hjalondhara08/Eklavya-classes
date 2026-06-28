// scripts/relink-student-batches.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ---------- Load MONGODB_URI ----------
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

const obsoleteToNew = {
  // AnandNagar Branch
  "6a3e18ece04decafce5f6cf3": "6a3e75cb3d70d99d695534e6", // 6E1
  "6a3e18ede04decafce5f6cf5": "6a3e75cb3d70d99d695534e8", // 7E1
  "6a3e18ede04decafce5f6cf7": "6a3e75cb3d70d99d695534ea", // 8E1
  "6a3e18eee04decafce5f6cf9": "6a3e75cc3d70d99d695534ec", // 9E1
  "6a3e18efe04decafce5f6cfb": "6a3e75cc3d70d99d695534ee", // 9E2
  "6a3e18efe04decafce5f6cfd": "6a3e75cc3d70d99d695534f0", // 10E1
  "6a3e18f0e04decafce5f6cff": "6a3e75cd3d70d99d695534f2", // 10E2
  "6a3e18f2e04decafce5f6d01": "6a3e75cd3d70d99d695534f4", // 10E3
  "6a3e18f3e04decafce5f6d03": "6a3e75cd3d70d99d695534f6", // 11E1
  "6a3e18f4e04decafce5f6d05": "6a3e75ce3d70d99d695534f8", // 12E1

  // Kanbiwad Branch
  "6a3e18f5e04decafce5f6d07": "6a3e75ce3d70d99d695534fa", // 6E1
  "6a3e18f6e04decafce5f6d09": "6a3e75ce3d70d99d695534fc", // 7E1
  "6a3e18f7e04decafce5f6d0b": "6a3e75cf3d70d99d695534fe", // 8E1
  "6a3e18f8e04decafce5f6d0d": "6a3e75cf3d70d99d69553500", // 9E3
  "6a3e18f9e04decafce5f6d0f": "6a3e75cf3d70d99d69553502", // 9E4
  "6a3e18fae04decafce5f6d11": "6a3e75cf3d70d99d69553504", // 10E4
  "6a3e18fce04decafce5f6d13": "6a3e75d03d70d99d69553506", // 10E5
  "6a3e1901e04decafce5f6d15": "6a3e75d03d70d99d69553508", // 10E6
  "6a3e1902e04decafce5f6d17": "6a3e75d03d70d99d6955350a", // 11E2
  "6a3e1903e04decafce5f6d19": "6a3e75d13d70d99d6955350c"  // 12E2
};

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;
  const studentsCol = db.collection('students');
  const batchesCol = db.collection('batches');

  const allStudents = await studentsCol.find({}).toArray();
  console.log(`Processing ${allStudents.length} students...`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const s of allStudents) {
    if (!s.batchId) {
      console.log(`Student "${s.name}" does not have any batchId, skipping.`);
      skippedCount++;
      continue;
    }

    const currentBatchIdStr = s.batchId.toString();
    const targetBatchIdStr = obsoleteToNew[currentBatchIdStr];

    if (!targetBatchIdStr) {
      console.log(`Student "${s.name}" has unmapped batchId "${currentBatchIdStr}", skipping.`);
      skippedCount++;
      continue;
    }

    // Update student with new batch ObjectId
    await studentsCol.updateOne(
      { _id: s._id },
      { $set: { batchId: new mongoose.Types.ObjectId(targetBatchIdStr) } }
    );
    updatedCount++;
  }

  console.log('\n========================================');
  console.log(`Done! Relinked: ${updatedCount}, Skipped/Unmapped: ${skippedCount}`);
  console.log('========================================');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
