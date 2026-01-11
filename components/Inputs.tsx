import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  readOnly?: boolean;
  labelClassName?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = "", readOnly, labelClassName = "", ...props }) => (
  <div className="space-y-1">
    <label className={`text-xs font-medium text-gray-500 ${labelClassName}`}>{label}</label>
    <input
      className={`form-input w-full rounded-md border-gray-300 bg-white text-sm focus:border-blue-500 focus:ring-blue-500 ${readOnly ? 'bg-gray-100 text-gray-500' : ''} ${className}`}
      readOnly={readOnly}
      {...props}
    />
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ label, children, className = "", ...props }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-gray-500">{label}</label>
    <select
      className={`form-select block w-full rounded-md border-gray-300 bg-gray-50 text-sm focus:border-blue-500 focus:ring-blue-500 ${className}`}
      {...props}
    >
      {children}
    </select>
  </div>
);