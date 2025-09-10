import React from 'react';

function Card({ children, title, className = "", animate = true }) {
  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${animate ? 'animate-slide-up' : ''} ${className}`}>
      {title && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

export default Card;