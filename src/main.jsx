import React from "react";
import { createRoot } from "react-dom/client";
import ThemeProvider from "./context/ThemeContext";
import AuthProvider from "./context/AuthContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
