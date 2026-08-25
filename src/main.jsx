import React from "react";
import { createRoot } from "react-dom/client";
import ThemeProvider from "./context/ThemeContext";
import AuthProvider from "./context/AuthContext";
import App from "./App";
import "./index.css";
import PreferencesProvider from "./context/PreferencesContext";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <PreferencesProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PreferencesProvider>
    </ThemeProvider>
  </React.StrictMode>
);
