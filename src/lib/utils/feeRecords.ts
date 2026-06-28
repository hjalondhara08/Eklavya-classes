import mongoose from 'mongoose';
import FeeRecord from '@/models/FeeRecord';

export async function initStudentFeeRecords(student: { _id: mongoose.Types.ObjectId, joiningDate: Date, monthlyFee: number }) {
  const joinDate = new Date(student.joiningDate);
  const joinMonth = joinDate.getMonth() + 1;
  const joinYear = joinDate.getFullYear();

  // Determine the start of the academic year based on joining date
  // If joined Jan-Apr, the academic year started in the previous year's May
  const academicStartYear = joinMonth < 5 ? joinYear - 1 : joinYear;

  const academicMonths = [];
  for (let i = 0; i < 12; i++) {
    // Academic year starts in May (month 5)
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
    const amountDue = isBeforeJoin ? 0 : student.monthlyFee;

    return {
      updateOne: {
        filter: { studentId: student._id, year: m.year, month: m.month },
        update: {
          // $setOnInsert: only applies when creating a NEW record
          // Never overwrite existing paid/partial records
          $setOnInsert: { status, amountDue, amountPaid: 0 }
        },
        upsert: true
      }
    };
  });

  await FeeRecord.bulkWrite(operations);
}

export async function applyPayment(studentId: string | mongoose.Types.ObjectId, amountReceived: number) {
  const records = await FeeRecord.find({
    studentId,
    status: { $in: ['due', 'partial'] }
  }).sort({ year: 1, month: 1 });

  let remainingAmount = amountReceived;
  let monthsFullyPaid = 0;
  let partialMonth = undefined;
  const operations: any[] = [];

  for (const record of records) {
    if (remainingAmount <= 0) break;

    const amountNeeded = record.amountDue - record.amountPaid;

    if (remainingAmount >= amountNeeded) {
      remainingAmount -= amountNeeded;
      monthsFullyPaid++;
      operations.push({
        updateOne: {
          filter: { _id: record._id },
          update: {
            $set: {
              status: 'paid',
              amountPaid: record.amountDue,
              paidOn: new Date()
            }
          }
        }
      });
    } else {
      partialMonth = { year: record.year, month: record.month, amount: remainingAmount };
      operations.push({
        updateOne: {
          filter: { _id: record._id },
          update: {
            $set: {
              status: 'partial',
              amountPaid: record.amountPaid + remainingAmount,
              paidOn: new Date()
            }
          }
        }
      });
      remainingAmount = 0;
      break;
    }
  }

  if (operations.length > 0) {
    await FeeRecord.bulkWrite(operations);
  }

  return {
    monthsFullyPaid,
    partialMonth,
    remainingBalance: remainingAmount
  };
}

export function getPendingFees(student: { yearlyFees: number; totalPaidAmount?: number }) {
  return student.yearlyFees - (student.totalPaidAmount || 0);
}
