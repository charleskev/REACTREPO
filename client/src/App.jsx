import { useEffect, useState } from "react";
import { ForgotPasswordPage, LoginPage, RegisterPage } from "./pages/AuthPages.jsx";
import { DamageReportPage, FarmerDashboard, MyReportsPage, NotificationsPage, ProfileLandPage, WeatherPage } from "./pages/FarmerPages.jsx";
import { AdminDashboard, ReviewReportsPage, StaffDashboard } from "./pages/StaffPages.jsx";
import { AdminControlCenter, FarmerDirectoryPage, SendNotificationPage, UserManagementPage } from "./pages/StaffAdminPages.jsx";
import { HomePage } from "./pages/HomePage.jsx";

export default function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem("agrisystem-session") || "null"));
  const [route, setRoute] = useState(() => location.hash || "#home");
  useEffect(() => { const change=()=>setRoute(location.hash || "#home"); addEventListener("hashchange",change); return ()=>removeEventListener("hashchange",change); }, []);
  function login(result) { const next={ token: result.token, user: result.user }; localStorage.setItem("agrisystem-session",JSON.stringify(next)); setSession(next); location.hash=next.user.role === "farmer" ? "#farmer" : "#staff"; }
  function logout(){localStorage.removeItem("agrisystem-session");setSession(null);location.hash="#login";}
  if (!session) {
    if (route === "#register") return <RegisterPage onLogin={login} onNavigate={h=>location.hash=h}/>;
    if (route === "#forgot-password") return <ForgotPasswordPage onNavigate={h=>location.hash=h}/>;
    if (route === "#login") return <LoginPage onLogin={login} onNavigate={h=>location.hash=h}/>;
    return <HomePage onNavigate={h => location.hash = h}/>;
  }
  const props={token:session.token,onLogout:logout,role:session.user.role};
  if(session.user.role !== "farmer") { if(route==="#review")return <ReviewReportsPage {...props}/>; if(route==="#admin")return <AdminControlCenter {...props}/>; if(route==="#registrations")return <AdminDashboard {...props}/>; if(route==="#farmers")return <FarmerDirectoryPage {...props}/>; if(route==="#users")return <UserManagementPage {...props}/>; if(route==="#send-notification")return <SendNotificationPage {...props}/>; return <StaffDashboard {...props}/>; }
  if(route==="#profile")return <ProfileLandPage {...props}/>; if(route==="#report")return <DamageReportPage {...props}/>; if(route==="#my-reports")return <MyReportsPage {...props}/>; if(route==="#weather")return <WeatherPage {...props}/>; if(route==="#notifications")return <NotificationsPage {...props}/>; return <FarmerDashboard {...props}/>;
}
