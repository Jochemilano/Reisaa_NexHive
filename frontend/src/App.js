import './App.css';
import AppRouter from './router/AppRouter';
import { useState, useEffect } from "react";
import { preferencesApi } from "@/utils/preferences";
import { Toaster } from "sonner";

function App() {
  const [userPreferences, setUserPreferences] = useState(null);

  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await preferencesApi.getPreferences();
      if (prefs) {
        setUserPreferences(prefs);

        // Parsear preferencias de tema
        let themeMode = "light";
        let accentColor = "blue";
        let fontFamily = "system";

        if (prefs.theme) {
          if (prefs.theme.includes("-")) {
            const parts = prefs.theme.split("-");
            if (parts[0] === "theme") {
              // Formato heredado: "theme-dark", "theme-blue"
              const accent = parts[1];
              if (accent === "dark") {
                themeMode = "dark";
                accentColor = "amber";
              } else {
                accentColor = accent;
                themeMode = (accent === "blue" || accent === "purple") ? "dark" : "light";
              }
            } else {
              themeMode = parts[0];
              accentColor = parts[1];
              if (parts[2]) {
                fontFamily = parts[2];
              }
            }
          } else if (prefs.theme === "light") {
            themeMode = "light";
            accentColor = "blue";
          } else {
            themeMode = "light";
            accentColor = "blue";
          }
        }

        document.documentElement.setAttribute('data-theme', themeMode);
        document.documentElement.setAttribute('data-accent', accentColor);
        document.documentElement.setAttribute('data-font', fontFamily);
        document.body.className = "";
      }
    };

    loadPreferences();
  }, []);

  return (
    <>
      <Toaster position="bottom-right" richColors closeButton />
      <div className="App">
        <AppRouter userPreferences={userPreferences} />
      </div>
    </>
  );
}

export default App;