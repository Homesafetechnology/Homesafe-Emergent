import { Outlet, NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Map, 
  Radio, 
  History, 
  Settings,
  Shield
} from "lucide-react";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/zones", icon: Map, label: "Zones" },
  { path: "/sensors", icon: Radio, label: "Sensors" },
  { path: "/activity", icon: History, label: "Activity" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="w-64 hidden md:flex flex-col border-r border-slate-200 bg-white h-screen sticky top-0">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-manrope font-bold text-lg text-slate-900">SafeHouse</h1>
              <p className="text-xs text-slate-500">Security System</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <p className="text-xs text-slate-400 text-center">
            Home Intruder Alarm v1.0
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path === "/" && location.pathname === "/");
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`mobile-nav-item flex-1 ${isActive ? "active text-slate-900" : ""}`}
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs mt-1">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
