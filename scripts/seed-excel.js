// scripts/seed-excel.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx'); // Standard npm package for Excel parsing

// 1. Connect to MongoDB using env variables from .env.local
let MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  try {
    const envPath = path.join(__dirname, '../.env.local');
    const envFile = fs.readFileSync(envPath, 'utf-8');
    const match = envFile.match(/MONGODB_URI=(.+)/);
    if (match) {
      MONGODB_URI = match[1].trim();
    }
  } catch (err) {
    console.error("Failed to read .env.local:", err.message);
  }
}
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found! Set it in .env.local or as an environment variable.');
  process.exit(1);
}

// 2. Define Student and FeeRecord Schemas
const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  parentMobile: { type: String },
  standard: { type: String, required: true },
  monthlyFee: { type: Number, default: 0 },
  yearlyFees: { type: Number, required: true },
  joinDate: { type: Date, required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  isActive: { type: Boolean, default: true },
});

const FeeRecordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  status: {
    type: String,
    enum: ['paid', 'partial', 'due', 'na'],
    required: true,
    default: 'due'
  },
  amountDue: { type: Number, required: true, default: 0 },
  amountPaid: { type: Number, required: true, default: 0 },
  paidOn: { type: Date },
  note: { type: String }
}, { timestamps: true });

const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);
const FeeRecord = mongoose.models.FeeRecord || mongoose.model('FeeRecord', FeeRecordSchema);

function excelDateToJSDate(serial) {
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

// Helper to look up alternate headers in the excel sheet row
function getValueByAlternateKeys(row, keys, defaultValue = undefined) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  return defaultValue;
}

async function initStudentFeeRecords(studentId, joinDateVal, monthlyFee) {
  const joinDate = new Date(joinDateVal);
  const joinMonth = joinDate.getMonth() + 1;
  const joinYear = joinDate.getFullYear();

  const academicStartYear = joinMonth < 5 ? joinYear - 1 : joinYear;

  const academicMonths = [];
  for (let i = 0; i < 12; i++) {
    let month = 5 + i;
    let year = academicStartYear;
    if (month > 12) {
      month -= 12;
      year += 1;
    }
    academicMonths.push({ month, year });
  }

  const operations = academicMonths.map(m => {
    const isBeforeJoin = m.year < joinYear || (m.year === joinYear && m.month < joinMonth);
    const status = isBeforeJoin ? 'na' : 'due';
    const amountDue = isBeforeJoin ? 0 : monthlyFee;

    return {
      updateOne: {
        filter: { studentId: studentId, year: m.year, month: m.month },
        update: {
          $setOnInsert: { status, amountDue, amountPaid: 0 }
        },
        upsert: true
      }
    };
  });

  await FeeRecord.bulkWrite(operations);
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB.");

  // Get Excel file name from CLI arguments     
  const inputFileName = process.argv[2] || 'DATA_FINAL.xlsx';
  const excelFilePath = path.isAbsolute(inputFileName) ? inputFileName : path.join(__dirname, inputFileName);

  if (!fs.existsSync(excelFilePath)) {
    console.error(`Error: Excel file not found at ${excelFilePath}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Reading Excel file: ${excelFilePath}`);
  const workbook = xlsx.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const rawRows = xlsx.utils.sheet_to_json(worksheet);
  console.log(`Found ${rawRows.length} rows in sheet.`);

  let successCount = 0;
  for (const row of rawRows) {
    const nameVal = getValueByAlternateKeys(row, ['Name', 'name', 'Student Name', 'student_name']);
    if (!nameVal || !String(nameVal).trim()) {
      continue;
    }

    const name = String(nameVal).trim();

    // Alternate keys for all parameters to handle different spreadsheet structures
    const mobileVal = getValueByAlternateKeys(row, ['mobile', 'Mobile', 'Mobile Number', 'mobile_number', 'MobileNo'], '0000000000');
    const parentMobileVal = getValueByAlternateKeys(row, ['parent_mobile', 'Parent Mobile', 'Parent Mobile Number', 'parent_mobile_number', 'ParentMobile'], '');
    const standardVal = getValueByAlternateKeys(row, ['standard', 'Standard', 'Class', 'class'], '10');
    const feesVal = getValueByAlternateKeys(row, ['fees', 'Fees', 'Early Fees', 'yearlyFees', 'Yearly Fees', 'yearly_fees'], 10000);
    const joinDateRaw = getValueByAlternateKeys(row, ['join_date', 'Join Date', 'joinDate', 'joining_date']);
    const branchIdVal = getValueByAlternateKeys(row, ['branch_id', 'Branch ID', 'branchId', 'branch']);
    const batchIdVal = getValueByAlternateKeys(row, ['batch_id', 'Batch ID', 'batchId', 'batch']);

    // Convert join date
    let joinDateVal = new Date("2026-05-01");
    if (joinDateRaw) {
      const serial = Number(joinDateRaw);
      if (!isNaN(serial)) {
        joinDateVal = excelDateToJSDate(serial);
      } else {
        joinDateVal = new Date(joinDateRaw);
      }
    }

    // Resolve branch ID (use row value or lookup by batchId)
    let resolvedBranchId = branchIdVal;
    if (!resolvedBranchId && batchIdVal) {
      const batchObj = await mongoose.connection.db.collection('batches').findOne({ 
        _id: new mongoose.Types.ObjectId(String(batchIdVal).trim()) 
      });
      if (batchObj) {
        resolvedBranchId = batchObj.branchId;
      }
    }

    // Default fallback branch if still missing (Kanbiwad branch ID)
    if (!resolvedBranchId) {
      resolvedBranchId = "6a3359e1dbc89d2130f4e2b0";
    }

    if (!batchIdVal) {
      console.warn(`Skipping row for "${name}" because batch ID is missing.`);
      continue;
    }

    let finalBranchObjId = null;
    let finalBatchObjId = null;

    try {
      finalBranchObjId = new mongoose.Types.ObjectId(String(resolvedBranchId).trim());
      finalBatchObjId = new mongoose.Types.ObjectId(String(batchIdVal).trim());
    } catch (err) {
      console.warn(`Skipping row for "${name}" due to invalid batch/branch ID format.`);
      continue;
    }

    const yearlyFees = Number(feesVal);
    const monthlyFee = Math.round(yearlyFees / 12);

    const studentData = {
      name: name,
      mobileNumber: String(mobileVal).trim(),
      parentMobile: String(parentMobileVal).trim(),
      standard: String(standardVal).trim(),
      monthlyFee: monthlyFee,
      yearlyFees: yearlyFees,
      joinDate: joinDateVal,
      branchId: finalBranchObjId,
      batchId: finalBatchObjId,
      isActive: true,
    };

    // Check duplicate & save
    const exists = await Student.findOne({ 
      name: studentData.name, 
      branchId: studentData.branchId,
      batchId: studentData.batchId 
    });

    if (!exists) {
      const saved = await Student.create(studentData);
      
      // Initialize Academic Fee Records for student
      await initStudentFeeRecords(saved._id, saved.joinDate, saved.monthlyFee);
      
      successCount++;
      console.log(`[${successCount}] Imported & Activated: ${saved.name}`);
    } else {
      console.log(`Student "${studentData.name}" already exists, skipping.`);
    }
  }

  console.log(`\nSeeding complete! Successfully processed ${successCount} new students.`);
  await mongoose.disconnect();
}

seed().catch(console.error);
