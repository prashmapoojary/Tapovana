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
import { AllocationProvider } from "./utils/AllocationContext";

const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem("access_token");
  return token ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <Router>
      <AllocationProvider>
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
            <Route index element={<Home />} />
            <Route path="services" element={<Services />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="customers" element={<Customers />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="team" element={<Team />} />
            <Route path="set-password" element={<SetPassword />} />
            <Route path="membership" element={<Membership />} />
            <Route path="workshops" element={<Workshops />} />
          </Route>

        </Routes>
      </AllocationProvider>
    </Router>
  );
}

export default App;