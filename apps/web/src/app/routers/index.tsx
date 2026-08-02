import {
  createBrowserRouter,
  Navigate,
  Outlet,
  ScrollRestoration,
} from "react-router";
import { lazy, Suspense, type ReactNode } from "react";
import { useData } from "@/app/data";

const Home = lazy(() => import("@/app/pages/client/Home"));
const Jobs = lazy(() => import("@/app/pages/client/Jobs"));
const CandidateGuide = lazy(() => import("@/app/pages/client/CandidateGuide"));
const Contact = lazy(() => import("@/app/pages/client/Contact"));
const JobDetail = lazy(() => import("@/app/pages/client/JobDetail"));
const Apply = lazy(() => import("@/app/pages/client/Apply"));
const ApplySuccess = lazy(() => import("@/app/pages/client/ApplySuccess"));
const AdminLogin = lazy(() => import("@/app/pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("@/app/pages/admin/AdminDashboard"));
const AdminJobs = lazy(() => import("@/app/pages/admin/AdminJobs"));
const AdminJobDetail = lazy(() => import("@/app/pages/admin/AdminJobDetail"));
const CreateEditJob = lazy(() => import("@/app/pages/admin/CreateEditJob"));
const CandidateInbox = lazy(() => import("@/app/pages/admin/CandidateInbox"));
const CandidateDetail = lazy(() => import("@/app/pages/admin/CandidateDetail"));
const TalentPoolDetail = lazy(() => import("@/app/pages/admin/TalentPoolDetail"));
const CandidateChats = lazy(() => import("@/app/pages/admin/CandidateChats"));
const FollowUp = lazy(() => import("@/app/pages/admin/FollowUp"));
const MessageTemplates = lazy(() => import("@/app/pages/admin/MessageTemplates"));
const AdminSettings = lazy(() => import("@/app/pages/admin/AdminSettings"));
const Terms = lazy(() => import("@/app/pages/client/Terms"));
const Privacy = lazy(() => import("@/app/pages/client/Privacy"));

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdminLoggedIn, isAuthReady } = useData();
  if (!isAuthReady)
    return (
      <div className="min-h-screen bg-background p-10 text-sm font-semibold text-muted-foreground">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  return isAdminLoggedIn ? children : <Navigate to="/admin" replace />;
}

function RouteLayout() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <ScrollRestoration />
      <Outlet />
    </Suspense>
  );
}

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-sm font-semibold text-muted-foreground">
      Đang tải nội dung...
    </div>
  );
}

export const router = createBrowserRouter([
  {
    Component: RouteLayout,
    children: [
      { path: "/", Component: Home },
      { path: "/jobs", Component: Jobs },
      {
        path: "/saved-jobs",
        element: <Navigate to="/jobs?view=saved" replace />,
      },
      { path: "/candidate-guide", Component: CandidateGuide },
      { path: "/contact", Component: Contact },
      { path: "/terms", Component: Terms },
      { path: "/privacy", Component: Privacy },
      { path: "/jobs/:id", Component: JobDetail },
      { path: "/jobs/:id/apply", Component: Apply },
      { path: "/apply/success", Component: ApplySuccess },
      { path: "/admin", Component: AdminLogin },
      {
        path: "/admin/dashboard",
        element: (
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        ),
      },
      {
        path: "/admin/jobs",
        element: (
          <RequireAdmin>
            <AdminJobs />
          </RequireAdmin>
        ),
      },
      {
        path: "/admin/jobs/new",
        element: (
          <RequireAdmin>
            <CreateEditJob />
          </RequireAdmin>
        ),
      },
      {
        path: "/admin/jobs/:id",
        element: (
          <RequireAdmin>
            <AdminJobDetail />
          </RequireAdmin>
        ),
      },
      {
        path: "/admin/jobs/:id/edit",
        element: (
          <RequireAdmin>
            <CreateEditJob />
          </RequireAdmin>
        ),
      },
      {
        path: "/admin/candidates",
        element: (
          <RequireAdmin>
            <CandidateInbox />
          </RequireAdmin>
        ),
      },
      {
        path: "/admin/candidates/:id",
        element: (
          <RequireAdmin>
            <CandidateDetail />
          </RequireAdmin>
        ),
      },
      {
        path: "/admin/talent-pool",
        element: (
          <RequireAdmin>
            <Navigate to="/admin/candidates" replace />
          </RequireAdmin>
        ),
      },
      {
        path: "/admin/talent-pool/:id",
        element: (
          <RequireAdmin>
            <TalentPoolDetail />
          </RequireAdmin>
        ),
      },
      {
        path: "/admin/chats",
        element: (
          <RequireAdmin>
            <CandidateChats />
          </RequireAdmin>
        ),
      },
      {
        path: "/admin/follow-up",
        element: (
          <RequireAdmin>
            <FollowUp />
          </RequireAdmin>
        ),
      },
      {
        path: "/admin/templates",
        element: (
          <RequireAdmin>
            <MessageTemplates />
          </RequireAdmin>
        ),
      },
      {
        path: "/admin/settings",
        element: (
          <RequireAdmin>
            <AdminSettings />
          </RequireAdmin>
        ),
      },
      { path: "*", Component: () => <Navigate to="/" replace /> },
    ],
  },
]);
