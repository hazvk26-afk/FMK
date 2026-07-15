import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { UserRole, Profile, Grado, ValidationResult } from '../types';

interface ValidatorPanelProps {
  roleMode: UserRole;
  userProfile: Profile | null;
  onNavigate: (section: string) => void;
}

export const ValidatorPanel: React.FC<ValidatorPanelProps> = ({ roleMode, userProfile, onNavigate }) => {
  // Selectors
  const [currentGradeId, setCurrentGradeId] = useState<string>('marron');
  const [targetGradeId, setTargetGradeId] = useState<string>('1dan');
  
  // Search state for Director
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFederado, setSelectedFederado] = useState<any | null>(null);
  
  // Database data
  const [dbGrades, setDbGrades] = useState<Grado[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [rpcWarning, setRpcWarning] = useState<boolean>(false);

  // Static fallback data for local verification (Normativa 2017)
  const localGrades = [
    { id: 'marron', nombre: 'Cinturón Marrón', orden: 6 },
    { id: '1dan', nombre: '1º DAN', orden: 7 },
    { id: '2dan', nombre: '2º DAN', orden: 8 },
    { id: '3dan', nombre: '3º DAN', orden: 9 },
    { id: '4dan', nombre: '4º DAN', orden: 10 }
  ];

  const localRequirements: { [key: string]: { prev: string; age: number; years: number; licenses: number; label: string } } = {
    '1dan': { prev: 'marron', age: 16, years: 1, licenses: 3, label: '1º DAN' },
    '2dan': { prev: '1dan', age: 18, years: 2, licenses: 2, label: '2º DAN' },
    '3dan': { prev: '2dan', age: 21, years: 3, licenses: 3, label: '3º DAN' },
    '4dan': { prev: '3dan', age: 25, years: 4, licenses: 4, label: '4º DAN' }
  };

  // Cargar grados de la base de datos
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const { data, error } = await supabase
          .from('grados')
          .select('*')
          .order('orden', { ascending: true });
        if (!error && data) {
          setDbGrades(data);
        }
      } catch (err) {
        console.error('Error fetching grades:', err);
      }
    };
    fetchGrades();
  }, []);

  // Al cambiar el rol o perfil, sincronizar
  useEffect(() => {
    if (roleMode === 'aspirante') {
      setSelectedFederado(null);
      setSearchQuery('');
      setSearchResults([]);
      if (userProfile?.current_grado_id) {
        setCurrentGradeId(userProfile.current_grado_id);
      } else {
        setCurrentGradeId('marron');
      }
    }
  }, [roleMode, userProfile]);

  // Ejecutar validación al cambiar grados, perfil o federado seleccionado
  useEffect(() => {
    runValidation();
  }, [currentGradeId, targetGradeId, selectedFederado, roleMode, userProfile]);

  // Ejecutar validación
  const runValidation = async () => {
    setLoading(true);
    setRpcWarning(false);
    
    const activeFederadoId = roleMode === 'director' 
      ? selectedFederado?.id 
      : userProfile?.id;

    if (!activeFederadoId) {
      // Si no hay sesión o federado seleccionado, correr simulación con valores locales
      runLocalSimulation();
      setLoading(false);
      return;
    }

    try {
      // 1. Invocar la función de validación oficial RPC en base de datos
      const { data, error } = await supabase.rpc('fn_validar_elegibilidad', {
        p_federado_id: activeFederadoId,
        p_grado_objetivo_id: targetGradeId,
        p_fecha_referencia: new Date().toISOString()
      });

      if (!error && data) {
        setValidation(data);
      } else {
        // Fallback local con aviso de TODO
        console.warn('Supabase RPC fn_validar_elegibilidad falló o no existe. Usando cálculo de fallback local.', error);
        setRpcWarning(true);
        await runLocalFallback(activeFederadoId);
      }
    } catch (err) {
      console.warn('Excepción de red al invocar RPC. Usando cálculo local.', err);
      setRpcWarning(true);
      await runLocalFallback(activeFederadoId);
    } finally {
      setLoading(false);
    }
  };

  // Validación local offline/simulada si no hay usuario o datos
  const runLocalSimulation = () => {
    const rule = localRequirements[targetGradeId] || localRequirements['1dan'];
    const currentName = dbGrades.find(g => g.id === currentGradeId)?.nombre || localGrades.find(g => g.id === currentGradeId)?.nombre || currentGradeId;
    const prevName = dbGrades.find(g => g.id === rule.prev)?.nombre || localGrades.find(g => g.id === rule.prev)?.nombre || rule.prev;

    // Simulación por defecto
    const seqOk = currentGradeId === rule.prev;
    const ageOk = 24 >= rule.age;
    const yearsOk = 1.5 >= rule.years;
    const licensesOk = 3 >= rule.licenses;

    setValidation({
      apto: seqOk && ageOk && yearsOk && licensesOk,
      datos_completos: true,
      progresion_secuencial: {
        apto: seqOk,
        actual_id: currentGradeId,
        requerido_id: rule.prev,
        actual_nombre: currentName,
        requerido_nombre: prevName
      },
      edad: {
        apto: ageOk,
        actual: 24,
        requerido: rule.age
      },
      permanencia: {
        apto: yearsOk,
        actual: 1.5,
        requerido: rule.years
      },
      licencias: {
        apto: licensesOk,
        actual: 3,
        consecutivas_requeridas: rule.licenses,
        alternas_requeridas: rule.licenses + 1
      },
      grado_objetivo_nombre: rule.label
    });
  };

  // Fallback local calculando en base a datos reales del perfil y licencias cargados
  const runLocalFallback = async (federadoId: string) => {
    // Cargar perfil y licencias para simular
    let profileData: any = null;
    if (federadoId === userProfile?.id) {
      profileData = userProfile;
    } else {
      const { data } = await supabase.from('profiles').select('*').eq('id', federadoId).maybeSingle();
      profileData = data;
    }

    if (!profileData) {
      runLocalSimulation();
      return;
    }

    // Contar licencias válidas en base de datos
    const { count } = await supabase
      .from('licencias_federativas')
      .select('*', { count: 'exact', head: true })
      .eq('federado_id', federadoId)
      .neq('estado', 'anulada');

    const rule = localRequirements[targetGradeId] || localRequirements['1dan'];
    const currentName = dbGrades.find(g => g.id === currentGradeId)?.nombre || localGrades.find(g => g.id === currentGradeId)?.nombre || currentGradeId;
    const prevName = dbGrades.find(g => g.id === rule.prev)?.nombre || localGrades.find(g => g.id === rule.prev)?.nombre || rule.prev;

    // Calcular edad y permanencia
    const age = profileData.birth_date 
      ? Math.floor((new Date().getTime() - new Date(profileData.birth_date).getTime()) / 31557600000)
      : 0;
      
    const permanence = profileData.current_grado_since
      ? Math.round(((new Date().getTime() - new Date(profileData.current_grado_since).getTime()) / 31557600000) * 10) / 10
      : 0.0;

    const licenseCount = count || 0;

    const seqOk = currentGradeId === rule.prev;
    const ageOk = age >= rule.age;
    const yearsOk = permanence >= rule.years;
    const licensesOk = licenseCount >= rule.licenses;

    setValidation({
      apto: seqOk && ageOk && yearsOk && licensesOk,
      datos_completos: !!profileData.birth_date && !!profileData.current_grado_since,
      progresion_secuencial: {
        apto: seqOk,
        actual_id: currentGradeId,
        requerido_id: rule.prev,
        actual_nombre: currentName,
        requerido_nombre: prevName
      },
      edad: {
        apto: ageOk,
        actual: age,
        requerido: rule.age
      },
      permanencia: {
        apto: yearsOk,
        actual: permanence,
        requerido: rule.years
      },
      licencias: {
        apto: licensesOk,
        actual: licenseCount,
        consecutivas_requeridas: rule.licenses,
        alternas_requeridas: rule.licenses + 1
      },
      grado_objetivo_nombre: rule.label
    });
  };

  // Buscar deportistas (Rol director)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, license_number, current_grado_id')
        .or(`full_name.ilike.%${searchQuery}%,dni_nie.ilike.%${searchQuery}%,license_number.ilike.%${searchQuery}%`)
        .limit(5);

      if (!error && data) {
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Error searching:', err);
    }
  };

  // Seleccionar federado buscado
  const selectFederado = (profile: any) => {
    setSelectedFederado(profile);
    setSearchResults([]);
    setSearchQuery('');
    if (profile.current_grado_id) {
      setCurrentGradeId(profile.current_grado_id);
    }
  };

  // Descarga de Certificado (Mock)
  const handleDownloadCert = () => {
    alert('Generando y descargando Certificado de Elegibilidad en PDF desde Supabase Edge Function...');
  };

  // Iniciar Inscripción (Navegación al wizard)
  const handleStartEnrollment = () => {
    onNavigate('enrollment');
  };

  // Tooltip simple
  const renderTooltip = (text: string) => {
    return (
      <span 
        className="underline decoration-primary cursor-help italic font-medium relative group"
      >
        katas obligatorios
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-neutral-800 text-white text-[10px] p-2 rounded shadow-lg max-w-[200px] leading-relaxed font-sans normal-case z-20">
          {text}
        </span>
      </span>
    );
  };

  return (
    <div className="space-y-gutter">
      {/* TODO Warning for local simulation fallback */}
      {rpcWarning && (
        <div className="bg-amber-50 border border-amber-300 rounded p-sm text-amber-800 text-xs flex items-center gap-sm">
          <span className="material-symbols-outlined text-sm font-bold">warning</span>
          <span>
            <strong>Nota técnica (TODO):</strong> La validación se está calculando en local (JS) como fallback. 
            La validación definitiva en producción debe ejecutarse mediante la función SQL RPC <code>fn_validar_elegibilidad</code>.
          </span>
        </div>
      )}

      {/* Buscador para director */}
      {roleMode === 'director' && (
        <div className="bg-surface-container-low border border-outline-variant p-lg rounded-xl space-y-md">
          <div className="flex items-center gap-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">search</span>
            <span className="text-xs font-bold">Búsqueda de deportista federado (Director)</span>
          </div>
          <div className="flex gap-md max-w-xl">
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              type="text" 
              className="flex-1 bg-white border border-outline-variant p-md rounded text-xs focus:border-primary-container focus:ring-0" 
              placeholder="Buscar por Nombre, DNI/NIE o Licencia..." 
            />
            <button 
              onClick={handleSearch}
              className="bg-primary text-white text-xs font-bold py-sm px-lg rounded hover:bg-primary-container transition-all shrink-0" 
              type="button"
            >
              Buscar
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="border border-outline-variant rounded bg-white divide-y divide-outline-variant max-h-40 overflow-y-auto">
              {searchResults.map((profile) => (
                <div 
                  key={profile.id}
                  onClick={() => selectFederado(profile)}
                  className="p-sm hover:bg-surface-container cursor-pointer text-xs flex justify-between items-center"
                >
                  <strong>{profile.full_name}</strong>
                  <span className="text-on-surface-variant text-[11px]">Licencia: {profile.license_number || 'N/A'}</span>
                </div>
              ))}
            </div>
          )}

          {selectedFederado && (
            <div className="text-xs font-semibold text-primary flex items-center gap-sm">
              <span className="material-symbols-outlined text-sm">person</span>
              <span>Deportista seleccionado: {selectedFederado.full_name} ({selectedFederado.license_number || 'Sin Licencia'})</span>
            </div>
          )}
        </div>
      )}

      {/* Grid principal */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Selectores y Requisitos */}
        <div className="col-span-12 lg:col-span-8 space-y-gutter">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            
            {/* Grado Actual */}
            <div className="bg-surface-container-low border border-outline-variant p-lg rounded-xl">
              <div className="flex items-center gap-sm mb-md text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">military_tech</span>
                <span className="text-xs font-bold">Grado actual</span>
              </div>
              <select 
                value={currentGradeId}
                onChange={(e) => setCurrentGradeId(e.target.value)}
                disabled={roleMode === 'aspirante'}
                className="w-full bg-white border border-outline-variant p-md rounded text-sm font-semibold text-on-surface focus:border-primary-container focus:ring-0 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <option value="marron">Cinturón Marrón</option>
                <option value="1dan">1º DAN</option>
                <option value="2dan">2º DAN</option>
                <option value="3dan">3º DAN</option>
              </select>
            </div>

            {/* Grado Objetivo */}
            <div className="bg-surface-container-low border border-outline-variant p-lg rounded-xl">
              <div className="flex items-center gap-sm mb-md text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">stars</span>
                <span className="text-xs font-bold">Grado objetivo</span>
              </div>
              <select 
                value={targetGradeId}
                onChange={(e) => setTargetGradeId(e.target.value)}
                className="w-full bg-white border border-outline-variant p-md rounded text-sm font-semibold text-on-surface focus:border-primary-container focus:ring-0 transition-all"
              >
                <option value="1dan">1º DAN</option>
                <option value="2dan">2º DAN</option>
                <option value="3dan">3º DAN</option>
                <option value="4dan">4º DAN</option>
              </select>
            </div>
          </div>

          {/* Listado de Requisitos con barras de progreso */}
          {validation && (
            <div className="bg-[#F0F0F0] border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="bg-surface-container-high px-lg py-md border-b border-outline-variant">
                <h4 className="text-sm font-bold text-primary">Análisis de requisitos</h4>
              </div>
              <div className="p-lg space-y-lg">
                
                {/* Progresión secuencial */}
                <div className="space-y-sm">
                  <div className="flex justify-between items-center mb-sm">
                    <div className="flex items-center gap-md">
                      <div className={`w-8 h-8 rounded-full ${validation.progresion_secuencial.apto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} flex items-center justify-center shrink-0`}>
                        <span className="material-symbols-outlined text-sm font-bold">
                          {validation.progresion_secuencial.apto ? 'check' : 'close'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold">Progresión secuencial</span>
                    </div>
                    <div className={`${validation.progresion_secuencial.apto ? 'bg-green-600' : 'bg-red-600'} text-white text-[9px] font-bold px-sm py-[2px] rounded-full uppercase`}>
                      {validation.progresion_secuencial.apto ? 'Apto' : 'No Apto'}
                    </div>
                  </div>
                  <div className="h-2 w-full bg-white border border-outline-variant rounded-full overflow-hidden">
                    <div className={`h-full ${validation.progresion_secuencial.apto ? 'bg-green-600' : 'bg-red-600'}`} style={{ width: validation.progresion_secuencial.apto ? '100%' : '0%' }}></div>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-xs">
                    Actual: {validation.progresion_secuencial.actual_nombre} | Requerido previo: {validation.progresion_secuencial.requerido_nombre}
                  </p>
                </div>

                {/* Edad Mínima */}
                <div className="space-y-sm">
                  <div className="flex justify-between items-center mb-sm">
                    <div className="flex items-center gap-md">
                      <div className={`w-8 h-8 rounded-full ${validation.edad.apto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} flex items-center justify-center shrink-0`}>
                        <span className="material-symbols-outlined text-sm font-bold">
                          {validation.edad.apto ? 'check' : 'close'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold">Edad mínima requerida</span>
                    </div>
                    <div className={`${validation.edad.apto ? 'bg-green-600' : 'bg-red-600'} text-white text-[9px] font-bold px-sm py-[2px] rounded-full uppercase`}>
                      {validation.edad.apto ? 'Apto' : 'No Apto'}
                    </div>
                  </div>
                  <div className="h-2 w-full bg-white border border-outline-variant rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${validation.edad.apto ? 'bg-green-600' : 'bg-red-600'}`} 
                      style={{ width: `${Math.min(100, Math.round((validation.edad.actual / validation.edad.requerido) * 100))}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-xs">
                    Actual: {validation.edad.actual} años | Requerido: {validation.edad.requerido} años cumplidos
                  </p>
                </div>

                {/* Permanencia */}
                <div className="space-y-sm">
                  <div className="flex justify-between items-center mb-sm">
                    <div className="flex items-center gap-md">
                      <div className={`w-8 h-8 rounded-full ${validation.permanencia.apto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} flex items-center justify-center shrink-0`}>
                        <span className="material-symbols-outlined text-sm font-bold">
                          {validation.permanencia.apto ? 'check' : 'close'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold">Permanencia en grado</span>
                    </div>
                    <div className={`${validation.permanencia.apto ? 'bg-green-600' : 'bg-red-600'} text-white text-[9px] font-bold px-sm py-[2px] rounded-full uppercase`}>
                      {validation.permanencia.apto ? 'Apto' : 'No Apto'}
                    </div>
                  </div>
                  <div className="h-2 w-full bg-white border border-outline-variant rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${validation.permanencia.apto ? 'bg-green-600' : 'bg-red-600'}`} 
                      style={{ width: `${Math.min(100, Math.round((validation.permanencia.actual / validation.permanencia.requerido) * 100))}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-xs">
                    Actual: {validation.permanencia.actual.toFixed(1)} años | Requerido: {validation.permanencia.requerido} años mínimos
                  </p>
                </div>

                {/* Licencias */}
                <div className="space-y-sm">
                  <div className="flex justify-between items-center mb-sm">
                    <div className="flex items-center gap-md">
                      <div className={`w-8 h-8 rounded-full ${validation.licencias.apto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} flex items-center justify-center shrink-0`}>
                        <span className="material-symbols-outlined text-sm font-bold">
                          {validation.licencias.apto ? 'check' : 'close'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold">Licencias federativas</span>
                    </div>
                    <div className={`${validation.licencias.apto ? 'bg-green-600' : 'bg-red-600'} text-white text-[9px] font-bold px-sm py-[2px] rounded-full uppercase`}>
                      {validation.licencias.apto ? 'Apto' : 'No Apto'}
                    </div>
                  </div>
                  <div className="h-2 w-full bg-white border border-outline-variant rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${validation.licencias.apto ? 'bg-green-600' : 'bg-red-600'}`} 
                      style={{ width: `${Math.min(100, Math.round((validation.licencias.actual / validation.licencias.consecutivas_requeridas) * 100))}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-xs">
                    Actual: {validation.licencias.actual} licencias | Requerido: {validation.licencias.consecutivas_requeridas} consecutivas o {validation.licencias.alternas_requeridas} alternas
                  </p>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Tarjeta de Estado Final Bento (Columna Derecha) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
          {validation && (
            <div 
              className={`rounded-xl p-lg flex flex-col items-center justify-center text-center text-white min-h-[300px] relative overflow-hidden group transition-colors duration-300 ${
                !validation.datos_completos 
                  ? 'bg-amber-500' 
                  : validation.apto 
                    ? 'bg-green-600' 
                    : 'bg-red-600'
              }`}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="material-symbols-outlined text-6xl mb-md fill-icon opacity-30 absolute top-4 right-4">
                {!validation.datos_completos 
                  ? 'info' 
                  : validation.apto 
                    ? 'check_circle' 
                    : 'cancel'}
              </span>
              
              <div className="z-10 flex flex-col w-full">
                <span className="text-[10px] tracking-widest uppercase opacity-80 mb-sm block">Estado final</span>
                <h5 className="text-lg font-bold leading-tight mb-lg">
                  {!validation.datos_completos 
                    ? 'PENDIENTE DE VERIFICAR' 
                    : validation.apto 
                      ? 'APTO PARA PRESENTARSE' 
                      : 'NO APTO'}
                </h5>
                <p className="text-xs opacity-90 max-w-[200px] mx-auto mb-lg">
                  {!validation.datos_completos 
                    ? 'Faltan completar algunos datos del deportista en Supabase para validar.' 
                    : validation.apto 
                      ? `El federado cumple con todos los requisitos para presentarse al examen de ${validation.grado_objetivo_nombre}.`
                      : 'No cumple con las cuotas requeridas en la Normativa de Grados vigente.'}
                </p>

                <button 
                  onClick={handleDownloadCert}
                  disabled={loading || !validation.apto}
                  className="bg-white text-neutral-800 font-bold text-xs px-lg py-md rounded hover:bg-surface-container-lowest transition-all scale-100 active:scale-95 shadow-md w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Cargando...' : 'Descargar Certificado'}
                </button>
                
                <button 
                  onClick={handleStartEnrollment}
                  disabled={!validation.apto}
                  className="mt-md w-full bg-primary-container text-white font-bold text-xs px-lg py-md rounded hover:bg-primary transition-all scale-100 active:scale-95 shadow-md flex items-center justify-center gap-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm">how_to_reg</span>
                  Iniciar Inscripción
                </button>
              </div>
            </div>
          )}

          {/* Dojo Image Card */}
          <div className="bg-surface-container-low border border-outline-variant p-lg rounded-xl flex-1 flex flex-col items-center justify-center">
            <div className="w-full h-40 relative rounded-lg overflow-hidden mb-md">
              <img 
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" 
                alt="Karate Dojo" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBeTIfUIdhe_f7ArVyGVjwhLQKmkLE828threYh_Ku5cf0P78Vp_nomtMreCr-4H2aAT2v88dugiAkdHy-hMRb9vl37xkJkTq-5Dhulbt_8Cc04lDUtFhfjIn0117GYRWUMeeyabfo7N4O9sHBoxhr29dzH5pqThlX2TznmZBvHME6nIGGfeldMq4O4FAzsy1cX6yhHfjIggAvR7aEM6VXvpOlH7LiYo6JbAqO1eKfNFz8Urm9NkaJRn-_6EqsonUKeYGvr6G0dO_o_" 
              />
            </div>
            <h6 className="text-sm font-bold text-center">Protocolo de examen</h6>
            <p className="text-xs text-on-surface-variant text-center mt-xs">
              Recuerda consultar la lista de {renderTooltip("Katas obligatorios son las formas preestablecidas de movimientos que el aspirante debe ejecutar correctamente ante el tribunal federativo.")} para tu grado objetivo.
            </p>
          </div>
        </div>

        {/* Tabla Maestra de Requisitos */}
        <div className="col-span-12 mt-lg">
          <div className="bg-[#F0F0F0] border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="bg-surface-container-high px-lg py-md border-b border-outline-variant flex justify-between items-center">
              <h4 className="text-sm font-bold text-primary">Tabla Maestra de Requisitos (Normativa 2017)</h4>
              <span className="bg-surface px-sm py-1 rounded text-[10px] border border-outline-variant">1º - 10º DAN</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container text-on-surface text-xs font-bold border-b border-outline-variant">
                    <th className="p-md border-r border-outline-variant">GRADO OBJETIVO</th>
                    <th className="p-md border-r border-outline-variant">EDAD MÍNIMA</th>
                    <th className="p-md border-r border-outline-variant">PERMANENCIA EN GRADO</th>
                    <th className="p-md border-r border-outline-variant">LICENCIAS REQUERIDAS</th>
                    <th className="p-md">OBSERVACIONES</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-outline-variant">
                  <tr className="hover:bg-surface-container transition-colors">
                    <td className="p-md border-r border-outline-variant font-bold">1º DAN</td>
                    <td className="p-md border-r border-outline-variant">16 años</td>
                    <td className="p-md border-r border-outline-variant">1 año en Marrón</td>
                    <td className="p-md border-r border-outline-variant">3 consecutivas o 4 alternas</td>
                    <td className="p-md italic text-on-surface-variant">Edad cumplida el día del examen.</td>
                  </tr>
                  <tr className="bg-white/40 hover:bg-surface-container transition-colors">
                    <td className="p-md border-r border-outline-variant font-bold">2º DAN</td>
                    <td className="p-md border-r border-outline-variant">18 años</td>
                    <td className="p-md border-r border-outline-variant">2 años en 1º DAN</td>
                    <td className="p-md border-r border-outline-variant">2 consecutivas o 3 alternas</td>
                    <td className="p-md italic text-on-surface-variant">Presentar justificante de grado anterior.</td>
                  </tr>
                  <tr className="hover:bg-surface-container transition-colors">
                    <td className="p-md border-r border-outline-variant font-bold">3º DAN</td>
                    <td className="p-md border-r border-outline-variant">21 años</td>
                    <td className="p-md border-r border-outline-variant">3 años en 2º DAN</td>
                    <td className="p-md border-r border-outline-variant">3 consecutivas o 4 alternas</td>
                    <td className="p-md italic text-on-surface-variant">—</td>
                  </tr>
                  <tr className="bg-white/40 hover:bg-surface-container transition-colors">
                    <td className="p-md border-r border-outline-variant font-bold">4º DAN</td>
                    <td className="p-md border-r border-outline-variant">25 años</td>
                    <td className="p-md border-r border-outline-variant">4 años en 3º DAN</td>
                    <td className="p-md border-r border-outline-variant">4 consecutivas o 5 alternas</td>
                    <td className="p-md italic text-on-surface-variant">Posibilidad de méritos deportivos.</td>
                  </tr>
                  <tr className="hover:bg-surface-container transition-colors">
                    <td className="p-md border-r border-outline-variant font-bold">5º DAN</td>
                    <td className="p-md border-r border-outline-variant">30 años</td>
                    <td className="p-md border-r border-outline-variant">5 años en 4º DAN</td>
                    <td className="p-md border-r border-outline-variant">5 consecutivas o 6 alternas</td>
                    <td className="p-md italic text-on-surface-variant">Evaluación ante Tribunal Nacional.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="bg-surface-container-low border-t border-outline-variant py-sm px-lg mt-xl flex flex-col sm:flex-row justify-between items-center gap-sm shrink-0">
        <div className="flex items-center gap-md">
          <span className="material-symbols-outlined text-sm text-primary">info</span>
          <p className="text-[11px] text-on-surface-variant italic">Última actualización de normativa: 12 de Junio 2017</p>
        </div>
        <div className="flex gap-lg">
          <a className="text-[11px] text-primary hover:underline" href="#">Ver Normativa Completa (PDF)</a>
          <a className="text-[11px] text-primary hover:underline" href="#">Contacto Tribunal</a>
        </div>
      </footer>
    </div>
  );
};
