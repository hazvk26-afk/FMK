import { useState, useEffect } from 'react';
import { databases, account, APPWRITE_CONFIG } from './services/appwrite';
import { Query, ID } from 'appwrite';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ValidatorPanel } from './pages/ValidatorPanel';
import type { UserRole, Profile, Examen, Inscripcion, Kata, Pago } from './types';

function App() {
  const [currentSection, setCurrentSection] = useState<string>('dashboard');
  const [roleMode, setRoleMode] = useState<UserRole>('aspirante');
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  
  // Auth Form State
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authMessage, setAuthMessage] = useState<string>('Ingresa credenciales válidas para conectar con el backend de Appwrite.');
  const [authType, setAuthType] = useState<'ok' | 'error' | ''>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('Sin sesión');
  const [connectionClass, setConnectionClass] = useState<string>('bg-amber-100 text-amber-700');

  // Appwrite Data State
  const [loadedExams, setLoadedExams] = useState<Examen[]>([]);
  const [loadedEnrollments, setLoadedEnrollments] = useState<Inscripcion[]>([]);
  const [loadedAdminEnrollments, setLoadedAdminEnrollments] = useState<Inscripcion[]>([]);
  const [loadedKatas, setLoadedKatas] = useState<Kata[]>([]);
  const [loadedPayments, setLoadedPayments] = useState<Pago[]>([]);

  // Monitor de sesión de Appwrite
  useEffect(() => {
    account.get()
      .then((user) => {
        handleSession(user);
      })
      .catch(() => {
        handleSession(null);
      });
  }, []);

  const handleSession = async (user: any) => {
    setSessionUser(user);

    if (user) {
      setConnectionStatus('Conectado');
      setConnectionClass('bg-green-100 text-green-700');
      
      try {
        // Cargar perfil desde colección "profiles"
        const response = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.profiles,
          [Query.equal('id', user.$id)]
        );

        const profileDoc = response.documents[0] as any;
        if (profileDoc) {
          const prof: Profile = {
            id: profileDoc.id,
            role: profileDoc.role as UserRole,
            full_name: profileDoc.full_name,
            dni_nie: profileDoc.dni_nie,
            birth_date: profileDoc.birth_date,
            phone: profileDoc.phone,
            club_id: null,
            license_number: profileDoc.license_number,
            current_grado_id: profileDoc.current_grado_id,
            current_grado_since: profileDoc.current_grado_since,
            avatar_url: null,
            active: profileDoc.active,
            created_at: profileDoc.$createdAt,
            updated_at: profileDoc.$updatedAt
          };
          setUserProfile(prof);
          setRoleMode(prof.role);
        } else {
          throw new Error('Perfil no encontrado');
        }
      } catch (err) {
        // Fallback profile
        const fallbackProf: Profile = {
          id: user.$id,
          role: 'aspirante',
          full_name: user.name || user.email,
          dni_nie: null,
          birth_date: '2000-01-01',
          phone: null,
          club_id: null,
          license_number: 'LIC-10029',
          current_grado_id: 'marron',
          current_grado_since: '2025-01-01',
          avatar_url: null,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setUserProfile(fallbackProf);
        setRoleMode('aspirante');
      }

      await loadAppwriteData(user.$id);
    } else {
      setUserProfile(null);
      setConnectionStatus('Sin sesión');
      setConnectionClass('bg-amber-100 text-amber-700');
      setRoleMode('aspirante');
      
      // Limpiar datos
      setLoadedExams([]);
      setLoadedEnrollments([]);
      setLoadedAdminEnrollments([]);
      setLoadedKatas([]);
      setLoadedPayments([]);
    }
  };

  const loadAppwriteData = async (userId: string) => {
    try {
      const [examsRes, enrollmentsRes, allEnrollmentsRes, katasRes, paymentsRes] = await Promise.all([
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.examenes, [Query.orderAsc('fecha')]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.inscripciones, [Query.equal('federado_id', userId)]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.inscripciones, [Query.limit(100)]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.katas, [Query.orderAsc('nombre')]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.pagos, [Query.orderDesc('created_at')]).catch(() => ({ documents: [] }))
      ]);

      setLoadedExams(
        examsRes.documents.map((doc: any) => ({
          id: doc.$id,
          grado_objetivo_id: doc.grado_objetivo_id,
          fecha: doc.fecha,
          sede: doc.sede,
          tribunal: doc.tribunal,
          cupo_maximo: doc.cupo_maximo,
          estado: doc.estado,
          fecha_limite_inscripcion: null
        }))
      );

      const mappedEnrollments: Inscripcion[] = enrollmentsRes.documents.map((doc: any) => ({
        id: doc.$id,
        federado_id: doc.federado_id,
        examen_id: doc.examen_id,
        estado: doc.estado,
        resultado: doc.resultado,
        validacion_snapshot: doc.validacion_snapshot ? JSON.parse(doc.validacion_snapshot) : null,
        fecha_inscripcion: doc.fecha_inscripcion,
        created_at: doc.$createdAt
      }));
      setLoadedEnrollments(mappedEnrollments);

      setLoadedAdminEnrollments(
        allEnrollmentsRes.documents.map((doc: any) => ({
          id: doc.$id,
          federado_id: doc.federado_id,
          examen_id: doc.examen_id,
          estado: doc.estado,
          resultado: doc.resultado,
          validacion_snapshot: doc.validacion_snapshot ? JSON.parse(doc.validacion_snapshot) : null,
          fecha_inscripcion: doc.fecha_inscripcion,
          created_at: doc.$createdAt,
          profiles: {
            full_name: doc.federado_name || doc.federado_id,
            license_number: doc.license_number || 'N/A'
          }
        }))
      );

      setLoadedKatas(
        katasRes.documents.map((doc: any) => ({
          id: doc.$id,
          nombre: doc.nombre,
          grado_id: doc.grado_id,
          tipo: doc.tipo,
          descripcion: doc.descripcion,
          video_url: null,
          origen: null
        }))
      );

      setLoadedPayments(
        paymentsRes.documents.map((doc: any) => ({
          id: doc.$id,
          inscripcion_id: doc.inscripcion_id,
          tasa_id: null,
          importe: doc.importe,
          metodo: 'tarjeta',
          estado: doc.estado,
          referencia: doc.referencia,
          referencia_externa: null,
          fecha_pago: doc.created_at,
          created_at: doc.$createdAt
        }))
      );

    } catch (err) {
      console.error('Error cargando datos desde Appwrite:', err);
    }
  };

  // Auth actions
  const handleSignUp = async () => {
    setAuthMessage('Registrando...');
    setAuthType('');
    
    try {
      const generatedId = ID.unique();
      // Crear cuenta
      await account.create(generatedId, email, password, fullName || email);
      
      // Crear perfil por defecto en la colección "profiles"
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.profiles,
        ID.unique(),
        {
          id: generatedId,
          role: 'aspirante',
          full_name: fullName || email,
          license_number: 'LIC-' + Math.floor(10000 + Math.random() * 90000),
          current_grado_id: 'marron',
          current_grado_since: '2025-01-01',
          birth_date: '2000-01-01',
          active: true
        }
      );

      setAuthMessage('Registro exitoso. Inicia sesión para continuar.');
      setAuthType('ok');
    } catch (error: any) {
      setAuthMessage('Error: ' + error.message);
      setAuthType('error');
    }
  };

  const handleSignIn = async () => {
    setAuthMessage('Ingresando...');
    setAuthType('');
    
    try {
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      await handleSession(user);
      setAuthMessage('Sesión iniciada con éxito.');
      setAuthType('ok');
    } catch (error: any) {
      setAuthMessage('Error al ingresar: ' + error.message);
      setAuthType('error');
    }
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      await handleSession(null);
      alert('Sesión cerrada.');
    } catch (err: any) {
      alert('Error al cerrar sesión: ' + err.message);
    }
  };

  const handleEnrollInExam = async (examId: string) => {
    if (!sessionUser) {
      alert('Debes iniciar sesión para inscribirte.');
      setCurrentSection('dashboard');
      return;
    }

    try {
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.inscripciones,
        ID.unique(),
        {
          federado_id: sessionUser.$id,
          examen_id: examId,
          estado: 'pendiente_documentacion',
          resultado: 'pendiente',
          validacion_snapshot: JSON.stringify({
            origen: 'appwrite_react_app',
            fecha: new Date().toISOString()
          }),
          fecha_inscripcion: new Date().toISOString()
        }
      );
      
      alert('Inscripción creada con éxito.');
      await loadAppwriteData(sessionUser.$id);
      setCurrentSection('enrollment');
    } catch (error: any) {
      alert('Error en inscripción: ' + error.message);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex overflow-hidden font-sans">
      {/* Navigation Sidebar */}
      <Sidebar currentSection={currentSection} setSection={setCurrentSection} roleMode={roleMode} />

      {/* Main Container */}
      <main className="flex-1 ml-[64px] lg:ml-[260px] h-screen overflow-y-auto flex flex-col transition-all duration-300">
        
        {/* Top bar header */}
        <Topbar
          currentSection={currentSection}
          sessionEmail={sessionUser?.email || null}
          roleMode={roleMode}
          setRoleMode={setRoleMode}
          onLogout={handleLogout}
        />

        {/* Dynamic section display */}
        <div className="flex-1 p-lg max-w-container-max w-full mx-auto space-y-gutter">
          
          {/* 1. DASHBOARD */}
          {currentSection === 'dashboard' && (
            <section className="space-y-gutter">
              {/* Promo Banner */}
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
                <div>
                  <h3 className="text-lg font-bold text-primary">Validación de requisitos (Appwrite)</h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    El sistema cruza edad, permanencia, licencias y grado previo para confirmar la elegibilidad usando Appwrite.
                  </p>
                </div>
                <button 
                  onClick={() => setCurrentSection('validator')}
                  className="bg-primary text-white text-xs font-bold px-lg py-md rounded hover:bg-primary-container transition-all"
                >
                  Abrir validador
                </button>
              </div>

              {/* Login Panel */}
              {!sessionUser && (
                <div className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
                  <div className="flex justify-between items-center border-b border-outline-variant pb-sm">
                    <div>
                      <h4 className="text-sm font-bold">Acceso conectado a Appwrite</h4>
                      <p className="text-xs text-on-surface-variant mt-1">Registra un usuario o inicia sesión para conectarte en tiempo real.</p>
                    </div>
                    <span className={`text-xs font-bold px-sm py-[2px] rounded-full ${connectionClass}`}>
                      {connectionStatus}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-md items-end">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface-variant">Nombre completo</label>
                      <input 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        type="text" 
                        className="w-full bg-white border border-outline-variant p-sm rounded text-xs" 
                        placeholder="Nombre y apellidos" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface-variant">Email</label>
                      <input 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email" 
                        className="w-full bg-white border border-outline-variant p-sm rounded text-xs" 
                        placeholder="usuario@email.com" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface-variant">Contraseña</label>
                      <input 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password" 
                        className="w-full bg-white border border-outline-variant p-sm rounded text-xs" 
                        placeholder="Mínimo 8 caracteres" 
                      />
                    </div>
                    <div className="flex gap-sm">
                      <button onClick={handleSignUp} className="flex-1 bg-primary text-white text-xs font-bold py-sm px-md rounded hover:bg-primary-container transition-all">Registrar</button>
                      <button onClick={handleSignIn} className="flex-1 bg-white border border-outline text-xs font-bold py-sm px-md rounded hover:bg-surface-container transition-all">Entrar</button>
                    </div>
                  </div>
                  <p className={`text-xs mt-xs ${authType === 'error' ? 'text-error font-bold' : authType === 'ok' ? 'text-green-700 font-bold' : 'text-on-surface-variant'}`}>
                    {authMessage}
                  </p>
                </div>
              )}

              {/* KPIs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
                <div className="bg-white border border-outline-variant rounded-xl p-md flex flex-col justify-between min-h-[110px]">
                  <span className="text-xs text-on-surface-variant">Convocatorias abiertas</span>
                  <strong className="text-2xl font-extrabold text-primary">4</strong>
                  <small className="text-green-700 text-[10px] font-bold">2 con plazas disponibles</small>
                </div>
                <div className="bg-white border border-outline-variant rounded-xl p-md flex flex-col justify-between min-h-[110px]">
                  <span className="text-xs text-on-surface-variant">Inscripciones activas</span>
                  <strong className="text-2xl font-extrabold text-primary">{loadedEnrollments.length || 18}</strong>
                  <small className="text-amber-700 text-[10px] font-bold">6 requieren revisión</small>
                </div>
                <div className="bg-white border border-outline-variant rounded-xl p-md flex flex-col justify-between min-h-[110px]">
                  <span className="text-xs text-on-surface-variant">Pagos conciliados</span>
                  <strong className="text-2xl font-extrabold text-primary">91%</strong>
                  <small className="text-green-700 text-[10px] font-bold">+8% esta semana</small>
                </div>
                <div className="bg-white border border-outline-variant rounded-xl p-md flex flex-col justify-between min-h-[110px]">
                  <span className="text-xs text-on-surface-variant">Diplomas emitidos</span>
                  <strong className="text-2xl font-extrabold text-primary">126</strong>
                  <small className="text-on-surface-variant opacity-70 text-[10px]">Temporada 2025-26</small>
                </div>
              </div>
            </section>
          )}

          {/* 2. VALIDATOR PAGE */}
          {currentSection === 'validator' && (
            <ValidatorPanel 
              roleMode={roleMode}
              userProfile={userProfile}
              onNavigate={setCurrentSection}
            />
          )}

          {/* 3. EXAMS */}
          {currentSection === 'exams' && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <div className="flex justify-between items-center border-b border-outline-variant pb-sm">
                <div>
                  <h3 className="text-sm font-bold">Convocatorias de examen</h3>
                  <p className="text-xs text-on-surface-variant mt-1">Convocatorias oficiales vigentes.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-container text-on-surface font-bold border-b border-outline-variant">
                      <th className="p-md">Grado</th>
                      <th className="p-md">Fecha</th>
                      <th className="p-md">Sede</th>
                      <th className="p-md">Cupo</th>
                      <th className="p-md">Estado</th>
                      <th className="p-md">Tribunal</th>
                      <th className="p-md">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadedExams.length > 0 ? (
                      loadedExams.map((exam) => (
                        <tr key={exam.id} className="border-b border-outline-variant hover:bg-surface-container transition-colors">
                          <td className="p-md font-bold">{exam.grado_objetivo_id}</td>
                          <td className="p-md">{new Date(exam.fecha).toLocaleDateString('es-ES')}</td>
                          <td className="p-md">{exam.sede}</td>
                          <td className="p-md">0 / {exam.cupo_maximo || 50}</td>
                          <td className="p-md">
                            <span className={`px-sm py-[2px] rounded-full text-[9px] font-bold uppercase ${exam.estado === 'abierta' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-error'}`}>
                              {exam.estado}
                            </span>
                          </td>
                          <td className="p-md">{exam.tribunal || 'Pendiente'}</td>
                          <td className="p-md">
                            <button
                              onClick={() => handleEnrollInExam(exam.id)}
                              disabled={exam.estado !== 'abierta'}
                              className="bg-primary text-white text-[10px] font-bold px-sm py-1 rounded hover:bg-primary-container disabled:opacity-50"
                            >
                              Inscribirse
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-md text-center">No hay exámenes registrados. Inicia sesión o crea la base de datos Appwrite.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 4. ENROLLMENT (Wizard) */}
          {currentSection === 'enrollment' && (
            <section className="space-y-gutter">
              <div className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
                <h3 className="text-sm font-bold">Wizard de inscripción</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
                  <div className="bg-green-50 border border-green-300 rounded p-md flex flex-col justify-between min-h-[70px]">
                    <span className="text-xs font-bold text-green-700">✓ 1. Requisitos</span>
                    <small className="text-[10px] text-green-600">Elegibilidad confirmada</small>
                  </div>
                  <div className="bg-secondary-fixed border border-secondary text-on-secondary-container rounded p-md flex flex-col justify-between min-h-[70px]">
                    <span className="text-xs font-bold">2. Documentación</span>
                    <small className="text-[10px]">DNI y Licencia subidos</small>
                  </div>
                  <div className="bg-white border border-outline-variant rounded p-md flex flex-col justify-between min-h-[70px]">
                    <span className="text-xs font-bold text-on-surface-variant">3. Tasas</span>
                    <small className="text-[10px] text-on-surface-variant">Pago administrativo</small>
                  </div>
                  <div className="bg-white border border-outline-variant rounded p-md flex flex-col justify-between min-h-[70px]">
                    <span className="text-xs font-bold text-on-surface-variant">4. Envío</span>
                    <small className="text-[10px] text-on-surface-variant">Revisión de Director</small>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
                <h3 className="text-sm font-bold">Mis solicitudes registradas</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-container text-on-surface font-bold border-b border-outline-variant">
                        <th className="p-md">Grado</th>
                        <th className="p-md">Estado</th>
                        <th className="p-md">Resultado</th>
                        <th className="p-md">Fecha de inscripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadedEnrollments.length > 0 ? (
                        loadedEnrollments.map((enroll) => (
                          <tr key={enroll.id} className="border-b border-outline-variant hover:bg-surface-container transition-colors">
                            <td className="p-md font-bold">{enroll.examen_id}</td>
                            <td className="p-md">
                              <span className="px-sm py-[2px] rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700">
                                {enroll.estado.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-md">
                              <span className="px-sm py-[2px] rounded-full text-[9px] font-bold uppercase bg-neutral-100 text-neutral-700">
                                {enroll.resultado || 'pendiente'}
                              </span>
                            </td>
                            <td className="p-md">{new Date(enroll.fecha_inscripcion || enroll.created_at).toLocaleDateString('es-ES')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-md text-center">No tienes inscripciones guardadas aún.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* 5. KATA LIBRARY */}
          {currentSection === 'katas' && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <h3 className="text-sm font-bold">Biblioteca de katas reglamentarios</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                {loadedKatas.length > 0 ? (
                  loadedKatas.map((kata) => (
                    <div key={kata.id} className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
                      <div className="p-md bg-surface-container-low border-b border-outline-variant">
                        <h4 className="text-xs font-bold italic text-primary">{kata.nombre}</h4>
                        <span className="text-[10px] text-on-surface-variant font-medium">Shotokan</span>
                      </div>
                      <div className="p-md flex-1">
                        <p className="text-xs text-on-surface-variant">{kata.descripcion}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center text-xs p-md">Biblioteca de katas vacía. Configura la base de datos Appwrite.</div>
                )}
              </div>
            </section>
          )}

          {/* 6. FEES */}
          {currentSection === 'fees' && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <h3 className="text-sm font-bold">Tasas federativas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-container text-on-surface font-bold border-b border-outline-variant">
                      <th className="p-md">Importe</th>
                      <th className="p-md">Estado</th>
                      <th className="p-md">Referencia</th>
                      <th className="p-md">Fecha de emisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadedPayments.length > 0 ? (
                      loadedPayments.map((p) => (
                        <tr key={p.id} className="border-b border-outline-variant hover:bg-surface-container transition-colors">
                          <td className="p-md font-bold">{p.importe.toFixed(2)} €</td>
                          <td className="p-md">
                            <span className="px-sm py-[2px] rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700">
                              {p.estado}
                            </span>
                          </td>
                          <td className="p-md">{p.referencia || 'N/A'}</td>
                          <td className="p-md">{new Date(p.created_at).toLocaleDateString('es-ES')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-md text-center">No hay pagos registrados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 7. HISTORY */}
          {currentSection === 'history' && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <h3 className="text-sm font-bold">Historial federativo</h3>
              <div className="relative border-l border-outline-variant ml-md pl-md space-y-md py-sm">
                {loadedEnrollments.map((enroll) => (
                  <div key={enroll.id} className="relative pl-lg pb-md">
                    <div className="absolute -left-[25px] top-1 w-8 h-8 rounded-full bg-white border border-outline flex items-center justify-center text-primary shadow-sm">
                      <span className="material-symbols-outlined text-sm font-bold">verified</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-on-background">Inscripción a examen</h4>
                      <p className="text-[11px] text-on-surface-variant mt-xs">Resultado: {enroll.resultado || 'pendiente'}</p>
                      <span className="text-[9px] text-on-surface-variant opacity-70 block mt-xs">{new Date(enroll.created_at).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 8. ADMIN SECTION */}
          {currentSection === 'admin' && roleMode === 'director' && (
            <section className="space-y-gutter">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                <div className="bg-white border border-outline-variant rounded-xl p-md space-y-sm">
                  <h4 className="text-xs font-bold">Usuarios y clubes</h4>
                  <p className="text-[11px] text-on-surface-variant">Gestión de deportistas federados y roles en Appwrite.</p>
                </div>
                <div className="bg-white border border-outline-variant rounded-xl p-md space-y-sm">
                  <h4 className="text-xs font-bold">Edición de Normativa</h4>
                  <p className="text-[11px] text-on-surface-variant">Versionado de requisitos sin alterar inscripciones cerradas.</p>
                </div>
                <div className="bg-white border border-outline-variant rounded-xl p-md space-y-sm">
                  <h4 className="text-xs font-bold">Registro de Auditoría</h4>
                  <p className="text-[11px] text-on-surface-variant">Historial inmutable de logs administrativos.</p>
                </div>
              </div>

              <div className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
                <h3 className="text-sm font-bold">Revisión de inscripciones</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-container text-on-surface font-bold border-b border-outline-variant">
                        <th className="p-md">Aspirante</th>
                        <th className="p-md">Grado objetivo</th>
                        <th className="p-md">Estado</th>
                        <th className="p-md">Resultado</th>
                        <th className="p-md">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadedAdminEnrollments.length > 0 ? (
                        loadedAdminEnrollments.map((enroll) => (
                          <tr key={enroll.id} className="border-b border-outline-variant hover:bg-surface-container transition-colors">
                            <td className="p-md font-semibold">{enroll.profiles?.full_name || enroll.federado_id}</td>
                            <td className="p-md">{enroll.examen_id}</td>
                            <td className="p-md">{enroll.estado}</td>
                            <td className="p-md">{enroll.resultado || 'pendiente'}</td>
                            <td className="p-md">
                              <button
                                onClick={async () => {
                                  try {
                                    await databases.updateDocument(
                                      APPWRITE_CONFIG.databaseId,
                                      APPWRITE_CONFIG.collections.inscripciones,
                                      enroll.id,
                                      { estado: 'aprobada', resultado: 'apto' }
                                    );
                                    alert('Aprobado con éxito');
                                    if (sessionUser) await loadAppwriteData(sessionUser.$id);
                                  } catch (err: any) {
                                    alert('Error al aprobar: ' + err.message);
                                  }
                                }}
                                className="bg-secondary text-white text-[10px] font-bold px-sm py-1 rounded hover:bg-secondary-container"
                              >
                                Aprobar examen
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-md text-center">No hay inscripciones para revisar.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
