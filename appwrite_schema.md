# Guía de Creación de Base de Datos en Appwrite

Para que la aplicación funcione con Appwrite, debes crear una base de datos con el ID `fmk_db` (o el que configures en tu `.env`) y las siguientes colecciones y atributos en tu consola de Appwrite (https://cloud.appwrite.io):

## 1. Colección `profiles` (ID de colección: `profiles`)
Crea los siguientes atributos en esta colección:
- `role`: String (tamaño 20, requerido: true) - Valores permitidos: `aspirante`, `director`
- `full_name`: String (tamaño 100, requerido: false)
- `dni_nie`: String (tamaño 20, requerido: false)
- `birth_date`: String (tamaño 30, requerido: false) - Almacenar en formato ISO (e.g. `YYYY-MM-DD`)
- `phone`: String (tamaño 20, requerido: false)
- `license_number`: String (tamaño 20, requerido: false)
- `current_grado_id`: String (tamaño 20, requerido: false)
- `current_grado_since`: String (tamaño 30, requerido: false)
- `active`: Boolean (default: true, requerido: true)

*Permisos (Settings):* 
- Añadir rol `Any` con permisos de `Read`.
- Añadir rol `users` con permisos de `Update` (para que editen su propio perfil) o configurar según convenga.

---

## 2. Colección `grados` (ID de colección: `grados`)
Crea los siguientes atributos:
- `nombre`: String (tamaño 50, requerido: true)
- `tipo`: String (tamaño 10, requerido: true) - Valores: `kyu`, `dan`
- `orden`: Integer (requerido: true)

*Permisos (Settings):*
- Rol `Any` con permisos de `Read`.

---

## 3. Colección `requisitos_grado` (ID de colección: `requisitos_grado`)
Crea los siguientes atributos:
- `grado_objetivo_id`: String (tamaño 20, requerido: true)
- `grado_previo_requerido_id`: String (tamaño 20, requerido: false)
- `edad_minima`: Integer (requerido: true)
- `permanencia_anios`: Integer (requerido: true)
- `licencias_consecutivas_requeridas`: Integer (requerido: true)
- `licencias_alternas_requeridas`: Integer (requerido: true)
- `observaciones`: String (tamaño 500, requerido: false)

*Permisos (Settings):*
- Rol `Any` con permisos de `Read`.

---

## 4. Colección `examenes` (ID de colección: `examenes`)
Crea los siguientes atributos:
- `grado_objetivo_id`: String (tamaño 20, requerido: true)
- `fecha`: String (tamaño 30, requerido: true)
- `sede`: String (tamaño 100, requerido: true)
- `tribunal`: String (tamaño 100, requerido: false)
- `cupo_maximo`: Integer (requerido: false)
- `estado`: String (tamaño 20, requerido: true) - Valores: `borrador`, `abierta`, `cerrada`

*Permisos (Settings):*
- Rol `Any` con permisos de `Read`.

---

## 5. Colección `inscripciones` (ID de colección: `inscripciones`)
Crea los siguientes atributos:
- `federado_id`: String (tamaño 50, requerido: true)
- `examen_id`: String (tamaño 50, requerido: true)
- `estado`: String (tamaño 30, requerido: true) - Valores: `borrador`, `pendiente_documentacion`, `pendiente_pago`, `pendiente_revision`, `aprobada`, `rechazada`
- `resultado`: String (tamaño 20, requerido: false) - Valores: `apto`, `no_apto`, `pendiente`, `exento`
- `validacion_snapshot`: String (tamaño 2000, requerido: false) - Almacenar como String de JSON stringificado
- `fecha_inscripcion`: String (tamaño 30, requerido: true)

*Permisos (Settings):*
- Rol `users` con permisos de `Create` y `Read`.

---

## 6. Colección `licencias_federativas` (ID de colección: `licencias_federativas`)
Crea los siguientes atributos:
- `federado_id`: String (tamaño 50, requerido: true)
- `numero`: String (tamaño 30, requerido: true)
- `anio_ejercicio`: Integer (requerido: true)
- `estado`: String (tamaño 20, requerido: true) - Valores: `activa`, `vencida`, `anulada`

*Permisos (Settings):*
- Rol `users` con permisos de `Read`.

---

## 7. Colección `katas` (ID de colección: `katas`)
Crea los siguientes atributos:
- `nombre`: String (tamaño 50, requerido: true)
- `grado_id`: String (tamaño 20, requerido: true)
- `tipo`: String (tamaño 20, requerido: true) - Valores: `obligatoria`, `libre`
- `descripcion`: String (tamaño 500, requerido: false)

---

## 8. Colección `pagos` (ID de colección: `pagos`)
Crea los siguientes atributos:
- `inscripcion_id`: String (tamaño 50, requerido: true)
- `importe`: Float (requerido: true)
- `estado`: String (tamaño 20, requerido: true) - Valores: `pendiente`, `pagado`
- `referencia`: String (tamaño 50, requerido: false)
- `created_at`: String (tamaño 30, requerido: true)
