import express from 'express';
import { MongoClient, Db, ObjectId } from 'mongodb';
import cors from 'cors';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'gestion_forestal';

// Crear la aplicación Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a MongoDBasdasd
let db: Db;

async function conectarBaseDatos() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Servicio API conectado a MongoDB');
    return client.db(DB_NAME);
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    throw error;
  }
}

// Función para obtener la conexión a la base de datos (serverless safe)
async function getDB() {
  if (!db) {
    db = await conectarBaseDatos();
  }
  return db;
}

// Definir rutas de la API

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Gestión Forestal funcionando' });
});

// Rutas para datos administrativos
const coleccionesAdmin = [
  'zonas', 'propietarios', 'campos', 'empresas', 'actividades', 
  'usuarios', 'tiposUso', 'especies', 'ambientales', 'insumos'
];

// Ruta genérica para todas las colecciones administrativas
coleccionesAdmin.forEach(coleccion => {
  // Obtener todos los elementos en la colección
  app.get(`/api/${coleccion}`, async (req, res) => {
    try {
      const db = await getDB();
      const items = await db.collection(coleccion).find().toArray();
      res.json(items);
    } catch (error) {
      console.error(`Error al obtener ${coleccion}:`, error);
      res.status(500).json({ error: `Error al obtener ${coleccion}` });
    }
  });

  // Obtener elemento por ID
  // @ts-ignore
  app.get(`/api/${coleccion}/:id`, async (req, res) => {
    try {
      const db = await getDB();
      let id = req.params.id;
      if (id.length === 24 && coleccion !== 'ordenesTrabajoAPI') {
        // @ts-ignore
        id = new ObjectId(id);
      } else if (!isNaN(Number(id))) {
        // @ts-ignore
        id = Number(id);
      }
      const item = await db.collection(coleccion).findOne({ _id: id as any });
      if (!item) {
        return res.status(404).json({ error: `Elemento de ${coleccion} no encontrado` });
      }
      res.json(item);
    } catch (error) {
      console.error(`Error al obtener elemento de ${coleccion}:`, error);
      res.status(500).json({ error: `Error al obtener elemento de ${coleccion}` });
    }
  });

  // Crear nuevo elemento
  // @ts-ignore
  app.post(`/api/${coleccion}`, async (req, res) => {
    try {
      const db = await getDB();
      const result = await db.collection(coleccion).insertOne(req.body);
      res.status(201).json({ 
        mensaje: `Elemento de ${coleccion} creado`, 
        id: result.insertedId 
      });
    } catch (error) {
      console.error(`Error al crear elemento de ${coleccion}:`, error);
      res.status(500).json({ error: `Error al crear elemento de ${coleccion}` });
    }
  });

  // Actualizar elemento
  // @ts-ignore
  app.put(`/api/${coleccion}/:id`, async (req, res) => {
    try {
      const db = await getDB();
      let id = req.params.id;
      if (id.length === 24 && coleccion !== 'ordenesTrabajoAPI') {
        // @ts-ignore
        id = new ObjectId(id);
      } else if (!isNaN(Number(id))) {
        // @ts-ignore
        id = Number(id);
      }
      const result = await db.collection(coleccion).updateOne(
        { _id: id as any },
        { $set: req.body }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: `Elemento de ${coleccion} no encontrado` });
      }
      res.json({ mensaje: `Elemento de ${coleccion} actualizado` });
    } catch (error) {
      console.error(`Error al actualizar elemento de ${coleccion}:`, error);
      res.status(500).json({ error: `Error al actualizar elemento de ${coleccion}` });
    }
  });

  // Eliminar elemento
  // @ts-ignore
  app.delete(`/api/${coleccion}/:id`, async (req, res) => {
    try {
      const db = await getDB();
      let id = req.params.id;
      if (id.length === 24 && coleccion !== 'ordenesTrabajoAPI') {
        // @ts-ignore
        id = new ObjectId(id);
      } else if (!isNaN(Number(id))) {
        // @ts-ignore
        id = Number(id);
      }
      const result = await db.collection(coleccion).deleteOne({ _id: id as any });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: `Elemento de ${coleccion} no encontrado` });
      }
      res.json({ mensaje: `Elemento de ${coleccion} eliminado` });
    } catch (error) {
      console.error(`Error al eliminar elemento de ${coleccion}:`, error);
      res.status(500).json({ error: `Error al eliminar elemento de ${coleccion}` });
    }
  });
});

