import React from 'react';
import type { UserRole } from '../types';

interface SidebarProps {
  currentSection: string;
  setSection: (section: string) => void;
  roleMode: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentSection, setSection, roleMode }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'validator', label: 'Validator', icon: 'verified' },
    { id: 'exams', label: 'Exam Structure', icon: 'account_tree' },
    { id: 'enrollment', label: 'Enrollment', icon: 'person_add' },
    { id: 'katas', label: 'Kata Library', icon: 'menu_book' },
    { id: 'fees', label: 'Fees', icon: 'payments' },
    { id: 'history', label: 'History', icon: 'history' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-[64px] lg:w-[260px] bg-surface-container-low border-r border-outline-variant flex flex-col p-sm lg:p-md gap-sm z-50 transition-all duration-300">
      {/* Brand Header */}
      <div className="px-xs lg:px-md py-sm mb-sm lg:mb-md flex items-center gap-md">
        <div className="w-10 h-10 bg-primary-container rounded flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
            sports_martial_arts
          </span>
        </div>
        <div className="hidden lg:block">
          <h1 className="text-sm font-bold text-primary">Gestión Técnica</h1>
          <p className="text-[11px] text-on-surface-variant opacity-70">Federación Madrileña</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Navegación principal">
        {menuItems.map((item) => {
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-md px-md py-sm text-xs rounded-lg text-left transition-all duration-200 ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container font-bold scale-[0.98]'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive ? 'fill-icon' : ''}`}>
                {item.icon}
              </span>
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          );
        })}

        {/* Admin Tab (Visible only to director role) */}
        {roleMode === 'director' && (
          <button
            onClick={() => setSection('admin')}
            className={`w-full flex items-center gap-md px-md py-sm text-xs rounded-lg text-left transition-all duration-200 ${
              currentSection === 'admin'
                ? 'bg-red-50 text-error font-bold scale-[0.98] border border-red-200'
                : 'text-error hover:bg-red-50/50'
            }`}
          >
            <span className="material-symbols-outlined">admin_panel_settings</span>
            <span className="hidden lg:inline font-semibold">Administración</span>
          </button>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="mt-auto pt-md border-t border-outline-variant space-y-1">
        <div className="hidden lg:block px-md py-sm text-[11px] text-on-surface-variant italic">
          Normativa FMK 2017
        </div>
      </div>
    </aside>
  );
};
