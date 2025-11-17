import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { MongoClient, Db } from 'mongodb';

// Configuración desde variables de entorno
const ADMIN_API_URL = process.env.ADMIN_API_URL || 'https://gis.fasa.ibc.ar/ordenes/json-tablas-adm';
const WORK_ORDERS_API_URL = process.env.WORK_ORDERS_API_URL || 'https://gis.fasa.ibc.ar/api/ordenes/listar';
const WORK_ORDERS_API_KEY = process.env.WORK_ORDERS_API_KEY || 'c3kvEUZ3yqzjU7ePcqesLUOZfaijujtRbl1tswiscXY7XxcU2LuZtvlB9I0oAq2g';
const WORK_ORDERS_PHPSESSID = process.env.WORK_ORDERS_PHPSESSID || 'dj0hbus2cu9dr62dqmjmller9v';
const WORK_ORDERS_FROM_DATE = process.env.WORK_ORDERS_FROM_DATE || '2020-01-01';
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'gestion_forestal';

// Conexión a MongoDBasdasdsa
let db: Db;

async function conectarBaseDatos() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI no está configurada en las variables de entorno');
    }
    
    console.log('Conectando a MongoDB...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Conexión a MongoDB establecida');
    return client.db(DB_NAME);
  } catch (error: any) {
    console.error('❌ Error al conectar a MongoDB:', error?.message || error);
    console.error('Stack:', error?.stack);
    throw error;
  }
}

// Funciones para obtener datos de las APIsasdasdasd
async function obtenerDatosAdministrativos() {
  try {
    console.log(`Obteniendo datos administrativos desde: ${ADMIN_API_URL}`);
    
    // Intentar con cookie de sesión también
    const headers: any = {
      'Cookie': `PHPSESSID=${WORK_ORDERS_PHPSESSID}`,
      'Accept': 'application/json',
    };
    
    const response = await axios.get(ADMIN_API_URL, {
      headers: headers,
      timeout: 10000, // 10 segundos de timeout
    });
    console.log('✅ Datos administrativos obtenidos correctamente');
    return response.data;
  } catch (error: any) {
    console.error('⚠️ Error al obtener datos administrativos:', error?.message || error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('El endpoint de datos administrativos puede requerir autenticación o haber cambiado');
    }
    // Retornar objeto vacío en lugar de lanzar error para que el proceso continúe
    console.warn('Continuando sin datos administrativos...');
    return {};
  }
}

// Función para obtener la fecha de la última orden sincronizada
async function obtenerFechaUltimaOrden(): Promise<string | null> {
  try {
    if (!db) {
      console.warn('⚠️ Base de datos no inicializada, no se puede obtener fecha de última orden');
      return null;
    }
    
    const coleccion = db.collection('ordenesTrabajoAPI');
    const ultimaOrden = await coleccion
      .findOne(
        {},
        { sort: { fecha: -1 } }
      );
    
    if (ultimaOrden && ultimaOrden.fecha) {
      // Restar 2 días como margen de seguridad para asegurar que no se pierdan órdenes
      const fechaUltima = new Date(ultimaOrden.fecha);
      fechaUltima.setDate(fechaUltima.getDate() - 2);
      const fechaFormateada = fechaUltima.toISOString().split('T')[0];
      console.log(`Última orden sincronizada: ${ultimaOrden.fecha}, usando fecha desde: ${fechaFormateada}`);
      return fechaFormateada;
    }
    console.log('No se encontró ninguna orden previa en la base de datos');
    return null;
  } catch (error: any) {
    console.error('Error al obtener fecha de última orden:', error?.message || error);
    console.error('Stack:', error?.stack);
    return null;
  }
}