// Rutas para órdenes de trabajo
// Obtener todas las órdenes de trabajo
app.get('/api/ordenesTrabajoAPI', async (req, res) => {
  try {
    const db = await getDB();
    const query: any = {};
    
    // Opciones de filtro
    if (req.query.estado) query.estado = parseInt(req.query.estado as string);
    if (req.query.cod_zona) query.cod_zona = parseInt(req.query.cod_zona as string);
    if (req.query.cod_campo) query.cod_campo = parseInt(req.query.cod_campo as string);
    if (req.query.cod_empres) query.cod_empres = parseInt(req.query.cod_empres as string);
    if (req.query.supervisor_id) query.supervisor_id = parseInt(req.query.supervisor_id as string);
    
    // Rango de fechas
    if (req.query.fechaDesde && req.query.fechaHasta) {
      query.fecha = {
        $gte: req.query.fechaDesde as string,
        $lte: req.query.fechaHasta as string
      };
    } else if (req.query.fechaDesde) {
      query.fecha = { $gte: req.query.fechaDesde as string };
    } else if (req.query.fechaHasta) {
      query.fecha = { $lte: req.query.fechaHasta as string };
    }
    
    // Paginación
    const pagina = parseInt(req.query.pagina as string) || 1;
    const limite = parseInt(req.query.limite as string) || 20;
    const salto = (pagina - 1) * limite;
    
    // Ejecutar consulta con paginación
    const ordenes = await db.collection('ordenesTrabajoAPI')
      .find(query)
      .sort({ fecha: -1 })
      .skip(salto)
      .limit(limite)
      .toArray();
    
    // Obtener el total para info de paginación
    const total = await db.collection('ordenesTrabajoAPI').countDocuments(query);
    
    res.json({
      ordenes,
      paginacion: {
        total,
        pagina,
        limite,
        paginas: Math.ceil(total / limite)
      }
    });
  } catch (error) {
    console.error('Error al obtener órdenes de trabajo:', error);
    res.status(500).json({ error: 'Error al obtener órdenes de trabajo' });
  }
});

// Obtener orden de trabajo por ID
// @ts-ignore
app.get('/api/ordenesTrabajoAPI/:id', async (req, res) => {
  try {
    const db = await getDB();
    const id = Number(req.params.id);
    const orden = await db.collection('ordenesTrabajoAPI').findOne({ _id: id as any });
    if (!orden) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }
    res.json(orden);
  } catch (error) {
    console.error('Error al obtener orden de trabajo:', error);
    res.status(500).json({ error: 'Error al obtener orden de trabajo' });
  }
});

// Crear nueva orden de trabajo
// @ts-ignore
app.post('/api/ordenesTrabajoAPI', async (req, res) => {
  try {
    const db = await getDB();
    const nuevaOrden = req.body;
    // Generar un ID secuencial si no se proporciona
    if (!nuevaOrden._id) {
      const ultimaOrden = await db.collection('ordenesTrabajoAPI')
        .find()
        .sort({ _id: -1 })
        .limit(1)
        .toArray();
      if (ultimaOrden.length > 0 && typeof ultimaOrden[0]._id === 'number') {
        nuevaOrden._id = ultimaOrden[0]._id + 1;
      } else {
        nuevaOrden._id = 1;
      }
    }
    const result = await db.collection('ordenesTrabajoAPI').insertOne(nuevaOrden);
    res.status(201).json({ 
      mensaje: 'Orden de trabajo creada', 
      id: nuevaOrden._id
    });
  } catch (error) {
    console.error('Error al crear orden de trabajo:', error);
    res.status(500).json({ error: 'Error al crear orden de trabajo' });
  }
});

