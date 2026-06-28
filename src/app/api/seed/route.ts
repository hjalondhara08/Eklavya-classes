import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Branch from '@/models/Branch';
import User from '@/models/User';
import Batch from '@/models/Batch';
import Student from '@/models/Student';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    // SECURITY: this endpoint performs destructive bulk writes and (re)creates the
    // admin account, so it must never be publicly reachable. Restrict to an
    // authenticated administrator only.
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    await connectToDatabase();

    // ── STEP 1: Find the real branch documents that exist in DB ─────────────
    const anandNagarBranch = await Branch.findOne({ name: 'AnandNagar', isActive: true });
    const kanbiwadBranch   = await Branch.findOne({ name: 'Kanbiwad',   isActive: true });

    if (!anandNagarBranch) throw new Error('Branch "AnandNagar" not found in DB. Please check branch names.');
    if (!kanbiwadBranch)   throw new Error('Branch "Kanbiwad" not found in DB. Please check branch names.');

    // ── STEP 2: Seed Admin User ──────────────────────────────────────────────
    const adminEmail = 'admin@eklavya.in';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        branchId: null,
        isActive: true,
      });
    }

    // ── STEP 3: Create / Update all batches (upsert to keep constant _id values) ──
    const batchesToSeed = [
      // ── ANANDNAGAR ───────────────────────────────────────────────
      { branchId: anandNagarBranch._id, name: '6E1',   timing: '07:00 AM - 09:00 AM' },
      { branchId: anandNagarBranch._id, name: '7E1',   timing: '07:00 AM - 09:00 AM' },
      { branchId: anandNagarBranch._id, name: '8E1',   timing: '07:00 AM - 09:00 AM' },
      { branchId: anandNagarBranch._id, name: '9E1',   timing: '07:00 AM - 09:00 AM' },
      { branchId: anandNagarBranch._id, name: '9E2',   timing: '09:00 AM - 11:00 AM' },
      { branchId: anandNagarBranch._id, name: '10E1',  timing: '07:00 AM - 09:00 AM' },
      { branchId: anandNagarBranch._id, name: '10E2',  timing: '09:00 AM - 11:00 AM' },
      { branchId: anandNagarBranch._id, name: '10E3',  timing: '11:00 AM - 01:00 PM' },
      { branchId: anandNagarBranch._id, name: '11E1',  timing: '02:00 PM - 04:00 PM' },
      { branchId: anandNagarBranch._id, name: '12E1',  timing: '04:00 PM - 06:00 PM' },

      // ── KANBIWAD ─────────────────────────────────────────────────
      { branchId: kanbiwadBranch._id, name: '6E1',  timing: '07:00 AM - 09:00 AM' },
      { branchId: kanbiwadBranch._id, name: '7E1',  timing: '07:00 AM - 09:00 AM' },
      { branchId: kanbiwadBranch._id, name: '8E1',  timing: '07:00 AM - 09:00 AM' },
      { branchId: kanbiwadBranch._id, name: '9E3',  timing: '04:00 PM - 06:00 PM' },
      { branchId: kanbiwadBranch._id, name: '9E4',  timing: '09:00 AM - 11:00 AM' },
      { branchId: kanbiwadBranch._id, name: '10E4', timing: '09:00 AM - 11:00 AM' },
      { branchId: kanbiwadBranch._id, name: '10E5', timing: '04:00 PM - 06:00 PM' },
      { branchId: kanbiwadBranch._id, name: '10E6', timing: '11:00 AM - 01:00 PM' },
      { branchId: kanbiwadBranch._id, name: '11E2', timing: '06:00 PM - 08:00 PM' },
      { branchId: kanbiwadBranch._id, name: '12E2', timing: '06:00 PM - 08:00 PM' },
    ];

    const seededBatches: any[] = [];
    for (const b of batchesToSeed) {
      let batch = await Batch.findOne({ branchId: b.branchId, name: b.name });
      if (!batch) {
        batch = await Batch.create(b);
      } else {
        batch.timing = b.timing;
        await batch.save();
      }
      seededBatches.push(batch);
    }

    // ── STEP 4: Self-healing / Dynamic Relinker for Students ───────────────
    const idToBatchName: Record<string, { name: string, branch: string }> = {
      // Excel raw IDs
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
      "6a3e1903e04decafce5f6d19": { name: "12E2", branch: "Kanbiwad" }
    };

    const activeBatchIds = new Set(seededBatches.map(b => b._id.toString()));
    const allStudents = await Student.find({});
    
    let relinkedCount = 0;
    for (const s of allStudents) {
      if (!s.batchId) continue;
      const currentBatchIdStr = s.batchId.toString();
      
      // If student is already mapped to a currently active batch, skip relinking
      if (activeBatchIds.has(currentBatchIdStr)) continue;

      let targetBatchName = '';
      const mapped = idToBatchName[currentBatchIdStr];
      
      if (mapped) {
        targetBatchName = mapped.name;
      } else {
        // Fallback standard-based guessing
        const stdNum = parseInt(s.standard);
        const isKanbiwad = s.branchId?.toString() === kanbiwadBranch._id.toString();
        
        if (stdNum === 6) targetBatchName = '6E1';
        else if (stdNum === 7) targetBatchName = '7E1';
        else if (stdNum === 8) targetBatchName = '8E1';
        else if (stdNum === 11) targetBatchName = isKanbiwad ? '11E2' : '11E1';
        else if (stdNum === 12) targetBatchName = isKanbiwad ? '12E2' : '12E1';
        else {
          if (stdNum === 9) targetBatchName = isKanbiwad ? '9E3' : '9E1';
          else if (stdNum === 10) targetBatchName = isKanbiwad ? '10E4' : '10E1';
        }
      }

      if (targetBatchName) {
        const branchIdToFind = s.branchId?.toString() || anandNagarBranch._id.toString();
        const activeBatchDoc = seededBatches.find(b => 
          b.name === targetBatchName && 
          b.branchId.toString() === branchIdToFind
        );
        if (activeBatchDoc) {
          s.batchId = activeBatchDoc._id;
          await s.save();
          relinkedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Seeding & Self-healing completed successfully!',
      branches: [
        { id: anandNagarBranch._id, name: anandNagarBranch.name },
        { id: kanbiwadBranch._id,   name: kanbiwadBranch.name },
      ],
      batches: seededBatches.map(b => b.name),
      relinkedStudentsCount: relinkedCount,
      admin: admin.email,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
