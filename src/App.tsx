import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense } from "react";
import { RoleGuard } from "@/components/RoleGuard";

const Login = lazy(() => import("./pages/Login"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Members = lazy(() => import("./pages/Members"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Finance = lazy(() => import("./pages/Finance"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Documents = lazy(() => import("./pages/Documents"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const Projects = lazy(() => import("./pages/Projects"));
const Clients = lazy(() => import("./pages/Clients"));
const WorkOrders = lazy(() => import("./pages/WorkOrders"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const Quotations = lazy(() => import("./pages/Quotations"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Expenses = lazy(() => import("./pages/Expenses"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Employees = lazy(() => import("./pages/Employees"));
const Manpower = lazy(() => import("./pages/Manpower"));
const Payroll = lazy(() => import("./pages/Payroll"));
const Assets = lazy(() => import("./pages/Assets"));
const Warehouse = lazy(() => import("./pages/Warehouse"));
const HSE = lazy(() => import("./pages/HSE"));
const Training = lazy(() => import("./pages/Training"));
const Facilities = lazy(() => import("./pages/Facilities"));
const Sites = lazy(() => import("./pages/Sites"));
const Accommodation = lazy(() => import("./pages/Accommodation"));
const Transport = lazy(() => import("./pages/Transport"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Reports = lazy(() => import("./pages/Reports"));
const VisitorLog = lazy(() => import("./pages/VisitorLog"));
const Helpdesk = lazy(() => import("./pages/Helpdesk"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const LeaveManagement = lazy(() => import("./pages/LeaveManagement"));
const Requisitions2 = lazy(() => import("./pages/Requisitions"));
const Deployments = lazy(() => import("./pages/Deployments"));
const GatePasses = lazy(() => import("./pages/GatePasses"));
const Timesheets = lazy(() => import("./pages/Timesheets"));
const DutyRoster = lazy(() => import("./pages/DutyRoster"));
const MPBilling = lazy(() => import("./pages/MPBilling"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const ApprovalCenter = lazy(() => import("./pages/ApprovalCenter"));
const FinancialReports = lazy(() => import("./pages/FinancialReports"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute - reduce excessive refetches
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // Prevent refetch on tab switch
    },
    mutations: {
      retry: 1,
    },
  },
});

const Loading = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3">
    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LegacyPathRedirect() {
  const location = useLocation();

  return (
    <Navigate
      to={{
        pathname: "/",
        search: location.search,
        hash: location.hash,
      }}
      replace
    />
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/index" element={<LegacyPathRedirect />} />
              <Route path="/index.html" element={<LegacyPathRedirect />} />
              <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="my-profile" element={<MyProfile />} />
                <Route path="projects" element={<Projects />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="work-orders" element={<WorkOrders />} />
                <Route path="maintenance" element={<Maintenance />} />
                <Route path="quotations" element={<Quotations />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="purchase-orders" element={<PurchaseOrders />} />
                <Route path="clients" element={<Clients />} />
                <Route path="employees" element={<Employees />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="manpower" element={<Manpower />} />
                <Route path="leave" element={<LeaveManagement />} />
                <Route path="requisitions" element={<Requisitions2 />} />
                <Route path="deployments" element={<Deployments />} />
                <Route path="timesheets" element={<Timesheets />} />
                <Route path="duty-roster" element={<DutyRoster />} />
                <Route path="gate-passes" element={<GatePasses />} />
                <Route path="assets" element={<Assets />} />
                <Route path="warehouse" element={<Warehouse />} />
                <Route path="hse" element={<HSE />} />
                <Route path="training" element={<Training />} />
                <Route path="facilities" element={<Facilities />} />
                <Route path="sites" element={<Sites />} />
                <Route path="accommodation" element={<Accommodation />} />
                <Route path="transport" element={<Transport />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="announcements" element={<Announcements />} />
                <Route path="documents" element={<Documents />} />
                <Route path="visitor-log" element={<VisitorLog />} />
                <Route path="helpdesk" element={<Helpdesk />} />
                {/* Admin/Manager protected routes */}
                <Route path="finance" element={<RoleGuard allowedRoles={["admin", "manager"]}><Finance /></RoleGuard>} />
                <Route path="invoices" element={<RoleGuard allowedRoles={["admin", "manager"]}><Invoices /></RoleGuard>} />
                <Route path="contracts" element={<RoleGuard allowedRoles={["admin", "manager"]}><Contracts /></RoleGuard>} />
                <Route path="payroll" element={<RoleGuard allowedRoles={["admin", "manager"]}><Payroll /></RoleGuard>} />
                <Route path="mp-billing" element={<RoleGuard allowedRoles={["admin", "manager"]}><MPBilling /></RoleGuard>} />
                <Route path="reports" element={<RoleGuard allowedRoles={["admin", "manager"]}><Reports /></RoleGuard>} />
                <Route path="financial-reports" element={<RoleGuard allowedRoles={["admin", "manager"]}><FinancialReports /></RoleGuard>} />
                <Route path="approvals" element={<RoleGuard allowedRoles={["admin", "manager"]}><ApprovalCenter /></RoleGuard>} />
                {/* Admin only routes */}
                <Route path="members" element={<RoleGuard allowedRoles={["admin"]}><Members /></RoleGuard>} />
                <Route path="audit-logs" element={<RoleGuard allowedRoles={["admin"]}><AuditLogs /></RoleGuard>} />
                <Route path="settings" element={<RoleGuard allowedRoles={["admin"]}><SettingsPage /></RoleGuard>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
