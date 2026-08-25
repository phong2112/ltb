import {
  createBrowserRouter,
  Navigate,
  Outlet,
  ScrollRestoration,
  useLocation,
} from "react-router";
import { lazy, Suspense, type ReactNode } from "react";
import { useData } from "@/app/data";
import CherryBlossomFall from "@/app/components/CherryBlossomFall";

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
const SourcingCampaigns = lazy(() => import("@/app/pages/admin/SourcingCampaigns"));
const SourcingCampaignDetail = lazy(() => import("@/app/pages/admin/SourcingCampaignDetail"));
const Terms = lazy(() => import("@/app/pages/client/Terms"));
const Privacy = lazy(() => import("@/app/pages/client/Privacy"));

function RequireAdmin({ children }: { children?: ReactNode }) {
  const { isAdminLoggedIn, isAuthReady } = useData();
  if (!isAuthReady)
    return (
      <div className="min-h-screen bg-background p-10 text-sm font-semibold text-muted-foreground">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  return isAdminLoggedIn ? (children ?? <Outlet />) : <Navigate to="/admin" replace />;
}

function RouteLayout() {
  const location = useLocation();

  return (
    <>
      <CherryBlossomFall context={location.pathname.startsWith("/admin") ? "admin" : "public"} />
      <Suspense fallback={<RouteLoadingFallback />}>
        <ScrollRestoration />
        <Outlet />
      </Suspense>
    </>
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
      {
        path: "/jobs",
        children: [
          { index: true, Component: Jobs },
          { path: ":id", Component: JobDetail },
          { path: ":id/apply", Component: Apply },
        ],
      },
      {
        path: "/saved-jobs",
        element: <Navigate to="/jobs?view=saved" replace />,
      },
      { path: "/candidate-guide", Component: CandidateGuide },
      { path: "/contact", Component: Contact },
      { path: "/terms", Component: Terms },
      { path: "/privacy", Component: Privacy },
      {
        path: "/apply",
        children: [
          { path: "success", Component: ApplySuccess },
        ],
      },
      {
        path: "/t/:tenantSlug",
        children: [
          { index: true, Component: Home },
          {
            path: "jobs",
            children: [
              { index: true, Component: Jobs },
              { path: ":id", Component: JobDetail },
              { path: ":id/apply", Component: Apply },
            ],
          },
          {
            path: "saved-jobs",
            element: <Navigate to="../jobs?view=saved" replace />,
          },
          { path: "candidate-guide", Component: CandidateGuide },
          { path: "contact", Component: Contact },
          { path: "terms", Component: Terms },
          { path: "privacy", Component: Privacy },
          {
            path: "apply",
            children: [
              { path: "success", Component: ApplySuccess },
            ],
          },
        ],
      },
      {
        path: "/admin",
        children: [
          { index: true, Component: AdminLogin },
          {
            element: <RequireAdmin />,
            children: [
              { path: "dashboard", Component: AdminDashboard },
              { path: "jobs", Component: AdminJobs },
              { path: "jobs/new", Component: CreateEditJob },
              { path: "jobs/:id", Component: AdminJobDetail },
              { path: "jobs/:id/edit", Component: CreateEditJob },
              { path: "candidates", Component: CandidateInbox },
              { path: "candidates/:id", Component: CandidateDetail },
              { path: "talent-pool", element: <Navigate to="/admin/candidates" replace /> },
              { path: "talent-pool/:id", Component: TalentPoolDetail },
              { path: "chats", Component: CandidateChats },
              { path: "follow-up", Component: FollowUp },
              { path: "templates", Component: MessageTemplates },
              { path: "settings", Component: AdminSettings },
              { path: "sourcing", Component: SourcingCampaigns },
              { path: "sourcing/:id", Component: SourcingCampaignDetail },
            ],
          },
        ],
      },
      { path: "*", Component: () => <Navigate to="/" replace /> },
    ],
  },
]);
