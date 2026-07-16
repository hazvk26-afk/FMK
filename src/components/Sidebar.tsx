import React from 'react';
import type { UserRole } from '../types';

interface SidebarProps {
  currentSection: string;
  setSection: (section: string) => void;
  roleMode: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentSection, setSection, roleMode }) => {
  const isAspiranteVisible = roleMode === 'aspirante' || roleMode === 'administrador';
  const isDirectorVisible = roleMode === 'director' || roleMode === 'administrador';
  const isJuezVisible = roleMode === 'juez' || roleMode === 'administrador';
  const isAdminVisible = roleMode === 'administrador';

  const aspiranteItems = [
    { id: 'dashboard', label: 'Inicio (Aspirante)', icon: 'dashboard' },
    { id: 'validator', label: 'Validador Requisitos', icon: 'verified' },
    { id: 'enrollment', label: 'Mis Inscripciones', icon: 'person_add' },
    { id: 'katas', label: 'Biblioteca de Katas', icon: 'menu_book' },
    { id: 'fees', label: 'Mis Tasas y Pagos', icon: 'payments' },
    { id: 'history', label: 'Historial Técnico', icon: 'history' },
  ];

  const directorItems = [
    { id: 'admin_dashboard', label: 'Directorio Federados', icon: 'groups' },
    { id: 'admin_enrollments', label: 'Aprobación / Documentos', icon: 'rule' },
    { id: 'admin_exams', label: 'Convocar Examen', icon: 'add_task' },
    { id: 'admin_clubs', label: 'Gestión de Clubes', icon: 'domain' },
    { id: 'admin_rules', label: 'Editor Normativa', icon: 'edit_note' },
  ];

  const juezItems = [
    { id: 'juez_exams', label: 'Calificar Exámenes', icon: 'rate_review' },
  ];

  const adminItems = [
    { id: 'system_users', label: 'Cuentas Usuarios', icon: 'manage_accounts' },
    { id: 'system_docs', label: 'Descarga Documental', icon: 'download' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-surface-container-low border-r border-outline-variant flex flex-col p-md gap-sm z-50 overflow-y-auto">
      {/* Brand Header */}
      <div className="px-md py-sm mb-md flex items-center gap-md shrink-0">
        <div className="w-10 h-10 bg-primary-container rounded flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
            sports_martial_arts
          </span>
        </div>
        <div>
          <h1 className="font-headline-sm text-headline-sm font-bold text-primary">Gestión Técnica</h1>
          <p className="font-label-md text-label-md text-on-surface-variant opacity-70">Federación Madrileña</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-md">
        
        {/* ÁREA ASPIRANTE */}
        {isAspiranteVisible && (
          <div className="space-y-base">
            <span className="px-md text-[10px] font-bold text-on-surface-variant/50 tracking-wider uppercase block">
              ÁREA ASPIRANTE
            </span>
            {aspiranteItems.map((item) => {
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-md px-md py-sm font-label-md text-label-md text-left transition-all ${
                    isActive
                      ? 'bg-secondary-container text-on-secondary-container font-bold rounded-lg scale-[0.98]'
                      : 'text-on-surface-variant hover:bg-surface-container-high rounded-lg'
                  }`}
                >
                  <span className={`material-symbols-outlined ${isActive ? 'fill-icon' : ''}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ÁREA DIRECCIÓN */}
        {isDirectorVisible && (
          <div className="space-y-base pt-sm border-t border-outline-variant/20">
            <span className="px-md text-[10px] font-bold text-error/60 tracking-wider uppercase block">
              ÁREA DIRECCIÓN
            </span>
            {directorItems.map((item) => {
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-md px-md py-sm font-label-md text-label-md text-left transition-all ${
                    isActive
                      ? 'bg-red-50 text-error font-bold rounded-lg scale-[0.98] border border-red-200'
                      : 'text-on-surface-variant hover:bg-red-50/20 rounded-lg'
                  }`}
                >
                  <span className={`material-symbols-outlined ${isActive ? 'fill-icon' : ''}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ÁREA JUECES */}
        {isJuezVisible && (
          <div className="space-y-base pt-sm border-t border-outline-variant/20">
            <span className="px-md text-[10px] font-bold text-blue-700/60 tracking-wider uppercase block">
              ÁREA JUECES
            </span>
            {juezItems.map((item) => {
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-md px-md py-sm font-label-md text-label-md text-left transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-800 font-bold rounded-lg scale-[0.98] border border-blue-200'
                      : 'text-on-surface-variant hover:bg-blue-50/20 rounded-lg'
                  }`}
                >
                  <span className={`material-symbols-outlined ${isActive ? 'fill-icon' : ''}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ÁREA SISTEMAS (ADMIN) */}
        {isAdminVisible && (
          <div className="space-y-base pt-sm border-t border-outline-variant/20">
            <span className="px-md text-[10px] font-bold text-violet-700/60 tracking-wider uppercase block">
              ÁREA ADMINISTRACIÓN
            </span>
            {adminItems.map((item) => {
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-md px-md py-sm font-label-md text-label-md text-left transition-all ${
                    isActive
                      ? 'bg-violet-50 text-violet-800 font-bold rounded-lg scale-[0.98] border border-violet-200'
                      : 'text-on-surface-variant hover:bg-violet-50/20 rounded-lg'
                  }`}
                >
                  <span className={`material-symbols-outlined ${isActive ? 'fill-icon' : ''}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="mt-auto pt-md border-t border-outline-variant space-y-base shrink-0">
        <div className="px-md py-sm font-label-sm text-label-sm text-on-surface-variant italic">
          Normativa FMK 2017
        </div>
      </div>
    </aside>
  );
};
