# Eklavya Classes TMS — Update Specification

> **Stack:** Next.js · TypeScript · MongoDB Atlas · NextAuth.js · Vercel  
> **Academic Year:** 01/05/2025 – 30/04/2026

---

## 1. Fee Structure: Mid-Year Enrollment & N/A Month Logic

### Problem
Students who join mid-year (e.g., joining December) currently show all earlier months as PENDING — this inflates the pending fee list and distorts revenue reports.

### Solution: Three-State Fee Status + N/A Months

**MongoDB Schema — `feeRecords` collection (update/upsert per student per month):**

```typescript
interface FeeRecord {
  studentId: ObjectId;
  year: number;          // e.g., 2025
  month: number;         // 1–12
  status: 'paid' | 'partial' | 'due' | 'na';
  amountDue: number;     // 0 if status === 'na'
  amountPaid: number;
  paidOn?: Date;
  note?: string;
}
```

**Rule — on student enrollment:**
```
Academic months: May(5) 2025 → April(4) 2026
joiningDate = student.joiningDate

For each academic month M:
  if M < joiningMonth → status = 'na', amountDue = 0
  else → status = 'due', amountDue = student.monthlyFee
```

**Prompt for your AI/Copilot:**
> "Write a MongoDB Atlas / Node.js utility function `initStudentFeeRecords(student)` that receives a student document with fields `_id`, `joiningDate` (Date), and `monthlyFee` (number). Academic year is May 2025 (month index 5, year 2025) to April 2026 (month index 4, year 2026). For each of the 12 academic months, insert a `feeRecord` document into the `feeRecords` collection with status `na` and `amountDue: 0` for months before the joining month, and status `due` with `amountDue: student.monthlyFee` for months from joining month onward. Use `bulkWrite` with `upsert: true` on composite key `{ studentId, year, month }`. TypeScript, Mongoose or native MongoDB driver."

---

## 2. Partial Payment → Auto-Mark Months as Paid

### Logic
```
totalPaid = sum of all payments for student
monthlyFee = student.monthlyFee (e.g., ₹600)
paidMonths = Math.floor(totalPaid / monthlyFee)
remainder = totalPaid % monthlyFee

Apply paidMonths greedily from earliest 'due' month forward.
If remainder > 0 → mark next month as 'partial', amountPaid = remainder.
```

**Example:**
- Fee = ₹600/month, Parent pays ₹4000
- 4000 ÷ 600 = 6 full months paid, remainder ₹400
- Months 1–6 → `paid`, Month 7 → `partial` (₹400 paid, ₹200 still due)
- Later pays ₹2000 → ₹200 clears partial + 3 more full months

**Prompt for your AI/Copilot:**
> "Write a TypeScript async function `applyPayment(studentId: string, amountReceived: number)` for a tuition management app. MongoDB collections: `students` (has `monthlyFee: number`, `joiningDate: Date`), `feeRecords` (fields: studentId, year, month, status: 'paid'|'partial'|'due'|'na', amountDue, amountPaid). Academic year: May 2025–April 2026 ordered as [May, Jun, Jul, Aug, Sep, Oct, Nov, Dec, Jan, Feb, Mar, Apr]. Fetch all feeRecords for this student where status is 'due' or 'partial', sorted by year+month ascending. Distribute `amountReceived` greedily: fill partial months first (top up to full fee), then mark subsequent 'due' months as 'paid' (amountPaid = monthlyFee), and if remainder > 0 after all full months, set next month to 'partial' with amountPaid = remainder. Use a single `bulkWrite` to update. Return a summary object: `{ monthsFullyPaid, partialMonth?, remainingBalance }`. TypeScript, native MongoDB driver."

---

## 3. Fee Status Display: Monthly vs Yearly Toggle

### Problem
When switching status view from **Monthly → Yearly**, the UI still shows month-by-month breakdown.

### Fix
- Add a `viewMode: 'monthly' | 'yearly'` state to the fee section component.
- **Monthly mode:** render existing month grid (Jan–Dec tiles).
- **Yearly mode:** render a single summary card per academic year:
  - Total Expected (enrolled months × fee)
  - Total Collected
  - Total Pending (only from `due` + `partial` statuses)
  - Status badge: Fully Paid / Partially Paid / Due

