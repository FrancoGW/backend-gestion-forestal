import * as dotenv from 'dotenv';
import axios from 'axios';
import { MongoClient, Db } from 'mongodb';
import cron from 'node-cron';

// Cargar variables de entorno
dotenv.config();

// Configuración
const ADMIN_API_URL = process.env.ADMIN_API_URL || '';
const WORK_ORDERS_API_URL = process.env.WORK_ORDERS_API_URL || 'https://gis.fasa.ibc.ar/api/ordenes/listar';
const WORK_ORDERS_API_KEY = process.env.WORK_ORDERS_API_KEY || 'c3kvEUZ3yqzjU7ePcqesLUOZfaijujtRbl1tswiscXY7XxcU2LuZtvlB9I0oAq2g';
const WORK_ORDERS_FROM_DATE = process.env.WORK_ORDERS_FROM_DATE || '2020-01-01';
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'gestion_forestal';

// Conexión a MongoDB
let db: Db;

async function conectarBaseDatos() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    return db;
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    throw error;
  }
}

// Funciones para obtener datos de las APIs
async function obtenerDatosAdministrativos() {
    try {
      const response = await axios.get(ADMIN_API_URL);
      // Asegúrate de que estás accediendo correctamente a los datos según la estructura de respuesta
      return response.data; // Ajusta si la respuesta tiene una estructura diferente
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

// Procesar datos administrativos
async function procesarDatosAdministrativos(datosAdmin: any) {
  // Extraer y transformar datos administrativos
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

  
  // Procesar cada colección
  for (const coleccion of colecciones) {
    try {
      // Crear índices únicos donde sea apropiado (asumiendo que _id es el campo único)
      await db.collection(coleccion.nombre).createIndex({ _id: 1 }, { unique: true });
      
      // Si la colección está vacía, simplemente insertar todo
      const count = await db.collection(coleccion.nombre).countDocuments();
      
      if (count === 0) {
        // Primera carga - inserción masiva
        if (coleccion.datos.length > 0) {
          await db.collection(coleccion.nombre).insertMany(coleccion.datos);
        }
      } else {
        // Actualizar colección existente
        for (const item of coleccion.datos) {
          // Upsert: actualizar si existe, insertar si no
          await db.collection(coleccion.nombre).updateOne(
            { _id: item._id }, 
            { $set: item }, 
            { upsert: true }
          );
        }
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
    
    // Crear índice en el campo _id
    await coleccion.createIndex({ _id: 1 }, { unique: true });
    
    // Crear índices adicionales para consultas comunes
    await coleccion.createIndex({ estado: 1 });
    await coleccion.createIndex({ fecha: 1 });
    await coleccion.createIndex({ 'cod_zona': 1 });
    await coleccion.createIndex({ 'cod_campo': 1 });
    await coleccion.createIndex({ 'cod_empres': 1 });
    
    let procesadas = 0;
    let errores = 0;
    
    // Procesar órdenes de trabajo
    for (const orden of ordenes) {
      try {
        // Validar que la orden tenga _id
        if (!orden._id) {
          console.warn('Orden sin _id, saltando:', JSON.stringify(orden).substring(0, 200));
          errores++;
          continue;
        }
        
        // Upsert: actualizar si existe, insertar si no
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

// Ejecutar el proceso ETL
async function ejecutarETL() {
  
  try {
    // Obtener datos de las APIs
    const [datosAdmin, ordenesTrabajoAPI] = await Promise.all([
      obtenerDatosAdministrativos(),
      obtenerOrdenesDeTrabajoAPI()
    ]);
    
    // Procesar los datos
    await procesarDatosAdministrativos(datosAdmin);
    await procesarOrdenesDeTrabajoAPI(ordenesTrabajoAPI);
    
  } catch (error) {
    console.error('Error en el proceso ETL:', error);
  }
}

// Función principal de la aplicación
async function main() {
    try {
      // Conectar a la base de datos
      await conectarBaseDatos();
      
      // Ejecutar el proceso ETL inicial
      await ejecutarETL();
      
      // Ya no programamos ejecuciones automáticas, solo la inicial
    } catch (error) {
      console.error('Error al iniciar la aplicación:', error);
      process.exit(1);
    }
  }

// Iniciar la aplicación
main();