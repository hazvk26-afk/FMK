const fs = require('fs');
const path = require('path');

// Read config from .env in the project directory
const envPath = path.join(__dirname, '.env');
let endpoint = 'https://nyc.cloud.appwrite.io/v1';
let projectId = '6a581f8f001ba3f207cd';
let databaseId = 'FMK2026';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith('VITE_APPWRITE_ENDPOINT=')) {
      endpoint = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_APPWRITE_PROJECT_ID=')) {
      projectId = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_APPWRITE_DATABASE_ID=')) {
      databaseId = line.split('=')[1].trim();
    }
  }
}

const apiKey = process.argv[2];

if (!apiKey) {
  console.error('\x1b[31mError: Debes proporcionar tu Appwrite API Key como argumento.\x1b[0m');
  console.log('Uso: node setup_appwrite.cjs [TU_API_KEY]\n');
  process.exit(1);
}

console.log('\x1b[36m=== CONFIGURACIÓN DE APPWRITE FMK ===\x1b[0m');
console.log(`Endpoint:   ${endpoint}`);
console.log(`Project ID: ${projectId}`);
console.log(`Database:   ${databaseId}\n`);

async function apiRequest(method, urlPath, body = null) {
  const url = `${endpoint}${urlPath}`;
  const options = {
    method,
    headers: {
      'x-appwrite-project': projectId,
      'x-appwrite-key': apiKey,
      'content-type': 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status} en ${urlPath}: ${errText}`);
  }
  return res.json();
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const collections = [
  {
    id: 'profiles',
    name: 'Profiles',
    attributes: [
      { type: 'string', key: 'id', size: 50, required: true },
      { type: 'string', key: 'role', size: 20, required: true },
      { type: 'string', key: 'full_name', size: 100, required: false },
      { type: 'string', key: 'dni_nie', size: 20, required: false },
      { type: 'string', key: 'birth_date', size: 30, required: false },
      { type: 'string', key: 'phone', size: 20, required: false },
      { type: 'string', key: 'license_number', size: 20, required: false },
      { type: 'string', key: 'current_grado_id', size: 20, required: false },
      { type: 'string', key: 'current_grado_since', size: 30, required: false },
      { type: 'boolean', key: 'active', required: false, default: true }
    ]
  },
  {
    id: 'grados',
    name: 'Grados',
    attributes: [
      { type: 'string', key: 'nombre', size: 50, required: true },
      { type: 'string', key: 'tipo', size: 10, required: true },
      { type: 'integer', key: 'orden', required: true }
    ]
  },
  {
    id: 'requisitos_grado',
    name: 'Requisitos de Grado',
    attributes: [
      { type: 'string', key: 'grado_objetivo_id', size: 20, required: true },
      { type: 'string', key: 'grado_previo_requerido_id', size: 20, required: false },
      { type: 'integer', key: 'edad_minima', required: true },
      { type: 'integer', key: 'permanencia_anios', required: true },
      { type: 'integer', key: 'licencias_consecutivas_requeridas', required: true },
      { type: 'integer', key: 'licencias_alternas_requeridas', required: true },
      { type: 'string', key: 'observaciones', size: 500, required: false }
    ]
  },
  {
    id: 'examenes',
    name: 'Examenes',
    attributes: [
      { type: 'string', key: 'grado_objetivo_id', size: 20, required: true },
      { type: 'string', key: 'fecha', size: 30, required: true },
      { type: 'string', key: 'sede', size: 100, required: true },
      { type: 'string', key: 'tribunal', size: 100, required: false },
      { type: 'integer', key: 'cupo_maximo', required: false },
      { type: 'string', key: 'estado', size: 20, required: true }
    ]
  },
  {
    id: 'inscripciones',
    name: 'Inscripciones',
    attributes: [
      { type: 'string', key: 'federado_id', size: 50, required: true },
      { type: 'string', key: 'examen_id', size: 50, required: true },
      { type: 'string', key: 'estado', size: 30, required: true },
      { type: 'string', key: 'resultado', size: 20, required: false },
      { type: 'string', key: 'validacion_snapshot', size: 2000, required: false },
      { type: 'string', key: 'fecha_inscripcion', size: 30, required: true },
      { type: 'float', key: 'puntuacion_kata', required: false },
      { type: 'float', key: 'puntuacion_kumite', required: false },
      { type: 'string', key: 'juez_id', size: 50, required: false },
      { type: 'string', key: 'dni_file_id', size: 100, required: false },
      { type: 'string', key: 'lic_file_id', size: 100, required: false }
    ]
  },
  {
    id: 'licencias_federativas',
    name: 'Licencias Federativas',
    attributes: [
      { type: 'string', key: 'federado_id', size: 50, required: true },
      { type: 'string', key: 'numero', size: 30, required: true },
      { type: 'integer', key: 'anio_ejercicio', required: true },
      { type: 'string', key: 'estado', size: 20, required: true }
    ]
  },
  {
    id: 'katas',
    name: 'Katas',
    attributes: [
      { type: 'string', key: 'nombre', size: 50, required: true },
      { type: 'string', key: 'grado_id', size: 20, required: true },
      { type: 'string', key: 'tipo', size: 20, required: true },
      { type: 'string', key: 'descripcion', size: 500, required: false }
    ]
  },
  {
    id: 'pagos',
    name: 'Pagos',
    attributes: [
      { type: 'string', key: 'inscripcion_id', size: 50, required: true },
      { type: 'float', key: 'importe', required: true },
      { type: 'string', key: 'estado', size: 20, required: true },
      { type: 'string', key: 'referencia', size: 30, required: true },
      { type: 'string', key: 'created_at', size: 30, required: true }
    ]
  },
  {
    id: 'clubes',
    name: 'Clubes',
    attributes: [
      { type: 'string', key: 'nombre', size: 100, required: true },
      { type: 'string', key: 'sede', size: 100, required: true },
      { type: 'string', key: 'director_nombre', size: 100, required: false }
    ]
  }
];

async function run() {
  try {
    // 1. Verificar/Crear base de datos - omitido porque ya existe FMK2026 en tu consola
    console.log(`Utilizando base de datos existente: "${databaseId}"`);

    // 2. Crear colecciones y atributos
    for (const col of collections) {
      console.log(`\nProcesando colección "${col.id}"...`);
      let colExists = false;
      try {
        await apiRequest('GET', `/databases/${databaseId}/collections/${col.id}`);
        colExists = true;
        console.log(`Colección "${col.id}" ya existe.`);
      } catch (err) {
        // No existe, la creamos
      }

      if (!colExists) {
        console.log(`Creando colección "${col.id}"...`);
        // We set permissions to enable ANY read, write, etc. (for sandbox client access)
        await apiRequest('POST', `/databases/${databaseId}/collections`, {
          collectionId: col.id,
          name: col.name,
          permissions: [
            'read("any")',
            'create("any")',
            'update("any")',
            'delete("any")'
          ],
          documentSecurity: false
        });
        console.log(`Colección "${col.id}" creada con éxito.`);
      }

      // Obtener atributos existentes
      const colMeta = await apiRequest('GET', `/databases/${databaseId}/collections/${col.id}`);
      const existingKeys = colMeta.attributes.map(a => a.key);

      // Crear atributos faltantes
      for (const attr of col.attributes) {
        if (existingKeys.includes(attr.key)) {
          console.log(`Atributo "${attr.key}" ya existe.`);
          continue;
        }

        console.log(`Creando atributo "${attr.key}" (${attr.type})...`);
        let attrPath = '';
        const body = {
          key: attr.key,
          required: attr.required,
        };
        if (attr.default !== undefined) {
          body.default = attr.default;
        }

        if (attr.type === 'string') {
          attrPath = '/attributes/string';
          body.size = attr.size;
        } else if (attr.type === 'integer') {
          attrPath = '/attributes/integer';
        } else if (attr.type === 'boolean') {
          attrPath = '/attributes/boolean';
        } else if (attr.type === 'float') {
          attrPath = '/attributes/float';
        }

        await apiRequest('POST', `/databases/${databaseId}/collections/${col.id}${attrPath}`, body);
        console.log(`Atributo "${attr.key}" enviado a creación.`);
        await sleep(500); // Pequeña pausa para no saturar
      }

      // Esperar a que los atributos se procesen
      console.log('Esperando procesamiento de esquema de atributos...');
      await sleep(3000);
    }

    // 3. Verificar/Crear Bucket de Almacenamiento
    console.log('\nVerificando bucket de almacenamiento "documentos_aspirantes"...');
    let bucketExists = false;
    try {
      await apiRequest('GET', '/storage/buckets/documentos_aspirantes');
      bucketExists = true;
      console.log('El bucket "documentos_aspirantes" ya existe.');
    } catch (err) {
      // No existe
    }

    if (!bucketExists) {
      console.log('Creando bucket "documentos_aspirantes"...');
      await apiRequest('POST', '/storage/buckets', {
        bucketId: 'documentos_aspirantes',
        name: 'Documentos de Aspirantes',
        permissions: [
          'read("any")',
          'create("any")',
          'update("any")',
          'delete("any")'
        ],
        fileSecurity: false,
        allowedFileExtensions: ['pdf', 'jpg', 'jpeg', 'png']
      });
      console.log('Bucket "documentos_aspirantes" creado con éxito.');
    }

    console.log('\n\x1b[32m=== ¡CONFIGURACIÓN DE TABLAS Y STORAGE DE APPWRITE COMPLETADA CON ÉXITO! ===\x1b[0m');
    console.log('Ahora puedes abrir tu página de Netlify, registrarte y hacer clic en "Sembrar Base de Datos" en el Panel Dirección.');
  } catch (error) {
    console.error('\n\x1b[31mError durante el proceso:\x1b[0m', error.message);
  }
}

run();
