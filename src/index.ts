import * as dotenv from 'dotenv';
import axios from 'axios';
import { MongoClient, Db } from 'mongodb';
import cron from 'node-cron';

// Cargar variables de entorno
dotenv.config();

// Configuración
const ADMIN_API_URL = process.env.ADMIN_API_URL || '';
const WORK_ORDERS_API_URL = process.env.WORK_ORDERS_API_URL || '';
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'gestion_forestal';

// Conexión a MongoDB
let db: Db;

async function conectarBaseDatos() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Conectado a MongoDB');
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
      const response = await axios.get(WORK_ORDERS_API_URL);
      // Asegúrate de que estás accediendo correctamente a los datos según la estructura de respuesta
      return response.data; // Ajusta si la respuesta tiene una estructura diferente
    } catch (error) {
      console.error('Error al obtener órdenes de trabajo:', error);
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

  console.log('Procesando datos administrativos...');
  
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
          console.log(`Insertados ${coleccion.datos.length} documentos en ${coleccion.nombre}`);
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
        console.log(`Actualizados ${coleccion.datos.length} documentos en ${coleccion.nombre}`);
      }
    } catch (error) {
      console.error(`Error al procesar ${coleccion.nombre}:`, error);
    }
  }
}

// Procesar órdenes de trabajo
async function procesarOrdenesDeTrabajoAPI(ordenes: any[]) {
  try {
    console.log('Procesando órdenes de trabajo...');
    const coleccion = db.collection('ordenesTrabajoAPI');
    
    // Crear índice en el campo _id
    await coleccion.createIndex({ _id: 1 }, { unique: true });
    
    // Crear índices adicionales para consultas comunes
    await coleccion.createIndex({ estado: 1 });
    await coleccion.createIndex({ fecha: 1 });
    await coleccion.createIndex({ 'cod_zona': 1 });
    await coleccion.createIndex({ 'cod_campo': 1 });
    await coleccion.createIndex({ 'cod_empres': 1 });
    
    // Procesar órdenes de trabajo
    for (const orden of ordenes) {
      // Upsert: actualizar si existe, insertar si no
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

// Ejecutar el proceso ETL
async function ejecutarETL() {
  console.log('Iniciando proceso ETL en', new Date().toISOString());
  
  try {
    // Obtener datos de las APIs
    const [datosAdmin, ordenesTrabajoAPI] = await Promise.all([
      obtenerDatosAdministrativos(),
      obtenerOrdenesDeTrabajoAPI()
    ]);
    
    // Procesar los datos
    await procesarDatosAdministrativos(datosAdmin);
    await procesarOrdenesDeTrabajoAPI(ordenesTrabajoAPI);
    
    console.log('Proceso ETL completado con éxito en', new Date().toISOString());
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
      console.log('Servicio ETL en ejecución. Las actualizaciones serán manejadas por el cron job de Vercel');
    } catch (error) {
      console.error('Error al iniciar la aplicación:', error);
      process.exit(1);
    }
  }

// Iniciar la aplicación
main();