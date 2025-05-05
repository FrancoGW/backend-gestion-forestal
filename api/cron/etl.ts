import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { MongoClient, Db } from 'mongodb';

// Configuración desde variables de entorno
const ADMIN_API_URL = process.env.ADMIN_API_URL || 'https://gis.fasa.ibc.ar/ordenes/json-tablas-adm';
const WORK_ORDERS_API_URL = process.env.WORK_ORDERS_API_URL || 'https://gis.fasa.ibc.ar/ordenes/json-ordenes';
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'gestion_forestal';

// Conexión a MongoDB
let db: Db;

async function conectarBaseDatos() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Cron job conectado a MongoDB');
    return client.db(DB_NAME);
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    throw error;
  }
}

// Funciones para obtener datos de las APIs
async function obtenerDatosAdministrativos() {
  try {
    const response = await axios.get(ADMIN_API_URL);
    return response.data;
  } catch (error) {
    console.error('Error al obtener datos administrativos:', error);
    throw error;
  }
}

async function obtenerOrdenesDeTrabajoAPI() {
  try {
    const response = await axios.get(WORK_ORDERS_API_URL);
    return response.data;
  } catch (error) {
    console.error('Error al obtener órdenes de trabajo:', error);
    throw error;
  }
}

// Procesar datos administrativos
async function procesarDatosAdministrativos(datosAdmin: any) {
  const colecciones = [
    { nombre: 'zonas', datos: datosAdmin.zonas || [] },
    { nombre: 'propietarios', datos: datosAdmin.propietarios || [] },
    { nombre: 'campos', datos: datosAdmin.campos || [] },
    { nombre: 'empresas', datos: datosAdmin.empresas || [] },
    { nombre: 'actividades', datos: datosAdmin.actividades || [] },
    { nombre: 'usuarios', datos: datosAdmin.usuarios || [] },
    { nombre: 'tiposUso', datos: datosAdmin.tiposUso || [] },
    { nombre: 'especies', datos: datosAdmin.especies || [] },
    { nombre: 'ambientales', datos: datosAdmin.ambientales || [] },
    { nombre: 'insumos', datos: datosAdmin.insumos || [] },
  ];
  
  for (const coleccion of colecciones) {
    try {
      await db.collection(coleccion.nombre).createIndex({ _id: 1 }, { unique: true });
      
      for (const item of coleccion.datos) {
        await db.collection(coleccion.nombre).updateOne(
          { _id: item._id }, 
          { $set: item }, 
          { upsert: true }
        );
      }
      console.log(`Actualizados ${coleccion.datos.length} documentos en ${coleccion.nombre}`);
    } catch (error) {
      console.error(`Error al procesar ${coleccion.nombre}:`, error);
    }
  }
}

// Procesar órdenes de trabajo
async function procesarOrdenesDeTrabajoAPI(ordenes: any[]) {
  try {
    const coleccion = db.collection('ordenesTrabajoAPI');
    await coleccion.createIndex({ _id: 1 }, { unique: true });
    
    for (const orden of ordenes) {
      await coleccion.updateOne(
        { _id: orden._id }, 
        { $set: orden }, 
        { upsert: true }
      );
    }
    console.log(`Procesadas ${ordenes.length} órdenes de trabajo`);
  } catch (error) {
    console.error('Error al procesar órdenes de trabajo:', error);
  }
}

// En src/api/cron/etl.ts
// Función del handler de la API
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log('Iniciando cron job ETL diario en', new Date().toISOString());
    
    // Solo permitir solicitudes GET
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Método no permitido' });
    }
    
    try {
      // Verificar cron secret si se proporciona
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'No autorizado' });
      }
      
      // Conectar a MongoDB
      db = await conectarBaseDatos();
      
      // Obtener datos de las APIs
      const [datosAdmin, ordenesTrabajoAPI] = await Promise.all([
        obtenerDatosAdministrativos(),
        obtenerOrdenesDeTrabajoAPI()
      ]);
      
      // Procesar los datos
      await procesarDatosAdministrativos(datosAdmin);
      await procesarOrdenesDeTrabajoAPI(ordenesTrabajoAPI);
      
      console.log('Cron job ETL diario completado con éxito en', new Date().toISOString());
      res.status(200).json({ success: true, mensaje: 'Proceso ETL completado con éxito' });
    } catch (error) {
      console.error('Error en cron job ETL:', error);
      res.status(500).json({ error: 'Proceso ETL falló' });
    }
  }