import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { FigmaTopBar } from '../figma/FigmaTopBar';
import { FigmaHeader } from '../figma/FigmaHeader';
import { FigmaBottomNav } from '../figma/FigmaBottomNav';
import { DesktopNavbar } from './DesktopNavbar';
import { Footer } from './Footer';
import { ErrorBoundary } from '../common/ErrorBoundary';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isWebmap = location.pathname === '/webmap';

  return (
    <div className="min-h-screen bg-[#F1F7FA] flex flex-col antialiased">
      {/* Mobile Top Navigation (only < md / < 768px) */}
      <div className="md:hidden w-full max-w-[430px] mx-auto bg-white border-x border-slate-200 shadow-xs">
        <FigmaTopBar />
        <FigmaHeader />
      </div>

      {/* Desktop & Tablet Top Navigation (only >= md / >= 768px) */}
      <div className="hidden md:block w-full">
        <DesktopNavbar />
      </div>

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col relative ${
          isWebmap
            ? 'h-[calc(100vh-144px)] md:h-[calc(100vh-72px)] overflow-hidden w-full'
            : 'w-full max-w-[430px] md:max-w-none mx-auto border-x md:border-x-0 border-slate-200'
        }`}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Navigation (only < md / < 768px) */}
      <div className="md:hidden w-full max-w-[430px] mx-auto sticky bottom-0 z-30 border-x border-slate-200 shadow-md">
        <FigmaBottomNav />
      </div>

      {/* Desktop Footer (only >= md and non-webmap) */}
      {!isWebmap && (
        <div className="hidden md:block w-full">
          <Footer />
        </div>
      )}
    </div>
  );
};
