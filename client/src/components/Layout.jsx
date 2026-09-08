import { Outlet } from "react-router-dom";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import "../styles/layout.css";

export default function Layout() {
  return (
    <div className="layout">
      <Nav />
      <main className="content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
