import React from "react";
import { Home, CalendarPlus, Scissors, Shield, LayoutDashboard } from "lucide-react";

export type NavTab = "home" | "booking" | "barber" | "admin";

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isAdminLoggedIn: boolean;
}

export function BottomNav({
  currentTab,
  onSelectTab,
  isAdminLoggedIn,
}: BottomNavProps) {
  const items = [
    { id: "home" as NavTab, label: "Início", icon: Home },
    { id: "booking" as NavTab, label: "Agendar", icon: CalendarPlus },
    { id: "barber" as NavTab, label: "Minha Agenda", icon: Scissors },
    {
      id: "admin" as NavTab,
      label: isAdminLoggedIn ? "Gestão Admin" : "Login Admin",
      icon: isAdminLoggedIn ? LayoutDashboard : Shield,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#272a34] bg-[#101115]/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_25px_rgba(0,0,0,0.6)]">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1 transition-all relative ${
                isActive
                  ? "text-[#00f0ff]"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {/* Active top line glow */}
              {isActive && (
                <span className="absolute top-0 inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent shadow-[0_0_8px_#00f0ff]" />
              )}

              <div
                className={`p-1 rounded-xl transition ${
                  isActive ? "bg-[#00f0ff]/15 scale-110" : ""
                }`}
              >
                <Icon className="size-5" />
              </div>
              <span
                className={`text-[10px] tracking-tight ${
                  isActive ? "font-bold text-[#00f0ff]" : "font-medium"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
