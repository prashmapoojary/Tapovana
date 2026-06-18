import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./Layout/Layout";
import { AllocationProvider } from "./utils/AllocationContext";
import ErrorBoundary from "./utils/ErrorBoundary";
import { getUser } from "./utils/session";

const SignIn = lazy(() => import("./SignIn/SignIn"));
const Home = lazy(() => import("./Home/Home"));
const Services = lazy(() => import("./Services/Services"));
const Bookings = lazy(() => import("./Bookings/Bookings"));
const Customers = lazy(() => import("./Customers/Customers"));
const Transactions = lazy(() => import("./Transactions/Transactions"));
const Team = lazy(() => import("./Team/Team"));
const SetPassword = lazy(() => import("./SignIn/SetPassword"));
const ResetPassword = lazy(() => import("./SignIn/ResetPassword"));
const ForceChangePassword = lazy(() => import("./SignIn/ForceChangePassword"));
const Profile = lazy(() => import("./Profile/Profile"));
const Membership = lazy(() => import("./Membership/Membership"));
const Workshops = lazy(() => import("./Workshops/Workshops"));
const VedicLifePrograms = lazy(() => import("./VedicLifePrograms/VedicLifePrograms"));
const Blogs = lazy(() => import("./Blogs/Blogs"));
const BlogCreate = lazy(() => import("./Blogs/BlogCreate"));
const BlogEdit = lazy(() => import("./Blogs/BlogEdit"));
const MyAssignments = lazy(() => import("./MyAssignments/MyAssignments"));

// Guard 1: Checks for a valid session token and handles forced password change
const ProtectedRoute = ({ children, isForceChangeRoute = false }) => {
  const token = sessionStorage.getItem("access_token");
  if (!token) return <Navigate to="/" replace />;

  const mustChange = sessionStorage.getItem("must_change") === "true";

  if (mustChange && !isForceChangeRoute) {
    return <Navigate to="/force-change-password" replace />;
  }
  if (!mustChange && isForceChangeRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Guard 2: Role-based route protection.
// ADMIN-only routes redirect staff (DOCTOR/THERAPIST) back to Home.
const RoleProtectedRoute = ({ children }) => {
  const user = getUser();
  const role = (user?.role || "").toUpperCase();
  const isStaff = role === "DOCTOR" || role === "THERAPIST";
  if (isStaff) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Wraps each page in its own ErrorBoundary so a crash in one page
// does NOT unmount AllocationProvider or crash neighbouring pages.
const SafePage = ({ children }) => (
  <ErrorBoundary>{children}</ErrorBoundary>
);

const LoadingFallback = () => (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "80vh",
    fontSize: "1.2rem",
    color: "#cda751",
    fontFamily: "sans-serif",
    fontWeight: "500"
  }}>
    Loading page...
  </div>
);

function App() {
  /*
   * Tree order matters:
   *   Router
   *     └─ AllocationProvider   ← context lives here, never unmounted by route errors
   *         └─ Routes
   *             └─ SafePage (per-route ErrorBoundary)
   *                 └─ <Page />
   *
   * Previously AllocationProvider was inside an outer ErrorBoundary.
   * If that boundary fired it would unmount the Provider, causing every
   * child's useAllocations() to throw "must be used within AllocationProvider".
   * Now the Provider is safe: only the individual page boundary fires.
   */
  return (
    <Router>
      <AllocationProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>

            <Route path="/" element={<SignIn />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/force-change-password" element={
              <ProtectedRoute isForceChangeRoute={true}>
                <ForceChangePassword />
              </ProtectedRoute>
            } />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Accessible to all logged-in roles */}
              <Route index element={<SafePage><Home /></SafePage>} />
              <Route path="profile" element={<SafePage><Profile /></SafePage>} />
              <Route path="blogs" element={<SafePage><Blogs /></SafePage>} />
              <Route path="blogs/create" element={<SafePage><BlogCreate /></SafePage>} />
              <Route path="blogs/:id" element={<SafePage><Blogs /></SafePage>} />
              <Route path="blogs/:id/edit" element={<SafePage><BlogEdit /></SafePage>} />
              <Route path="my-assignments" element={<SafePage><MyAssignments /></SafePage>} />
              <Route path="bookings" element={<SafePage><Bookings /></SafePage>} />
              <Route path="services" element={<SafePage><Services /></SafePage>} />

              {/* Admin-only routes — redirects staff to Home */}
              <Route path="customers" element={<RoleProtectedRoute><SafePage><Customers /></SafePage></RoleProtectedRoute>} />
              <Route path="transactions" element={<RoleProtectedRoute><SafePage><Transactions /></SafePage></RoleProtectedRoute>} />
              <Route path="team" element={<RoleProtectedRoute><SafePage><Team /></SafePage></RoleProtectedRoute>} />
              <Route path="membership" element={<RoleProtectedRoute><SafePage><Membership /></SafePage></RoleProtectedRoute>} />
              <Route path="workshops" element={<RoleProtectedRoute><SafePage><Workshops /></SafePage></RoleProtectedRoute>} />
              <Route path="vedic-programs" element={<RoleProtectedRoute><SafePage><VedicLifePrograms /></SafePage></RoleProtectedRoute>} />
            </Route>

          </Routes>
        </Suspense>
      </AllocationProvider>
    </Router>
  );
}

export default App;