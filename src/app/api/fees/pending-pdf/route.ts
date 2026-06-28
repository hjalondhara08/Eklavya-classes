import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Student from '@/models/Student';
import FeePayment from '@/models/FeePayment';
import { buildPendingFeesPdfBytes } from '@/lib/utils/pendingPdf';
import { formatDate } from '@/lib/utils/dates';

// Returns the pending-fees / dues list as a downloadable PDF (Content-Disposition:
// attachment). A real HTTP download is reliable on every device/browser, unlike
// client-side blob/share/window.print() which fail on many mobile browsers.
// Accessible to any logged-in user (used by Reports for admins and the dashboard
// batch drawer for operators); filter by branch / batch / standard / name search.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const batchId = searchParams.get('batchId');
    const standard = searchParams.get('standard');
    const search = searchParams.get('search');

    const studentFilter: any = { isActive: true };
    if (branchId && /^[0-9a-fA-F]{24}$/.test(branchId)) studentFilter.branchId = branchId;
    if (batchId && /^[0-9a-fA-F]{24}$/.test(batchId)) studentFilter.batchId = batchId;
    if (standard) studentFilter.standard = standard;
    if (search) {
      const safe = String(search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      studentFilter.name = { $regex: safe, $options: 'i' };
    }

    const students = await Student.find(studentFilter)
      .populate('branchId', 'name')
      .populate('batchId', 'name')
      .sort({ name: 1 })
      .lean();

    const studentIds = (students as any[]).map(s => s._id);
    const payments = studentIds.length
      ? await FeePayment.find({ studentId: { $in: studentIds } }).lean()
      : [];

    const paidMap: Record<string, number> = {};
    payments.forEach((p: any) => {
      const id = p.studentId.toString();
      paidMap[id] = (paidMap[id] || 0) + (p.amount || 0);
    });

    const pendingList: any[] = [];
    let grandTotalDue = 0;
    for (const s of students as any[]) {
      const totalPaidAmount = paidMap[s._id.toString()] || 0;
      const pendingAmount = Math.max(0, (s.yearlyFees || 0) - totalPaidAmount);
      if (pendingAmount > 0) {
        pendingList.push({
          name: s.name,
          mobileNumber: s.mobileNumber || s.mobile || '',
          parentMobile: s.parentMobile || '',
          branchName: (s.branchId as any)?.name || '',
          batchName: (s.batchId as any)?.name || '',
          yearlyFees: s.yearlyFees || 0,
          totalPaidAmount,
          pendingAmount,
        });
        grandTotalDue += pendingAmount;
      }
    }
    pendingList.sort((a, b) => b.pendingAmount - a.pendingAmount);

    const scopeLabel = (batchId && pendingList[0]?.batchName)
      ? `Batch ${pendingList[0].batchName}`
      : 'All';
    const metaLine = [
      scopeLabel,
      standard ? `Std ${standard}` : '',
      `${pendingList.length} student(s) with dues`,
      `Generated: ${formatDate(new Date())}`,
    ].filter(Boolean).join('  -  ');

    const bytes = buildPendingFeesPdfBytes(pendingList, grandTotalDue, metaLine);

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Pending_Fees_List.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