**Prompt:**
> "In my Next.js/TypeScript fee status component, I have a toggle between 'monthly' and 'yearly' view. Currently both modes show the same month grid. Update the component so: (1) monthly mode shows the existing 12-tile month grid, (2) yearly mode shows a single summary card with fields: `totalExpected` (count of non-'na' feeRecords × monthlyFee), `totalCollected` (sum of amountPaid across all records), `totalPending` (sum of amountDue - amountPaid for 'due' and 'partial' records), and a status label. Data comes from a `/api/students/[id]/fee-summary?year=2025` endpoint that returns these aggregated values from MongoDB. Add the API route too."

---

## 4. Reports Section — Fix Pending/Dues & Yearly Fee Collection

### 4A. Pending & Dues Tab

**Problem:** Not showing correct data.

**Correct query logic:**
```
Pending students = feeRecords where:
  status IN ['due', 'partial']
  AND month is an academic month (May 2025–Apr 2026)
  AND status != 'na'

Group by studentId, sum (amountDue - amountPaid) as totalDue
Join with students collection for name, branch, batch
```

**Prompt:**
> "Write a MongoDB aggregation pipeline for my `feeRecords` collection that returns a list of students with pending fees. Filter: status in ['due', 'partial'] and NOT 'na'. Group by studentId, compute totalDue = sum(amountDue - amountPaid). Lookup student name, branch, batch from `students` collection. Sort by totalDue descending. This will be used in a Next.js API route `/api/reports/pending-dues` returning JSON. TypeScript, native MongoDB driver."

### 4B. Yearly Fee Collection Report

**Problem:** Not working.

**Correct aggregation:**
```
For academic year May 2025–Apr 2026:
  totalExpected = count(feeRecords where status != 'na') × avgFee
  totalCollected = sum(amountPaid) where status in ['paid','partial']
  totalPending = sum(amountDue - amountPaid) where status in ['due','partial']
  collectionRate = (totalCollected / totalExpected) × 100
```

**Prompt:**
> "Write a MongoDB aggregation for my `feeRecords` collection to generate a yearly fee collection report for academic year May 2025–April 2026 (year 2025, months 5–12 and year 2026 months 1–4). Compute: totalExpected (sum of amountDue for all non-'na' records), totalCollected (sum of amountPaid for 'paid' and 'partial' records), totalPending (totalExpected - totalCollected), collectionRate percentage. Also break it down month by month. Return as JSON for a Next.js API route `/api/reports/yearly-collection?year=2025`. TypeScript, native MongoDB driver."

---

## 5. Operator Section — Student Information Not Showing

**Problem:** Students list is empty in operator view.

**Likely causes & fixes:**
1. Missing branch/batch filter — operator is scoped to a branch but query has no branch filter
2. Role-based query not passing `branchId` from session

**Prompt:**
> "In my Next.js API route `/api/operator/students`, the student list is not returning any data for operator-role users. The operator session contains `branchId`. Fix the API route to: (1) extract `branchId` from the session/JWT, (2) query MongoDB `students` collection filtering by `branchId`, (3) return fields: name, enrollmentNumber, batch, joiningDate, feeStatus, contact. Also ensure the frontend operator dashboard passes the auth token correctly and re-fetches on mount. TypeScript, NextAuth.js session, native MongoDB driver."

---

## 6. Date Format: Change to dd/mm/yyyy Everywhere

**Prompt:**
> "In my Next.js TypeScript app, all dates are currently displayed in ISO or mm/dd/yyyy format. Create a utility function `formatDate(date: Date | string): string` that returns dates in dd/mm/yyyy format. Then find and replace all date display instances in the app — including student profile, fee records, reports, and operator section — to use this utility. Also update any date input fields to accept and display dd/mm/yyyy using a controlled input with proper parsing back to ISO for MongoDB storage."

**Utility function to add:**
```typescript
// utils/formatDate.ts
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
```

---

## 7. Fee Status Summary — Academic Year Navigation

### Fix: Education Month Range
- Academic year: **01/05/2025 to 30/04/2026**
- Month order in grid: `May · Jun · Jul · Aug · Sep · Oct · Nov · Dec · Jan · Feb · Mar · Apr`
- Year selector (← 2026 →) should map to academic year starting May of that year - 1

