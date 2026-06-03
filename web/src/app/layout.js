import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Petty Cash PT BABJM",
  description: "Sistem Pencatatan Kas dan Bon Kas PT BABJM",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <div className="page-container">
          <Sidebar />
          <div className="main-content">
            <header className="header">
              <h2>Dashboard</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="badge badge-success">Online</span>
                <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>
                  AD
                </div>
              </div>
            </header>
            <main className="content-area">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
