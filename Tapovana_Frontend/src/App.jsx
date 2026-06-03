import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./Layout/Layout";
import SignIn from "./SignIn/SignIn";

import Home from "./Home/Home";
import Services from "./Services/Services";
import Bookings from "./Bookings/Bookings";
import Customers from "./Customers/Customers";
import Transactions from "./Transactions/Transactions";
import Team from "./Team/Team";
import SetPassword from "./SignIn/SetPassword";

import Membership from "./Membership/Membership";
import Workshops from "./Workshops/Workshops";
import VedicLifePrograms from "./VedicLifePrograms/VedicLifePrograms";
import Blogs from "./Blogs/Blogs";
import MyAssignments from "./MyAssignments/MyAssignments";
import { AllocationProvider } from "./utils/AllocationContext";
import { getUser } from "./utils/session";

// Guard 1: Checks for a valid session token
const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem("access_token");
  return token ? children : <Navigate to="/" replace />;
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

function App() {
  return (
    <AllocationProvider>
      <Router>
        <Routes>

          <Route path="/" element={<SignIn />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Accessible to all logged-in roles */}
            <Route index element={<Home />} />
            <Route path="set-password" element={<SetPassword />} />
            <Route path="blogs" element={<Blogs />} />
            <Route path="blogs/:id" element={<Blogs />} />
            <Route path="my-assignments" element={<MyAssignments />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="services" element={<Services />} />

            {/* Admin-only routes — redirects staff to Home */}
            <Route path="customers" element={<RoleProtectedRoute><Customers /></RoleProtectedRoute>} />
            <Route path="transactions" element={<RoleProtectedRoute><Transactions /></RoleProtectedRoute>} />
            <Route path="team" element={<RoleProtectedRoute><Team /></RoleProtectedRoute>} />
            <Route path="membership" element={<RoleProtectedRoute><Membership /></RoleProtectedRoute>} />
            <Route path="workshops" element={<RoleProtectedRoute><Workshops /></RoleProtectedRoute>} />
            <Route path="vedic-programs" element={<RoleProtectedRoute><VedicLifePrograms /></RoleProtectedRoute>} />
          </Route>

        </Routes>
      </Router>
    </AllocationProvider>
  );
}

export default App;