// scripts/assign-and-cleanup.js
// 1. Removes the 20 dummy students seeded by fix-student-mapping.js
// 2. Assigns all real students with null/invalid batchId to correct batch by Standard + Branch

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
if (!MONGODB_URI) { console.error('MONGODB_URI not found!'); process.exit(1); }

// Names of the 20 dummy students we seeded — these will be removed
const DUMMY_STUDENTS = [
  'Neha Gupta', 'Kiran Rao', 'Vijay Kumar', 'Sonal Jain', 'Tarun Mishra',
  'Disha Patel', 'Manish Tiwari', 'Reena Singh', 'Varun Dhawan', 'Kriti Sanon',
  'Raj Patel', 'Priya Shah', 'Amit Desai', 'Sneha Joshi', 'Rahul Mehta',
  'Pooja Trivedi', 'Rohan Bhatia', 'Anjali Sharma', 'Yash Varma', 'Kavya Singh'
];

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;
  const studentsCol  = db.collection('students');
  const batchesCol   = db.collection('batches');
  const branchesCol  = db.collection('branches');
  const feeRecordsCol = db.collection('feerecords');

  // ================================================================
  // STEP 1: Delete the 20 dummy students + their fee records
  // ================================================================
  console.log('=== STEP 1: Removing dummy test students ===');
  const dummyDocs = await studentsCol.find({
    name: { $in: DUMMY_STUDENTS }
  }).toArray();

  if (dummyDocs.length === 0) {
    console.log('No dummy students found — already cleaned up.\n');
  } else {
    const dummyIds = dummyDocs.map(s => s._id);
    // Remove fee records first
    const feeDeleteResult = await feeRecordsCol.deleteMany({ studentId: { $in: dummyIds } });
    console.log(`  → Deleted ${feeDeleteResult.deletedCount} fee records`);
    // Remove students
    const studDeleteResult = await studentsCol.deleteMany({ _id: { $in: dummyIds } });
    console.log(`  → Deleted ${studDeleteResult.deletedCount} dummy students`);
    dummyDocs.forEach(s => console.log(`     ✗ Removed: "${s.name}"`));
  }
  console.log();

  // ================================================================
  // STEP 2: Load all branches and batches from DB
  // ================================================================
  const allBranches = await branchesCol.find({}).toArray();
  const allBatches  = await batchesCol.find({ isActive: { $ne: false } }).toArray();

  console.log('Branches in DB:');
  allBranches.forEach(b => console.log(`  [${b._id}] "${b.name}"`));
  console.log('\nBatches in DB:');
  allBatches.forEach(b => console.log(`  [${b._id}] "${b.name}" -> branchId: ${b.branchId}`));
  console.log();

  // ================================================================
  // STEP 3: For each real student with null/invalid batchId → assign correct batch
  // ================================================================
  console.log('=== STEP 2: Assigning correct batches to real students ===');

  // Find students whose batchId doesn't exist in our batches collection
  const allBatchIds = new Set(allBatches.map(b => b._id.toString()));
  const allStudents = await studentsCol.find({ isActive: true }).toArray();

  let assignedCount = 0;
  let alreadyOkCount = 0;
  let errorCount = 0;

  // For distributing students across multiple batches of same standard
  // Key: branchId_standard → [batch docs]
  const batchDistributionMap = {};
  const batchAssignCounters  = {};

  for (const batch of allBatches) {
    const stdNum = batch.name.match(/^(\d+)/)?.[1];
    if (!stdNum) continue;
    const key = `${batch.branchId.toString()}_${stdNum}`;
    if (!batchDistributionMap[key]) {
      batchDistributionMap[key] = [];
    }
    batchDistributionMap[key].push(batch);
  }

  for (const student of allStudents) {
    const batchIdStr  = student.batchId?.toString();
    const branchIdStr = student.branchId?.toString();

    // Check if already correctly assigned
    if (batchIdStr && allBatchIds.has(batchIdStr)) {
      alreadyOkCount++;
      console.log(`  ✓ OK: "${student.name}" already in batch [${batchIdStr}]`);
      continue;
    }

    // Need to assign: find branch
    if (!branchIdStr) {
      console.error(`  ✗ ERROR: "${student.name}" has no branchId — skipping`);
      errorCount++;
      continue;
    }

    const branch = allBranches.find(b => b._id.toString() === branchIdStr);
    if (!branch) {
      console.error(`  ✗ ERROR: "${student.name}" — branch [${branchIdStr}] not found in DB`);
      errorCount++;
      continue;
    }

    // Match batch by standard number
    const standard = String(student.standard || '').trim();
    const key = `${branchIdStr}_${standard}`;
    const matchingBatches = batchDistributionMap[key] || [];

    if (matchingBatches.length === 0) {
      console.error(`  ✗ ERROR: "${student.name}" (Std ${standard}, Branch "${branch.name}") — no matching batch found`);
      errorCount++;
      continue;
    }

    // Round-robin distribute across matching batches for same standard
    if (!batchAssignCounters[key]) batchAssignCounters[key] = 0;
    const assignedBatch = matchingBatches[batchAssignCounters[key] % matchingBatches.length];
    batchAssignCounters[key]++;

    await studentsCol.updateOne(
      { _id: student._id },
      { $set: { batchId: assignedBatch._id } }
    );
    assignedCount++;
    console.log(`  + Assigned: "${student.name}" (Std ${standard}) → Batch "${assignedBatch.name}" [${assignedBatch._id}] in "${branch.name}"`);
  }

  console.log('\n========================================');
  console.log(`DONE!`);
  console.log(`  Dummy students removed : ${DUMMY_STUDENTS.length}`);
  console.log(`  Students re-assigned   : ${assignedCount}`);
  console.log(`  Already correct        : ${alreadyOkCount}`);
  console.log(`  Errors                 : ${errorCount}`);
  console.log('========================================');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
