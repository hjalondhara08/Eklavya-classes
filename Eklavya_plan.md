<div align="center">

<img src="https://raw.githubusercontent.com/placeholder/eklavya/main/assets/logo.png" alt="Eklavya Classes Logo" width="100"/>

# EKLAVYA CLASSES
### Tuition Management System

**જ્ઞાનથી ઉજ્જવળ ભવિષ્ય તરફ ✨**
*Towards a bright future through knowledge.*

---

![Version](https://img.shields.io/badge/version-1.0.0-0D1B4B?style=for-the-badge)
![Stack](https://img.shields.io/badge/stack-Next.js%20%2B%20MongoDB-E8A500?style=for-the-badge)
![Auth](https://img.shields.io/badge/auth-NextAuth.js-0D1B4B?style=for-the-badge)
![Deploy](https://img.shields.io/badge/deploy-Vercel-black?style=for-the-badge)
![Cost](https://img.shields.io/badge/monthly%20cost-₹0-2E7D32?style=for-the-badge)

</div>

---

## What Is Eklavya Classes?

**Eklavya Classes** is a **Responsive Progressive Web App (PWA)** — a browser-based application that works exactly like a mobile app on phones, tablets, and desktops — no App Store, no Play Store, no installation required.

Built for **Eklavya Classes** (Anand Nagar & Kanbivad branches), it manages students, fee collection, expenses, and profit reporting across two branches — with strict role-based access so the **Admin controls everything**, and **Fee Operators see only what they need**.

> Works on iPhone Safari · Android Chrome · Desktop · Tablet — all from a single URL.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Role-Based Access Control](#role-based-access-control)
- [How Auth Works](#how-auth-works)
- [Design System](#design-system)
- [Database Schema](#database-schema)
- [Feature Modules](#feature-modules)
- [Fee View Specifications](#fee-view-specifications)
- [Folder Structure](#folder-structure)
- [What to Build Where](#what-to-build-where)
- [Development Phases](#development-phases)
- [Deployment](#deployment)
- [Business Logic Rules](#business-logic-rules)
- [Monthly Cost](#monthly-cost)
- [Branches](#branches)

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) + TypeScript | SSR, file-based routing, PWA-ready |
| **Styling** | Tailwind CSS | Mobile-first responsive, fast iteration |
| **Database** | MongoDB Atlas | Flexible documents, free M0 tier, cloud-hosted |
| **ODM** | Mongoose | Schema validation, model definitions for MongoDB |
| **Auth** | NextAuth.js (Auth.js v5) | Built for Next.js, session + JWT, role support |
| **Deploy** | Vercel | Auto-deploy from GitHub, free tier |
| **PWA** | next-pwa | Installable on mobile, offline-capable |
| **Fonts** | Poppins + Noto Sans Gujarati | Brand typography, Gujarati script support |

---

## Role-Based Access Control

> **Only the Admin can create, manage, and deactivate Operators. Operators cannot self-register.**

```
Admin
 └── Creates & manages Operator accounts
 └── Full access to everything

Fee Operator
 └── Created by Admin only
 └── Restricted view — cannot access expenses, reports, or profit
```

### Permission Matrix

| Feature | Admin | Fee Operator |
|---|:---:|:---:|
| Dashboard (full) | ✅ | ❌ |
| Dashboard (student summary only) | ✅ | ✅ |
| View Students | ✅ | ✅ |
| Add Student | ✅ | ✅ |
| Edit Student | ✅ | ✅ |
| Delete / Deactivate Student | ✅ | ❌ |
| Collect Fee | ✅ | ✅ |
| Fee History | ✅ | ✅ |
| Pending Fees | ✅ | ✅ |
| Add Expense | ✅ | ❌ |
| Edit / Delete Expense | ✅ | ❌ |
| Expense Dashboard | ✅ | ❌ |
| Profit Report | ✅ | ❌ |
| Monthly Report | ✅ | ❌ |
| Yearly Report | ✅ | ❌ |
| Manage Users (Operators) | ✅ | ❌ |
| Export PDF | ✅ | ❌ |

---

## How Auth Works

### Flow

```
User visits /login
       ↓
Enters email + password
       ↓
NextAuth.js CredentialsProvider
       ↓
Looks up user in MongoDB (users collection)
       ↓
Verifies hashed password (bcrypt)
       ↓
Creates JWT session → role stored inside token
       ↓
Next.js middleware reads role on every request
       ↓
Admin routes → only if role === 'admin'
Operator routes → if role === 'admin' OR 'operator'
```

### Session Token Shape

```ts
// What NextAuth puts in the JWT
{
  id: "mongo_user_id",
  name: "Operator Name",
  email: "operator@eklavya.in",
  role: "operator",   // 'admin' | 'operator'
  branchId: "branch_mongo_id"  // null for admin
}
```

### Admin-Only Operator Creation Flow

1. Admin logs in → goes to **Users** page
2. Admin fills Create Operator form (name, email, password, branch)
3. API route `POST /api/users` hashes password with bcrypt → saves to MongoDB `users` collection with `role: "operator"`
4. Operator logs in with the credentials Admin gave them
5. Operator can **never** change their own role — role field is write-protected in the API

---

## Design System

Inspired by the **Eklavya Classes brand identity** — Navy, Gold, and White — with clean mobile-first typography.

### Color Palette

```css
--color-navy:           #0D1B4B;   /* Primary — brand dark navy */
--color-gold:           #E8A500;   /* Accent — brand gold/amber */
--color-red:            #D32F2F;   /* Danger — pending / overdue */
--color-green:          #2E7D32;   /* Success — paid / active */
--color-surface:        #F8F9FA;   /* Page background */
--color-card:           #FFFFFF;   /* Card background */
--color-divider:        #E0E0E0;   /* Borders */
--color-text-primary:   #1A1A2E;
--color-text-secondary: #6B7280;
```

### Typography

```
Display / Headings  →  Poppins (Bold, SemiBold)
Body / UI           →  Poppins (Regular, Medium)
Gujarati Branding   →  Noto Sans Gujarati
```

```
h1  Poppins 28px Bold       — Screen titles
h2  Poppins 20px SemiBold   — Section headings
h3  Poppins 16px SemiBold   — Card titles
p   Poppins 14px Regular    — Body text
sm  Poppins 12px Regular    — Captions, labels
```

### Component Tokens

```
Card Radius     : 16px
Button Radius   : 12px
Card Shadow     : 0 2px 8px rgba(0,0,0,0.08)
Standard Padding: 16px
Small Padding   : 8px
Icon Size       : 24px
Bottom Nav Ht   : 64px  (mobile)
```

### Mobile-First Layout

- **Mobile** (< 640px) — Single column, bottom navigation bar
- **Tablet** (640–1024px) — Two-column cards, side navigation
- **Desktop** (> 1024px) — Sidebar navigation, multi-column dashboard

---

## Database Schema

**Platform:** MongoDB Atlas | **ODM:** Mongoose | **Version:** 1.0.0

All data is stored as documents in MongoDB collections. Relationships use `ObjectId` references.

---

### Collection: `users`

```ts
// models/User.ts
{
  _id: ObjectId,
  name: String,               // required
  email: String,              // required, unique
  password: String,           // required — bcrypt hashed
  role: String,               // enum: ['admin', 'operator']
  branchId: ObjectId | null,  // ref: 'Branch' — null means all branches (admin)
  isActive: Boolean,          // default: true
  createdAt: Date,
  updatedAt: Date
}
```

---

### Collection: `branches`

```ts
// models/Branch.ts
{
  _id: ObjectId,
  name: String,       // required — e.g. "Anand Nagar"
  address: String,
  phone: String,
  isActive: Boolean,  // default: true
  createdAt: Date,
  updatedAt: Date
}

// Seed documents
{ name: "Anand Nagar", address: "L.I.G. - 472, Biju Bus Stand, Anandnagar",              phone: "8469966983" }
{ name: "Kanbivad",    address: "Thakkar Khamani ni Bajuma, Kharget Road, Kanbivad",      phone: "9662172580" }
```

---

### Collection: `batches`

```ts
// models/Batch.ts
{
  _id: ObjectId,
  branchId: ObjectId,   // ref: 'Branch', required
  name: String,         // required — e.g. "Batch A", "Std 10 Morning"
  timing: String,       // e.g. "7:00 AM - 9:00 AM"
  days: String,         // e.g. "Mon, Wed, Fri"
  isActive: Boolean,    // default: true
  createdAt: Date,
  updatedAt: Date
}
```

---

### Collection: `students`

```ts
// models/Student.ts
{
  _id: ObjectId,
  branchId: ObjectId,      // ref: 'Branch', required
  batchId: ObjectId,       // ref: 'Batch', required
  name: String,            // required
  mobile: String,
  parentMobile: String,
  standard: String,        // e.g. "10", "12"
  monthlyFee: Number,      // required, default: 0
  joinDate: Date,          // required
  isActive: Boolean,       // default: true
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

### Collection: `fee_payments`

```ts
// models/FeePayment.ts
{
  _id: ObjectId,
  studentId: ObjectId,      // ref: 'Student', required
  feeMonth: String,         // required — Format: "YYYY-MM" e.g. "2026-06"
  amount: Number,           // required
  paymentType: String,      // enum: ['full','partial','extra','discount','late_fee']
  transactionDate: Date,    // required — core filter field
  notes: String,
  createdBy: ObjectId,      // ref: 'User'
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ transactionDate: 1 }
{ studentId: 1 }
{ feeMonth: 1 }
```

---

### Collection: `expenses`

```ts
// models/Expense.ts
{
  _id: ObjectId,
  branchId: ObjectId | null,  // ref: 'Branch' — null = general expense
  category: String,           // enum: ['Rent','Electricity','Staff Salary','Internet','Marketing','Other']
  name: String,               // required
  amount: Number,             // required
  transactionDate: Date,      // required — core filter field
  notes: String,
  createdBy: ObjectId,        // ref: 'User'
  createdAt: Date,
  updatedAt: Date
}

// Index
{ transactionDate: 1 }
```

---

## Feature Modules

### Phase 1 — Authentication
- Admin login · Operator login via NextAuth CredentialsProvider
- JWT session with role stored in token
- Middleware route protection on every request
- Admin-only: Create / deactivate operators

### Phase 2 — Student Module
- Add / Edit / Search students
- Assign to branch and batch
- Mark student as inactive
- Transfer student between batches / branches

### Phase 3 — Fee Module
- Collect fee (full / partial / extra / discount / late fee)
- 12-month fee status grid (Green = Paid, Red = Pending, Grey = N/A, Blue = Advance)
- Fee history per student
- **Year View** — annual per-student breakdown: paid months, pending months, advance months, totals
- **Month View** — single month snapshot per student: paid / pending / advance for that month only
- **Pending Fee List** — shows each student's unpaid month count and total payable amount

### Phase 4 — Expense Module (Admin only)
- Add / Edit / Delete expenses
- Categories: Rent, Electricity, Staff Salary, Internet, Marketing, Other
- Assign to branch or mark as general

### Phase 5 — Profit Dashboard (Admin only)
- Total Collected Fees
- Total Expenses
- **Net Profit = Collected Fees − Expenses**
- Filter by date range / month / year

### Phase 6 — Reports (Admin only)

| Report | Description |
|---|---|
| Monthly Collection | Branch and batch-wise breakdown |
| Yearly Collection | Month-over-month view |
| Pending Fees | Per student, per batch |
| Expense Report | Category-wise |
| Profit Report | Net income over any period |
| Student Report | Active/inactive count, enrollment stats |

All reports exportable as PDF, shareable via WhatsApp.

---

## Fee View Specifications

The fee module has three distinct views depending on what the user selects: **Year View**, **Month View**, and **Pending Fee List**. Each view has a specific layout and data logic.

---

### Year View

When the user selects a **year**, the app shows a full annual breakdown per student — every month of that year, what was paid, what is pending, and whether any advance was made.

```
Year View — 2026
──────────────────────────────────────────────
Rahul Shah
  Monthly Fee:         Rs. 500
  Annual Total:        Rs. 6,000
  Paid   (5 months):   Rs. 2,500   Jan Feb Mar Apr May
  Pending (7 months):  Rs. 3,500   Jun Jul Aug Sep Oct Nov Dec
  Advance:             Rs. 0
──────────────────────────────────────────────
Hiren Patel
  Monthly Fee:         Rs. 800
  Annual Total:        Rs. 9,600
  Paid   (2 months):   Rs. 1,600   Jan Feb
  Pending (5 months):  Rs. 4,000   Mar Apr May Jun Aug
  Advance (1 month):   Rs. 800     Jul
──────────────────────────────────────────────
YEAR TOTAL SUMMARY
  Annual Expected:     Rs. 15,600
  Total Collected:     Rs. 4,100
  Total Pending:       Rs. 11,500
──────────────────────────────────────────────
```

**How it is calculated:**

| Field | Calculation |
|---|---|
| Annual Total | `monthlyFee × 12` |
| Paid months | Months where `feePayments` exist for that student in that year with `paymentType` = `full` or `partial` (summed to full) |
| Pending months | Months in the year where no full payment exists and student was active |
| Advance months | Months where fee was paid ahead of the current date (future `feeMonth`) |
| Paid amount | Sum of all `amount` in `fee_payments` for that year |
| Pending amount | `Annual Total − Paid amount` |
| Year Expected (summary) | Sum of `monthlyFee × 12` for all active students |
| Year Collected (summary) | Sum of all payments in that year |
| Year Pending (summary) | `Year Expected − Year Collected` |

---

### Month View

When the user selects a **specific month**, the app shows only that month's status for each student — one row per student, one month of data.

```
Month View — June 2026
──────────────────────────────────────────────
Student          Monthly Fee   Status     Amount
──────────────────────────────────────────────
Rahul Shah       Rs. 500       PENDING    Rs. 500 due
Hiren Patel      Rs. 800       PAID       Rs. 800 on 03-Jun
Priya Mehta      Rs. 600       ADVANCE    Rs. 600 paid on 28-May
Rohan Joshi      Rs. 500       PARTIAL    Rs. 300 paid, Rs. 200 due
──────────────────────────────────────────────
MONTH SUMMARY
  Expected:    Rs. 2,400
  Collected:   Rs. 1,700
  Pending:     Rs. 700
──────────────────────────────────────────────
```

**Status definitions for Month View:**

| Status | Meaning |
|---|---|
| PAID | Full `monthlyFee` collected for this month |
| PENDING | No payment recorded for this month (student is active) |
| PARTIAL | Some amount paid but less than `monthlyFee` — shows amount paid and amount remaining |
| ADVANCE | Payment recorded for a future month (paid before the month began) |

---

### Pending Fee List

The Pending Fee List is a dedicated view that answers: **"Which students owe money, how many months, and how much total?"**

```
Pending Fee List — All Students
──────────────────────────────────────────────────────────
Student          Branch        Months Unpaid   Total Due
──────────────────────────────────────────────────────────
Rahul Shah       Anand Nagar   7 months        Rs. 3,500
                               Jun Jul Aug Sep Oct Nov Dec
──────────────────────────────────────────────────────────
Rohan Joshi      Kanbivad      4 months        Rs. 2,000
                               Mar Apr May Jun
                               (partial: Rs. 200 on Mar)
──────────────────────────────────────────────────────────
Neha Trivedi     Anand Nagar   2 months        Rs. 1,200
                               May Jun
──────────────────────────────────────────────────────────
TOTAL PENDING
  Students with dues:   3
  Total months unpaid:  13
  Total payable:        Rs. 6,700
──────────────────────────────────────────────────────────
```

**How it is calculated:**

| Field | Calculation |
|---|---|
| Months Unpaid | Count of months from student's `joinDate` to today where no full payment exists |
| Total Due | `months unpaid × monthlyFee` minus any partial amounts already paid |
| Partial credit | If a partial payment exists for a month, that amount is subtracted from that month's due |
| Student with dues | Any active student with at least 1 unpaid month |

**Filters available on Pending Fee List:**
- Filter by Branch (Anand Nagar / Kanbivad / All)
- Filter by Batch
- Filter by date range (e.g. pending only for Jan–Jun 2026)
- Sort by: Total Due (highest first) · Student Name · Months Unpaid

---

### Fee Status Color Legend

| Color | Status | Meaning |
|---|:---:|---|
| Green | PAID | Full monthly fee collected |
| Red | PENDING | No payment for this month |
| Orange | PARTIAL | Partial payment made, balance remaining |
| Blue | ADVANCE | Paid for a future month |
| Grey | N/A | Student was not enrolled this month |

---

## Folder Structure

```
eklavya-classes/
│
├── app/                              ← Next.js App Router
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx             ← Login page
│   │
│   ├── (admin)/                     ← Admin-only routes
│   │   ├── dashboard/page.tsx
│   │   ├── students/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── fees/page.tsx
│   │   ├── expenses/page.tsx
│   │   ├── reports/page.tsx
│   │   └── users/page.tsx           ← Manage operators
│   │
│   ├── (operator)/                  ← Operator-only routes (limited)
│   │   ├── dashboard/page.tsx
│   │   ├── students/page.tsx
│   │   └── fees/page.tsx
│   │
│   ├── api/                         ← API Routes (Next.js Route Handlers)
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts         ← NextAuth handler
│   │   ├── students/
│   │   │   ├── route.ts             ← GET all, POST new
│   │   │   └── [id]/route.ts        ← GET one, PUT, DELETE
│   │   ├── fees/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── expenses/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── branches/route.ts
│   │   ├── batches/route.ts
│   │   ├── reports/route.ts
│   │   └── users/
│   │       ├── route.ts             ← Admin: create operator
│   │       └── [id]/route.ts        ← Admin: deactivate operator
│   │
│   ├── layout.tsx
│   └── middleware.ts                ← Role-based route guard
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── BottomNav.tsx
│   │   └── Modal.tsx
│   ├── dashboard/
│   │   ├── BranchSummaryCard.tsx
│   │   ├── ProfitCard.tsx
│   │   └── StudentSummaryCard.tsx
│   ├── students/
│   │   ├── StudentList.tsx
│   │   ├── StudentCard.tsx
│   │   └── StudentForm.tsx
│   ├── fees/
│   │   ├── FeeGrid.tsx              ← 12-month status grid
│   │   ├── PaymentModal.tsx
│   │   ├── FeeHistory.tsx
│   │   └── PendingFees.tsx
│   ├── expenses/
│   │   ├── ExpenseList.tsx
│   │   └── ExpenseForm.tsx
│   ├── reports/
│   │   ├── MonthlyReport.tsx
│   │   ├── YearlyReport.tsx
│   │   ├── PendingReport.tsx
│   │   ├── ProfitReport.tsx
│   │   └── ReportPDF.tsx
│   └── users/
│       └── OperatorForm.tsx
│
├── models/                          ← Mongoose models
│   ├── User.ts
│   ├── Branch.ts
│   ├── Batch.ts
│   ├── Student.ts
│   ├── FeePayment.ts
│   └── Expense.ts
│
├── lib/
│   ├── mongodb.ts                   ← MongoDB Atlas connection
│   ├── auth.ts                      ← NextAuth config (authOptions)
│   ├── auth/
│   │   ├── getSession.ts            ← Server-side session helper
│   │   └── withRole.ts              ← HOC for role-gated pages
│   └── utils/
│       ├── currency.ts              ← Rs. formatting
│       ├── dates.ts
│       └── pdf.ts
│
├── styles/
│   └── globals.css                  ← Tailwind + CSS variables
│
├── public/
│   ├── logo.png
│   ├── banner.jpg
│   ├── manifest.json                ← PWA manifest
│   └── icons/
│
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## What to Build Where

A clear map of every feature → the exact file where you write the code.

### Authentication

| What | File Path |
|---|---|
| NextAuth config (providers, callbacks) | `lib/auth.ts` |
| NextAuth route handler | `app/api/auth/[...nextauth]/route.ts` |
| Login page UI | `app/(auth)/login/page.tsx` |
| Route protection middleware | `app/middleware.ts` |
| Server-side session helper | `lib/auth/getSession.ts` |
| Role-gated page HOC | `lib/auth/withRole.ts` |
| MongoDB connection | `lib/mongodb.ts` |

### Admin Dashboard

| What | File Path |
|---|---|
| Admin dashboard page | `app/(admin)/dashboard/page.tsx` |
| Branch summary card component | `components/dashboard/BranchSummaryCard.tsx` |
| Profit summary card component | `components/dashboard/ProfitCard.tsx` |
| Bottom navigation bar | `components/ui/BottomNav.tsx` |

### Operator Dashboard

| What | File Path |
|---|---|
| Operator dashboard (limited view) | `app/(operator)/dashboard/page.tsx` |
| Student summary card (read-only) | `components/dashboard/StudentSummaryCard.tsx` |

### Students

| What | File Path |
|---|---|
| Student list page (admin) | `app/(admin)/students/page.tsx` |
| Student detail page | `app/(admin)/students/[id]/page.tsx` |
| Student list page (operator) | `app/(operator)/students/page.tsx` |
| Student list component | `components/students/StudentList.tsx` |
| Student card component | `components/students/StudentCard.tsx` |
| Add / Edit student form | `components/students/StudentForm.tsx` |
| Students API (GET all, POST new) | `app/api/students/route.ts` |
| Student API (GET one, PUT, DELETE) | `app/api/students/[id]/route.ts` |
| Student Mongoose model | `models/Student.ts` |

### Fee Collection

| What | File Path |
|---|---|
| Fee page (admin) | `app/(admin)/fees/page.tsx` |
| Fee page (operator) | `app/(operator)/fees/page.tsx` |
| 12-month fee status grid | `components/fees/FeeGrid.tsx` |
| Collect fee modal | `components/fees/PaymentModal.tsx` |
| Fee history list | `components/fees/FeeHistory.tsx` |
| Pending fees view | `components/fees/PendingFees.tsx` |
| Fees API (GET, POST) | `app/api/fees/route.ts` |
| Fee API (GET one, PUT, DELETE) | `app/api/fees/[id]/route.ts` |
| FeePayment Mongoose model | `models/FeePayment.ts` |

### Expenses (Admin only)

| What | File Path |
|---|---|
| Expense dashboard page | `app/(admin)/expenses/page.tsx` |
| Expense list component | `components/expenses/ExpenseList.tsx` |
| Add / Edit expense form | `components/expenses/ExpenseForm.tsx` |
| Expenses API (GET, POST) | `app/api/expenses/route.ts` |
| Expense API (PUT, DELETE) | `app/api/expenses/[id]/route.ts` |
| Expense Mongoose model | `models/Expense.ts` |

### Reports (Admin only)

| What | File Path |
|---|---|
| Reports page | `app/(admin)/reports/page.tsx` |
| Monthly report component | `components/reports/MonthlyReport.tsx` |
| Yearly report component | `components/reports/YearlyReport.tsx` |
| Pending fees report | `components/reports/PendingReport.tsx` |
| Profit report component | `components/reports/ProfitReport.tsx` |
| PDF export component | `components/reports/ReportPDF.tsx` |
| Reports API (aggregations) | `app/api/reports/route.ts` |
| PDF generator utility | `lib/utils/pdf.ts` |

### User Management (Admin only)

| What | File Path |
|---|---|
| Manage operators page | `app/(admin)/users/page.tsx` |
| Create operator form | `components/users/OperatorForm.tsx` |
| Users API (create operator) | `app/api/users/route.ts` |
| User API (deactivate operator) | `app/api/users/[id]/route.ts` |
| User Mongoose model | `models/User.ts` |

### Branches and Batches

| What | File Path |
|---|---|
| Branches API | `app/api/branches/route.ts` |
| Batches API | `app/api/batches/route.ts` |
| Branch Mongoose model | `models/Branch.ts` |
| Batch Mongoose model | `models/Batch.ts` |

### Design and Globals

| What | File Path |
|---|---|
| CSS variables, Tailwind base | `styles/globals.css` |
| Tailwind config (colors, fonts) | `tailwind.config.ts` |
| Next.js config (PWA, images) | `next.config.js` |
| PWA manifest | `public/manifest.json` |
| App icons | `public/icons/` |
| Logo image | `public/logo.png` |
| Banner image | `public/banner.jpg` |

### Shared Utilities

| What | File Path |
|---|---|
| Currency formatter (Rs.) | `lib/utils/currency.ts` |
| Date helpers | `lib/utils/dates.ts` |
| Reusable Button | `components/ui/Button.tsx` |
| Reusable Card | `components/ui/Card.tsx` |
| Reusable Badge (Paid / Pending) | `components/ui/Badge.tsx` |
| Reusable Modal | `components/ui/Modal.tsx` |

### Environment and Config

| What | File Path |
|---|---|
| All secrets and env vars | `.env.local` |
| TypeScript config | `tsconfig.json` |

---

## Development Phases

| Phase | Module | Key Deliverables |
|---|---|---|
| **1 – Foundation** | DB + Models | MongoDB Atlas setup, all Mongoose models, seed branches |
| **2 – Auth** | NextAuth | Login page, CredentialsProvider, JWT role, middleware |
| **3 – Students** | Student CRUD | Add, edit, search, deactivate, transfer, API routes |
| **4 – Fees** | Fee Collection | Collect fee, 12-month grid, fee history, pending list |
| **5 – Expenses** | Expense CRUD | Add/edit/delete, categories, branch assignment |
| **6 – Dashboard** | Profit View | Summary cards, net profit formula, date filters |
| **7 – Reports** | Reports + PDF | All 6 report types, PDF export, WhatsApp share |
| **8 – PWA Polish** | App Experience | Manifest, icons, offline support, install prompt |

---

## Deployment

```
GitHub Repository
       ↓  (push to main)
Vercel (auto-deploy)
       ↓
eklavya-classes.vercel.app
       ↓  (optional)
eklavyaclasses.in  (custom domain)
```

### Environment Variables

```env
# .env.local

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/eklavya_classes?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_URL=https://eklavya-classes.vercel.app   # your deployed URL
NEXTAUTH_SECRET=your-random-secret-key            # generate with: openssl rand -base64 32
```

> No other services needed. MongoDB Atlas hosts the database. NextAuth handles all auth. Vercel deploys the app.

---

## Business Logic Rules

### Core Rules

1. All financial calculations use `transactionDate`, never `createdAt`.
2. **Expected Fees** = sum of `monthlyFee` for all active students in the period.
3. **Collected Fees** = sum of `fee_payments.amount` where `transactionDate` is in period.
4. **Pending** = Expected − Collected (per student, per batch, per branch).
5. **Net Profit** = Total Collected Fees − Total Expenses (same date range).
6. A student can have multiple payments per month — partial payments accumulate.
7. `feeMonth` (YYYY-MM) = which month the fee is **for**. `transactionDate` = when it was **paid**. These can differ.
8. Inactive students are excluded from all Expected Fees calculations.
9. Expenses with `branchId = null` count toward overall profit but not branch-specific profit.
10. Operators can collect fees but cannot see profit, expenses, or reports.

### Year View Rules

11. Year View always shows all 12 months (Jan–Dec) for the selected year.
12. A month is **Paid** when total payments for that `feeMonth` >= student's `monthlyFee`.
13. A month is **Partial** when total payments for that `feeMonth` > 0 but < `monthlyFee`.
14. A month is **Pending** when the student was active that month and no payment exists.
15. A month is **Advance** when `feeMonth` is a future month but payment has already been recorded.
16. A month is **N/A** (grey) when the student's `joinDate` is after that month, i.e. the student was not yet enrolled.
17. Year Summary totals are computed only over active students.

### Month View Rules

18. Month View shows exactly one month of status per student.
19. **PARTIAL** status shows both the amount already paid and the balance remaining: `balance = monthlyFee − paid`.
20. Month View summary (Expected / Collected / Pending) covers only the selected month.

### Pending Fee List Rules

21. Months Unpaid = count of months from `joinDate` to today where the student has no full payment.
22. Total Due per student = `(months unpaid × monthlyFee) − partial amounts already paid for those months`.
23. A student appears in the Pending Fee List if they have at least one unpaid or partially paid month.
24. Inactive students are excluded from the Pending Fee List.
25. The list footer shows: total students with dues, total months unpaid across all students, and grand total payable.

---

## Monthly Cost

| Service | Cost |
|---|---|
| Vercel (hosting) | Rs. 0 |
| MongoDB Atlas M0 (free cluster) | Rs. 0 |
| GitHub | Rs. 0 |
| Custom domain (optional) | Rs. 0 – Rs. 1,000/year |
| **Total** | **Rs. 0/month** |

> The app runs entirely free. MongoDB Atlas M0 gives 512MB storage — more than enough for this app. Upgrade to M2/M5 only if needed.

---

## Branches

| Branch | Address | Phone |
|---|---|---|
| **Anand Nagar** | L.I.G. - 472, Biju Bus Stand, Anandnagar | 8469966983 |
| **Kanbivad** | Thakkar Khamani ni Bajuma, Kharget Road, Kanbivad | 9662172580 |

---

<div align="center">

**Eklavya Classes**
*જ્ઞાનથી ઉજ્જવળ ભવિષ્ય તરફ ✨*

Plan File Version: **3.0.0 (MongoDB Edition)** | Date: **Jun 2026**
You are a precise data-entry and Gujarati-to-English transliteration assistant.

Extract ALL student rows from the provided register image(s). Each page is a handwritten Gujarati register with columns: serial number, student name (surname + first name written in Gujarati), and mobile numbers.

BATCH METADATA (embed these values in every row exactly as given — do NOT extract from image):
- batch: "10E1"
- standard: "10"
- fees: "10000"
- join_date: "01-05-2026"
- batch_id: "6a3c2abcd9930392616e9a1a"
- branch_id: "6a335c12dbc89d2130f4e2f3"

TRANSLITERATION RULES:
- Convert Gujarati names to standard English.
- The register writes names as: SURNAME FIRSTNAME (surname first).
- Output them REVERSED: use FIRSTNAME as "name" and SURNAME as "surname".
- Example: "પટેલ રાજ" → name: "Raj", surname: "Patel"
- Example: "શાહ પ્રિયાંશી" → name: "Priyanshi", surname: "Shah"
- Use standard English transliteration (e.g. ભ→Bh, શ→Sh, ક→K, પ→P, ર→R, ન→N, ચ→Ch).

MOBILE NUMBER RULES:
- Extract up to 2 mobile numbers per student.
- First number = student mobile, second number = parent mobile.
- If only one number exists, leave parent_mobile as empty string.
- Copy numbers exactly as written, digits only, no spaces or dashes.

OTHER RULES:
- Skip any row that is crossed out, blank, or has no name.
- Do not invent or guess data. If a digit is unclear, write it as-is.
- Return ONLY a raw JSON array. No markdown, no backticks, no explanation.

OUTPUT FORMAT (strictly follow this schema):
[
  {
    "name": "Priyanshi",
    "surname": "Patel",
    "mobile": "9825000000",
    "parent_mobile": "9825111111",
    "standard": "10",
    "fees": "10000",
    "join_date": "01-05-2026",
    "batch_id": "6a3c2abcd9930392616e9a1a",
    "branch_id": "6a335c12dbc89d2130f4e2f3",
    "batch": "10E1"
  }
]
</div>
