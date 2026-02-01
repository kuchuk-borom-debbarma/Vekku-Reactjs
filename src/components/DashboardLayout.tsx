import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, Outlet, useLocation } from "react-router-dom";
import { LogOut, User, Home, FileText, Tag as TagIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? "text-indigo-600 bg-indigo-50" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100";
  };

  const mobileIsActive = (path: string) => {
    return location.pathname === path ? "text-indigo-600" : "text-zinc-500 hover:text-zinc-700";
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 flex flex-col">
      {/* Top Header - Desktop & Tablet */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 text-white shadow-sm">
                <span className="font-bold text-sm">V</span>
              </div>
              <span className="font-bold text-lg tracking-tight text-zinc-900">Vekku</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive("/")}`}>
                Dashboard
              </Link>
              <Link to="/contents" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive("/contents")}`}>
                Contents
              </Link>
              <Link to="/tags" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive("/tags")}`}>
                Tags
              </Link>
            </nav>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 outline-none group cursor-pointer">
                  <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900 transition-colors hidden sm:inline-block">
                    {user?.name || "User"}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 group-hover:bg-zinc-200 group-hover:text-zinc-900 transition-all shadow-sm">
                    <User size={16} />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
                    <p className="text-xs leading-none text-zinc-500 font-normal">Signed in</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 mb-16 md:mb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 z-50 pb-safe">
        <div className="grid grid-cols-3 h-16">
          <Link 
            to="/" 
            className={`flex flex-col items-center justify-center gap-1 ${mobileIsActive("/")}`}
          >
            <Home size={20} />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link 
            to="/contents" 
            className={`flex flex-col items-center justify-center gap-1 ${mobileIsActive("/contents")}`}
          >
            <FileText size={20} />
            <span className="text-[10px] font-medium">Contents</span>
          </Link>
          <Link 
            to="/tags" 
            className={`flex flex-col items-center justify-center gap-1 ${mobileIsActive("/tags")}`}
          >
            <TagIcon size={20} />
            <span className="text-[10px] font-medium">Tags</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