**Prompt:**
> "Update my fee status summary component. The academic year runs from May 1 to April 30 (e.g., 'Academic Year 2025-26' = May 2025 to April 2026). The year navigator shows '2026' meaning the year the academic year ends. The month grid must display in order: May, Jun, Jul, Aug, Sep, Oct, Nov, Dec (year-1), Jan, Feb, Mar, Apr (year). Update the grid rendering logic and the API call to fetch feeRecords for the correct year+month combinations. N/A months should show a grey tile with 'N/A' text instead of a red ✕. TypeScript, Next.js, MongoDB."

---

## 8. Pending Fee Section — Smart Calculation

### Display logic for student profile pending fee:
```
pendingMonths = feeRecords where status IN ['due', 'partial'] AND status != 'na'
  filtered from joiningDate onward

totalPayable = sum(amountDue - amountPaid) for above records

Display:
  - List of pending month names (e.g., "Jan, Feb, Mar, Apr")
  - Total: ₹X payable
  - Quick pay button per month (collects monthlyFee for that month)
```

**Prompt:**
> "In my student profile page, the pending fee section should: (1) show only months from the student's joining date onward that have status 'due' or 'partial' (exclude 'na'), (2) list each month name with amount due, (3) show total payable amount, (4) clicking a red pending month tile opens a quick payment dialog that pre-fills ₹600 (or the student's monthlyFee) and calls `/api/fees/collect` with `{ studentId, year, month, amount }`. The API should call `applyPayment()` and return updated feeRecords. TypeScript, Next.js, MongoDB."

---

## 9. Revenue Calculation — Exclude N/A Months

**Correct formula:**
```
Expected Revenue (branch/all) =
  SUM over all students of:
    (count of enrolled months for student) × student.monthlyFee

Enrolled months = feeRecords where status != 'na'

Actual Revenue = SUM(amountPaid) where status in ['paid', 'partial']
Pending = Expected - Actual
```

**Prompt:**
> "Write a MongoDB aggregation for my tuition app that calculates revenue correctly, excluding N/A months (months before a student's joining date). Collections: `feeRecords` (studentId, status: paid|partial|due|na, amountDue, amountPaid), `students` (monthlyFee, branchId). Pipeline should: (1) filter out records where status = 'na', (2) group by branchId optionally, (3) compute totalExpected = sum(amountDue), totalCollected = sum(amountPaid where status in [paid, partial]), totalPending = totalExpected - totalCollected. Used in `/api/reports/revenue`. TypeScript, native MongoDB driver."

---

## Summary of Files to Update

| File / Area | Change |
|---|---|
| `utils/formatDate.ts` | New utility, dd/mm/yyyy format |
| `utils/feeRecords.ts` | `initStudentFeeRecords()`, `applyPayment()` |
| `models/FeeRecord.ts` | Add `na` to status enum |
| `pages/api/students/[id]/fee-summary.ts` | Monthly/yearly aggregation |
| `pages/api/reports/pending-dues.ts` | Fix aggregation, exclude 'na' |
| `pages/api/reports/yearly-collection.ts` | Fix academic year aggregation |
| `pages/api/reports/revenue.ts` | Exclude 'na' from expected |
| `pages/api/operator/students.ts` | Add branchId filter from session |
| `pages/api/fees/collect.ts` | Call applyPayment(), return updated records |
| `components/FeeStatusSummary.tsx` | Month order (May→Apr), N/A tiles, yearly toggle |
| `components/StudentProfile/PendingFee.tsx` | Show from joining date, total payable |
| All date displays | Use `formatDate()` utility |

---

## Academic Year Reference

```
Academic Year 2025-26
Start: 01/05/2025
End:   30/04/2026

Month order in UI:
[May'25] [Jun'25] [Jul'25] [Aug'25] [Sep'25] [Oct'25]
[Nov'25] [Dec'25] [Jan'26] [Feb'26] [Mar'26] [Apr'26]

Student joining December 2025:
  May–Nov → N/A (grey tile, no fee)
  Dec–Apr → Due/Paid (active fee months)
  Total payable months = 5
```
