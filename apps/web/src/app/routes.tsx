import { createBrowserRouter, Navigate } from "react-router";
import type { ReactNode } from "react";
import Home from "@/app/pages/Home";
import Jobs from "@/app/pages/Jobs";
import CandidateGuide from "@/app/pages/CandidateGuide";
import Contact from "@/app/pages/Contact";
import JobDetail from "@/app/pages/JobDetail";
import Apply from "@/app/pages/Apply";
import ApplySuccess from "@/app/pages/ApplySuccess";
import AdminLogin from "@/app/pages/AdminLogin";
import AdminDashboard from "@/app/pages/AdminDashboard";
import AdminJobs from "@/app/pages/AdminJobs";
import CreateEditJob from "@/app/pages/CreateEditJob";
import CandidateInbox from "@/app/pages/CandidateInbox";
import CandidateDetail from "@/app/pages/CandidateDetail";
import CandidateChats from "@/app/pages/CandidateChats";
import FollowUp from "@/app/pages/FollowUp";
import MessageTemplates from "@/app/pages/MessageTemplates";
import AdminSettings from "@/app/pages/AdminSettings";
import Terms from "@/app/pages/Terms";
import Privacy from "@/app/pages/Privacy";
import { useData } from "@/app/data";

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdminLoggedIn, isAuthReady } = useData();
  if (!isAuthReady) return <div className="min-h-screen bg-background p-10 text-sm font-semibold text-muted-foreground">Đang kiểm tra phiên đăng nhập...</div>;
  return isAdminLoggedIn ? children : <Navigate to="/admin" replace />;
}

export const router = createBrowserRouter([
  { path: "/", Component: Home },
  { path: "/jobs", Component: Jobs },
  { path: "/candidate-guide", Component: CandidateGuide },
  { path: "/contact", Component: Contact },
  { path: "/terms", Component: Terms },
  { path: "/privacy", Component: Privacy },
  { path: "/jobs/:id", Component: JobDetail },
  { path: "/jobs/:id/apply", Component: Apply },
  { path: "/apply/success", Component: ApplySuccess },
  { path: "/admin", Component: AdminLogin },
  { path: "/admin/dashboard", element: <RequireAdmin><AdminDashboard /></RequireAdmin> },
  { path: "/admin/jobs", element: <RequireAdmin><AdminJobs /></RequireAdmin> },
  { path: "/admin/jobs/new", element: <RequireAdmin><CreateEditJob /></RequireAdmin> },
  { path: "/admin/jobs/:id/edit", element: <RequireAdmin><CreateEditJob /></RequireAdmin> },
  { path: "/admin/candidates", element: <RequireAdmin><CandidateInbox /></RequireAdmin> },
  { path: "/admin/candidates/:id", element: <RequireAdmin><CandidateDetail /></RequireAdmin> },
  { path: "/admin/chats", element: <RequireAdmin><CandidateChats /></RequireAdmin> },
  { path: "/admin/follow-up", element: <RequireAdmin><FollowUp /></RequireAdmin> },
  { path: "/admin/templates", element: <RequireAdmin><MessageTemplates /></RequireAdmin> },
  { path: "/admin/settings", element: <RequireAdmin><AdminSettings /></RequireAdmin> },
  { path: "*", Component: () => <Navigate to="/" replace /> },
]);
