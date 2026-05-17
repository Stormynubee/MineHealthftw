import React, { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Shell from "./components/Shell";
import SplashScreen from "./components/SplashScreen";
import { ProfileProvider } from "./lib/ProfileContext";
import Dashboard from "./pages/Dashboard";
import Study from "./pages/Study";
import Code from "./pages/Code";
import Health from "./pages/Health";
import Meditate from "./pages/Meditate";
import Career from "./pages/Career";
import Buddy from "./pages/Buddy";
import Creative from "./pages/Creative";
import Focus from "./pages/Focus";
import Achievements from "./pages/Achievements";
import Landing from "./pages/Landing";
import PublicProfile from "./pages/PublicProfile";
import Settings from "./pages/Settings";
import MorningAlarm from "./pages/MorningAlarm";
import Journal from "./pages/Journal";
import NotFound from "./pages/NotFound";

const AppShell = () => (
  <Shell />
);

function App() {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("splash_done"));
  useEffect(() => { if (!showSplash) sessionStorage.setItem("splash_done", "1"); }, [showSplash]);

  return (
    <div className="App">
      {showSplash && <SplashScreen onDone={() => { sessionStorage.setItem("splash_done", "1"); setShowSplash(false); }}/>}
      <ProfileProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/profile" element={<PublicProfile />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="study" element={<Study />} />
              <Route path="code" element={<Code />} />
              <Route path="health" element={<Health />} />
              <Route path="meditate" element={<Meditate />} />
              <Route path="career" element={<Career />} />
              <Route path="buddy" element={<Buddy />} />
              <Route path="creative" element={<Creative />} />
              <Route path="focus" element={<Focus />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="settings" element={<Settings />} />
              <Route path="morning" element={<MorningAlarm />} />
              <Route path="journal" element={<Journal />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ProfileProvider>
    </div>
  );
}

export default App;
