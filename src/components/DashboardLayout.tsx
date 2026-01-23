import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, FileText, Tag, LogOut, User, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/contents", label: "Contents", icon: FileText },
    { path: "/tags", label: "Tags", icon: Tag },
  ];

  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center px-6 border-b border-zinc-100">
        <Link to="/" className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
            <span className="font-bold text-sm">V</span>
          </div>
          Vekku
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
            <User size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">{user?.name}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-zinc-200 flex-col fixed inset-y-0 z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden h-16 bg-white border-b border-zinc-200 fixed top-0 inset-x-0 z-30 flex items-center px-4 gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg">
              <Menu size={24} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <div className="flex flex-col h-full">
               <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
            <span className="font-bold text-sm">V</span>
          </div>
          Vekku
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-20 lg:pt-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
