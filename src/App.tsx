import React, { useState, useEffect } from "react";
import { useStore, actions, initCloudSync } from "./lib/store";
import { BottomNav, type NavTab } from "./components/BottomNav";
import { HomeView } from "./components/HomeView";
import { BookingFlow } from "./components/BookingFlow";
import { BarberPanel } from "./components/BarberPanel";
import { AdminLogin } from "./components/AdminLogin";
import { AdminPanel } from "./components/AdminPanel";

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>("home");
  const adminAuth = useStore((s) => s.adminAuth);

  useEffect(() => {
    const unsubPromise = initCloudSync();
    return () => {
      unsubPromise?.then((unsub) => unsub?.());
    };
  }, []);

  const handleGoToBooking = (serviceId?: string) => {
    setCurrentTab("booking");
  };

  const handleGoToAdmin = () => {
    setCurrentTab("admin");
  };

  const handleLogoutAdmin = () => {
    actions.logoutAdmin();
    setCurrentTab("home");
  };

  return (
    <div className="min-h-screen bg-[#101115] text-[#f3f4f6]">
      {/* View routing based on active tab */}
      <main className="mx-auto min-h-screen max-w-md pb-20">
        {currentTab === "home" && (
          <HomeView
            onGoToBooking={handleGoToBooking}
            onGoToAdmin={handleGoToAdmin}
          />
        )}

        {currentTab === "booking" && (
          <BookingFlow onBackToHome={() => setCurrentTab("home")} />
        )}

        {currentTab === "barber" && <BarberPanel />}

        {currentTab === "admin" && (
          <>
            {adminAuth.isAuthenticated ? (
              <AdminPanel onLogout={handleLogoutAdmin} />
            ) : (
              <AdminLogin
                onSuccess={() => setCurrentTab("admin")}
                onBackToHome={() => setCurrentTab("home")}
              />
            )}
          </>
        )}
      </main>

      {/* Persistent Bottom Mobile Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isAdminLoggedIn={adminAuth.isAuthenticated}
      />
    </div>
  );
}
