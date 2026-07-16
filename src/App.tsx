import { useState, useEffect } from 'react';
import { databases, account, APPWRITE_CONFIG } from './services/appwrite';
import { Query, ID } from 'appwrite';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ValidatorPanel } from './pages/ValidatorPanel';
import type { UserRole, Profile, Examen, Inscripcion, Kata, Pago, Club } from './types';

function App() {
  const [currentSection, setCurrentSection] = useState<string>('dashboard');
  const [roleMode, setRoleMode] = useState<UserRole>('aspirante');
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  
  // Auth Form State
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [registerRole, setRegisterRole] = useState<UserRole>('aspirante');
  const [registerGrade, setRegisterGrade] = useState<string>('marron');
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authMessage, setAuthMessage] = useState<string>('Ingresa credenciales para conectar con el backend de Appwrite.');
  const [authType, setAuthType] = useState<'ok' | 'error' | ''>('');

  // Admin Create User Form
  const [adminUserFullname, setAdminUserFullname] = useState<string>('');
  const [adminUserEmail, setAdminUserEmail] = useState<string>('');
  const [adminUserPass, setAdminUserPass] = useState<string>('');
  const [adminUserRole, setAdminUserRole] = useState<UserRole>('aspirante');
  const [adminUserGrade, setAdminUserGrade] = useState<string>('marron');

  // Appwrite Data State
  const [loadedExams, setLoadedExams] = useState<Examen[]>([]);
  const [loadedEnrollments, setLoadedEnrollments] = useState<Inscripcion[]>([]);
  const [loadedAdminEnrollments, setLoadedAdminEnrollments] = useState<Inscripcion[]>([]);
  const [loadedKatas, setLoadedKatas] = useState<Kata[]>([]);
  const [loadedPayments, setLoadedPayments] = useState<Pago[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loadedClubs, setLoadedClubs] = useState<Club[]>([]);

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

  // New Club Form State
  const [newClubName, setNewClubName] = useState<string>('');
  const [newClubSede, setNewClubSede] = useState<string>('');
  const [newClubDirector, setNewClubDirector] = useState<string>('');

  // New Rule Form State (Admin)
  const [selectedRuleGrade, setSelectedRuleGrade] = useState<string>('1dan');
  const [ruleAge, setRuleAge] = useState<number>(16);
  const [ruleYears, setRuleYears] = useState<number>(1);
  const [ruleLicenses, setRuleLicenses] = useState<number>(3);

  // Juez Grade State
  const [juezSelectedExamId, setJuezSelectedExamId] = useState<string>('');
  const [gradingKata, setGradingKata] = useState<{ [key: string]: number }>({});
  const [gradingKumite, setGradingKumite] = useState<{ [key: string]: number }>({});
  const [gradingStatus, setGradingStatus] = useState<{ [key: string]: string }>({});

  // Document Validation State (Director)
  const [validatedDocs, setValidatedDocs] = useState<{ [key: string]: { dni: boolean; lic: boolean } }>({});

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
            active: profileDoc.active ?? true,
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
      setRoleMode('aspirante');
      
      setLoadedExams([]);
      setLoadedEnrollments([]);
      setLoadedAdminEnrollments([]);
      setLoadedKatas([]);
      setLoadedPayments([]);
      setAllProfiles([]);
      setLoadedClubs([]);
    }
  };

  const loadAppwriteData = async (userId: string) => {
    try {
      const [examsRes, enrollmentsRes, allEnrollmentsRes, katasRes, paymentsRes, profilesRes, clubsRes] = await Promise.all([
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.examenes, [Query.limit(100)]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.inscripciones, [Query.equal('federado_id', userId)]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.inscripciones, [Query.limit(100)]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.katas, [Query.limit(100)]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.pagos, [Query.limit(100)]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.profiles, [Query.limit(100)]).catch(() => ({ documents: [] })),
        databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.clubes, [Query.limit(100)]).catch(() => ({ documents: [] }))
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
        puntuacion_kata: doc.puntuacion_kata,
        puntuacion_kumite: doc.puntuacion_kumite,
        juez_id: doc.juez_id,
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
          puntuacion_kata: doc.puntuacion_kata,
          puntuacion_kumite: doc.puntuacion_kumite,
          juez_id: doc.juez_id,
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
          active: doc.active ?? true,
          created_at: doc.$createdAt,
          updated_at: doc.$updatedAt
        }))
      );

      setLoadedClubs(
        clubsRes.documents.map((doc: any) => ({
          id: doc.$id,
          nombre: doc.nombre,
          sede: doc.sede,
          director_nombre: doc.director_nombre,
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
      await account.create(generatedId, email, password, fullName || email);
      
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.profiles,
        ID.unique(),
        {
          id: generatedId,
          role: registerRole,
          full_name: fullName || email,
          license_number: 'LIC-' + Math.floor(10000 + Math.random() * 90000),
          current_grado_id: registerRole === 'aspirante' ? registerGrade : 'marron',
          current_grado_since: '2025-01-01',
          birth_date: '2000-01-01',
          active: true
        }
      );

      setAuthMessage('Registro exitoso. Inicia sesión para continuar.');
      setAuthType('ok');
      setAuthTab('login');
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

  const handleSeedDatabase = async () => {
    try {
      const gradosData = [
        { id: 'blanco', nombre: 'Cinturón Blanco', orden: 0, tipo: 'kyu' },
        { id: 'amarillo', nombre: 'Cinturón Amarillo', orden: 1, tipo: 'kyu' },
        { id: 'naranja', nombre: 'Cinturón Naranja', orden: 2, tipo: 'kyu' },
        { id: 'verde', nombre: 'Cinturón Verde', orden: 3, tipo: 'kyu' },
        { id: 'azul', nombre: 'Cinturón Azul', orden: 4, tipo: 'kyu' },
        { id: 'marron', nombre: 'Cinturón Marrón', orden: 6, tipo: 'kyu' },
        { id: '1dan', nombre: 'Cinturón Negro 1º DAN', orden: 7, tipo: 'dan' },
        { id: '2dan', nombre: 'Cinturón Negro 2º DAN', orden: 8, tipo: 'dan' },
        { id: '3dan', nombre: 'Cinturón Negro 3º DAN', orden: 9, tipo: 'dan' },
        { id: '4dan', nombre: 'Cinturón Negro 4º DAN', orden: 10, tipo: 'dan' }
      ];
      for (const grade of gradosData) {
        await databases.createDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.grados, grade.id, {
          nombre: grade.nombre,
          tipo: grade.tipo,
          orden: grade.orden
        }).catch(() => {});
      }

      const reqsData = [
        { id: 'req_amarillo', grado_objetivo_id: 'amarillo', grado_previo_requerido_id: 'blanco', edad_minima: 4, permanencia_anios: 0, licencias_consecutivas_requeridas: 1, licencias_alternas_requeridas: 1, observaciones: 'Examen básico de club.' },
        { id: 'req_naranja', grado_objetivo_id: 'naranja', grado_previo_requerido_id: 'amarillo', edad_minima: 5, permanencia_anios: 0, licencias_consecutivas_requeridas: 1, licencias_alternas_requeridas: 1, observaciones: 'Examen de club.' },
        { id: 'req_verde', grado_objetivo_id: 'verde', grado_previo_requerido_id: 'naranja', edad_minima: 7, permanencia_anios: 0, licencias_consecutivas_requeridas: 1, licencias_alternas_requeridas: 1, observaciones: 'Examen de club.' },
        { id: 'req_azul', grado_objetivo_id: 'azul', grado_previo_requerido_id: 'verde', edad_minima: 9, permanencia_anios: 0, licencias_consecutivas_requeridas: 1, licencias_alternas_requeridas: 1, observaciones: 'Examen de club.' },
        { id: 'req_marron', grado_objetivo_id: 'marron', grado_previo_requerido_id: 'azul', edad_minima: 12, permanencia_anios: 0, licencias_consecutivas_requeridas: 1, licencias_alternas_requeridas: 1, observaciones: 'Examen de club.' },
        { id: 'req_1dan', grado_objetivo_id: '1dan', grado_previo_requerido_id: 'marron', edad_minima: 16, permanencia_anios: 1, licencias_consecutivas_requeridas: 3, licencias_alternas_requeridas: 4, observaciones: 'Edad cumplida el día del examen.' },
        { id: 'req_2dan', grado_objetivo_id: '2dan', grado_previo_requerido_id: '1dan', edad_minima: 18, permanencia_anios: 2, licencias_consecutivas_requeridas: 2, licencias_alternas_requeridas: 3, observaciones: 'Presentar justificante de grado anterior.' },
        { id: 'req_3dan', grado_objetivo_id: '3dan', grado_previo_requerido_id: '2dan', edad_minima: 21, permanencia_anios: 3, licencias_consecutivas_requeridas: 3, licencias_alternas_requeridas: 4, observaciones: 'Sin observaciones.' },
        { id: 'req_4dan', grado_objetivo_id: '4dan', grado_previo_requerido_id: '3dan', edad_minima: 25, permanencia_anios: 4, licencias_consecutivas_requeridas: 4, licencias_alternas_requeridas: 5, observaciones: 'Examen ante tribunal de altos grados.' }
      ];
      for (const req of reqsData) {
        await databases.createDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.requisitos_grado, req.id, {
          grado_objetivo_id: req.grado_objetivo_id,
          grado_previo_requerido_id: req.grado_previo_requerido_id,
          decay: 0, // unused
          edad_minima: req.edad_minima,
          permanencia_anios: req.permanencia_anios,
          licencias_consecutivas_requeridas: req.licencias_consecutivas_requeridas,
          licencias_alternas_requeridas: req.licencias_alternas_requeridas,
          observaciones: req.observaciones
        }).catch(() => {});
      }

      const examsData = [
        { id: 'exam_1dan_julio', grado_objetivo_id: '1dan', fecha: '2026-07-25', sede: 'Polideportivo Central Madrid', tribunal: 'M. Nakazato (7º DAN)', cupo_maximo: 30, estado: 'abierta' },
        { id: 'exam_2dan_agosto', grado_objetivo_id: '2dan', fecha: '2026-08-10', sede: 'Centro Tecnificación Karate', tribunal: 'P. Sanz (6º DAN)', cupo_maximo: 20, estado: 'abierta' },
        { id: 'exam_3dan_septiembre', grado_objetivo_id: '3dan', fecha: '2026-09-05', sede: 'Palacio de Deportes Madrid', tribunal: 'T. Suzuki (8º DAN)', cupo_maximo: 15, estado: 'abierta' }
      ];
      for (const ex of examsData) {
        await databases.createDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.examenes, ex.id, {
          grado_objetivo_id: ex.grado_objetivo_id,
          fecha: ex.fecha,
          sede: ex.sede,
          tribunal: ex.tribunal,
          cupo_maximo: ex.cupo_maximo,
          estado: ex.estado
        }).catch(() => {});
      }

      const clubsData = [
        { id: 'club_kendo', nombre: 'Club Karate San Blas', sede: 'San Blas, Madrid', director_nombre: 'Santiago Martínez' },
        { id: 'club_kata', nombre: 'Karate Dojo Retiro', sede: 'El Retiro, Madrid', director_nombre: 'Mariana de Miguel' }
      ];
      for (const club of clubsData) {
        await databases.createDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.clubes, club.id, {
          nombre: club.nombre,
          sede: club.sede,
          director_nombre: club.director_nombre
        }).catch(() => {});
      }

      const katasData = [
        { id: 'heian_shodan', nombre: 'Heian Shodan', grado_id: '1dan', tipo: 'obligatoria', descripcion: 'Primer kata de la serie Heian, enfatiza posturas de Zenkutsu Dachi y defensas básicas.' },
        { id: 'heian_nidan', nombre: 'Heian Nidan', grado_id: '1dan', tipo: 'obligatoria', descripcion: 'Segundo kata de la serie Heian, introduce patadas y golpes de canto de mano (Shuto Uke).' },
        { id: 'heian_sandan', nombre: 'Heian Sandan', grado_id: '1dan', tipo: 'obligatoria', descripcion: 'Tercer kata Heian, trabaja Kiba Dachi, golpes de codo y giros cortos.' },
        { id: 'heian_yondan', nombre: 'Heian Yondan', grado_id: '1dan', tipo: 'obligatoria', descripcion: 'Cuarto kata Heian, introduce defensas dobles y uso intensivo de patadas laterales (Yoko Geri).' },
        { id: 'heian_godan', nombre: 'Heian Godan', grado_id: '1dan', tipo: 'obligatoria', descripcion: 'Quinto kata Heian, incluye un salto característico y defensas de nivel bajo y alto.' },
        { id: 'bassai_dai', nombre: 'Bassai Dai', grado_id: '1dan', tipo: 'libre', descripcion: 'Kata de la penetración de la fortaleza, clásico para pase a Cinturón Negro.' },
        { id: 'kanku_dai', nombre: 'Kanku Dai', grado_id: '2dan', tipo: 'libre', descripcion: 'Kata superior que simula la observación del cielo, introduce saltos y defensas avanzadas.' },
        { id: 'jion', nombre: 'Jion', grado_id: '2dan', tipo: 'libre', descripcion: 'Kata tradicional de origen monástico, enfocado en técnicas firmes y directas.' },
        { id: 'enpi', nombre: 'Enpi', grado_id: '2dan', tipo: 'libre', descripcion: 'Kata del vuelo de la golondrina, característico por sus cambios de nivel y ligereza.' },
        { id: 'kanku_sho', nombre: 'Kanku Sho', grado_id: '3dan', tipo: 'libre', descripcion: 'Versión menor de Kanku, introduce defensas ágiles contra agarres de bastón.' },
        { id: 'gojushiho_dai', nombre: 'Gojushiho Dai', grado_id: '4dan', tipo: 'libre', descripcion: 'Kata de los cincuenta y cuatro pasos, muy técnico y de ritmo complejo.' }
      ];
      for (const kata of katasData) {
        await databases.createDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.katas, kata.id, {
          nombre: kata.nombre,
          grado_id: kata.grado_id,
          tipo: kata.tipo,
          descripcion: kata.descripcion
        }).catch(() => {});
      }

      alert('¡Base de datos sembrada con éxito! Grados, Requisitos, Clubes, Exámenes y Katas inicializados.');
      await loadAppwriteData(sessionUser?.$id || '');
    } catch (err: any) {
      alert('Error al sembrar base de datos: ' + err.message);
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
          estado: 'pendiente_revision',
          resultado: 'pendiente',
          validacion_snapshot: JSON.stringify({
            origen: 'appwrite_wizard',
            fecha: new Date().toISOString(),
            verificacion: 'apto'
          }),
          fecha_inscripcion: new Date().toISOString()
        }
      );

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

  // Crear Club (Director)
  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName || !newClubSede) {
      alert('Rellena el nombre y la sede del club.');
      return;
    }

    try {
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.clubes,
        ID.unique(),
        {
          nombre: newClubName,
          sede: newClubSede,
          director_nombre: newClubDirector || 'Pendiente'
        }
      );
      alert('Club deportivo registrado con éxito.');
      setNewClubName('');
      setNewClubSede('');
      setNewClubDirector('');
      await loadAppwriteData(sessionUser.$id);
    } catch (error: any) {
      alert('Error registrando club: ' + error.message);
    }
  };

  // Guardar normativa
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Normativa para ${selectedRuleGrade} actualizada a: Edad=${ruleAge}, Permanencia=${ruleYears} año(s), Licencias=${ruleLicenses}.`);
  };

  // Aprobar/Rechazar inscripción (Director)
  const handleApproveEnrollment = async (enrollId: string) => {
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.inscripciones,
        enrollId,
        { estado: 'aprobada', resultado: 'pendiente' }
      );
      alert('Solicitud de examen aprobada. El deportista ya puede ser calificado por los Jueces.');
      await loadAppwriteData(sessionUser.$id);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

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

  // Calificar como Juez
  const handleJuezGrade = async (enrollId: string) => {
    const kScore = gradingKata[enrollId] || 0.0;
    const kuScore = gradingKumite[enrollId] || 0.0;
    const status = gradingStatus[enrollId] || 'apto';

    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.inscripciones,
        enrollId,
        {
          puntuacion_kata: kScore,
          puntuacion_kumite: kuScore,
          resultado: status,
          estado: 'completada',
          juez_id: sessionUser.$id
        }
      );
      alert('Puntajes guardados con éxito en la base de datos.');
      await loadAppwriteData(sessionUser.$id);
    } catch (error: any) {
      alert('Error al calificar: ' + error.message);
    }
  };

  // Habilitar/Desactivar cuenta (Admin)
  const handleToggleUserActive = async (profileId: string, currentActive: boolean) => {
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.profiles,
        profileId,
        { active: !currentActive }
      );
      alert(`Estado de la cuenta actualizado a: ${!currentActive ? 'ACTIVA' : 'DESACTIVADA'}`);
      await loadAppwriteData(sessionUser.$id);
    } catch (error: any) {
      alert('Error al actualizar cuenta: ' + error.message);
    }
  };

  // Crear cuenta por Administrador
  const handleAdminCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUserEmail || !adminUserPass || !adminUserFullname) {
      alert('Rellena todos los campos.');
      return;
    }

    try {
      const generatedId = ID.unique();
      // Crear en cuenta Appwrite Auth
      await account.create(generatedId, adminUserEmail, adminUserPass, adminUserFullname);
      
      // Crear en coleccion profiles
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.profiles,
        ID.unique(),
        {
          id: generatedId,
          role: adminUserRole,
          full_name: adminUserFullname,
          license_number: 'LIC-' + Math.floor(10000 + Math.random() * 90000),
          current_grado_id: adminUserRole === 'aspirante' ? adminUserGrade : 'marron',
          current_grado_since: '2025-01-01',
          birth_date: '2000-01-01',
          active: true
        }
      );

      alert(`Cuenta de ${adminUserFullname} con rol ${adminUserRole} creada con éxito.`);
      setAdminUserEmail('');
      setAdminUserPass('');
      setAdminUserFullname('');
      await loadAppwriteData(sessionUser.$id);
    } catch (err: any) {
      alert('Error creando usuario: ' + err.message);
    }
  };

  // Descargar expediente Mock (Admin)
  const handleDownloadExpediente = (fullname: string) => {
    alert(`Preparando y descargando el expediente completo de ${fullname} (DNI, Licencia, Pago y Certificados) en un archivo ZIP...`);
  };

  // Validar documentos individuales (Director)
  const handleValidateDoc = (enrollId: string, docType: 'dni' | 'lic', status: boolean) => {
    const current = validatedDocs[enrollId] || { dni: false, lic: false };
    const updated = { ...current, [docType]: status };
    setValidatedDocs({
      ...validatedDocs,
      [enrollId]: updated
    });
    alert(`Documento (${docType.toUpperCase()}) marcado como ${status ? 'VÁLIDO' : 'RECHAZADO'}`);
  };

  // Filtrado de Katas
  const filteredKatas = loadedKatas.filter(k => {
    const matchesQuery = k.nombre.toLowerCase().includes(kataQuery.toLowerCase()) || 
                         (k.descripcion && k.descripcion.toLowerCase().includes(kataQuery.toLowerCase()));
    const matchesGrade = selectedKataGrade === 'all' || k.grado_id === selectedKataGrade;
    return matchesQuery && matchesGrade;
  });

  // Si no hay sesión activa, mostrar la pantalla completa de login/registro
  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-lg font-sans">
        <div className="w-full max-w-[420px] bg-white border border-outline-variant rounded-xl shadow-lg p-lg space-y-md">
          {/* Logo / Brand */}
          <div className="flex flex-col items-center gap-sm pb-md border-b border-outline-variant">
            <div className="w-12 h-12 bg-primary-container rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-3xl">sports_martial_arts</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-primary font-bold">Gestión de Grados FMK</h1>
            <p className="font-label-md text-label-md text-on-surface-variant">Federación Madrileña de Karate</p>
          </div>

          {/* Form Tabs */}
          <div className="flex border-b border-outline-variant text-xs">
            <button
              onClick={() => setAuthTab('login')}
              className={`flex-1 pb-sm font-bold text-center border-b-2 transition-all ${
                authTab === 'login' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setAuthTab('register')}
              className={`flex-1 pb-sm font-bold text-center border-b-2 transition-all ${
                authTab === 'register' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* Auth inputs */}
          <div className="space-y-md py-sm">
            {authTab === 'register' && (
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant">Nombre y Apellidos</label>
                <input 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  type="text" 
                  className="w-full bg-white border border-outline-variant p-md rounded text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                  placeholder="e.g. Juan Pérez" 
                />
              </div>
            )}
            
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant">Correo electrónico</label>
              <input 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email" 
                className="w-full bg-white border border-outline-variant p-md rounded text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                placeholder="usuario@email.com" 
              />
            </div>

            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant">Contraseña</label>
              <input 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password" 
                className="w-full bg-white border border-outline-variant p-md rounded text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                placeholder="Mínimo 8 caracteres" 
              />
            </div>

            {authTab === 'register' && (
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant">Selecciona tu Rol</label>
                <select
                  value={registerRole}
                  onChange={(e) => setRegisterRole(e.target.value as UserRole)}
                  className="w-full bg-white border border-outline-variant p-md rounded text-xs font-semibold focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="aspirante">Aspirante (Deportista)</option>
                  <option value="director">Director (Federativo)</option>
                  <option value="juez">Juez (Tribunal Calificador)</option>
                  <option value="administrador">Administrador (Gestor de Sistemas)</option>
                </select>
              </div>
            )}

            {authTab === 'register' && registerRole === 'aspirante' && (
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant">Selecciona tu Grado (Cinturón) Actual</label>
                <select
                  value={registerGrade}
                  onChange={(e) => setRegisterGrade(e.target.value)}
                  className="w-full bg-white border border-outline-variant p-md rounded text-xs font-semibold focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="blanco">Cinturón Blanco</option>
                  <option value="amarillo">Cinturón Amarillo</option>
                  <option value="naranja">Cinturón Naranja</option>
                  <option value="verde">Cinturón Verde</option>
                  <option value="azul">Cinturón Azul</option>
                  <option value="marron">Cinturón Marrón</option>
                  <option value="1dan">Cinturón Negro 1º DAN</option>
                  <option value="2dan">Cinturón Negro 2º DAN</option>
                  <option value="3dan">Cinturón Negro 3º DAN</option>
                </select>
              </div>
            )}
          </div>

          <div className="pt-sm">
            {authTab === 'login' ? (
              <button 
                onClick={handleSignIn}
                className="w-full bg-primary text-white font-bold text-xs py-md rounded-lg hover:bg-primary-container transition-all"
              >
                Ingresar a la Plataforma
              </button>
            ) : (
              <button 
                onClick={handleSignUp}
                className="w-full bg-primary text-white font-bold text-xs py-md rounded-lg hover:bg-primary-container transition-all"
              >
                Crear Cuenta Oficial
              </button>
            )}
          </div>

          <p className={`text-xs text-center ${authType === 'error' ? 'text-error font-bold' : authType === 'ok' ? 'text-green-700 font-bold' : 'text-on-surface-variant'}`}>
            {authMessage}
          </p>
        </div>
      </div>
    );
  }

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
          userRole={userProfile?.role}
        />

        {/* Dynamic section display */}
        <div className="flex-1 p-lg max-w-[1280px] w-full mx-auto space-y-gutter">
          
          {/* ==================== ÁREA ASPIRANTE ==================== */}

          {/* 1. DASHBOARD ASPIRANTE */}
          {currentSection === 'dashboard' && (
            <section className="space-y-gutter">
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

              {/* Grid de Estado del Deportista */}
              {userProfile && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                  <div className="bg-surface-container-low border border-outline-variant p-lg rounded-xl space-y-sm">
                    <div className="flex items-center gap-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">badge</span>
                      <span className="font-label-md text-label-md">PERFIL FEDERATIVO</span>
                    </div>
                    <h4 className="font-headline-sm text-headline-sm font-bold">{userProfile.full_name}</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant">Licencia: <strong>{userProfile.license_number}</strong></p>
                    <p className="font-body-md text-body-md text-on-surface-variant">DNI/NIE: {userProfile.dni_nie || 'Pendiente registrar'}</p>
                    <p className="font-body-md text-body-md text-on-surface-variant">Rol de Perfil: <strong className="uppercase">{userProfile.role}</strong></p>
                    <p className="font-body-md text-body-md text-on-surface-variant">Estado Cuenta: 
                      <span className={`ml-sm px-sm py-[2px] rounded text-[10px] font-bold ${userProfile.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {userProfile.active ? 'ACTIVO' : 'DESACTIVADO'}
                      </span>
                    </p>
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

          {/* 3. MIS INSCRIPCIONES */}
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
                        className="w-full bg-white border border-outline-variant p-md rounded text-xs font-semibold focus:outline-none"
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
                        <th className="p-md">Calificaciones</th>
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
                              <span className={`px-sm py-[2px] rounded-full text-[9px] font-bold uppercase ${enroll.resultado === 'apto' ? 'bg-green-100 text-green-700' : enroll.resultado === 'no_apto' ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-700'}`}>
                                {enroll.resultado || 'pendiente'}
                              </span>
                            </td>
                            <td className="p-md">
                              {enroll.puntuacion_kata !== undefined ? (
                                <span className="font-mono text-[10px]">
                                  KATA: {enroll.puntuacion_kata} | KUMITE: {enroll.puntuacion_kumite}
                                </span>
                              ) : (
                                <span className="italic text-on-surface-variant">Sin puntuar</span>
                              )}
                            </td>
                            <td className="p-md">{new Date(enroll.fecha_inscripcion || enroll.created_at).toLocaleDateString('es-ES')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-md text-center">No tienes inscripciones guardadas aún.</td>
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
                <div className="flex gap-md max-w-[600px]">
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
                    className="bg-white border border-outline-variant p-sm rounded text-xs font-semibold focus:outline-none"
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

          {/* 7. PANEL DE DIRECCIÓN - Directorio de federados */}
          {currentSection === 'admin_dashboard' && (roleMode === 'director' || roleMode === 'administrador') && (
            <section className="space-y-gutter">
              {/* Seeding row */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-error font-bold">Consola del Administrador de Sistemas</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                    ¿La base de datos de Appwrite está vacía? Presiona el botón para sembrar automáticamente los datos iniciales obligatorios.
                  </p>
                </div>
                <button 
                  onClick={handleSeedDatabase}
                  className="bg-primary text-white font-bold text-xs px-lg py-md rounded-lg hover:bg-primary-container transition-all flex items-center gap-sm shrink-0 shadow"
                >
                  <span className="material-symbols-outlined text-sm">database</span>
                  Sembrar Base de Datos (Grados, Requisitos, Clubes, Exámenes)
                </button>
              </div>

              {/* Directory search */}
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
                        <th className="p-md">Rol de Cuenta</th>
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
                          <td className="p-md uppercase font-bold text-secondary">{prof.role}</td>
                          <td className="p-md uppercase font-bold text-primary">{prof.current_grado_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* 8. APROBACIONES & VALIDADOR DE DOCUMENTOS (Director) */}
          {currentSection === 'admin_enrollments' && (roleMode === 'director' || roleMode === 'administrador') && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Aprobación de Solicitudes y Validación de Documentos</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-container text-on-surface font-label-md text-label-md border-b border-outline-variant">
                      <th className="p-md">Federado</th>
                      <th className="p-md">Convocatoria</th>
                      <th className="p-md">Estado Solicitud</th>
                      <th className="p-md">Validación Documental (DNI y Licencia)</th>
                      <th className="p-md">Acción Final</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-body-md divide-y divide-outline-variant">
                    {loadedAdminEnrollments.length > 0 ? (
                      loadedAdminEnrollments.map((enroll) => {
                        const status = validatedDocs[enroll.id] || { dni: false, lic: false };
                        return (
                          <tr key={enroll.id} className="hover:bg-surface-container-lowest transition-colors">
                            <td className="p-md font-semibold">{enroll.profiles?.full_name || enroll.federado_id}</td>
                            <td className="p-md font-bold">{enroll.examen_id}</td>
                            <td className="p-md">
                              <span className="px-sm py-[2px] rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700">
                                {enroll.estado.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-md space-y-sm">
                              <div className="flex items-center justify-between gap-sm bg-neutral-50 border p-sm rounded max-w-[280px]">
                                <span className="font-medium text-[10px]">Copia DNI:</span>
                                <div className="flex gap-xs">
                                  <button onClick={() => handleValidateDoc(enroll.id, 'dni', true)} className={`text-[9px] font-bold px-[6px] py-[2px] rounded ${status.dni ? 'bg-green-600 text-white' : 'bg-white border border-outline'}`}>Válido</button>
                                  <button onClick={() => handleValidateDoc(enroll.id, 'dni', false)} className={`text-[9px] font-bold px-[6px] py-[2px] rounded ${!status.dni ? 'bg-red-600 text-white' : 'bg-white border border-outline'}`}>Rechazar</button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-sm bg-neutral-50 border p-sm rounded max-w-[280px]">
                                <span className="font-medium text-[10px]">Licencia:</span>
                                <div className="flex gap-xs">
                                  <button onClick={() => handleValidateDoc(enroll.id, 'lic', true)} className={`text-[9px] font-bold px-[6px] py-[2px] rounded ${status.lic ? 'bg-green-600 text-white' : 'bg-white border border-outline'}`}>Válido</button>
                                  <button onClick={() => handleValidateDoc(enroll.id, 'lic', false)} className={`text-[9px] font-bold px-[6px] py-[2px] rounded ${!status.lic ? 'bg-red-600 text-white' : 'bg-white border border-outline'}`}>Rechazar</button>
                                </div>
                              </div>
                            </td>
                            <td className="p-md space-y-xs">
                              <button
                                onClick={() => handleApproveEnrollment(enroll.id)}
                                disabled={!status.dni || !status.lic}
                                className={`w-full text-[10px] font-bold px-sm py-1 rounded transition-colors ${
                                  status.dni && status.lic 
                                    ? 'bg-green-600 text-white hover:bg-green-700' 
                                    : 'bg-neutral-100 text-neutral-400 cursor-not-allowed border'
                                }`}
                              >
                                Aprobar Candidato
                              </button>
                              <button
                                onClick={() => handleRejectEnrollment(enroll.id)}
                                className="w-full bg-error text-white text-[10px] font-bold px-sm py-1 rounded hover:bg-red-700"
                              >
                                Rechazar
                              </button>
                            </td>
                          </tr>
                        );
                      })
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
          {currentSection === 'admin_exams' && (roleMode === 'director' || roleMode === 'administrador') && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Publicar Nueva Convocatoria de Examen</h3>
              <form onSubmit={handleCreateExam} className="grid grid-cols-1 md:grid-cols-2 gap-md items-end">
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Grado objetivo</label>
                  <select 
                    value={newExamGrade}
                    onChange={(e) => setNewExamGrade(e.target.value)}
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none"
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
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Sede de celebración</label>
                  <input 
                    value={newExamSede}
                    onChange={(e) => setNewExamSede(e.target.value)}
                    type="text" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                    placeholder="e.g. Polideportivo Central" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Tribunales designados</label>
                  <input 
                    value={newExamTribunal}
                    onChange={(e) => setNewExamTribunal(e.target.value)}
                    type="text" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                    placeholder="e.g. M. Nakazato, P. Sanz" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Cupo máximo de aspirantes</label>
                  <input 
                    value={newExamCupo}
                    onChange={(e) => setNewExamCupo(Number(e.target.value))}
                    type="number" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
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

          {/* 10. GESTIÓN DE CLUBES (Director) */}
          {currentSection === 'admin_clubs' && (roleMode === 'director' || roleMode === 'administrador') && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Gestión de Clubes Deportivos Oficiales</h3>
              <form onSubmit={handleCreateClub} className="grid grid-cols-1 md:grid-cols-4 gap-md items-end">
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Nombre del Club</label>
                  <input 
                    value={newClubName}
                    onChange={(e) => setNewClubName(e.target.value)}
                    type="text" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                    placeholder="e.g. Club Karate San Blas" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Sede / Ubicación</label>
                  <input 
                    value={newClubSede}
                    onChange={(e) => setNewClubSede(e.target.value)}
                    type="text" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                    placeholder="e.g. Calle Alcalá 120, Madrid" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Nombre Director/Delegado</label>
                  <input 
                    value={newClubDirector}
                    onChange={(e) => setNewClubDirector(e.target.value)}
                    type="text" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                    placeholder="e.g. Santiago Martínez" 
                  />
                </div>
                <button 
                  type="submit" 
                  className="bg-primary text-white font-bold text-xs py-sm px-md rounded-lg hover:bg-primary-container transition-all"
                >
                  Registrar Club
                </button>
              </form>

              {/* List of Clubs */}
              <div className="pt-md border-t border-outline-variant/30 space-y-sm">
                <h4 className="font-headline-sm text-headline-sm text-primary font-bold">Clubes Deportivos Adheridos</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-container text-on-surface font-label-md text-label-md border-b border-outline-variant">
                        <th className="p-md">Nombre del Club</th>
                        <th className="p-md">Sede / Municipio</th>
                        <th className="p-md">Director</th>
                      </tr>
                    </thead>
                    <tbody className="font-body-md text-body-md divide-y divide-outline-variant">
                      {loadedClubs.map(club => (
                        <tr key={club.id}>
                          <td className="p-md font-semibold text-primary">{club.nombre}</td>
                          <td className="p-md">{club.sede}</td>
                          <td className="p-md font-semibold">{club.director_nombre}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* 11. CONFIGURADOR DE REQUISITOS (Director) */}
          {currentSection === 'admin_rules' && (roleMode === 'director' || roleMode === 'administrador') && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Configurador de Requisitos por Grado (Normativa)</h3>
              <form onSubmit={handleSaveRule} className="grid grid-cols-1 md:grid-cols-4 gap-md items-end">
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Grado objetivo</label>
                  <select 
                    value={selectedRuleGrade}
                    onChange={(e) => setSelectedRuleGrade(e.target.value)}
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none"
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
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Años permanencia mínima</label>
                  <input 
                    value={ruleYears}
                    onChange={(e) => setRuleYears(Number(e.target.value))}
                    type="number" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md">Licencias requeridas</label>
                  <input 
                    value={ruleLicenses}
                    onChange={(e) => setRuleLicenses(Number(e.target.value))}
                    type="number" 
                    className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
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

          {/* ==================== ÁREA JUECES ==================== */}

          {/* 12. CALIFICAR EXÁMENES (Juez) */}
          {currentSection === 'juez_exams' && (roleMode === 'juez' || roleMode === 'administrador') && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Acta de Calificaciones de Exámenes (Juez)</h3>
              
              <div className="space-y-sm max-w-[600px]">
                <label className="font-label-md text-label-md block">Selecciona la convocatoria de examen a abrir:</label>
                <select 
                  value={juezSelectedExamId}
                  onChange={(e) => setJuezSelectedExamId(e.target.value)}
                  className="w-full bg-white border border-outline-variant p-md rounded text-xs font-semibold focus:outline-none"
                >
                  <option value="">-- Seleccionar Examen Abierto --</option>
                  {loadedExams.map(ex => (
                    <option key={ex.id} value={ex.id}>
                      {ex.grado_objetivo_id} - Sede: {ex.sede} (Fecha: {new Date(ex.fecha).toLocaleDateString('es-ES')})
                    </option>
                  ))}
                </select>
              </div>

              {juezSelectedExamId && (
                <div className="pt-md space-y-md">
                  <h4 className="font-headline-sm text-headline-sm text-primary font-bold">Aspirantes Inscritos en este Examen</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-surface-container text-on-surface font-label-md text-label-md border-b border-outline-variant">
                          <th className="p-md">Aspirante</th>
                          <th className="p-md">Puntaje KATA (0-10)</th>
                          <th className="p-md">Puntaje KUMITE (0-10)</th>
                          <th className="p-md">Decisión Final</th>
                          <th className="p-md">Guardar</th>
                        </tr>
                      </thead>
                      <tbody className="font-body-md text-body-md divide-y divide-outline-variant">
                        {loadedAdminEnrollments
                          .filter(enroll => enroll.examen_id === juezSelectedExamId && enroll.estado === 'aprobada')
                          .map((enroll) => (
                            <tr key={enroll.id}>
                              <td className="p-md font-semibold">{enroll.profiles?.full_name || enroll.federado_id}</td>
                              <td className="p-md">
                                <input 
                                  value={gradingKata[enroll.id] || ''}
                                  onChange={(e) => setGradingKata({ ...gradingKata, [enroll.id]: Number(e.target.value) })}
                                  type="number" 
                                  step="0.1" 
                                  min="0" 
                                  max="10" 
                                  className="w-20 bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none"
                                  placeholder="e.g. 7.5"
                                />
                              </td>
                              <td className="p-md">
                                <input 
                                  value={gradingKumite[enroll.id] || ''}
                                  onChange={(e) => setGradingKumite({ ...gradingKumite, [enroll.id]: Number(e.target.value) })}
                                  type="number" 
                                  step="0.1" 
                                  min="0" 
                                  max="10" 
                                  className="w-20 bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none"
                                  placeholder="e.g. 6.8"
                                />
                              </td>
                              <td className="p-md">
                                <select
                                  value={gradingStatus[enroll.id] || 'apto'}
                                  onChange={(e) => setGradingStatus({ ...gradingStatus, [enroll.id]: e.target.value })}
                                  className="bg-white border border-outline-variant p-sm rounded text-xs font-semibold focus:outline-none"
                                >
                                  <option value="apto">Apto</option>
                                  <option value="no_apto">No Apto</option>
                                  <option value="pendiente">Pendiente</option>
                                </select>
                              </td>
                              <td className="p-md">
                                <button
                                  onClick={() => handleJuezGrade(enroll.id)}
                                  className="bg-blue-600 text-white font-bold text-[10px] px-sm py-1 rounded hover:bg-blue-700"
                                >
                                  Calificar
                                </button>
                              </td>
                            </tr>
                          ))}
                        {loadedAdminEnrollments.filter(enroll => enroll.examen_id === juezSelectedExamId && enroll.estado === 'aprobada').length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-md text-center">No hay aspirantes aprobados pendientes de evaluación en este examen.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ==================== ÁREA ADMINISTRACIÓN ==================== */}

          {/* 13. CUENTAS USUARIOS (Admin) */}
          {currentSection === 'system_users' && roleMode === 'administrador' && (
            <section className="space-y-gutter">
              {/* Form to create accounts */}
              <div className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
                <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Crear Nueva Cuenta Federativa</h3>
                <form onSubmit={handleAdminCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-md items-end">
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md">Nombre y Apellidos</label>
                    <input 
                      value={adminUserFullname}
                      onChange={(e) => setAdminUserFullname(e.target.value)}
                      type="text" 
                      className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                      placeholder="e.g. Manuel Nakazato" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md">Correo electrónico</label>
                    <input 
                      value={adminUserEmail}
                      onChange={(e) => setAdminUserEmail(e.target.value)}
                      type="email" 
                      className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                      placeholder="e.g. manuel@fmk.es" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md">Contraseña</label>
                    <input 
                      value={adminUserPass}
                      onChange={(e) => setAdminUserPass(e.target.value)}
                      type="password" 
                      className="w-full bg-white border border-outline-variant p-sm rounded text-xs focus:outline-none" 
                      placeholder="Mínimo 8 caracteres" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md">Rol asignado</label>
                    <select
                      value={adminUserRole}
                      onChange={(e) => setAdminUserRole(e.target.value as UserRole)}
                      className="w-full bg-white border border-outline-variant p-sm rounded text-xs font-semibold focus:outline-none"
                    >
                      <option value="aspirante">Aspirante</option>
                      <option value="director">Director</option>
                      <option value="juez">Juez</option>
                      <option value="administrador">Administrador</option>
                    </select>
                  </div>
                  {adminUserRole === 'aspirante' && (
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md">Grado (Cinturón) inicial</label>
                      <select
                        value={adminUserGrade}
                        onChange={(e) => setAdminUserGrade(e.target.value)}
                        className="w-full bg-white border border-outline-variant p-sm rounded text-xs font-semibold focus:outline-none"
                      >
                        <option value="blanco">Cinturón Blanco</option>
                        <option value="amarillo">Cinturón Amarillo</option>
                        <option value="naranja">Cinturón Naranja</option>
                        <option value="verde">Cinturón Verde</option>
                        <option value="azul">Cinturón Azul</option>
                        <option value="marron">Cinturón Marrón</option>
                        <option value="1dan">Cinturón Negro 1º DAN</option>
                        <option value="2dan">Cinturón Negro 2º DAN</option>
                        <option value="3dan">Cinturón Negro 3º DAN</option>
                      </select>
                    </div>
                  )}
                  <div className="col-span-4 flex justify-end">
                    <button 
                      type="submit" 
                      className="bg-primary text-white font-bold text-xs py-sm px-lg rounded-lg hover:bg-primary-container"
                    >
                      Crear Usuario
                    </button>
                  </div>
                </form>
              </div>

              {/* List of user accounts with activate/deactivate action */}
              <div className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
                <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Listado y Habilitación de Cuentas de Usuario</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-container text-on-surface font-label-md text-label-md border-b border-outline-variant">
                        <th className="p-md">Nombre</th>
                        <th className="p-md">Licencia</th>
                        <th className="p-md">Rol</th>
                        <th className="p-md">Estado</th>
                        <th className="p-md">Acciones Cuenta</th>
                      </tr>
                    </thead>
                    <tbody className="font-body-md text-body-md divide-y divide-outline-variant">
                      {allProfiles.map(prof => (
                        <tr key={prof.id}>
                          <td className="p-md font-semibold">{prof.full_name}</td>
                          <td className="p-md">{prof.license_number || 'Sin Licencia'}</td>
                          <td className="p-md font-bold uppercase text-secondary">{prof.role}</td>
                          <td className="p-md">
                            <span className={`px-sm py-[2px] rounded text-[9px] font-bold ${prof.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {prof.active ? 'ACTIVA' : 'DESACTIVADA'}
                            </span>
                          </td>
                          <td className="p-md">
                            <button
                              onClick={() => handleToggleUserActive(prof.id, prof.active)}
                              className={`text-[9px] font-bold px-sm py-[3px] rounded transition-all ${
                                prof.active ? 'bg-red-50 text-error hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'
                              }`}
                            >
                              {prof.active ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* 14. DESCARGA DOCUMENTAL (Admin) */}
          {currentSection === 'system_docs' && roleMode === 'administrador' && (
            <section className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Descarga y Exportación de Expedientes de Exámenes</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-container text-on-surface font-label-md text-label-md border-b border-outline-variant">
                      <th className="p-md">Candidato</th>
                      <th className="p-md">Convocatoria</th>
                      <th className="p-md">Estado Solicitud</th>
                      <th className="p-md">Documentos Adjuntos</th>
                      <th className="p-md">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-body-md divide-y divide-outline-variant">
                    {loadedAdminEnrollments.map(enroll => (
                      <tr key={enroll.id}>
                        <td className="p-md font-semibold">{enroll.profiles?.full_name || enroll.federado_id}</td>
                        <td className="p-md font-bold">{enroll.examen_id}</td>
                        <td className="p-md uppercase font-bold text-[9px] text-amber-700">{enroll.estado}</td>
                        <td className="p-md font-medium italic">dni_digital.pdf, licencias_2026.pdf</td>
                        <td className="p-md">
                          <button
                            onClick={() => handleDownloadExpediente(enroll.profiles?.full_name || enroll.federado_id)}
                            className="bg-primary text-white font-bold text-[10px] px-sm py-1 rounded hover:bg-primary-container"
                          >
                            Descargar Expediente (ZIP)
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
