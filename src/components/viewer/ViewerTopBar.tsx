import React from 'react';
import { Link } from 'react-router-dom';

export const ViewerTopBar = () => (
  <div className="h-[60px] bg-white border-b border-[#e5e5e5] flex items-center justify-between px-6 py-3 shadow-sm flex-shrink-0">
    <div className="flex items-center gap-4">
      <Link to="/" className="text-[#171717] text-[20px] font-bold">
        Seat Constructor
      </Link>
      <span className="text-sm bg-gray-100 text-gray-600 font-medium px-3 py-1 rounded-lg">
        Viewer Mode
      </span>
    </div>
    <Link
      to="/editor"
      className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-[8px] hover:bg-blue-700 transition-colors"
    >
      Back to Editor
    </Link>
  </div>
);