import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import garudaLogo from '../../assets/figma/garuda_pancasila.png';
import bigLogo from '../../assets/figma/logo_geospasial.png';

interface FigmaHeaderProps {
  showBack?: boolean;
  title?: string;
}

export const FigmaHeader: React.FC<FigmaHeaderProps> = () => {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    if (isAuthenticated) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

  return (
    <header className="w-full bg-white border-b border-[#1A3BAF]/50 px-4 h-[68px] flex items-center justify-between z-30 select-none">
      {/* Brand logo & name */}
      <Link to="/" className="flex items-center gap-2">
        {/* Garuda emblem in circle */}
        <div className="w-[42px] h-[42px] rounded-full border-2 border-[#BFB709] bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
          <img
            src={garudaLogo}
            alt="Garuda Pancasila"
            className="w-[30px] h-[32px] object-contain"
          />
        </div>

        {/* BIG Logo */}
        <img
          src={bigLogo}
          alt="Badan Informasi Geospasial"
          className="h-[40px] w-auto object-contain shrink-0"
        />

        {/* Brand Text */}
        <div className="flex flex-col justify-center leading-none">
          <span className="text-[#1A3BAF] font-extrabold text-[19px] tracking-tight">
            GEOSPASIAL
          </span>
          <span className="text-[#1E1E1E] font-medium text-[13px] mt-0.5">
            Untuk Negeri
          </span>
        </div>
      </Link>

      {/* Right User Icon Button */}
      <button
        onClick={handleProfileClick}
        aria-label="User Profile"
        className="w-[45px] h-[45px] rounded-full bg-[#1A3BAF] flex items-center justify-center text-white shrink-0 hover:opacity-90 active:scale-95 transition-transform shadow-sm"
      >
        {isAuthenticated && user?.name ? (
          <span className="font-bold text-sm">
            {user.name.charAt(0).toUpperCase()}
          </span>
        ) : (
          <User className="w-6 h-6 stroke-[2.2]" />
        )}
      </button>
    </header>
  );
};
