import React from 'react';

interface CardProps {
  title: string;
  icon?: React.ReactNode;
  headerColorClass: string;
  borderColorClass: string;
  iconColorClass: string;
  titleColorClass: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  icon,
  headerColorClass,
  borderColorClass,
  iconColorClass,
  titleColorClass,
  children
}) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border ${borderColorClass} overflow-hidden`}>
      <div className={`${headerColorClass} px-6 py-4 border-b border-opacity-50`}>
        <h3 className={`text-lg font-semibold ${titleColorClass} flex items-center gap-2`}>
          {icon && <span className={`${iconColorClass}`}>{icon}</span>}
          {title}
        </h3>
      </div>
      <div className="p-6 space-y-5">
        {children}
      </div>
    </div>
  );
};

export const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 pt-4 border-t border-gray-100">{title}</h4>
);