'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Receipt, 
  BarChart3, 
  UserCog, 
  LogOut
} from 'lucide-react';

export default function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return <>{children}</>;

  const role = session.user.role;
  const branchName = session.user.branchName || (role === 'admin' ? 'All Branches' : 'Assigned Branch');

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'operator'] },
    { name: 'Students', href: '/students', icon: Users, roles: ['admin', 'operator'] },
    { name: 'Fees', href: '/fees', icon: CreditCard, roles: ['admin', 'operator'] },
    { name: 'Expenses', href: '/expenses', icon: Receipt, roles: ['admin'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin'] },
    { name: 'Users', href: '/users', icon: UserCog, roles: ['admin'] },
  ];

  const allowedItems = navItems.filter(item => item.roles.includes(role));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-navy text-white flex-shrink-0 z-20 shadow-premium">
        {/* Brand/Logo */}
        <div className="p-6 border-b border-navy-light flex flex-col items-center">
          <div className="w-12 h-12 bg-white rounded-xl p-1.5 flex items-center justify-center shadow-md mb-2 overflow-hidden">
            <img src="/logo.png" alt="Eklavya Classes Logo" className="w-full h-full object-contain rounded-lg" />
          </div>
          <h1 className="font-sans font-bold text-lg text-gold tracking-wide">EKLAVYA CLASSES</h1>
          <p className="font-gujarati text-[10px] text-slate-300 font-medium tracking-wider mt-0.5">જ્ઞાનથી ઉજ્જવળ ભવિષ્ય તરફ</p>
        </div>

        {/* User Profile */}
        <div className="px-6 py-4 bg-navy-dark border-b border-navy-light/40">
          <p className="text-sm font-semibold text-slate-100 truncate">{session.user.name}</p>
          <span className="text-[10px] px-2 py-0.5 mt-1 inline-block rounded bg-gold/20 text-gold font-medium capitalize border border-gold/30">
            {role === 'admin' ? 'Administrator' : 'Class Administrator'}
          </span>
          {session.user.branchId && (
            <p className="text-[11px] text-slate-300 mt-1 truncate">Branch: {branchName}</p>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {allowedItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-btn transition-all duration-200 ${
                  isActive
                    ? 'bg-gold text-navy font-semibold shadow-md'
                    : 'text-slate-300 hover:bg-navy-light hover:text-white'
                }`}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-navy-light">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center px-4 py-3 text-sm font-medium rounded-btn text-slate-300 hover:bg-brand-red/20 hover:text-red-200 transition-all duration-200"
          >
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-navy text-white shadow-md z-30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-white rounded-lg p-1 flex items-center justify-center shadow-sm overflow-hidden">
            <img src="/logo.png" alt="Eklavya Classes Logo" className="w-full h-full object-contain rounded-md" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-gold">EKLAVYA CLASSES</h1>
            <p className="text-[9px] text-slate-300 font-gujarati -mt-0.5">જ્ઞાનથી ઉજજવળ ભવિષ્ય તરફ</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1 hover:text-red-300"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto w-full p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (Height: 64px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-navy text-white flex items-center justify-around px-2 border-t border-navy-light shadow-2xl z-30">
        {allowedItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 ${
                isActive ? 'text-gold scale-105 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5 truncate max-w-full px-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
