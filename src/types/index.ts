export type UserRole = 'aspirante' | 'director' | 'juez' | 'administrador';

export interface Club {
  id: string;
  nombre: string;
  sede: string;
  director_nombre: string;
  created_at?: string;
}

export interface Inscripcion {
  id: string;
  federado_id: string;
  examen_id: string;
  estado: 'borrador' | 'pendiente_documentacion' | 'pendiente_pago' | 'pendiente_revision' | 'aprobada' | 'rechazada' | 'completada' | 'cancelada';
  resultado: 'apto' | 'no_apto' | 'pendiente' | 'exento' | null;
  validacion_snapshot: any;
  fecha_inscripcion: string;
  observaciones_director?: string;
  puntuacion_kata?: number;
  puntuacion_kumite?: number;
  juez_id?: string;
  dni_file_id?: string;
  lic_file_id?: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    license_number: string | null;
  };
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  dni_nie: string | null;
  birth_date: string | null;
  phone: string | null;
  club_id: string | null;
  license_number: string | null;
  current_grado_id: string | null;
  current_grado_since: string | null;
  avatar_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  current_grado?: Grado;
}

export interface Grado {
  id: string;
  nombre: string;
  tipo: 'kyu' | 'dan';
  orden: number;
  created_at: string;
}

export interface NormativaVersion {
  id: string;
  nombre: string;
  fecha_publicacion: string;
  pdf_url: string | null;
  vigente: boolean;
  created_at: string;
}

export interface RequisitoGrado {
  id: string;
  normativa_version_id: string;
  grado_objetivo_id: string;
  grado_previo_requerido_id: string | null;
  edad_minima: number;
  permanencia_anios: number;
  licencias_consecutivas_requeridas: number | null;
  licencias_alternas_requeridas: number | null;
  observaciones: string | null;
}

export interface Examen {
  id: string;
  grado_objetivo_id: string;
  fecha: string;
  sede: string;
  tribunal: string | null;
  cupo_maximo: number | null;
  estado: 'borrador' | 'abierta' | 'cerrada' | 'cancelada';
  fecha_limite_inscripcion: string | null;
}


export interface Kata {
  id: string;
  nombre: string;
  grado_id: string;
  tipo: 'obligatoria' | 'libre';
  descripcion: string | null;
  video_url: string | null;
  origen: string | null;
}

export interface Pago {
  id: string;
  inscripcion_id: string;
  tasa_id: string | null;
  importe: number;
  metodo: 'transferencia' | 'tarjeta' | 'efectivo' | 'pasarela';
  estado: 'pendiente' | 'pagado' | 'reembolsado' | 'anulado';
  referencia: string | null;
  referencia_externa: string | null;
  fecha_pago: string | null;
  created_at: string;
}

export interface ValidationRequirementItem {
  apto: boolean;
  actual: any;
  requerido: any;
}

export interface ValidationResult {
  apto: boolean;
  datos_completos: boolean;
  progresion_secuencial: {
    apto: boolean;
    actual_id: string | null;
    requerido_id: string | null;
    actual_nombre: string;
    requerido_nombre: string;
  };
  edad: ValidationRequirementItem;
  permanencia: ValidationRequirementItem;
  licencias: {
    apto: boolean;
    actual: number;
    consecutivas_requeridas: number;
    alternas_requeridas: number;
  };
  grado_objetivo_nombre?: string;
  fecha_validacion?: string;
  error?: string;
}
