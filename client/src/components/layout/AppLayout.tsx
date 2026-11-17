import React from 'react';
import { Outlet } from 'react-router-dom';
import { FigmaTopBar } from '../figma/FigmaTopBar';
import { FigmaHeader } from '../figma/FigmaHeader';
import { FigmaBottomNav } from '../figma/FigmaBottomNav';
import { ErrorBoundary } from '../common/ErrorBoundary';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900/10 flex justify-center items-stretch antialiased">
      {/* Mobile viewport container matching Figma 402px canvas */}
      <div className="w-full max-w-[430px] min-h-screen bg-[#F1F7FA] shadow-2xl flex flex-col relative overflow-x-hidden border-x border-slate-200">
        <FigmaTopBar />
        <FigmaHeader />
        <main className="flex-1 flex flex-col relative overflow-y-auto overflow-x-hidden">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        <FigmaBottomNav />
      </div>
    </div>
  );
};
