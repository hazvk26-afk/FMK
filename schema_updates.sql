-- schema_updates.sql
-- Ejecutar en el editor SQL de Supabase para crear las políticas de seguridad (RLS) 
-- y la función RPC de validación de elegibilidad requerida por la V1 del sistema.

-- =========================================================================
-- 1. POLÍTICAS DE SEGURIDAD A NIVEL DE FILA (RLS) - SECCIÓN 5.18 Y 14
-- =========================================================================

-- Asegurarse de que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisitos_grado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normativa_versions ENABLE ROW LEVEL SECURITY;

-- 1.1 Políticas para la tabla 'profiles'
DROP POLICY IF EXISTS "Permitir lectura de perfil propio o directores" ON public.profiles;
CREATE POLICY "Permitir lectura de perfil propio o directores"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'director'
  )
);

DROP POLICY IF EXISTS "Permitir actualización de perfil propio o directores" ON public.profiles;
CREATE POLICY "Permitir actualización de perfil propio o directores"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'director'
  )
)
WITH CHECK (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'director'
  )
);

-- 1.2 Políticas para tablas maestras: 'requisitos_grado' y 'normativa_versions'
-- Lectura pública para cualquier usuario autenticado
DROP POLICY IF EXISTS "Lectura pública para requisitos_grado" ON public.requisitos_grado;
CREATE POLICY "Lectura pública para requisitos_grado"
ON public.requisitos_grado
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Lectura pública para normativa_versions" ON public.normativa_versions;
CREATE POLICY "Lectura pública para normativa_versions"
ON public.normativa_versions
FOR SELECT
TO authenticated
USING (true);

-- Escritura/Modificación reservada exclusivamente para directores
DROP POLICY IF EXISTS "Escritura exclusiva para directores en requisitos_grado" ON public.requisitos_grado;
CREATE POLICY "Escritura exclusiva para directores en requisitos_grado"
ON public.requisitos_grado
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'director'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'director'
  )
);

DROP POLICY IF EXISTS "Escritura exclusiva para directores en normativa_versions" ON public.normativa_versions;
CREATE POLICY "Escritura exclusiva para directores en normativa_versions"
ON public.normativa_versions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'director'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'director'
  )
);


-- =========================================================================
-- 2. FUNCIÓN RPC: fn_validar_elegibilidad - REQUISITO RF-VAL-03 A RF-VAL-06
-- =========================================================================

