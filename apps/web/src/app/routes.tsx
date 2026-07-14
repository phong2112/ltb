import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from "react-router";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { useData } from "@/app/data";

const Home = lazy(() => import("@/app/pages/Home"));
const Jobs = lazy(() => import("@/app/pages/Jobs"));
const CandidateGuide = lazy(() => import("@/app/pages/CandidateGuide"));
const Contact = lazy(() => import("@/app/pages/Contact"));
const JobDetail = lazy(() => import("@/app/pages/JobDetail"));
const Apply = lazy(() => import("@/app/pages/Apply"));
const ApplySuccess = lazy(() => import("@/app/pages/ApplySuccess"));
const AdminLogin = lazy(() => import("@/app/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("@/app/pages/AdminDashboard"));
const AdminJobs = lazy(() => import("@/app/pages/AdminJobs"));
const AdminJobDetail = lazy(() => import("@/app/pages/AdminJobDetail"));
const CreateEditJob = lazy(() => import("@/app/pages/CreateEditJob"));
const CandidateInbox = lazy(() => import("@/app/pages/CandidateInbox"));
const CandidateDetail = lazy(() => import("@/app/pages/CandidateDetail"));
const CandidateChats = lazy(() => import("@/app/pages/CandidateChats"));
const FollowUp = lazy(() => import("@/app/pages/FollowUp"));
const MessageTemplates = lazy(() => import("@/app/pages/MessageTemplates"));
const AdminSettings = lazy(() => import("@/app/pages/AdminSettings"));
const Terms = lazy(() => import("@/app/pages/Terms"));
const Privacy = lazy(() => import("@/app/pages/Privacy"));

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
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
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
