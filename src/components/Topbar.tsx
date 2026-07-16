import React from 'react';
import type { UserRole } from '../types';

interface TopbarProps {
  currentSection: string;
  sessionEmail: string | null;
  roleMode: UserRole;
  setRoleMode: (role: UserRole) => void;
  onLogout: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentSection,
  sessionEmail,
  roleMode,
  setRoleMode,
  onLogout,
}) => {
  const sectionTitles: { [key: string]: string } = {
    dashboard: 'FMK - Inicio (Aspirante)',
    validator: 'FMK - Validador de Requisitos',
    enrollment: 'FMK - Mis Inscripciones',
    katas: 'FMK - Biblioteca de Katas',
    fees: 'FMK - Mis Tasas y Pagos',
    history: 'FMK - Historial Técnico',
    admin_dashboard: 'FMK - Directorio Oficial de Federados',
    admin_enrollments: 'FMK - Aprobación de Solicitudes y Documentos',
    admin_exams: 'FMK - Convocar Examen Oficial',
    admin_clubs: 'FMK - Gestión de Clubes Deportivos',
    admin_rules: 'FMK - Editor de Normativas',
    juez_exams: 'FMK - Calificaciones y Actas de Examen',
    system_users: 'FMK - Cuentas de Usuario y Habilitación',
    system_docs: 'FMK - Descarga y Exportación de Expedientes',
  };

  const title = sectionTitles[currentSection] || 'FMK - Sistema de Grados';

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-outline-variant w-full h-16 flex items-center justify-between px-lg max-w-container-max mx-auto shrink-0">
      <div className="flex items-center gap-md">
        <h2 className="font-headline-md text-headline-md font-bold text-primary">{title}</h2>
      </div>

      <div className="flex items-center gap-lg">
        <div className="flex items-center gap-md">
          {sessionEmail && (
            <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low px-sm py-[2px] rounded border border-outline-variant">
              {sessionEmail}
            </span>
          )}

          {/* Simulated role switcher toggle for 4 roles */}
          <div className="flex items-center border border-outline-variant rounded-full overflow-hidden bg-white text-[11px] shadow-sm shrink-0">
            <button
              onClick={() => setRoleMode('aspirante')}
              className={`px-sm py-[3px] font-semibold transition-colors ${
                roleMode === 'aspirante'
                  ? 'bg-secondary text-white font-bold'
                  : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              Aspirante
            </button>
            <button
              onClick={() => setRoleMode('director')}
              className={`px-sm py-[3px] font-semibold transition-colors ${
                roleMode === 'director'
                  ? 'bg-secondary text-white font-bold'
                  : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              Director
            </button>
            <button
              onClick={() => setRoleMode('juez')}
              className={`px-sm py-[3px] font-semibold transition-colors ${
                roleMode === 'juez'
                  ? 'bg-secondary text-white font-bold'
                  : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              Juez
            </button>
            <button
              onClick={() => setRoleMode('administrador')}
              className={`px-sm py-[3px] font-semibold transition-colors ${
                roleMode === 'administrador'
                  ? 'bg-secondary text-white font-bold'
                  : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              Admin
            </button>
          </div>

          {sessionEmail && (
            <button
              onClick={onLogout}
              className="font-label-md text-label-md font-bold text-primary hover:underline"
              type="button"
            >
              Salir
            </button>
          )}

          {/* Prototype notification icons */}
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors shrink-0">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors shrink-0">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </div>
    </header>
  );
};