CREATE OR REPLACE FUNCTION public.fn_validar_elegibilidad(
  p_federado_id UUID,
  p_grado_objetivo_id UUID,
  p_fecha_referencia TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Permite ejecutar con permisos elevados para realizar la validación de forma segura
AS $$
DECLARE
  v_profile RECORD;
  v_requisito RECORD;
  v_grado_previo_nombre TEXT;
  v_grado_objetivo_nombre TEXT;
  
  -- Variables de cálculo
  v_edad_actual INTEGER;
  v_permanencia_anios NUMERIC;
  v_total_licencias INTEGER;
  
  -- Estados de validación
  v_progresion_secuencial_apto BOOLEAN := FALSE;
  v_edad_apto BOOLEAN := FALSE;
  v_permanencia_apto BOOLEAN := FALSE;
  v_licencias_apto BOOLEAN := FALSE;
  v_apto_global BOOLEAN := FALSE;
  v_datos_completos BOOLEAN := TRUE;
  
  v_result JSONB;
BEGIN
  -- 1. Cargar perfil del federado
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_federado_id AND active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'apto', false,
      'error', 'Federado no encontrado o inactivo',
      'datos_completos', false
    );
  END IF;

  -- 2. Cargar normativa vigente y requisitos del grado objetivo
  SELECT rq.* INTO v_requisito 
  FROM public.requisitos_grado rq
  JOIN public.normativa_versions nv ON rq.normativa_version_id = nv.id
  WHERE rq.grado_objetivo_id = p_grado_objetivo_id AND nv.vigente = TRUE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'apto', false,
      'error', 'No se encontraron requisitos para el grado objetivo en la normativa vigente',
      'datos_completos', false
    );
  END IF;

  -- Cargar nombres de los grados para el reporte
  SELECT nombre INTO v_grado_objetivo_nombre FROM public.grados WHERE id = p_grado_objetivo_id;
  IF v_requisito.grado_previo_requerido_id IS NOT NULL THEN
    SELECT nombre INTO v_grado_previo_nombre FROM public.grados WHERE id = v_requisito.grado_previo_requerido_id;
  ELSE
    v_grado_previo_nombre := 'Ninguno (Grado inicial)';
  END IF;

  -- 3. VALIDACIÓN 1: Progresión Secuencial (RN-02 y RN-06)
  -- El grado actual del federado debe ser igual al grado previo requerido
  IF v_requisito.grado_previo_requerido_id IS NULL THEN
    v_progresion_secuencial_apto := TRUE;
  ELSIF v_profile.current_grado_id = v_requisito.grado_previo_requerido_id THEN
    v_progresion_secuencial_apto := TRUE;
  ELSE
    v_progresion_secuencial_apto := FALSE;
  END IF;

  -- 4. VALIDACIÓN 2: Edad Mínima (RN-01)
  IF v_profile.birth_date IS NOT NULL THEN
    v_edad_actual := extract(year from age(p_fecha_referencia, v_profile.birth_date));
    v_edad_apto := v_edad_actual >= v_requisito.edad_minima;
  ELSE
    v_datos_completos := FALSE;
    v_edad_actual := 0;
    v_edad_apto := FALSE;
  END IF;

  -- 5. VALIDACIÓN 3: Permanencia Mínima (RN-02)
  IF v_profile.current_grado_since IS NOT NULL THEN
    v_permanencia_anios := round((extract(epoch from (p_fecha_referencia - v_profile.current_grado_since)) / 31557600.0)::numeric, 2);
    v_permanencia_apto := v_permanencia_anios >= v_requisito.permanencia_anios;
  ELSE
    v_datos_completos := FALSE;
    v_permanencia_anios := 0.0;
    v_permanencia_apto := FALSE;
  END IF;

  -- 6. VALIDACIÓN 4: Licencias Federativas (RN-03)
  -- Contamos las licencias del federado que no estén anuladas
  SELECT COUNT(*)::INTEGER INTO v_total_licencias 
  FROM public.licencias_federativas 
  WHERE federado_id = p_federado_id AND estado != 'anulada';
  
  -- Se asume apto si las licencias totales cumplen la cuota consecutiva o alterna (simplificado en SQL)
  v_licencias_apto := v_total_licencias >= COALESCE(v_requisito.licencias_consecutivas_requeridas, 0)
                      OR v_total_licencias >= COALESCE(v_requisito.licencias_alternas_requeridas, 0);

  -- 7. Estado Final Agregado (RN-04)
  v_apto_global := v_progresion_secuencial_apto AND v_edad_apto AND v_permanencia_apto AND v_licencias_apto;

  -- Construir el resultado en formato JSONB
  v_result := jsonb_build_object(
    'apto', v_apto_global,
    'datos_completos', v_datos_completos,
    'progresion_secuencial', jsonb_build_object(
      'apto', v_progresion_secuencial_apto,
      'actual_id', v_profile.current_grado_id,
      'requerido_id', v_requisito.grado_previo_requerido_id,
      'actual_nombre', COALESCE((SELECT nombre FROM public.grados WHERE id = v_profile.current_grado_id), 'Desconocido'),
      'requerido_nombre', v_grado_previo_nombre
    ),
    'edad', jsonb_build_object(
      'apto', v_edad_apto,
      'actual', v_edad_actual,
      'requerido', v_requisito.edad_minima
    ),
    'permanencia', jsonb_build_object(
      'apto', v_permanencia_apto,
      'actual', v_permanencia_anios,
      'requerido', v_requisito.permanencia_anios
    ),
    'licencias', jsonb_build_object(
      'apto', v_licencias_apto,
      'actual', v_total_licencias,
      'consecutivas_requeridas', v_requisito.licencias_consecutivas_requeridas,
      'alternas_requeridas', v_requisito.licencias_alternas_requeridas
    ),
    'grado_objetivo_nombre', v_grado_objetivo_nombre,
    'fecha_validacion', p_fecha_referencia
  );

  RETURN v_result;
END;
$$;
