// scripts/fix-student-mapping.js
// Fixes student batchId & branchId mapping by:
// 1. Looking up each batch in the DB by name + branchId (from the 2 known branch IDs)
// 2. Updating every student's batchId to the REAL DB _id of the matching batch

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

// ---------- Source data (the correct student→batch mapping) ----------
const STUDENTS = [
  // Kanbiwad Branch students
  { name: 'Neha Gupta',    batchName: '6E1',  standard: '6',  branchName: 'Kanbiwad', mobile: '9876543230', parentMobile: '9876543231', yearlyFees: 12000, joinDate: '2026-06-01' },
  { name: 'Kiran Rao',     batchName: '7E1',  standard: '7',  branchName: 'Kanbiwad', mobile: '9876543232', parentMobile: '9876543233', yearlyFees: 14000, joinDate: '2026-06-02' },
  { name: 'Vijay Kumar',   batchName: '8E1',  standard: '8',  branchName: 'Kanbiwad', mobile: '9876543234', parentMobile: '9876543235', yearlyFees: 16000, joinDate: '2026-06-03' },
  { name: 'Sonal Jain',    batchName: '9E3',  standard: '9',  branchName: 'Kanbiwad', mobile: '9876543236', parentMobile: '9876543237', yearlyFees: 18000, joinDate: '2026-06-04' },
  { name: 'Tarun Mishra',  batchName: '9E4',  standard: '9',  branchName: 'Kanbiwad', mobile: '9876543238', parentMobile: '9876543239', yearlyFees: 18000, joinDate: '2026-06-05' },
  { name: 'Disha Patel',   batchName: '10E4', standard: '10', branchName: 'Kanbiwad', mobile: '9876543240', parentMobile: '9876543241', yearlyFees: 20000, joinDate: '2026-06-06' },
  { name: 'Manish Tiwari', batchName: '10E5', standard: '10', branchName: 'Kanbiwad', mobile: '9876543242', parentMobile: '9876543243', yearlyFees: 20000, joinDate: '2026-06-07' },
  { name: 'Reena Singh',   batchName: '10E6', standard: '10', branchName: 'Kanbiwad', mobile: '9876543244', parentMobile: '9876543245', yearlyFees: 20000, joinDate: '2026-06-08' },
  { name: 'Varun Dhawan',  batchName: '11E2', standard: '11', branchName: 'Kanbiwad', mobile: '9876543246', parentMobile: '9876543247', yearlyFees: 25000, joinDate: '2026-06-09' },
  { name: 'Kriti Sanon',   batchName: '12E2', standard: '12', branchName: 'Kanbiwad', mobile: '9876543248', parentMobile: '9876543249', yearlyFees: 30000, joinDate: '2026-06-10' },
  // AnandNagar Branch students
  { name: 'Raj Patel',     batchName: '6E1',  standard: '6',  branchName: 'AnandNagar', mobile: '9876543210', parentMobile: '9876543211', yearlyFees: 12000, joinDate: '2026-06-01' },
  { name: 'Priya Shah',    batchName: '7E1',  standard: '7',  branchName: 'AnandNagar', mobile: '9876543212', parentMobile: '9876543213', yearlyFees: 14000, joinDate: '2026-06-02' },
  { name: 'Amit Desai',    batchName: '8E1',  standard: '8',  branchName: 'AnandNagar', mobile: '9876543214', parentMobile: '9876543215', yearlyFees: 16000, joinDate: '2026-06-03' },
  { name: 'Sneha Joshi',   batchName: '9E1',  standard: '9',  branchName: 'AnandNagar', mobile: '9876543216', parentMobile: '9876543217', yearlyFees: 18000, joinDate: '2026-06-04' },
  { name: 'Rahul Mehta',   batchName: '9E2',  standard: '9',  branchName: 'AnandNagar', mobile: '9876543218', parentMobile: '9876543219', yearlyFees: 18000, joinDate: '2026-06-05' },
  { name: 'Pooja Trivedi', batchName: '10E1', standard: '10', branchName: 'AnandNagar', mobile: '9876543220', parentMobile: '9876543221', yearlyFees: 20000, joinDate: '2026-06-06' },
  { name: 'Rohan Bhatia',  batchName: '10E2', standard: '10', branchName: 'AnandNagar', mobile: '9876543222', parentMobile: '9876543223', yearlyFees: 20000, joinDate: '2026-06-07' },
  { name: 'Anjali Sharma', batchName: '10E3', standard: '10', branchName: 'AnandNagar', mobile: '9876543224', parentMobile: '9876543225', yearlyFees: 20000, joinDate: '2026-06-08' },
  { name: 'Yash Varma',    batchName: '11E1', standard: '11', branchName: 'AnandNagar', mobile: '9876543226', parentMobile: '9876543227', yearlyFees: 25000, joinDate: '2026-06-09' },
  { name: 'Kavya Singh',   batchName: '12E1', standard: '12', branchName: 'AnandNagar', mobile: '9876543228', parentMobile: '9876543229', yearlyFees: 30000, joinDate: '2026-06-10' },
];

const FeeRecordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  year: Number, month: Number,
  status: { type: String, enum: ['paid', 'partial', 'due', 'na'], default: 'due' },
  amountDue: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  paidOn: Date, note: String
}, { timestamps: true });

async function initFeeRecords(studentId, joinDate, monthlyFee) {
  const FeeRecord = mongoose.models.FeeRecord || mongoose.model('FeeRecord', FeeRecordSchema);
  const jd = new Date(joinDate);
  const joinMonth = jd.getMonth() + 1;
  const joinYear = jd.getFullYear();
  const academicStartYear = joinMonth < 5 ? joinYear - 1 : joinYear;

  const ops = [];
  for (let i = 0; i < 12; i++) {
    let month = 5 + i;
    let year = academicStartYear;
    if (month > 12) { month -= 12; year += 1; }
    const isBeforeJoin = year < joinYear || (year === joinYear && month < joinMonth);
    ops.push({
      updateOne: {
        filter: { studentId, year, month },
        update: { $setOnInsert: { status: isBeforeJoin ? 'na' : 'due', amountDue: isBeforeJoin ? 0 : monthlyFee, amountPaid: 0 } },
        upsert: true
      }
    });
  }
  await FeeRecord.bulkWrite(ops);
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;
  const branchesCol = db.collection('branches');
  const batchesCol  = db.collection('batches');
  const studentsCol = db.collection('students');

  // Build a map: branchName (lowercase partial) → branch doc
  const allBranches = await branchesCol.find({}).toArray();
  console.log('Branches in DB:');
  allBranches.forEach(b => console.log(`  [${b._id}] "${b.name}"`));
  console.log();

  // Build a map: branchId + batchName → batch doc
  const allBatches = await batchesCol.find({}).toArray();
  console.log('Batches in DB:');
  allBatches.forEach(b => console.log(`  [${b._id}] "${b.name}" -> branchId: ${b.branchId}`));
  console.log();

  let fixedCount = 0;
  let createdCount = 0;
  let errorCount = 0;

  for (const entry of STUDENTS) {
    // Find the branch by name (partial, case-insensitive)
    const branch = allBranches.find(b =>
      b.name.toLowerCase().includes(entry.branchName.toLowerCase())
    );
    if (!branch) {
      console.error(`✗ Branch not found for "${entry.branchName}" (student: ${entry.name})`);
      errorCount++;
      continue;
    }

    // Find the batch by name + branchId
    const batch = allBatches.find(b =>
      b.name === entry.batchName &&
      b.branchId.toString() === branch._id.toString()
    );
    if (!batch) {
      console.error(`✗ Batch "${entry.batchName}" not found in branch "${branch.name}" (student: ${entry.name})`);
      errorCount++;
      continue;
    }

    const correctBranchId = branch._id;
    const correctBatchId  = batch._id;

    // Try to find existing student by name (case-insensitive)
    const existingStudent = await studentsCol.findOne({
      name: { $regex: `^${entry.name}$`, $options: 'i' }
    });

    if (existingStudent) {
      const currentBatchId  = existingStudent.batchId?.toString();
      const currentBranchId = existingStudent.branchId?.toString();

      if (currentBatchId !== correctBatchId.toString() || currentBranchId !== correctBranchId.toString()) {
        // Update to correct IDs
        await studentsCol.updateOne(
          { _id: existingStudent._id },
          { $set: { batchId: correctBatchId, branchId: correctBranchId } }
        );
        console.log(`✓ Fixed: "${entry.name}" → Batch "${entry.batchName}" [${correctBatchId}], Branch "${branch.name}" [${correctBranchId}]`);
        fixedCount++;
      } else {
        console.log(`- OK (already correct): "${entry.name}" in Batch "${entry.batchName}"`);
      }
    } else {
      // Student doesn't exist yet — create them
      const yearlyFees = entry.yearlyFees;
      const monthlyFee = Math.round(yearlyFees / 12);
      const newStudent = {
        name: entry.name,
        mobileNumber: entry.mobile,
        parentMobile: entry.parentMobile,
        standard: entry.standard,
        monthlyFee,
        yearlyFees,
        joinDate: new Date(entry.joinDate),
        branchId: correctBranchId,
        batchId: correctBatchId,
        isActive: true,
      };
      const result = await studentsCol.insertOne(newStudent);
      await initFeeRecords(result.insertedId, entry.joinDate, monthlyFee);
      console.log(`+ Created: "${entry.name}" in Batch "${entry.batchName}" [${correctBatchId}]`);
      createdCount++;
    }
  }

  console.log('\n========================================');
  console.log(`Done! Fixed: ${fixedCount}, Created: ${createdCount}, Errors: ${errorCount}`);
  console.log('========================================');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
