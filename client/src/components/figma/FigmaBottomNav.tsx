import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavItemProps {
  to: string;
  label: string;
  renderIcon: (isActive: boolean) => React.ReactNode;
}

export const FigmaBottomNav: React.FC = () => {
  const items: NavItemProps[] = [
    {
      to: '/',
      label: 'Beranda',
      renderIcon: (isActive) => (
        <svg
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7"
        >
          {/* Base shape */}
          <path
            d="M3.5 11.5L14 3.5L24.5 11.5V23.5C24.5 24.0523 24.0523 24.5 23.5 24.5H4.5C3.94772 24.5 3.5 24.0523 3.5 23.5V11.5Z"
            fill={isActive ? '#1A3BAF' : '#000000'}
            fillOpacity={isActive ? 0.25 : 0.1}
          />
          <path
            d="M2.5 11.5L14 2.5L25.5 11.5M6 9.5V24.5H22V9.5"
            stroke={isActive ? '#1A3BAF' : '#1E1E1E'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11 24.5V15H17V24.5"
            stroke={isActive ? '#1A3BAF' : '#1E1E1E'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      to: '/katalog',
      label: 'Katalog',
      renderIcon: (isActive) => (
        <svg
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7"
        >
          {/* 4 squares grid */}
          <rect
            x="4.5"
            y="4.5"
            width="8"
            height="8"
            rx="1.5"
            stroke={isActive ? '#1A3BAF' : '#1E1E1E'}
            strokeWidth="2"
            fill={isActive ? '#1A3BAF' : 'none'}
            fillOpacity={isActive ? 0.2 : 0}
          />
          <rect
            x="15.5"
            y="4.5"
            width="8"
            height="8"
            rx="1.5"
            stroke={isActive ? '#1A3BAF' : '#1E1E1E'}
            strokeWidth="2"
            fill={isActive ? '#1A3BAF' : 'none'}
            fillOpacity={isActive ? 0.2 : 0}
          />
          <rect
            x="4.5"
            y="15.5"
            width="8"
            height="8"
            rx="1.5"
            stroke={isActive ? '#1A3BAF' : '#1E1E1E'}
            strokeWidth="2"
            fill={isActive ? '#1A3BAF' : 'none'}
            fillOpacity={isActive ? 0.2 : 0}
          />
          <rect
            x="15.5"
            y="15.5"
            width="8"
            height="8"
            rx="1.5"
            stroke={isActive ? '#1A3BAF' : '#1E1E1E'}
            strokeWidth="2"
            fill={isActive ? '#1A3BAF' : 'none'}
            fillOpacity={isActive ? 0.2 : 0}
          />
        </svg>
      ),
    },
    {
      to: '/webmap',
      label: 'Peta',
      renderIcon: (isActive) => (
        <svg
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7"
        >
          <path
            d="M14 24C14 24 22 17 22 10.5C22 6.08172 18.4183 2.5 14 2.5C9.58172 2.5 6 6.08172 6 10.5C6 17 14 24 14 24Z"
            stroke={isActive ? '#1A3BAF' : '#1E1E1E'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isActive ? '#1A3BAF' : 'none'}
            fillOpacity={isActive ? 0.2 : 0}
          />
          <circle
            cx="14"
            cy="10.5"
            r="3.5"
            stroke={isActive ? '#1A3BAF' : '#1E1E1E'}
            strokeWidth="2"
            fill={isActive ? '#1A3BAF' : 'none'}
          />
        </svg>
      ),
    },
    {
      to: '/unduh',
      label: 'Unduh',
      renderIcon: (isActive) => (
        <svg
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7"
        >
          <path
            d="M3.5 7C3.5 5.89543 4.39543 5 5.5 5H10.5L12.5 8H22.5C23.6046 8 24.5 8.89543 24.5 10V21C24.5 22.1046 23.6046 23 22.5 23H5.5C4.39543 23 3.5 22.1046 3.5 21V7Z"
            stroke={isActive ? '#1A3BAF' : '#1E1E1E'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isActive ? '#1A3BAF' : 'none'}
            fillOpacity={isActive ? 0.2 : 0}
          />
          {/* Arrow pointing down */}
          <path
            d="M14 12V18.5M14 18.5L11 15.5M14 18.5L17 15.5"
            stroke={isActive ? '#1A3BAF' : '#1E1E1E'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      to: '/lainnya',
      label: 'Lainnya',
      renderIcon: (isActive) => (
        <svg
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7"
        >
          {/* 3 horizontal dots */}
          <circle
            cx="6.5"
            cy="14"
            r="2.2"
            fill={isActive ? '#1A3BAF' : '#1E1E1E'}
          />
          <circle
            cx="14"
            cy="14"
            r="2.2"
            fill={isActive ? '#1A3BAF' : '#1E1E1E'}
          />
          <circle
            cx="21.5"
            cy="14"
            r="2.2"
            fill={isActive ? '#1A3BAF' : '#1E1E1E'}
          />
        </svg>
      ),
    },
  ];

  return (
    <nav className="w-full h-[76px] bg-white/95 backdrop-blur-md border-t border-[#1A3BAF]/50 px-2 flex items-center justify-around z-30 shrink-0 select-none shadow-[0_-2px_8px_rgba(0,0,0,0.03)]">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-[60px] h-[52px] rounded-lg transition-colors active:scale-95 ${
              isActive ? 'text-[#1A3BAF]' : 'text-[#1E1E1E] hover:text-[#1A3BAF]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center justify-center h-7 mb-1">
                {item.renderIcon(isActive)}
              </div>
              <span
                className={`text-[12px] leading-none ${
                  isActive ? 'font-semibold text-[#1A3BAF]' : 'font-normal text-[#1E1E1E]'
                }`}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
