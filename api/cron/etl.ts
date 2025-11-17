import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { MongoClient, Db } from 'mongodb';

// Configuración desde variables de entorno
const ADMIN_API_URL = process.env.ADMIN_API_URL || 'https://gis.fasa.ibc.ar/ordenes/json-tablas-adm';
const WORK_ORDERS_API_URL = process.env.WORK_ORDERS_API_URL || 'https://gis.fasa.ibc.ar/api/ordenes/listar';
const WORK_ORDERS_API_KEY = process.env.WORK_ORDERS_API_KEY || 'c3kvEUZ3yqzjU7ePcqesLUOZfaijujtRbl1tswiscXY7XxcU2LuZtvlB9I0oAq2g';
const WORK_ORDERS_FROM_DATE = process.env.WORK_ORDERS_FROM_DATE || '2020-01-01';
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'gestion_forestal';

// Conexión a MongoDBasdasdsa
let db: Db;

async function conectarBaseDatos() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    return client.db(DB_NAME);
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    throw error;
  }
}

// Funciones para obtener datos de las APIsasdasdasd
async function obtenerDatosAdministrativos() {
  try {
    const response = await axios.get(ADMIN_API_URL);
    return response.data;
  } catch (error) {
    console.error('Error al obtener datos administrativos:', error);
    throw error;
  }
}

async function obtenerOrdenesDeTrabajoAPI(fechaDesde?: string) {
  try {
    const fecha = fechaDesde || WORK_ORDERS_FROM_DATE;
    console.log(`Obteniendo órdenes desde: ${fecha}`);
    const response = await axios.get(WORK_ORDERS_API_URL, {
      headers: {
        'x-api-key': WORK_ORDERS_API_KEY,
      },
      params: {
        from: fecha,
      },
    });
    
    // Log para debugging
    console.log('Respuesta de API - Status:', response.status);
    console.log('Respuesta de API - Tipo de datos:', typeof response.data);
    console.log('Respuesta de API - Es array?', Array.isArray(response.data));
    
    // Manejar diferentes estructuras de respuesta
    let ordenes = response.data;
    
    // Si la respuesta es un objeto, intentar extraer el array
    if (ordenes && typeof ordenes === 'object' && !Array.isArray(ordenes)) {
      // Intentar diferentes propiedades comunes
      if (ordenes.data && Array.isArray(ordenes.data)) {
        ordenes = ordenes.data;
        console.log('Órdenes extraídas de response.data.data');
      } else if (ordenes.ordenes && Array.isArray(ordenes.ordenes)) {
        ordenes = ordenes.ordenes;
        console.log('Órdenes extraídas de response.data.ordenes');
      } else if (ordenes.results && Array.isArray(ordenes.results)) {
        ordenes = ordenes.results;
        console.log('Órdenes extraídas de response.data.results');
      }
    }
    
    // Validar que sea un array
    if (!Array.isArray(ordenes)) {
      console.error('La respuesta no es un array. Estructura recibida:', JSON.stringify(ordenes).substring(0, 500));
      return [];
    }
    
    console.log(`Total de órdenes recibidas: ${ordenes.length}`);
    if (ordenes.length > 0) {
      console.log(`Primera orden - ID: ${ordenes[0]._id}, Fecha: ${ordenes[0].fecha || 'N/A'}`);
    }
    
    return ordenes;
  } catch (error: any) {
    console.error('Error al obtener órdenes de trabajo:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
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
    { nombre: 'jefes_de_area', datos: datosAdmin.jefes_de_area || [] },
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
    } catch (error) {
      console.error(`Error al procesar ${coleccion.nombre}:`, error);
    }
  }
}

// Procesar órdenes de trabajo
async function procesarOrdenesDeTrabajoAPI(ordenes: any[]) {
  try {
    if (!Array.isArray(ordenes)) {
      console.error('procesarOrdenesDeTrabajoAPI: Se esperaba un array pero se recibió:', typeof ordenes);
      return;
    }
    
    if (ordenes.length === 0) {
      console.log('No hay órdenes para procesar');
      return;
    }
    
    const coleccion = db.collection('ordenesTrabajoAPI');
    await coleccion.createIndex({ _id: 1 }, { unique: true });
    
    let procesadas = 0;
    let errores = 0;
    
    for (const orden of ordenes) {
      try {
        // Validar que la orden tenga _id
        if (!orden._id) {
          console.warn('Orden sin _id, saltando:', JSON.stringify(orden).substring(0, 200));
          errores++;
          continue;
        }
        
        await coleccion.updateOne(
          { _id: orden._id }, 
          { $set: orden }, 
          { upsert: true }
        );
        procesadas++;
      } catch (error: any) {
        console.error(`Error al procesar orden ${orden._id}:`, error.message);
        errores++;
      }
    }
    
    console.log(`Órdenes procesadas: ${procesadas}, Errores: ${errores}`);
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
      // Verificar cron secret si se proporcionaasdasdasdasdasdasdasd
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'No autorizado' });
      }
      
      // Conectar a MongoDB
      db = await conectarBaseDatos();
      
      // Permitir sobrescribir la fecha desde query parameter (útil para forzar recarga completa)
      const fechaDesde = req.query.from as string | undefined;
      if (fechaDesde) {
        console.log(`Fecha desde sobrescrita por parámetro: ${fechaDesde}`);
      }
      
      // Obtener datos de las APIs
      const [datosAdmin, ordenesTrabajoAPI] = await Promise.all([
        obtenerDatosAdministrativos(),
        obtenerOrdenesDeTrabajoAPI(fechaDesde)
      ]);
      
      // Procesar los datos
      await procesarDatosAdministrativos(datosAdmin);
      await procesarOrdenesDeTrabajoAPI(ordenesTrabajoAPI);
      
      res.status(200).json({ success: true, mensaje: 'Proceso ETL completado con éxito' });
    } catch (error) {
      console.error('Error en cron job ETL:', error);
      res.status(500).json({ error: 'Proceso ETL falló' });
    }
  }