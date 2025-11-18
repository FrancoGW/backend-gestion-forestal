import axios, { AxiosRequestConfig } from 'axios';
import { MongoClient, Db } from 'mongodb';
import { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import { URL } from 'url';

// Tipos para Vercel Serverless Functions
interface VercelRequest extends IncomingMessage {
  query: { [key: string]: string | string[] | undefined };
  body?: any;
  cookies?: { [key: string]: string };
  method?: string;
  headers: IncomingMessage['headers'] & {
    authorization?: string;
  };
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (body: any) => void;
  send: (body: any) => void;
}

// Configuración desde variables de entorno
const ADMIN_API_URL = process.env.ADMIN_API_URL || 'https://gis.fasa.ibc.ar/ordenes/json-tablas-adm';
// HARDCODEAR URL para evitar problemas con variables de entorno
const WORK_ORDERS_API_URL = 'https://gis.fasa.ibc.ar/api/ordenes/listar';
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
    console.log(`API Key: ${WORK_ORDERS_API_KEY ? 'Sí (longitud: ' + WORK_ORDERS_API_KEY.length + ')' : 'No'}`);
    console.log(`PHPSESSID: ${WORK_ORDERS_PHPSESSID ? 'Sí (' + WORK_ORDERS_PHPSESSID + ')' : 'No'}`);
    console.log(`Parámetro 'from': ${fecha}`);
    
    // Construir URL completa con parámetros
    const urlWithParams = `${WORK_ORDERS_API_URL}?from=${encodeURIComponent(fecha)}`;
    console.log(`📡 URL completa: ${urlWithParams}`);
    
    // Usar https nativo para tener control total sobre los headers
    const url = new URL(urlWithParams);
    
    // Headers que se enviarán (usando https nativo para asegurar que la cookie se envíe)
    const headers = {
      'x-api-key': WORK_ORDERS_API_KEY,
      'Cookie': `PHPSESSID=${WORK_ORDERS_PHPSESSID}`,
      'Accept': 'application/json',
      'User-Agent': 'Node.js',
    };
    
    console.log('📤 Headers que se enviarán:');
    console.log(`  x-api-key: ***${WORK_ORDERS_API_KEY.substring(WORK_ORDERS_API_KEY.length - 10)}`);
    console.log(`  Cookie: PHPSESSID=${WORK_ORDERS_PHPSESSID}`);
    console.log(`  Accept: ${headers['Accept']}`);
    
    // Hacer la solicitud usando https nativo
    const ordenes = await new Promise<any>((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'GET',
        headers: headers,
        timeout: 30000,
      };
      
      console.log('🔧 Opciones de la solicitud:');
      console.log(`  Hostname: ${options.hostname}`);
      console.log(`  Path: ${options.path}`);
      console.log(`  Headers Cookie: ${options.headers['Cookie']}`);
      
      const req = https.request(options, (res: IncomingMessage) => {
        console.log(`📥 Respuesta recibida - Status: ${res.statusCode}`);
        console.log(`📥 Headers de respuesta:`, JSON.stringify(res.headers, null, 2));
        
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            console.error(`❌ La API respondió con status ${res.statusCode}`);
            console.error('📄 Body de respuesta:', data.substring(0, 1000));
            reject(new Error(`API respondió con error ${res.statusCode}: ${data.substring(0, 500)}`));
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            console.error('Error al parsear JSON:', error);
            reject(new Error('La respuesta no es JSON válido'));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('❌ Error en la solicitud:', error);
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout en la solicitud'));
      });
      
      req.end();
    });
    
    console.log('Respuesta de API - Tipo de datos:', typeof ordenes);
    console.log('Respuesta de API - Es array?', Array.isArray(ordenes));
    
    // Manejar diferentes estructuras de respuesta
    let ordenesArray: any = ordenes;
    
    // Si la respuesta es un objeto, intentar extraer el array
    if (ordenesArray && typeof ordenesArray === 'object' && !Array.isArray(ordenesArray)) {
      // Intentar diferentes propiedades comunes
      if ((ordenesArray as any).data && Array.isArray((ordenesArray as any).data)) {
        ordenesArray = (ordenesArray as any).data;
        console.log('Órdenes extraídas de response.data');
      } else if ((ordenesArray as any).ordenes && Array.isArray((ordenesArray as any).ordenes)) {
        ordenesArray = (ordenesArray as any).ordenes;
        console.log('Órdenes extraídas de response.ordenes');
      } else if ((ordenesArray as any).results && Array.isArray((ordenesArray as any).results)) {
        ordenesArray = (ordenesArray as any).results;
        console.log('Órdenes extraídas de response.results');
      }
    }
    
    // Validar que sea un array
    if (!Array.isArray(ordenesArray)) {
      console.error('La respuesta no es un array. Estructura recibida:', JSON.stringify(ordenesArray).substring(0, 500));
      return [];
    }
    
    console.log(`Total de órdenes recibidas: ${ordenesArray.length}`);
    if (ordenesArray.length > 0) {
      // Mostrar información de la primera y última orden
      const fechas = ordenesArray
        .map((o: any) => o.fecha)
        .filter((f: any) => f)
        .sort();
      console.log(`Primera orden - ID: ${ordenesArray[0]._id}, Fecha: ${ordenesArray[0].fecha || 'N/A'}`);
      if (fechas.length > 0) {
        console.log(`Rango de fechas: ${fechas[0]} a ${fechas[fechas.length - 1]}`);
      }
    } else {
      console.warn('⚠️ No se recibieron órdenes de la API');
    }
    
    return ordenesArray;
    } catch (error: any) {
      console.error('❌ Error al obtener órdenes de trabajo:', error.message);
      console.error('Stack:', error.stack);
      
      if (error.response) {
        console.error('📥 Status HTTP:', error.response.status);
        console.error('📥 Headers de respuesta:', JSON.stringify(error.response.headers, null, 2));
        console.error('📥 Data de error (primeros 2000 chars):', 
          typeof error.response.data === 'string' 
            ? error.response.data.substring(0, 2000) 
            : JSON.stringify(error.response.data).substring(0, 2000));
        console.error('📤 URL solicitada:', error.config?.url || error.response.config?.url);
        console.error('📤 Headers que se intentaron enviar:', JSON.stringify(error.config?.headers || error.response.config?.headers, null, 2));
        
        // Verificar si la cookie estaba en los headers
        const sentHeaders = error.config?.headers || error.response.config?.headers || {};
        const cookieSent = sentHeaders['Cookie'] || sentHeaders['cookie'];
        console.error(`🍪 Cookie enviada: ${cookieSent ? 'SÍ (' + cookieSent + ')' : 'NO ❌'}`);
        
        // Crear un error más descriptivo
        const errorMessage = `Error al obtener órdenes: ${error.response.status} - ${typeof error.response.data === 'string' 
          ? error.response.data.substring(0, 500) 
          : JSON.stringify(error.response.data).substring(0, 500)}`;
        throw new Error(errorMessage);
      } else if (error.request) {
        console.error('❌ No se recibió respuesta del servidor');
        console.error('Request config:', JSON.stringify(error.config, null, 2));
        throw new Error('No se pudo conectar con la API de órdenes de trabajo');
      } else {
        console.error('❌ Error al configurar la solicitud:', error.message);
        console.error('Stack completo:', error.stack);
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
      // No crear índice en _id porque ya es único por defecto en MongoDB
      
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
    // No crear índice en _id porque ya es único por defecto en MongoDB
    
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
export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      
      // Obtener solo órdenes de trabajo (ignorar datos administrativos)
      console.log('📡 Obteniendo órdenes de trabajo...');
      
      const ordenesTrabajoAPI = await obtenerOrdenesDeTrabajoAPI(fechaDesde, forzarCompleto);
      console.log(`✅ Órdenes de trabajo obtenidas: ${ordenesTrabajoAPI.length}`);
      
      // Procesar solo las órdenes de trabajo
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
      console.error('❌❌❌ Error en cron job ETL ❌❌❌');
      console.error('Error message:', error?.message);
      console.error('Stack trace:', error?.stack);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      // Intentar extraer más información del error
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      if (error.config) {
        console.error('Request URL:', error.config.url);
        console.error('Request headers:', error.config.headers);
      }
      
      res.status(500).json({ 
        error: 'Proceso ETL falló',
        mensaje: error?.message || 'Error desconocido',
        tipo: error?.constructor?.name || 'Unknown',
        detalles: process.env.NODE_ENV === 'development' ? {
          stack: error?.stack,
          response: error?.response?.data,
          config: error?.config
        } : undefined
      });
    }
  }