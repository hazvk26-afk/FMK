import { Client, Databases, Account } from 'appwrite';

const client = new Client();

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || 'fmk-grados';
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'FMK2026';

client
  .setEndpoint(endpoint)
  .setProject(projectId);

export const databases = new Databases(client);
export const account = new Account(client);

export const APPWRITE_CONFIG = {
  databaseId,
  collections: {
    profiles: 'profiles',
    grados: 'grados',
    requisitos_grado: 'requisitos_grado',
    examenes: 'examenes',
    inscripciones: 'inscripciones',
    katas: 'katas',
    pagos: 'pagos',
    licencias_federativas: 'licencias_federativas',
    clubes: 'clubes'
  }
};
