import mongoose from 'mongoose';

// Ensure all Mongoose models are registered to avoid hot-reload schema errors
import '@/models/Branch';
import '@/models/Batch';
import '@/models/Student';
import '@/models/FeePayment';
import '@/models/Expense';
import '@/models/User';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then(async (mongooseInstance) => {
      try {
        const Student = mongooseInstance.models.Student;
        if (Student) {
          const studentsToMigrate = await Student.find({
            $or: [
              { yearlyFees: { $exists: false } },
              { mobileNumber: { $exists: false } }
            ]
          });
          if (studentsToMigrate.length > 0) {
            console.log(`[Migration] Migrating ${studentsToMigrate.length} students to new yearly schema...`);
            for (const student of studentsToMigrate) {
              const updates: any = {};
              if (student.yearlyFees === undefined || student.yearlyFees === 0) {
                updates.yearlyFees = (student.monthlyFee || 800) * 12;
              }
              if (!student.mobileNumber) {
                updates.mobileNumber = student.mobile || student.parentMobile || '';
              }
              await Student.updateOne({ _id: student._id }, { $set: updates });
            }
            console.log(`[Migration] Successfully migrated ${studentsToMigrate.length} students.`);
          }
        }
      } catch (err) {
        console.error('[Migration] Migration failed:', err);
      }
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
