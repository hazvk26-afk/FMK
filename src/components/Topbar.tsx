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
  const sectionTitles: { [key: string]: [string, string] } = {
    dashboard: ['Dashboard', 'Estado general del ciclo de grados y próximas acciones.'],
    validator: ['Validador de requisitos', 'Comprobación de edad, permanencia y licencias federativas.'],
    exams: ['Estructura de exámenes', 'Convocatorias oficiales, sedes, tribunales y cupos.'],
    enrollment: ['Inscripción', 'Flujo guiado para presentar una solicitud de examen.'],
    katas: ['Biblioteca de katas', 'Material técnico asociado a cada grado según reglamento.'],
    fees: ['Tasas', 'Tarifas federativas y conciliaciones.'],
    history: ['History', 'Grados oficiales, certificados y auditoría personal.'],
    admin: ['Administración', 'Panel de administración exclusivo de Dirección FMK.'],
  };

  const title = sectionTitles[currentSection] ? sectionTitles[currentSection][0] : 'FMK Grados';
  const subtitle = sectionTitles[currentSection] ? sectionTitles[currentSection][1] : '';

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant w-full h-16 flex items-center justify-between px-lg max-w-container-max mx-auto shrink-0">
      <div>
        <h2 className="text-md font-bold text-primary">{title}</h2>
        <p className="text-[11px] text-on-surface-variant opacity-70 hidden md:block">{subtitle}</p>
      </div>

      <div className="flex items-center gap-md">
        {/* Session Status chip */}
        <span className="text-xs text-on-surface-variant bg-surface-container border border-outline-variant px-sm py-1 rounded-full shrink-0">
          {sessionEmail ? `Sesión: ${sessionEmail}` : 'Sin sesión conectada'}
        </span>

        {/* Role switch toggle (Simulación) */}
        <div className="flex items-center border border-outline-variant rounded bg-white overflow-hidden text-xs shrink-0 shadow-sm">
          <button
            onClick={() => setRoleMode('aspirante')}
            className={`px-sm py-1 font-semibold transition-colors ${
              roleMode === 'aspirante'
                ? 'bg-secondary text-white font-bold'
                : 'text-on-surface hover:bg-surface-container-low'
            }`}
          >
            Aspirante
          </button>
          <button
            onClick={() => setRoleMode('director')}
            className={`px-sm py-1 font-semibold transition-colors ${
              roleMode === 'director'
                ? 'bg-secondary text-white font-bold'
                : 'text-on-surface hover:bg-surface-container-low'
            }`}
          >
            Director
          </button>
        </div>

        {sessionEmail && (
          <button
            onClick={onLogout}
            className="text-xs font-bold text-primary hover:underline px-sm py-1 shrink-0"
            type="button"
          >
            Salir
          </button>
        )}
      </div>
    </header>
  );
};
