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
  const [authMessage, setAuthMessage] = useState<string>('Ingresa credenciales para conectar con el backend de Appwrite.');
  const [authType, setAuthType] = useState<'ok' | 'error' | ''>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('Sin sesión');
  const [connectionClass, setConnectionClass] = useState<string>('bg-amber-100 text-amber-700');

  // Appwrite Data State
  const [loadedExams, setLoadedExams] = useState<Examen[]>([]);
  const [loadedEnrollments, setLoadedEnrollments] = useState<Inscripcion[]>([]);
  const [loadedAdminEnrollments, setLoadedAdminEnrollments] = useState<Inscripcion[]>([]);
  const [loadedKatas, setLoadedKatas] = useState<Kata[]>([]);
  const [loadedPayments, setLoadedPayments] = useState<Pago[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  // Wizard state for enrollment
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [docDniUploaded, setDocDniUploaded] = useState<boolean>(false);
  const [docLicUploaded, setDocLicUploaded] = useState<boolean>(false);

  // New Exam Form State
  const [newExamGrade, setNewExamGrade] = useState<string>('1dan');
  const [newExamDate, setNewExamDate] = useState<string>('');
  const [newExamSede, setNewExamSede] = useState<string>('');
  const [newExamTribunal, setNewExamTribunal] = useState<string>('');
  const [newExamCupo, setNewExamCupo] = useState<number>(30);

  // New Rule Form State (Admin)
  const [selectedRuleGrade, setSelectedRuleGrade] = useState<string>('1dan');
  const [ruleAge, setRuleAge] = useState<number>(16);
  const [ruleYears, setRuleYears] = useState<number>(1);
  const [ruleLicenses, setRuleLicenses] = useState<number>(3);

  // Kata search state
  const [kataQuery, setKataQuery] = useState<string>('');
  const [selectedKataGrade, setSelectedKataGrade] = useState<string>('all');

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
      
      setLoadedExams([]);
      setLoadedEnrollments([]);
      setLoadedAdminEnrollments([]);
      setLoadedKatas([]);
      setLoadedPayments([]);
      setAllProfiles([]);
    }
  };

  const loadAppwriteData = async (userId: string) => {
    try {
      const [examsRes, enrollmentsRes, allEnrollmentsRes, katasRes, paymentsRes, profilesRes] = await Promise.all([
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.examenes, [Query.limit(100)]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.inscripciones, [Query.equal('federado_id', userId)]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.inscripciones, [Query.limit(100)]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.katas, [Query.limit(100)]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.pagos, [Query.limit(100)]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.profiles, [Query.limit(100)]).catch(() => ({ documents: [] }))
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

      setAllProfiles(
        profilesRes.documents.map((doc: any) => ({
          id: doc.id || doc.$id,
          role: doc.role,
          full_name: doc.full_name,
          dni_nie: doc.dni_nie,
          birth_date: doc.birth_date,
          phone: doc.phone,
          club_id: null,
          license_number: doc.license_number,
          current_grado_id: doc.current_grado_id,
          current_grado_since: doc.current_grado_since,
          avatar_url: null,
          active: doc.active,
          created_at: doc.$createdAt,
          updated_at: doc.$updatedAt
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
      await account.create(generatedId, email, password, fullName || email);
      
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

  // Enviar inscripción oficial
  const handleSubmitEnrollment = async () => {
    if (!selectedExamId) {
      alert('Por favor selecciona una convocatoria.');
      return;
    }

    try {
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.inscripciones,
        ID.unique(),
        {
          federado_id: sessionUser.$id,
          examen_id: selectedExamId,
          estado: 'pendiente_pago',
          resultado: 'pendiente',
          validacion_snapshot: JSON.stringify({
            origen: 'appwrite_wizard',
            fecha: new Date().toISOString(),
            verificacion: 'apto'
          }),
          fecha_inscripcion: new Date().toISOString()
        }
      );

      // Crear tasa de pago mock
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.pagos,
        ID.unique(),
        {
          inscripcion_id: selectedExamId,
          importe: 50.00,
          estado: 'pendiente',
          referencia: 'REF-' + Math.floor(100000 + Math.random() * 900000),
          created_at: new Date().toISOString()
        }
      );

      alert('Solicitud enviada. Ahora procede al pago en "Mis Tasas y Pagos".');
      setWizardStep(1);
      setSelectedExamId('');
      setDocDniUploaded(false);
      setDocLicUploaded(false);
      
      await loadAppwriteData(sessionUser.$id);
      setCurrentSection('fees');
    } catch (error: any) {
      alert('Error en inscripción: ' + error.message);
    }
  };

  // Simular pago
  const handlePayFee = async (paymentId: string) => {
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.pagos,
        paymentId,
        { estado: 'pagado' }
      );
      alert('Pago procesado con éxito en la pasarela.');
      await loadAppwriteData(sessionUser.$id);
    } catch (error: any) {
      alert('Error al procesar pago: ' + error.message);
    }
  };

  // Convocar examen (Director)
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamDate || !newExamSede) {
      alert('Rellena la fecha y sede.');
      return;
    }

    try {
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.examenes,
        ID.unique(),
        {
          grado_objetivo_id: newExamGrade,
          fecha: newExamDate,
          sede: newExamSede,
          tribunal: newExamTribunal || 'Pendiente',
          cupo_maximo: newExamCupo,
          estado: 'abierta'
        }
      );
      alert('Nueva convocatoria publicada con éxito.');
      setNewExamDate('');
      setNewExamSede('');
      setNewExamTribunal('');
      await loadAppwriteData(sessionUser.$id);
    } catch (error: any) {
      alert('Error publicando examen: ' + error.message);
    }
  };

  // Guardar normativa
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Normativa para ${selectedRuleGrade} actualizada a: Edad=${ruleAge}, Permanencia=${ruleYears} año(s), Licencias=${ruleLicenses}.`);
  };

  // Aprobar inscripción (Director)
  const handleApproveEnrollment = async (enrollId: string) => {
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.inscripciones,
        enrollId,
        { estado: 'aprobada', resultado: 'apto' }
      );
      alert('Solicitud aprobada y marcada como APTO.');
      await loadAppwriteData(sessionUser.$id);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  // Rechazar inscripción (Director)
  const handleRejectEnrollment = async (enrollId: string) => {
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.inscripciones,
        enrollId,
        { estado: 'rechazada', resultado: 'no_apto' }
      );
      alert('Solicitud rechazada.');
      await loadAppwriteData(sessionUser.$id);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  // Filtrado de Katas
  const filteredKatas = loadedKatas.filter(k => {
    const matchesQuery = k.nombre.toLowerCase().includes(kataQuery.toLowerCase()) || 
                         (k.descripcion && k.descripcion.toLowerCase().includes(kataQuery.toLowerCase()));
    const matchesGrade = selectedKataGrade === 'all' || k.grado_id === selectedKataGrade;
    return matchesQuery && matchesGrade;
  });

  return (
    <div className="bg-background text-on-background min-h-screen flex overflow-hidden font-sans">
      {/* Navigation Sidebar */}
      <Sidebar currentSection={currentSection} setSection={setCurrentSection} roleMode={roleMode} />

      {/* Main Container */}
      <main className="flex-1 ml-[260px] h-screen overflow-y-auto flex flex-col transition-all duration-300">
        
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
          
          {/* ==================== ÁREA ASPIRANTE ==================== */}

          {/* 1. DASHBOARD ASPIRANTE */}
          {currentSection === 'dashboard' && (
            <section className="space-y-gutter">
              {/* Promo Banner */}
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
                <div>
                  <h3 className="font-headline-md text-headline-md text-primary">Portal del Deportista (Appwrite)</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                    Aquí puedes verificar tu elegibilidad técnica, gestionar tus inscripciones oficiales y realizar pagos de tasas.
                  </p>
                </div>
                <button 
                  onClick={() => setCurrentSection('validator')}
                  className="bg-primary text-white font-bold text-xs px-lg py-md rounded-lg hover:bg-primary-container transition-all"
                >
                  Abrir Validador
                </button>
              </div>

              {/* Login Panel */}
              {!sessionUser && (
                <div className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
                  <div className="flex justify-between items-center border-b border-outline-variant pb-sm">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm font-bold">Conexión con Appwrite</h4>
                      <p className="font-body-md text-body-md text-on-surface-variant mt-1">Crea una cuenta o ingresa credenciales de prueba.</p>
                    </div>
                    <span className={`text-[11px] font-bold px-sm py-[2px] rounded-full ${connectionClass}`}>
                      {connectionStatus}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-md items-end">
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-on-surface-variant">Nombre completo</label>
                      <input 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        type="text" 
                        className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                        placeholder="Nombre y apellidos" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-on-surface-variant">Email</label>
                      <input 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email" 
                        className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                        placeholder="usuario@email.com" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-on-surface-variant">Contraseña</label>
                      <input 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password" 
                        className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                        placeholder="Mínimo 8 caracteres" 
                      />
                    </div>
                    <div className="flex gap-sm">
                      <button onClick={handleSignUp} className="flex-1 bg-primary text-white font-bold text-xs py-sm px-md rounded-lg hover:bg-primary-container transition-all">Registrar</button>
                      <button onClick={handleSignIn} className="flex-1 bg-white border border-outline text-xs font-bold py-sm px-md rounded-lg hover:bg-surface-container transition-all">Entrar</button>
                    </div>
                  </div>
                  <p className={`text-xs mt-xs ${authType === 'error' ? 'text-error font-bold' : authType === 'ok' ? 'text-green-700 font-bold' : 'text-on-surface-variant'}`}>
                    {authMessage}
                  </p>
                </div>
              )}

              {/* Grid de Estado del Deportista */}
              {sessionUser && userProfile && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                  <div className="bg-surface-container-low border border-outline-variant p-lg rounded-xl space-y-sm">
                    <div className="flex items-center gap-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">badge</span>
                      <span className="font-label-md text-label-md">PERFIL FEDERATIVO</span>
                    </div>
                    <h4 className="font-headline-sm text-headline-sm font-bold">{userProfile.full_name}</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant">Licencia: <strong>{userProfile.license_number}</strong></p>
                    <p className="font-body-md text-body-md text-on-surface-variant">DNI/NIE: {userProfile.dni_nie || 'Pendiente registrar'}</p>
                  </div>
                  
                  <div className="bg-surface-container-low border border-outline-variant p-lg rounded-xl space-y-sm">
                    <div className="flex items-center gap-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">military_tech</span>
                      <span className="font-label-md text-label-md">GRADO ACTUAL</span>
                    </div>
                    <h4 className="font-headline-sm text-headline-sm font-bold text-primary">Cinturón Marrón</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant">Fecha obtención: <strong>01/01/2025</strong></p>
                    <p className="font-body-md text-body-md text-on-surface-variant">Permanencia: 1.5 años</p>
                  </div>

                  <div className="bg-surface-container-low border border-outline-variant p-lg rounded-xl space-y-sm">
                    <div className="flex items-center gap-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                      <span className="font-label-md text-label-md">PASOS PARA EL EXAMEN</span>
                    </div>
                    <ul className="text-xs space-y-xs font-medium text-on-surface-variant">
                      <li className="flex items-center gap-sm">
                        <span className="material-symbols-outlined text-green-700 text-xs font-bold">check</span> 
                        <span>Validar requisitos (Apto)</span>
                      </li>
                      <li className="flex items-center gap-sm">
                        <span className="material-symbols-outlined text-amber-700 text-xs font-bold">circle</span> 
                        <span>Cargar documentación</span>
                      </li>
                      <li className="flex items-center gap-sm">
                        <span className="material-symbols-outlined text-neutral-400 text-xs">circle</span> 
                        <span>Realizar pago de tasas</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 2. VALIDADOR DE REQUISITOS (Compartido) */}
          {currentSection === 'validator' && (
            <ValidatorPanel 
              roleMode={roleMode}
              userProfile={userProfile}
              onNavigate={setCurrentSection}
            />
          )}

          {/* 3. MIS INSCRIPCIONES (Wizard de Inscripciones) */}
          {currentSection === 'enrollment' && (
            <section className="space-y-gutter">
              {/* Wizard Steps Card */}
              <div className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
                <div className="flex justify-between items-center border-b border-outline-variant pb-sm">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Formulario de Inscripción Oficial</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-1">Completa los 4 pasos para inscribirte a una convocatoria de exámenes.</p>
                  </div>
                  <span className="bg-secondary-container text-on-secondary-container text-xs font-bold px-sm py-[2px] rounded-full">
                    Paso {wizardStep} de 4
                  </span>
                </div>

                {/* Step indicators */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-md text-xs font-bold">
                  <div className={`p-md rounded border ${wizardStep >= 1 ? 'bg-green-50 border-green-300 text-green-700' : 'bg-surface-container border-outline-variant text-on-surface-variant'}`}>
                    1. Requisitos
                  </div>
                  <div className={`p-md rounded border ${wizardStep >= 2 ? 'bg-green-50 border-green-300 text-green-700' : 'bg-surface-container border-outline-variant text-on-surface-variant'}`}>
                    2. Convocatoria
                  </div>
                  <div className={`p-md rounded border ${wizardStep >= 3 ? 'bg-green-50 border-green-300 text-green-700' : 'bg-surface-container border-outline-variant text-on-surface-variant'}`}>
                    3. Documentos
                  </div>
                  <div className={`p-md rounded border ${wizardStep >= 4 ? 'bg-green-50 border-green-300 text-green-700' : 'bg-surface-container border-outline-variant text-on-surface-variant'}`}>
                    4. Confirmar
                  </div>
                </div>

                {/* Step content */}
                <div className="py-md">
                  {wizardStep === 1 && (
                    <div className="space-y-md">
                      <p className="font-body-md text-body-md">Antes de continuar, debes asegurarte de cumplir con las cuotas normativas de edad, licencias y permanencia mínima.</p>
                      <div className="bg-green-50 border border-green-300 text-green-800 text-xs p-md rounded flex items-center gap-sm">
                        <span className="material-symbols-outlined font-bold">check_circle</span>
                        <span>Se ha validado tu perfil. Cumples con los requisitos para presentarte a examen de <strong>1º DAN</strong>.</span>
                      </div>
                      <button onClick={() => setWizardStep(2)} className="bg-primary text-white text-xs font-bold px-lg py-md rounded-lg hover:bg-primary-container">
                        Continuar a Convocatoria
                      </button>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="space-y-md">
                      <label className="font-label-md text-label-md block">Selecciona la convocatoria a inscribirte:</label>
                      <select 
                        value={selectedExamId}
                        onChange={(e) => setSelectedExamId(e.target.value)}
                        className="w-full bg-white border border-outline-variant p-md rounded text-xs font-semibold"
                      >
                        <option value="">-- Selecciona Convocatoria --</option>
                        {loadedExams.map(exam => (
                          <option key={exam.id} value={exam.id}>
                            {exam.grado_objetivo_id} - Sede: {exam.sede} (Fecha: {new Date(exam.fecha).toLocaleDateString('es-ES')})
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-sm">
                        <button onClick={() => setWizardStep(1)} className="bg-white border border-outline text-xs font-bold px-lg py-md rounded-lg">Atrás</button>
                        <button onClick={() => selectedExamId ? setWizardStep(3) : alert('Selecciona examen')} className="bg-primary text-white text-xs font-bold px-lg py-md rounded-lg">Siguiente</button>
                      </div>
                    </div>
                  )}

                  {wizardStep === 3 && (
                    <div className="space-y-md">
                      <p className="font-body-md text-body-md">Debes subir copias en formato digital de los siguientes documentos obligatorios:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                        <div className="border border-outline-variant p-md rounded bg-surface-container-low flex justify-between items-center">
                          <div>
                            <h5 className="font-headline-sm text-headline-sm font-bold text-xs">Copia DNI / NIE</h5>
                            <span className="text-[10px] text-on-surface-variant">{docDniUploaded ? '✓ dni_digital.pdf cargado' : 'Falta cargar'}</span>
                          </div>
                          <button onClick={() => setDocDniUploaded(true)} className="bg-white border border-outline text-[10px] font-bold py-1 px-sm rounded">Subir Mock</button>
                        </div>

                        <div className="border border-outline-variant p-md rounded bg-surface-container-low flex justify-between items-center">
                          <div>
                            <h5 className="font-headline-sm text-headline-sm font-bold text-xs">Licencia Federativa (PDF)</h5>
                            <span className="text-[10px] text-on-surface-variant">{docLicUploaded ? '✓ licencias_2026.pdf cargado' : 'Falta cargar'}</span>
                          </div>
                          <button onClick={() => setDocLicUploaded(true)} className="bg-white border border-outline text-[10px] font-bold py-1 px-sm rounded">Subir Mock</button>
                        </div>
                      </div>
                      <div className="flex gap-sm">
                        <button onClick={() => setWizardStep(2)} className="bg-white border border-outline text-xs font-bold px-lg py-md rounded-lg">Atrás</button>
                        <button onClick={() => (docDniUploaded && docLicUploaded) ? setWizardStep(4) : alert('Sube ambos documentos')} className="bg-primary text-white text-xs font-bold px-lg py-md rounded-lg">Siguiente</button>
                      </div>
                    </div>
                  )}

                  {wizardStep === 4 && (
                    <div className="space-y-md">
                      <p className="font-body-md text-body-md">Confirma que la información declarada y los documentos aportados son veraces.</p>
                      <div className="bg-surface-container-low p-md rounded border border-outline-variant text-xs space-y-xs">
                        <p><strong>Aspirante:</strong> {userProfile?.full_name}</p>
                        <p><strong>Convocatoria ID:</strong> {selectedExamId}</p>
                        <p><strong>Documentación:</strong> Completa (DNI + Licencias)</p>
                      </div>
                      <div className="flex gap-sm">
                        <button onClick={() => setWizardStep(3)} className="bg-white border border-outline text-xs font-bold px-lg py-md rounded-lg">Atrás</button>
                        <button onClick={handleSubmitEnrollment} className="bg-green-600 text-white text-xs font-bold px-lg py-md rounded-lg">Enviar Solicitud</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Solicitudes del usuario */}
              <div className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
                <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Mis solicitudes registradas</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-container text-on-surface font-label-md text-label-md border-b border-outline-variant">
                        <th className="p-md">Convocatoria</th>
                        <th className="p-md">Estado Solicitud</th>
                        <th className="p-md">Resultado Examen</th>
                        <th className="p-md">Fecha Solicitud</th>
                      </tr>
                    </thead>
                    <tbody className="font-body-md text-body-md divide-y divide-outline-variant">
                      {loadedEnrollments.length > 0 ? (
                        loadedEnrollments.map((enroll) => (
                          <tr key={enroll.id} className="hover:bg-surface-container-lowest transition-colors">
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

          {/* 4. BIBLIOTECA DE KATAS */}
          {currentSection === 'katas' && (
            <section className="space-y-gutter">
              <div className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
                <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Biblioteca de Katas Oficiales</h3>
                <div className="flex gap-md max-w-xl">
                  <input 
                    value={kataQuery}
                    onChange={(e) => setKataQuery(e.target.value)}
                    type="text" 
                    className="flex-1 bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                    placeholder="Filtrar por nombre o descripción de kata..." 
                  />
                  <select 
                    value={selectedKataGrade}
                    onChange={(e) => setSelectedKataGrade(e.target.value)}
                    className="bg-white border border-outline-variant p-sm rounded text-xs font-semibold"
                  >
                    <option value="all">Todos los grados</option>
                    <option value="1dan">1º DAN</option>
                    <option value="2dan">2º DAN</option>
                    <option value="3dan">3º DAN</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                  {filteredKatas.length > 0 ? (
                    filteredKatas.map((kata) => (
                      <div key={kata.id} className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
                        <div className="p-md bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                          <h4 className="font-headline-sm text-headline-sm font-bold italic text-primary">{kata.nombre}</h4>
                          <span className="bg-primary/10 text-primary text-[9px] font-bold px-sm py-[2px] rounded-full uppercase">
                            {kata.grado_id}
                          </span>
                        </div>
                        <div className="p-md flex-1">
                          <p className="font-body-md text-body-md text-on-surface-variant">{kata.descripcion}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-center text-xs p-md">
                      No se encontraron katas que coincidan con la búsqueda.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* 5. TASAS Y PAGOS */}
          {currentSection === 'fees' && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Tasas Administrativas y Pagos</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-container text-on-surface font-label-md text-label-md border-b border-outline-variant">
                      <th className="p-md">Importe Tasa</th>
                      <th className="p-md">Referencia Pago</th>
                      <th className="p-md">Estado Tasa</th>
                      <th className="p-md">Fecha de Emisión</th>
                      <th className="p-md">Acción Pasarela</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-body-md divide-y divide-outline-variant">
                    {loadedPayments.length > 0 ? (
                      loadedPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="p-md font-bold text-primary">{p.importe.toFixed(2)} €</td>
                          <td className="p-md">{p.referencia || 'N/A'}</td>
                          <td className="p-md">
                            <span className={`px-sm py-[2px] rounded-full text-[9px] font-bold uppercase ${p.estado === 'pagado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {p.estado}
                            </span>
                          </td>
                          <td className="p-md">{new Date(p.created_at).toLocaleDateString('es-ES')}</td>
                          <td className="p-md">
                            {p.estado === 'pendiente' && (
                              <button 
                                onClick={() => handlePayFee(p.id)}
                                className="bg-primary text-white text-[10px] font-bold px-sm py-1 rounded hover:bg-primary-container"
                              >
                                Pagar (Simular)
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-md text-center">No hay cargos de tasas administrativas pendientes.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 6. HISTORIAL TÉCNICO */}
          {currentSection === 'history' && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Historial Técnico e Inmutable</h3>
              <div className="relative border-l border-outline-variant ml-md pl-md space-y-md py-sm">
                <div className="relative pl-lg pb-md">
                  <div className="absolute -left-[25px] top-1 w-8 h-8 rounded-full bg-white border border-outline flex items-center justify-center text-primary shadow-sm">
                    <span className="material-symbols-outlined text-sm font-bold">verified</span>
                  </div>
                  <div>
                    <h4 className="font-headline-sm text-headline-sm font-bold text-on-background">Grado Cinturón Marrón obtenido</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Acreditación: FMK-10029 | Convocatoria: Club Dojo Central</p>
                    <span className="text-[10px] text-on-surface-variant opacity-70 block mt-xs">01/01/2025</span>
                  </div>
                </div>

                {loadedEnrollments.map((enroll) => (
                  <div key={enroll.id} className="relative pl-lg pb-md">
                    <div className="absolute -left-[25px] top-1 w-8 h-8 rounded-full bg-white border border-outline flex items-center justify-center text-primary shadow-sm">
                      <span className="material-symbols-outlined text-sm font-bold">verified</span>
                    </div>
                    <div>
                      <h4 className="font-headline-sm text-headline-sm font-bold text-on-background">Inscripción a examen</h4>
                      <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Grado Objetivo: {enroll.examen_id} | Resultado: {enroll.resultado || 'pendiente'}</p>
                      <span className="text-[10px] text-on-surface-variant opacity-70 block mt-xs">{new Date(enroll.created_at).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ==================== ÁREA DIRECCIÓN / ADMIN ==================== */}

          {/* 7. PANEL DE DIRECCIÓN */}
          {currentSection === 'admin_dashboard' && roleMode === 'director' && (
            <section className="space-y-gutter">
              {/* KPIs Dirección */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
                <div className="bg-white border border-outline-variant rounded-xl p-md flex flex-col justify-between min-h-[110px]">
                  <span className="font-label-md text-label-md text-on-surface-variant">FEDERADOS TOTALES</span>
                  <strong className="text-2xl font-extrabold text-primary">{allProfiles.length}</strong>
                  <small className="text-green-700 text-[10px] font-bold">Todos los clubes activos</small>
                </div>
                <div className="bg-white border border-outline-variant rounded-xl p-md flex flex-col justify-between min-h-[110px]">
                  <span className="font-label-md text-label-md text-on-surface-variant">SOLICITUDES PENDIENTES</span>
                  <strong className="text-2xl font-extrabold text-primary">
                    {loadedAdminEnrollments.filter(e => e.estado === 'pendiente_revision' || e.estado === 'pendiente_pago').length}
                  </strong>
                  <small className="text-amber-700 text-[10px] font-bold">Requieren tu atención</small>
                </div>
                <div className="bg-white border border-outline-variant rounded-xl p-md flex flex-col justify-between min-h-[110px]">
                  <span className="font-label-md text-label-md text-on-surface-variant">TASAS CONCILIADAS</span>
                  <strong className="text-2xl font-extrabold text-primary">100%</strong>
                  <small className="text-green-700 text-[10px] font-bold">Pasarela Appwrite OK</small>
                </div>
                <div className="bg-white border border-outline-variant rounded-xl p-md flex flex-col justify-between min-h-[110px]">
                  <span className="font-label-md text-label-md text-on-surface-variant">AUDITORÍAS LOGS RLS</span>
                  <strong className="text-2xl font-extrabold text-primary">Activo</strong>
                  <small className="text-on-surface-variant opacity-70 text-[10px]">Logs inmutables</small>
                </div>
              </div>

              {/* Director's search / Audit directory */}
              <div className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
                <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Directorio Oficial de Federados</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-container text-on-surface font-label-md text-label-md border-b border-outline-variant">
                        <th className="p-md">Nombre y Apellidos</th>
                        <th className="p-md">Licencia</th>
                        <th className="p-md">DNI/NIE</th>
                        <th className="p-md">Fecha de Nacimiento</th>
                        <th className="p-md">Grado Actual</th>
                      </tr>
                    </thead>
                    <tbody className="font-body-md text-body-md divide-y divide-outline-variant">
                      {allProfiles.map((prof) => (
                        <tr key={prof.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="p-md font-semibold">{prof.full_name}</td>
                          <td className="p-md">{prof.license_number || 'Sin Licencia'}</td>
                          <td className="p-md">{prof.dni_nie || 'N/A'}</td>
                          <td className="p-md">{prof.birth_date}</td>
                          <td className="p-md uppercase font-bold text-primary">{prof.current_grado_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* 8. APROBACIONES (Director) */}
          {currentSection === 'admin_enrollments' && roleMode === 'director' && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Aprobación de Solicitudes de Examen</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-container text-on-surface font-label-md text-label-md border-b border-outline-variant">
                      <th className="p-md">Federado</th>
                      <th className="p-md">Convocatoria</th>
                      <th className="p-md">Estado Solicitud</th>
                      <th className="p-md">Resultado</th>
                      <th className="p-md">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-body-md divide-y divide-outline-variant">
                    {loadedAdminEnrollments.length > 0 ? (
                      loadedAdminEnrollments.map((enroll) => (
                        <tr key={enroll.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="p-md font-semibold">{enroll.profiles?.full_name || enroll.federado_id}</td>
                          <td className="p-md font-bold">{enroll.examen_id}</td>
                          <td className="p-md">
                            <span className="px-sm py-[2px] rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700">
                              {enroll.estado.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-md font-semibold uppercase">{enroll.resultado || 'pendiente'}</td>
                          <td className="p-md flex gap-sm">
                            <button
                              onClick={() => handleApproveEnrollment(enroll.id)}
                              className="bg-green-600 text-white text-[10px] font-bold px-sm py-1 rounded hover:bg-green-700"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => handleRejectEnrollment(enroll.id)}
                              className="bg-error text-white text-[10px] font-bold px-sm py-1 rounded hover:bg-red-700"
                            >
                              Rechazar
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-md text-center">No hay solicitudes de exámenes registradas en el sistema.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 9. CONVOCAR EXAMEN (Director) */}
          {currentSection === 'admin_exams' && roleMode === 'director' && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Publicar Nueva Convocatoria de Examen</h3>
              <form onSubmit={handleCreateExam} className="grid grid-cols-1 md:grid-cols-2 gap-md items-end">
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Grado objetivo</label>
                  <select 
                    value={newExamGrade}
                    onChange={(e) => setNewExamGrade(e.target.value)}
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs"
                  >
                    <option value="1dan">1º DAN</option>
                    <option value="2dan">2º DAN</option>
                    <option value="3dan">3º DAN</option>
                    <option value="4dan">4º DAN</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Fecha de examen</label>
                  <input 
                    value={newExamDate}
                    onChange={(e) => setNewExamDate(e.target.value)}
                    type="date" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Sede de celebración</label>
                  <input 
                    value={newExamSede}
                    onChange={(e) => setNewExamSede(e.target.value)}
                    type="text" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs" 
                    placeholder="e.g. Polideportivo Central" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Tribunales designados</label>
                  <input 
                    value={newExamTribunal}
                    onChange={(e) => setNewExamTribunal(e.target.value)}
                    type="text" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs" 
                    placeholder="e.g. M. Nakazato, P. Sanz" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Cupo máximo de aspirantes</label>
                  <input 
                    value={newExamCupo}
                    onChange={(e) => setNewExamCupo(Number(e.target.value))}
                    type="number" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs" 
                  />
                </div>
                <button 
                  type="submit" 
                  className="bg-primary text-white font-bold text-xs py-sm px-md rounded-lg hover:bg-primary-container transition-all"
                >
                  Publicar Convocatoria
                </button>
              </form>

              {/* List of current callings */}
              <div className="pt-md border-t border-outline-variant/30 space-y-sm">
                <h4 className="font-headline-sm text-headline-sm text-primary font-bold">Convocatorias vigentes</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-container text-on-surface font-label-md text-label-md border-b border-outline-variant">
                        <th className="p-md">Grado</th>
                        <th className="p-md">Fecha</th>
                        <th className="p-md">Sede</th>
                        <th className="p-md">Tribunales</th>
                        <th className="p-md">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="font-body-md text-body-md divide-y divide-outline-variant">
                      {loadedExams.map(ex => (
                        <tr key={ex.id}>
                          <td className="p-md font-bold uppercase">{ex.grado_objetivo_id}</td>
                          <td className="p-md">{new Date(ex.fecha).toLocaleDateString('es-ES')}</td>
                          <td className="p-md">{ex.sede}</td>
                          <td className="p-md">{ex.tribunal}</td>
                          <td className="p-md">
                            <span className="px-sm py-[2px] rounded-full text-[9px] font-bold uppercase bg-green-100 text-green-700">
                              {ex.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* 10. EDITOR DE NORMATIVAS (Director) */}
          {currentSection === 'admin_rules' && roleMode === 'director' && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Configurador de Requisitos por Grado (Normativa)</h3>
              <form onSubmit={handleSaveRule} className="grid grid-cols-1 md:grid-cols-4 gap-md items-end">
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Grado objetivo</label>
                  <select 
                    value={selectedRuleGrade}
                    onChange={(e) => setSelectedRuleGrade(e.target.value)}
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs"
                  >
                    <option value="1dan">1º DAN</option>
                    <option value="2dan">2º DAN</option>
                    <option value="3dan">3º DAN</option>
                    <option value="4dan">4º DAN</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Edad mínima requerida</label>
                  <input 
                    value={ruleAge}
                    onChange={(e) => setRuleAge(Number(e.target.value))}
                    type="number" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Años permanencia mínima</label>
                  <input 
                    value={ruleYears}
                    onChange={(e) => setRuleYears(Number(e.target.value))}
                    type="number" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Licencias requeridas</label>
                  <input 
                    value={ruleLicenses}
                    onChange={(e) => setRuleLicenses(Number(e.target.value))}
                    type="number" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs" 
                  />
                </div>
                <div className="col-span-4 flex justify-end">
                  <button 
                    type="submit" 
                    className="bg-primary text-white font-bold text-xs py-sm px-lg rounded-lg hover:bg-primary-container transition-all"
                  >
                    Actualizar Requisitos
                  </button>
                </div>
              </form>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
