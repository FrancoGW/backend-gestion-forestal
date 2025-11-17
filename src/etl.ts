import axios from 'axios';
import { MongoClient, Db } from 'mongodb';

// Configuración desde variables de entorno
const ADMIN_API_URL = process.env.ADMIN_API_URL || 'https://gis.fasa.ibc.ar/ordenes/json-tablas-adm';
const WORK_ORDERS_API_URL = process.env.WORK_ORDERS_API_URL || 'https://gis.fasa.ibc.ar/api/ordenes/listar';
const WORK_ORDERS_API_KEY = process.env.WORK_ORDERS_API_KEY || 'c3kvEUZ3yqzjU7ePcqesLUOZfaijujtRbl1tswiscXY7XxcU2LuZtvlB9I0oAq2g';
const WORK_ORDERS_FROM_DATE = process.env.WORK_ORDERS_FROM_DATE || '2025-10-01';
const PROTECTION_API_URL = process.env.PROTECTION_API || 'https://gis.fasa.ibc.ar/proteccion/json';
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'gestion_forestal';

// Conexión a MongoDBasdadsadasdas
let db: Db;

async function conectarBaseDatos() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const database = client.db(DB_NAME);
    return database;
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

async function obtenerOrdenesDeTrabajoAPI() {
  try {
    console.log(`Obteniendo órdenes desde: ${WORK_ORDERS_FROM_DATE}`);
    const response = await axios.get(WORK_ORDERS_API_URL, {
      headers: {
        'x-api-key': WORK_ORDERS_API_KEY,
      },
      params: {
        from: WORK_ORDERS_FROM_DATE,
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

async function obtenerDatosProteccion() {
  try {
    const response = await axios.get(PROTECTION_API_URL);
    return response.data;
  } catch (error) {
    console.error('Error al obtener datos de protección:', error);
    throw error;
  }
}

// Procesar datos administrativos
interface DocumentoBase {
  [key: string]: any;
}

async function procesarDatosAdministrativos(datosAdmin: any) {
  const colecciones = [
    { nombre: 'zonas', datos: datosAdmin.zonas || [], idField: '_id' },
    { nombre: 'propietarios', datos: datosAdmin.propietarios || [], idField: '_id' },
    { nombre: 'campos', datos: datosAdmin.campos || [], idField: 'idcampo' },
    { nombre: 'empresas', datos: datosAdmin.empresas || [], idField: 'idempresa' },
    { nombre: 'actividades', datos: datosAdmin.actividades || [], idField: '_id' },
    { nombre: 'usuarios', datos: datosAdmin.usuarios || [], idField: '_id' },
    { nombre: 'tiposUso', datos: datosAdmin.tiposUso || [], idField: 'idtipouso' },
    { nombre: 'especies', datos: datosAdmin.especies || [], idField: '_id' },
    { nombre: 'ambientales', datos: datosAdmin.ambientales || [], idField: '_id' },
    { nombre: 'insumos', datos: datosAdmin.insumos || [], idField: '_id' },
  ];
  
  for (const coleccion of colecciones) {
    try {
      
      // Mapear los documentos para asegurar que _id sea el campo correcto
      const documentosMapeados = coleccion.datos.map((item: DocumentoBase) => {
        const documento = { ...item };
        if (coleccion.idField !== '_id') {
          documento._id = item[coleccion.idField];
          delete documento[coleccion.idField];
        }
        return documento;
      });

      // Usar bulkWrite para mejor rendimiento
      const operaciones = documentosMapeados.map((doc: DocumentoBase) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: doc },
          upsert: true
        }
      }));

      if (operaciones.length > 0) {
        const resultado = await db.collection(coleccion.nombre).bulkWrite(operaciones);
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

async function procesarDatosProteccion(datos: any[]) {
  try {
    const coleccion = db.collection('proteccion');
    
    const operaciones = datos.map((doc) => ({
      updateOne: {
        filter: { _id: doc.id },
        update: { $set: doc },
        upsert: true
      }
    }));

    if (operaciones.length > 0) {
      const resultado = await coleccion.bulkWrite(operaciones);
    }
  } catch (error) {
    console.error('Error al procesar datos de protección:', error);
  }
}

// En src/api/cron/etl.ts
// Función del handler de la API
export default async function handler(req: any, res: any) {
    
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
      const [datosAdmin, ordenesTrabajoAPI, datosProteccion] = await Promise.all([
        obtenerDatosAdministrativos(),
        obtenerOrdenesDeTrabajoAPI(),
        obtenerDatosProteccion()
      ]);
      
      // Procesar los datos
      await procesarDatosAdministrativos(datosAdmin);
      await procesarOrdenesDeTrabajoAPI(ordenesTrabajoAPI);
      await procesarDatosProteccion(datosProteccion);
      
      res.status(200).json({ success: true, mensaje: 'Proceso ETL completado con éxito' });
    } catch (error) {
      console.error('Error en cron job ETL:', error);
      res.status(500).json({ error: 'Proceso ETL falló' });
    }
  }