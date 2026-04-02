import "./Layout.css";
import { Outlet } from "react-router-dom";
import Header from "./Header.tsx";
import SideBarNav from "./SideBarNav.tsx";
import useNotifications from "../hooks/useNotifications.ts";
import useLoginContext from "../hooks/useLoginContext.ts";

/**
 * Main component represents the layout of the main page, including a sidebar
 * and the main content area.
 */
export default function Layout() {
  const { user, pass } = useLoginContext();
  const auth = { username: user.username, password: pass };
  const { notifications, dismiss } = useNotifications(auth);

  return (
    <>
      <div id="main" className="main">
        <Header />
        <SideBarNav />
        <div id="right_main" className="right_main">
          {notifications.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    background: "#e1f5ee",
                    border: "1px solid #0f6e56",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: "#085041",
                  }}
                >
                  <span>{n.message}</span>
                  <button
                    className="secondary narrow"
                    onClick={() => dismiss(n.id)}
                    style={{ marginLeft: "1rem" }}
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          )}
          <Outlet />
        </div>
      </div>
    </>
  );
}
