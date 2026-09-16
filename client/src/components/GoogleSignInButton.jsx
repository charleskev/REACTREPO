import { useEffect, useRef, useState } from "react";
import { api } from "../services/api.js";

let scriptPromise;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.defer = true;
    script.onload = resolve; script.onerror = () => reject(new Error("Google Sign-In could not be loaded."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function GoogleSignInButton({ purpose = "login", onLogin, onProfile, onError }) {
  const hostRef = useRef(null); const [config, setConfig] = useState(null);
  useEffect(() => { api("/auth/google/config").then(setConfig).catch(error => onError?.(error.message)); }, [onError]);
  useEffect(() => {
    if (!config?.enabled || !hostRef.current) return undefined;
    let active = true;
    loadGoogleScript().then(() => {
      if (!active || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({ client_id: config.clientId, callback: async response => {
        try {
          const result = await api(purpose === "login" ? "/auth/google/login" : "/auth/google/profile", { method: "POST", body: JSON.stringify({ credential: response.credential }) });
          if (purpose === "login") onLogin?.(result); else onProfile?.(result.profile);
        } catch (error) { onError?.(error.message); }
      } });
      hostRef.current.replaceChildren();
      window.google.accounts.id.renderButton(hostRef.current, { type: "standard", theme: "outline", size: "large", text: purpose === "login" ? "signin_with" : "signup_with", shape: "rectangular", width: 320 });
    }).catch(error => onError?.(error.message));
    return () => { active = false; };
  }, [config, purpose, onLogin, onProfile, onError]);
  if (config && !config.enabled) return <p className="text-center text-xs text-slate-500">Google Sign-In will be available after MAO configures its Google OAuth Client ID.</p>;
  return <div ref={hostRef} className="flex justify-center" aria-label="Google Sign-In"/>;
}
