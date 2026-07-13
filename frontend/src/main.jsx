import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { Toaster } from "react-hot-toast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: 12,
              background: "#0f1624",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#e8edf5",
              fontWeight: 500,
              fontSize: 13,
            },
            success: { iconTheme: { primary: "#10b981", secondary: "#0f1624" } },
            error:   { iconTheme: { primary: "#f43f5e", secondary: "#0f1624" } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

window.addEventListener("error", (e) => console.error("Global error:", e.error || e.message));
window.addEventListener("unhandledrejection", (e) => console.error("Unhandled rejection:", e.reason));
