// scripts/relink-student-batches-dynamic.js
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

// Master map of all known obsolete batch IDs to their target names and branch names
const idToBatchName = {
  // Original Excel / Seed IDs
  "6a3e18ece04decafce5f6cf3": { name: "6E1",  branch: "AnandNagar" },
  "6a3e18ede04decafce5f6cf5": { name: "7E1",  branch: "AnandNagar" },
  "6a3e18ede04decafce5f6cf7": { name: "8E1",  branch: "AnandNagar" },
  "6a3e18eee04decafce5f6cf9": { name: "9E1",  branch: "AnandNagar" },
  "6a3e18efe04decafce5f6cfb": { name: "9E2",  branch: "AnandNagar" },
  "6a3e18efe04decafce5f6cfd": { name: "10E1", branch: "AnandNagar" },
  "6a3e18f0e04decafce5f6cff": { name: "10E2", branch: "AnandNagar" },
  "6a3e18f2e04decafce5f6d01": { name: "10E3", branch: "AnandNagar" },
  "6a3e18f3e04decafce5f6d03": { name: "11E1", branch: "AnandNagar" },
  "6a3e18f4e04decafce5f6d05": { name: "12E1", branch: "AnandNagar" },

  "6a3e18f5e04decafce5f6d07": { name: "6E1",  branch: "Kanbiwad" },
  "6a3e18f6e04decafce5f6d09": { name: "7E1",  branch: "Kanbiwad" },
  "6a3e18f7e04decafce5f6d0b": { name: "8E1",  branch: "Kanbiwad" },
  "6a3e18f8e04decafce5f6d0d": { name: "9E3",  branch: "Kanbiwad" },
  "6a3e18f9e04decafce5f6d0f": { name: "9E4",  branch: "Kanbiwad" },
  "6a3e18fae04decafce5f6d11": { name: "10E4", branch: "Kanbiwad" },
  "6a3e18fce04decafce5f6d13": { name: "10E5", branch: "Kanbiwad" },
  "6a3e1901e04decafce5f6d15": { name: "10E6", branch: "Kanbiwad" },
  "6a3e1902e04decafce5f6d17": { name: "11E2", branch: "Kanbiwad" },
  "6a3e1903e04decafce5f6d19": { name: "12E2", branch: "Kanbiwad" },

  // Previous Run regenerated IDs (run at 12:54)
  "6a3e75cb3d70d99d695534e6": { name: "6E1",  branch: "AnandNagar" },
  "6a3e75cb3d70d99d695534e8": { name: "7E1",  branch: "AnandNagar" },
  "6a3e75cb3d70d99d695534ea": { name: "8E1",  branch: "AnandNagar" },
  "6a3e75cc3d70d99d695534ec": { name: "9E1",  branch: "AnandNagar" },
  "6a3e75cc3d70d99d695534ee": { name: "9E2",  branch: "AnandNagar" },
  "6a3e75cc3d70d99d695534f0": { name: "10E1", branch: "AnandNagar" },
  "6a3e75cd3d70d99d695534f2": { name: "10E2", branch: "AnandNagar" },
  "6a3e75cd3d70d99d695534f4": { name: "10E3", branch: "AnandNagar" },
  "6a3e75cd3d70d99d695534f6": { name: "11E1", branch: "AnandNagar" },
  "6a3e75ce3d70d99d695534f8": { name: "12E1", branch: "AnandNagar" },

  "6a3e75ce3d70d99d695534fa": { name: "6E1",  branch: "Kanbiwad" },
  "6a3e75ce3d70d99d695534fc": { name: "7E1",  branch: "Kanbiwad" },
  "6a3e75cf3d70d99d695534fe": { name: "8E1",  branch: "Kanbiwad" },
  "6a3e75cf3d70d99d69553500": { name: "9E3",  branch: "Kanbiwad" },
  "6a3e75cf3d70d99d69553502": { name: "9E4",  branch: "Kanbiwad" },
  "6a3e75cf3d70d99d69553504": { name: "10E4", branch: "Kanbiwad" },
  "6a3e75d03d70d99d69553506": { name: "10E5", branch: "Kanbiwad" },
  "6a3e75d03d70d99d69553508": { name: "10E6", branch: "Kanbiwad" },
  "6a3e75d03d70d99d6955350a": { name: "11E2", branch: "Kanbiwad" },
  "6a3e75d13d70d99d6955350c": { name: "12E2", branch: "Kanbiwad" }
};

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;
  const studentsCol = db.collection('students');
  const batchesCol = db.collection('batches');
  const branchesCol = db.collection('branches');

  // Load all active branches & batches
  const branches = await branchesCol.find({}).toArray();
  const batches = await batchesCol.find({}).toArray();

  const branchMap = {};
  branches.forEach(b => {
    branchMap[b._id.toString()] = b;
    branchMap[b.name.toLowerCase().replace(/[^a-z]/g, '')] = b;
  });

  const activeBatchIds = new Set(batches.map(b => b._id.toString()));

  const allStudents = await studentsCol.find({}).toArray();
  console.log(`Analyzing ${allStudents.length} students...`);

  let updatedCount = 0;
  let skippedCount = 0;
  let healthyCount = 0;

  for (const s of allStudents) {
    const sBranchIdStr = s.branchId ? s.branchId.toString() : '';
    const branchDoc = branchMap[sBranchIdStr];
    if (!branchDoc) {
      console.log(`Student "${s.name}" has no valid branch, skipping.`);
      skippedCount++;
      continue;
    }

    const currentBatchIdStr = s.batchId ? s.batchId.toString() : '';

    // If batchId is already valid in active batches, keep it!
    if (currentBatchIdStr && activeBatchIds.has(currentBatchIdStr)) {
      healthyCount++;
      continue;
    }

    // Resolve what the correct batch name and branch name is for this student
    let targetBatchName = '';
    let targetBranchName = branchDoc.name;

    const mapped = idToBatchName[currentBatchIdStr];
    if (mapped) {
      targetBatchName = mapped.name;
    } else {
      // Fallback heuristics based on standard
      const stdNum = parseInt(s.standard);
      const isKanbiwad = branchDoc.name.toLowerCase().includes('kanb');

      if (stdNum === 6) targetBatchName = '6E1';
      else if (stdNum === 7) targetBatchName = '7E1';
      else if (stdNum === 8) targetBatchName = '8E1';
      else if (stdNum === 11) targetBatchName = isKanbiwad ? '11E2' : '11E1';
      else if (stdNum === 12) targetBatchName = isKanbiwad ? '12E2' : '12E1';
      else {
        // For standard 9 and 10, default to first available batch if not mapped
        if (stdNum === 9) {
          targetBatchName = isKanbiwad ? '9E3' : '9E1';
        } else if (stdNum === 10) {
          targetBatchName = isKanbiwad ? '10E4' : '10E1';
        }
      }
    }

    if (!targetBatchName) {
      console.log(`Could not resolve batch name for student "${s.name}" (Std: ${s.standard}), skipping.`);
      skippedCount++;
      continue;
    }

    // Find the active batch doc matching targetBatchName under this branch
    const activeBatchDoc = batches.find(b => 
      b.name === targetBatchName && 
      b.branchId.toString() === branchDoc._id.toString()
    );

    if (!activeBatchDoc) {
      console.log(`Active batch "${targetBatchName}" not found in branch "${branchDoc.name}" for "${s.name}", skipping.`);
      skippedCount++;
      continue;
    }

    // Relink student to active batch
    await studentsCol.updateOne(
      { _id: s._id },
      { $set: { batchId: activeBatchDoc._id } }
    );
    updatedCount++;
  }

  console.log('\n========================================');
  console.log(`Done! Healthy: ${healthyCount}, Relinked: ${updatedCount}, Skipped: ${skippedCount}`);
  console.log('========================================');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
