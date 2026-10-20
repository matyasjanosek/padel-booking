import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import RequireAdmin from "./components/RequireAdmin.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import App from "./App.jsx";
import Info from "./pages/Info.jsx";
import Booking from "./pages/Booking.jsx";
import Contact from "./pages/Contact.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Account from "./pages/Account.jsx";
import Checkout from "./pages/Checkout.jsx";
import Tournament from "./pages/Tournament.jsx";
import TournamentDisplay from "./pages/TournamentDisplay.jsx";
import AdminBookings from "./pages/AdminBookings.jsx";
import AdminCourts from "./pages/AdminCourts.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminCoupons from "./pages/AdminCoupons.jsx";
import AdminTournaments from "./pages/AdminTournaments.jsx";
import AdminTournamentDetail from "./pages/AdminTournamentDetail.jsx";
import "./styles/main.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/tournaments/:id/display" element={<TournamentDisplay />} />
          <Route element={<Layout />}>
            <Route path="/" element={<App />} />
            <Route path="/info" element={<Info />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/tournaments/:id" element={<Tournament />} />
            <Route element={<RequireAuth />}>
              <Route path="/account" element={<Account />} />
              <Route path="/booking/:id/checkout" element={<Checkout />} />
            </Route>
          </Route>
          <Route path="/admin" element={<RequireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/bookings" replace />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="courts" element={<AdminCourts />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="tournaments" element={<AdminTournaments />} />
              <Route path="tournaments/:id" element={<AdminTournamentDetail />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