// Actualizar orden de trabajo
// @ts-ignore
app.put('/api/ordenesTrabajoAPI/:id', async (req, res) => {
  try {
    const db = await getDB();
    const id = Number(req.params.id);
    const actualizaciones = req.body;
    delete actualizaciones._id;
    const result = await db.collection('ordenesTrabajoAPI').updateOne(
      { _id: id as any },
      { $set: actualizaciones }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }
    res.json({ mensaje: 'Orden de trabajo actualizada' });
  } catch (error) {
    console.error('Error al actualizar orden de trabajo:', error);
    res.status(500).json({ error: 'Error al actualizar orden de trabajo' });
  }
});

// Actualizar solo el estado de una orden de trabajo
// @ts-ignore
app.patch('/api/ordenesTrabajoAPI/:id/estado', async (req, res) => {
  try {
    const db = await getDB();
    const id = Number(req.params.id);
    const { estado } = req.body;
    if (estado === undefined) {
      return res.status(400).json({ error: 'El estado es requerido' });
    }
    const result = await db.collection('ordenesTrabajoAPI').updateOne(
      { _id: id as any },
      { $set: { estado: Number(estado) } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }
    res.json({ mensaje: 'Estado de la orden de trabajo actualizado' });
  } catch (error) {
    console.error('Error al actualizar estado de la orden de trabajo:', error);
    res.status(500).json({ error: 'Error al actualizar estado de la orden de trabajo' });
  }
});

// Eliminar orden de trabajo
// @ts-ignore
app.delete('/api/ordenesTrabajoAPI/:id', async (req, res) => {
  try {
    const db = await getDB();
    const id = Number(req.params.id);
    const result = await db.collection('ordenesTrabajoAPI').deleteOne({ _id: id as any });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }
    res.json({ mensaje: 'Orden de trabajo eliminada' });
  } catch (error) {
    console.error('Error al eliminar orden de trabajo:', error);
    res.status(500).json({ error: 'Error al eliminar orden de trabajo' });
  }
});

// Reportes y analíticas

// Órdenes de trabajo por zona
app.get('/api/reportes/ordenesPorZona', async (req, res) => {
  try {
    const result = await db.collection('ordenesTrabajoAPI').aggregate([
      { $group: { _id: '$cod_zona', contador: { $sum: 1 } } },
      { $lookup: {
          from: 'zonas',
          localField: '_id',
          foreignField: '_id',
          as: 'infoZona'
        }
      },
      { $project: {
          zona: { $arrayElemAt: ['$infoZona.zona', 0] },
          contador: 1
        }
      },
      { $sort: { contador: -1 } }
    ]).toArray();
    
    res.json(result);
  } catch (error) {
    console.error('Error al generar reporte por zona:', error);
    res.status(500).json({ error: 'Error al generar reporte por zona' });
  }
});

// Órdenes de trabajo por estado
app.get('/api/reportes/ordenesPorEstado', async (req, res) => {
  try {
    const result = await db.collection('ordenesTrabajoAPI').aggregate([
      { $group: { _id: '$estado', contador: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    res.json(result);
  } catch (error) {
    console.error('Error al generar reporte por estado:', error);
    res.status(500).json({ error: 'Error al generar reporte por estado' });
  }
});

// Comentario forzado para trigger de deploy y asegurar subida de cambios de serverless
// Iniciar el servidor después de conectarse a la base de datos
// y exportar el handler para Vercel
if (process.env.VERCEL) {
  // Exporta el handler para Vercel
  module.exports = app;
} else {
  async function iniciarServidor() {
    try {
      db = await conectarBaseDatos();
      app.listen(PORT, () => {
        console.log(`Servidor API ejecutándose en el puerto ${PORT}`);
      });
    } catch (error) {
      console.error('Error al iniciar el servidor API:', error);
      process.exit(1);
    }
  }
  iniciarServidor();
}