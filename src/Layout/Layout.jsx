// import React from "react";
// import { Outlet, useNavigate, useLocation } from "react-router-dom";
// import "./Layout.css";

// import logo from "../assets/logo.png";

// import HomeIcon from "../assets/Home.svg";
// import ServicesIcon from "../assets/Services.svg";
// import BookingsIcon from "../assets/Bookings.svg";
// import CustomersIcon from "../assets/Customers.svg";
// import TransactionsIcon from "../assets/Transactions.svg";
// import TeamIcon from "../assets/Team.svg";

// import VerifyIcon from "../assets/verify.svg";
// import DropdownIcon from "../assets/dropdown.svg";
// import Person from "../assets/Person.png";

// const Layout = () => {
//   const navigate = useNavigate();
//   const location = useLocation();

//   const menuItems = [
//     { name: "Home", icon: HomeIcon, path: "/dashboard" },
//     { name: "Services", icon: ServicesIcon, path: "/dashboard/services" },
//     { name: "Bookings", icon: BookingsIcon, path: "/dashboard/bookings" },
//     { name: "Customers", icon: CustomersIcon, path: "/dashboard/customers" },
//     {
//       name: "Transactions",
//       icon: TransactionsIcon,
//       path: "/dashboard/transactions",
//     },
//     { name: "Team", icon: TeamIcon, path: "/dashboard/team" },
//   ];

//   return (
//     <div className="layout-container">
//       <header className="topbar">
//         <div className="logo-section">
//           <img src={logo} alt="Tapovana" />
//         </div>

//         <div className="profile-section">
//           <div className="profile-img-wrapper">
//             <img src={Person} alt="Admin" className="profile-img" />
//             <img src={VerifyIcon} alt="verify" className="verify-icon" />
//           </div>

//           <div className="profile-text">
//             <span className="name">Mahesh A</span>
//             <span className="role">Master Admin</span>
//           </div>

//           <img src={DropdownIcon} alt="menu" className="dropdown-icon" />
//         </div>
//       </header>

//       <div className="body-section">
//         <aside className="sidebar">
//           <ul className="menu">
//             {menuItems.map((item) => (
//               <li
//                 key={item.name}
//                 className={`menu-item ${
//                   location.pathname === item.path ? "active" : ""
//                 }`}
//                 onClick={() => navigate(item.path)}
//               >
//                 <img src={item.icon} alt={item.name} className="menu-icon" />
//                 {item.name}
//               </li>
//             ))}
//           </ul>
//         </aside>

//         <main className="page-content">
//           <Outlet />
//         </main>
//       </div>
//     </div>
//   );
// };

// export default Layout;

import React, { useMemo, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import "./Layout.css";

import logo from "../assets/logo.png";
import DefaultAvatar from "../assets/profileIconDefault.png"; 

import HomeIcon from "../assets/Home.svg";
import ServicesIcon from "../assets/Services.svg";
import BookingsIcon from "../assets/Bookings.svg";
import CustomersIcon from "../assets/Customers.svg";
import TransactionsIcon from "../assets/Transactions.svg";
import TeamIcon from "../assets/Team.svg";

import VerifyIcon from "../assets/verify.svg";
import DropdownIcon from "../assets/dropdown.svg";

import { getUser, getAccess, roleLabel } from "../utils/session";

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => getUser(), []);
  const access = useMemo(() => getAccess(), []);

  const fullName =
    (user?.first_name || "") + (user?.last_name ? ` ${user.last_name}` : "");
  const roleText = roleLabel(user?.role);

  const avatarSrc = user?.avatar_url ? user.avatar_url : DefaultAvatar;

  const menuItems = [
    { name: "Home", icon: HomeIcon, path: "/dashboard" }, // always visible
    { name: "Services", icon: ServicesIcon, path: "/dashboard/services", accessKey: "edit_service" },
    { name: "Bookings", icon: BookingsIcon, path: "/dashboard/bookings", accessKey: "view_booking" },
    { name: "Customers", icon: CustomersIcon, path: "/dashboard/customers", accessKey: "view_customers" },
    { name: "Transactions", icon: TransactionsIcon, path: "/dashboard/transactions", accessKey: "view_transaction" },
    { name: "Membership", icon: CustomersIcon, path: "/dashboard/membership", accessKey: "view_customers" },
    { name: "Workshops", icon: ServicesIcon, path: "/dashboard/workshops", accessKey: "edit_service" },
    { name: "Team", icon: TeamIcon, path: "/dashboard/team", accessKey: "view_staff" }
  ];

  const visibleMenu = menuItems.filter((item) => {
    const role = (user?.role || "").toLowerCase();
    
    // Always show Home
    if (item.name === "Home") return true;

    // Doctor sees only Services and Bookings
    if (role === "doctor") {
      return ["Services", "Bookings"].includes(item.name);
    }
    
    // Therapist sees only Bookings
    if (role === "therapist") {
      return ["Bookings"].includes(item.name);
    }

    // Admin / Manager / others see everything
    return true;
  });

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/");
  };

  return (
    <div className="layout-container">
      <header className="topbar">
        <div className="logo-section">
          <img src={logo} alt="Tapovana" />
        </div>

        <div 
          className="profile-section" 
          onClick={() => setShowProfileDropdown(!showProfileDropdown)} 
          style={{ cursor: 'pointer', position: 'relative' }}
        >
          <div className="profile-img-wrapper">
            <img src={avatarSrc} alt="Profile" className="profile-img" />
            <img src={VerifyIcon} alt="verify" className="verify-icon" />
          </div>

          <div className="profile-text">
            <span className="name">{fullName || "User"}</span>
            <span className="role">{roleText}</span>
          </div>

          <img src={DropdownIcon} alt="menu" className="dropdown-icon" />

          {showProfileDropdown && (
            <div style={{ 
              position: 'absolute', 
              top: '100%', 
              right: 0, 
              marginTop: '10px', 
              background: 'white', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
              minWidth: '150px', 
              zIndex: 100 
            }}>
              <div 
                onClick={handleLogout}
                style={{ padding: '12px 16px', color: '#e53e3e', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                Logout
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="body-section">
        <aside className="sidebar">
          <ul className="menu">
            {visibleMenu.map((item) => (
              <li
                key={item.name}
                className={`menu-item ${location.pathname === item.path ? "active" : ""}`}
                onClick={() => navigate(item.path)}
              >
                <img src={item.icon} alt={item.name} className="menu-icon" />
                {item.name}
              </li>
            ))}
          </ul>
        </aside>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