async function obtenerOrdenesDeTrabajoAPI(fechaDesde?: string, forzarCompleto: boolean = false) {
  try {
    let fecha: string;
    
    if (fechaDesde) {
      // Si se proporciona fecha desde query parameter, usarla
      fecha = fechaDesde;
      console.log(`Fecha desde sobrescrita por parámetro: ${fecha}`);
    } else if (forzarCompleto) {
      // Si se fuerza completo, usar la fecha por defecto
      fecha = WORK_ORDERS_FROM_DATE;
      console.log(`Forzando sincronización completa desde: ${fecha}`);
    } else {
      // Intentar obtener la fecha de la última orden sincronizada
      const fechaUltima = await obtenerFechaUltimaOrden();
      fecha = fechaUltima || WORK_ORDERS_FROM_DATE;
      if (fechaUltima) {
        console.log(`Usando fecha de última orden sincronizada: ${fecha}`);
      } else {
        console.log(`No se encontró última orden, usando fecha por defecto: ${fecha}`);
      }
    }
    
    // Validar que tenemos la API key
    if (!WORK_ORDERS_API_KEY) {
      throw new Error('WORK_ORDERS_API_KEY no está configurada en las variables de entorno');
    }
    
    console.log(`Obteniendo órdenes desde: ${fecha}`);
    console.log(`URL: ${WORK_ORDERS_API_URL}`);
    console.log(`API Key presente: ${WORK_ORDERS_API_KEY ? 'Sí (longitud: ' + WORK_ORDERS_API_KEY.length + ')' : 'No'}`);
    console.log(`PHPSESSID presente: ${WORK_ORDERS_PHPSESSID ? 'Sí' : 'No'}`);
    console.log(`Parámetro 'from': ${fecha}`);
    
    // Headers requeridos por la API (incluyendo la cookie de sesión)
    const headers: any = {
      'x-api-key': WORK_ORDERS_API_KEY,
      'Cookie': `PHPSESSID=${WORK_ORDERS_PHPSESSID}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    
    console.log('Headers que se enviarán:', Object.keys(headers).join(', '));
    
    const response = await axios.get(WORK_ORDERS_API_URL, {
      headers: headers,
      params: {
        from: fecha,
      },
      timeout: 30000, // 30 segundos de timeout
      validateStatus: (status) => status < 500, // No lanzar error para códigos 4xx
    });
    
    // Verificar si la respuesta es un error
    if (response.status >= 400) {
      console.error(`⚠️ La API respondió con status ${response.status}`);
      console.error('Respuesta:', JSON.stringify(response.data).substring(0, 500));
      throw new Error(`API respondió con error ${response.status}: ${JSON.stringify(response.data)}`);
    }
    
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
      // Mostrar información de la primera y última orden
      const fechas = ordenes
        .map((o: any) => o.fecha)
        .filter((f: any) => f)
        .sort();
      console.log(`Primera orden - ID: ${ordenes[0]._id}, Fecha: ${ordenes[0].fecha || 'N/A'}`);
      if (fechas.length > 0) {
        console.log(`Rango de fechas: ${fechas[0]} a ${fechas[fechas.length - 1]}`);
      }
    } else {
      console.warn('⚠️ No se recibieron órdenes de la API');
    }
    
    return ordenes;
  } catch (error: any) {
    console.error('❌ Error al obtener órdenes de trabajo:', error.message);
    if (error.response) {
      console.error('Status HTTP:', error.response.status);
      console.error('Headers de respuesta:', error.response.headers);
      console.error('Data de error:', JSON.stringify(error.response.data));
      console.error('URL solicitada:', error.config?.url);
      console.error('Headers enviados:', error.config?.headers);
      
      // Crear un error más descriptivo
      const errorMessage = `Error al obtener órdenes: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
      throw new Error(errorMessage);
    } else if (error.request) {
      console.error('No se recibió respuesta del servidor');
      console.error('Request config:', error.config);
      throw new Error('No se pudo conectar con la API de órdenes de trabajo');
    } else {
      console.error('Error al configurar la solicitud:', error.message);
      throw error;
    }
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
    let nuevas = 0;
    let actualizadas = 0;
    const fechasProcesadas: string[] = [];
    
    // Obtener IDs existentes en batch para optimizar
    const idsOrdenes = ordenes
      .map((o: any) => o._id)
      .filter((id: any) => id);
    
    const idsExistentes = new Set(
      (await coleccion.find({ _id: { $in: idsOrdenes } })
        .project({ _id: 1 })
        .toArray())
        .map((doc: any) => doc._id)
    );
    
    for (const orden of ordenes) {
      try {
        // Validar que la orden tenga _id
        if (!orden._id) {
          console.warn('Orden sin _id, saltando:', JSON.stringify(orden).substring(0, 200));
          errores++;
          continue;
        }
        
        // Verificar si la orden ya existe (usando el Set pre-cargado)
        const esNueva = !idsExistentes.has(orden._id);
        
        await coleccion.updateOne(
          { _id: orden._id }, 
          { $set: orden }, 
          { upsert: true }
        );
        
        if (esNueva) {
          nuevas++;
          idsExistentes.add(orden._id); // Agregar al set para futuras iteraciones
        } else {
          actualizadas++;
        }
        
        procesadas++;
        
        // Acumular fechas para estadísticas
        if (orden.fecha) {
          fechasProcesadas.push(orden.fecha);
        }
      } catch (error: any) {
        console.error(`Error al procesar orden ${orden._id}:`, error.message);
        errores++;
      }
    }
    
    // Calcular rango de fechas procesadas
    const fechasUnicas = [...new Set(fechasProcesadas)].sort();
    const rangoFechas = fechasUnicas.length > 0 
      ? `${fechasUnicas[0]} a ${fechasUnicas[fechasUnicas.length - 1]}`
      : 'N/A';
    
    console.log(`✅ Órdenes procesadas: ${procesadas} (Nuevas: ${nuevas}, Actualizadas: ${actualizadas}), Errores: ${errores}`);
    if (fechasUnicas.length > 0) {
      console.log(`📅 Rango de fechas procesadas: ${rangoFechas}`);
    }
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
      
      // Validar variables de entorno críticas
      console.log('🔍 Verificando configuración...');
      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI no está configurada');
      }
      if (!WORK_ORDERS_API_KEY) {
        throw new Error('WORK_ORDERS_API_KEY no está configurada');
      }
      console.log('✅ Variables de entorno verificadas');
      
      // Conectar a MongoDB
      db = await conectarBaseDatos();
      
      // Permitir sobrescribir la fecha desde query parameter (útil para forzar recarga completa)
      const fechaDesde = req.query.from as string | undefined;
      const forzarCompleto = req.query.force === 'true' || req.query.force === '1';
      
      if (fechaDesde) {
        console.log(`Fecha desde sobrescrita por parámetro: ${fechaDesde}`);
      }
      if (forzarCompleto) {
        console.log('⚠️ Modo FORZAR COMPLETO activado - se sincronizarán todas las órdenes desde la fecha por defecto');
      }
      
      // Obtener datos de las APIs
      console.log('📡 Iniciando obtención de datos de APIs...');
      
      // Obtener órdenes de trabajo (prioritario)
      let ordenesTrabajoAPI: any[] = [];
      try {
        ordenesTrabajoAPI = await obtenerOrdenesDeTrabajoAPI(fechaDesde, forzarCompleto);
        console.log(`✅ Órdenes de trabajo obtenidas: ${ordenesTrabajoAPI.length}`);
      } catch (error: any) {
        console.error('❌ Error crítico al obtener órdenes de trabajo:', error?.message);
        throw error; // Este error sí debe detener el proceso
      }
      
      // Obtener datos administrativos (opcional, no crítico)
      let datosAdmin: any = {};
      try {
        datosAdmin = await obtenerDatosAdministrativos();
        if (Object.keys(datosAdmin).length > 0) {
          console.log('✅ Datos administrativos obtenidos');
        }
      } catch (error: any) {
        console.warn('⚠️ No se pudieron obtener datos administrativos, continuando sin ellos...');
      }
      
      // Procesar los datos
      if (Object.keys(datosAdmin).length > 0) {
        await procesarDatosAdministrativos(datosAdmin);
      } else {
        console.log('⏭️ Saltando procesamiento de datos administrativos (no disponibles)');
      }
      
      await procesarOrdenesDeTrabajoAPI(ordenesTrabajoAPI);
      
      // Obtener estadísticas finales
      const totalOrdenes = await db.collection('ordenesTrabajoAPI').countDocuments();
      const ultimaOrden = await db.collection('ordenesTrabajoAPI')
        .findOne({}, { sort: { fecha: -1 } });
      
      const estadisticas = {
        totalOrdenesEnBD: totalOrdenes,
        ultimaOrdenFecha: ultimaOrden?.fecha || 'N/A',
        ordenesRecibidas: ordenesTrabajoAPI.length
      };
      
      console.log('📊 Estadísticas finales:', estadisticas);
      
      res.status(200).json({ 
        success: true, 
        mensaje: 'Proceso ETL completado con éxito',
        estadisticas
      });
    } catch (error: any) {
      console.error('Error en cron job ETL:', error);
      console.error('Stack trace:', error?.stack);
      console.error('Error message:', error?.message);
      console.error('Error details:', JSON.stringify(error, null, 2));
      res.status(500).json({ 
        error: 'Proceso ETL falló',
        mensaje: error?.message || 'Error desconocido',
        detalles: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      });
    }
  }