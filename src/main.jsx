import React from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import ThemeProvider from "./context/ThemeContext";
import AuthProvider from "./context/AuthContext";
import App from "./App";
import "./index.css";
import PreferencesProvider from "./context/PreferencesContext";
import { GOOGLE_CLIENT_ID, googleSignInAvailable } from "./lib/googleAuth";

const application = (
  <ThemeProvider>
    <PreferencesProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </PreferencesProvider>
  </ThemeProvider>
);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {googleSignInAvailable ? (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {application}
      </GoogleOAuthProvider>
    ) : application}
  </React.StrictMode>
);
