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

import React, { useMemo, useState, useEffect, useRef } from "react";
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

  const [user, setUser] = useState(() => getUser());
  const access = useMemo(() => getAccess(), []);

  const fullName =
    (user?.first_name || "") + (user?.last_name ? ` ${user.last_name}` : "");
  const roleText = roleLabel(user?.role);

  const avatarSrc = useMemo(() => {
    if (!user) return DefaultAvatar;
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    
    let photoUrl = user.profile_photo_url;
    if (photoUrl && /^[A-Za-z]:[/\\]/i.test(photoUrl)) {
      photoUrl = "/uploads/" + photoUrl.replace(/\\/g, '/').split('/').pop();
    }

    if (user.profile_photo_source === "upload" && photoUrl) {
      return `${API_BASE}${photoUrl}`;
    } else if (user.profile_photo_source === "local" && photoUrl) {
      return `/avatars/${photoUrl}`;
    } else if (user.avatar_url) {
      let avUrl = user.avatar_url;
      if (avUrl && /^[A-Za-z]:[/\\]/i.test(avUrl)) {
        avUrl = "/uploads/" + avUrl.replace(/\\/g, '/').split('/').pop();
      }
      return avUrl.startsWith("http") || avUrl.startsWith("/")
        ? avUrl
        : `${API_BASE}${avUrl}`;
    }
    return DefaultAvatar;
  }, [user]);

  const menuItems = [
    { 
      name: "Home", 
      icon: (
        <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ), 
      path: "/dashboard" 
    },
    { 
      name: "Services", 
      icon: (
        <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5c.5-1.5 2.5-1.5 3 0 .8 2.5-3 5.5-3 5.5s-3.8-3-3-5.5c.5-1.5 2.5-1.5 3 0Z" />
          <path d="M12 11.5V17a3 3 0 0 1-6 0v-3.5M16 11.5V14a2.5 2.5 0 0 0 5 0v-2" />
          <path d="M12 21h8a2 2 0 0 0 2-2v-3.5" />
        </svg>
      ), 
      path: "/dashboard/services", 
      accessKey: "edit_service" 
    },
    { 
      name: "Bookings", 
      icon: (
        <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ), 
      path: "/dashboard/bookings", 
      accessKey: "view_booking" 
    },
    { 
      name: "Customers", 
      icon: (
        <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ), 
      path: "/dashboard/customers", 
      accessKey: "view_customers" 
    },
    { 
      name: "Transactions", 
      icon: (
        <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ), 
      path: "/dashboard/transactions", 
      accessKey: "view_transaction" 
    },
    { 
      name: "Membership", 
      icon: (
        <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M12 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-7 4v-1a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v1" />
        </svg>
      ), 
      path: "/dashboard/membership", 
      accessKey: "view_customers" 
    },
    { 
      name: "Workshops", 
      icon: (
        <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ), 
      path: "/dashboard/workshops", 
      accessKey: "edit_service" 
    },

    { 
      name: "Vedic Programs", 
      icon: (
        <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="11" r="3" />
        </svg>
      ), 
      path: "/dashboard/vedic-programs", 
      accessKey: "edit_service" 
    },
    { 
      name: "Blogs", 
      icon: (
        <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ), 
      path: "/dashboard/blogs", 
      accessKey: "view_customers" 
    },
    { 
      name: "My Assignments", 
      icon: (
        <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M9 14l2 2 4-4" />
        </svg>
      ), 
      path: "/dashboard/my-assignments" 
    },
    { 
      name: "Team", 
      icon: (
        <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ), 
      path: "/dashboard/team", 
      accessKey: "view_staff" 
    },
    { 
      name: "Feedbacks", 
      icon: (
        <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ), 
      path: "/dashboard/feedbacks", 
      accessKey: "view_customers" 
    }
  ];

  const visibleMenu = menuItems.filter((item) => {
    const role = (user?.role || "").toLowerCase();
    
    // Always show Home
    if (item.name === "Home") return true;

    // My Assignments must only show in therapist as well doctors page
    if (item.name === "My Assignments") {
      return ["doctor", "therapist"].includes(role);
    }

    // Doctor sees only Services, Bookings, Blogs, My Assignments, and Feedbacks
    if (role === "doctor") {
      return ["Services", "Bookings", "Blogs", "My Assignments", "Feedbacks"].includes(item.name);
    }
    
    // Therapist sees only Bookings, Blogs, My Assignments, and Feedbacks
    if (role === "therapist") {
      return ["Bookings", "Blogs", "My Assignments", "Feedbacks"].includes(item.name);
    }

    // Admin / Manager / others see everything
    return true;
  });

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  useEffect(() => {
    const handleProfileUpdated = () => {
      setUser(getUser());
    };
    window.addEventListener("profileUpdated", handleProfileUpdated);
    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdated);
    };
  }, []);

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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileDropdown(false);
                  navigate("/dashboard/profile");
                }}
                style={{ padding: '12px 16px', color: '#2d3748', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #edf2f7' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                My Profile
              </div>
              <div 
                onClick={handleLogout}
                style={{ padding: '12px 16px', color: '#CDA751', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '0 0 8px 8px' }}
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
                {item.icon}
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
