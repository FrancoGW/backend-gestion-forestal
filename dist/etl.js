"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const axios_1 = __importDefault(require("axios"));
const mongodb_1 = require("mongodb");
// Configuración desde variables de entorno
const ADMIN_API_URL = process.env.ADMIN_API_URL || 'https://gis.fasa.ibc.ar/ordenes/json-tablas-adm';
const WORK_ORDERS_API_URL = process.env.WORK_ORDERS_API_URL || 'https://gis.fasa.ibc.ar/ordenes/json-ordenes';
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'gestion_forestal';
// Conexión a MongoDBasdadsadasdas
let db;
async function conectarBaseDatos() {
    try {
        const client = new mongodb_1.MongoClient(MONGODB_URI);
        await client.connect();
        const database = client.db(DB_NAME);
        console.log('Cron job conectado a MongoDB, base:', database.databaseName);
        return database;
    }
    catch (error) {
        console.error('Error al conectar a MongoDB:', error);
        throw error;
    }
}
// Funciones para obtener datos de las APIsasdasdasd
async function obtenerDatosAdministrativos() {
    try {
        const response = await axios_1.default.get(ADMIN_API_URL);
        return response.data;
    }
    catch (error) {
        console.error('Error al obtener datos administrativos:', error);
        throw error;
    }
}
async function obtenerOrdenesDeTrabajoAPI() {
    try {
        const response = await axios_1.default.get(WORK_ORDERS_API_URL);
        return response.data;
    }
    catch (error) {
        console.error('Error al obtener órdenes de trabajo:', error);
        throw error;
    }
}
async function procesarDatosAdministrativos(datosAdmin) {
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
            console.log(`Procesando colección: ${coleccion.nombre}, documentos a insertar: ${coleccion.datos.length}`);
            // Mapear los documentos para asegurar que _id sea el campo correcto
            const documentosMapeados = coleccion.datos.map((item) => {
                const documento = { ...item };
                if (coleccion.idField !== '_id') {
                    documento._id = item[coleccion.idField];
                    delete documento[coleccion.idField];
                }
                return documento;
            });
            // Usar bulkWrite para mejor rendimiento
            const operaciones = documentosMapeados.map((doc) => ({
                updateOne: {
                    filter: { _id: doc._id },
                    update: { $set: doc },
                    upsert: true
                }
            }));
            if (operaciones.length > 0) {
                const resultado = await db.collection(coleccion.nombre).bulkWrite(operaciones);
                console.log(`Actualizados ${resultado.upsertedCount + resultado.modifiedCount} documentos en ${coleccion.nombre}`);
            }
        }
        catch (error) {
            console.error(`Error al procesar ${coleccion.nombre}:`, error);
        }
    }
}
// Procesar órdenes de trabajo
async function procesarOrdenesDeTrabajoAPI(ordenes) {
    try {
        console.log(`Procesando órdenes de trabajo, documentos a insertar: ${ordenes.length}`);
        const coleccion = db.collection('ordenesTrabajoAPI');
        for (const orden of ordenes) {
            await coleccion.updateOne({ _id: orden._id }, { $set: orden }, { upsert: true });
        }
        console.log(`Procesadas ${ordenes.length} órdenes de trabajo`);
    }
    catch (error) {
        console.error('Error al procesar órdenes de trabajo:', error);
    }
}
// En src/api/cron/etl.ts
// Función del handler de la API
async function handler(req, res) {
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
    }
    catch (error) {
        console.error('Error en cron job ETL:', error);
        res.status(500).json({ error: 'Proceso ETL falló' });
    }
}
