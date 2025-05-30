import express, { Request, Response, RequestHandler } from 'express';
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
  'usuarios', 'tiposUso', 'especies', 'ambientales', 'insumos', 'cuadrillas'
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

// Endpoints específicos para cuadrillas
app.get('/api/cuadrillas/por-proveedor/:proveedorId', async (req, res) => {
  try {
    const db = await getDB();
    const proveedorId = req.params.proveedorId;
    const cuadrillas = await db.collection('cuadrillas')
      .find({ proveedorId: proveedorId })
      .toArray();
    res.json(cuadrillas);
  } catch (error) {
    console.error('Error al obtener cuadrillas por proveedor:', error);
    res.status(500).json({ error: 'Error al obtener cuadrillas por proveedor' });
  }
});

app.get('/api/cuadrillas/activas', async (req, res) => {
  try {
    const db = await getDB();
    const cuadrillas = await db.collection('cuadrillas')
      .find({ activa: true })
      .toArray();
    res.json(cuadrillas);
  } catch (error) {
    console.error('Error al obtener cuadrillas activas:', error);
    res.status(500).json({ error: 'Error al obtener cuadrillas activas' });
  }
});

// Rutas para avances de trabajo
// Obtener todos los avances (solo ADMIN)
app.get('/api/avancesTrabajos', (async (req: Request, res: Response) => {
  try {
    // TODO: Implementar verificación de rol ADMIN
    const db = await getDB();
    const avances = await db.collection('avancesTrabajos').find().toArray();
    res.json(avances);
  } catch (error) {
    console.error('Error al obtener avances de trabajo:', error);
    res.status(500).json({ error: 'Error al obtener avances de trabajo' });
  }
}) as RequestHandler);

// Obtener un avance específico
app.get('/api/avancesTrabajos/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = new ObjectId(req.params.id);
    const avance = await db.collection('avancesTrabajos').findOne({ _id: id });
    if (!avance) {
      return res.status(404).json({ error: 'Avance no encontrado' });
    }
    res.json(avance);
  } catch (error) {
    console.error('Error al obtener avance:', error);
    res.status(500).json({ error: 'Error al obtener avance' });
  }
}) as RequestHandler);

// Crear nuevo avance
app.post('/api/avancesTrabajos', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const avance = {
      ...req.body,
      fechaRegistro: new Date(),
      ultimaActualizacion: new Date()
    };
    
    // Validaciones
    if (avance.fecha > new Date()) {
      return res.status(400).json({ error: 'La fecha no puede ser futura' });
    }
    if (avance.superficie <= 0) {
      return res.status(400).json({ error: 'La superficie debe ser mayor a 0' });
    }
    if (avance.cantidadPlantas <= 0) {
      return res.status(400).json({ error: 'La cantidad de plantas debe ser mayor a 0' });
    }
    if (avance.cantPersonal <= 0) {
      return res.status(400).json({ error: 'La cantidad de personal debe ser mayor a 0' });
    }
    if (avance.jornada <= 0) {
      return res.status(400).json({ error: 'La jornada debe ser mayor a 0' });
    }

    const result = await db.collection('avancesTrabajos').insertOne(avance);
    
    // Actualizar estado de la orden de trabajo
    const ordenTrabajo = await db.collection('ordenesTrabajoAPI').findOne({ 
      _id: new ObjectId(avance.ordenTrabajoId) 
    });
    
    if (ordenTrabajo) {
      const avancesOrden = await db.collection('avancesTrabajos')
        .find({ ordenTrabajoId: avance.ordenTrabajoId })
        .toArray();
      
      const superficieTotal = avancesOrden.reduce((sum, a) => sum + a.superficie, 0);
      
      let nuevoEstado = ordenTrabajo.estado;
      if (avance.estado === 'C' && superficieTotal >= ordenTrabajo.superficie) {
        nuevoEstado = 3; // Finalizado
      } else if (avance.estado === 'P') {
        nuevoEstado = 2; // Pendiente
      }
      
      await db.collection('ordenesTrabajoAPI').updateOne(
        { _id: new ObjectId(avance.ordenTrabajoId) },
        { $set: { estado: nuevoEstado } }
      );
    }

    res.status(201).json({ 
      mensaje: 'Avance creado exitosamente',
      id: result.insertedId 
    });
  } catch (error) {
    console.error('Error al crear avance:', error);
    res.status(500).json({ error: 'Error al crear avance' });
  }
}) as RequestHandler);

// Actualizar avance existente
app.put('/api/avancesTrabajos/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = new ObjectId(req.params.id);
    const actualizacion = {
      ...req.body,
      ultimaActualizacion: new Date()
    };

    // Validaciones
    if (actualizacion.fecha > new Date()) {
      return res.status(400).json({ error: 'La fecha no puede ser futura' });
    }
    if (actualizacion.superficie <= 0) {
      return res.status(400).json({ error: 'La superficie debe ser mayor a 0' });
    }
    if (actualizacion.cantidadPlantas <= 0) {
      return res.status(400).json({ error: 'La cantidad de plantas debe ser mayor a 0' });
    }
    if (actualizacion.cantPersonal <= 0) {
      return res.status(400).json({ error: 'La cantidad de personal debe ser mayor a 0' });
    }
    if (actualizacion.jornada <= 0) {
      return res.status(400).json({ error: 'La jornada debe ser mayor a 0' });
    }

    const result = await db.collection('avancesTrabajos').updateOne(
      { _id: id },
      { $set: actualizacion }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Avance no encontrado' });
    }

    // Actualizar estado de la orden de trabajo
    const avance = await db.collection('avancesTrabajos').findOne({ _id: id });
    if (avance) {
      const ordenTrabajo = await db.collection('ordenesTrabajoAPI').findOne({ 
        _id: new ObjectId(avance.ordenTrabajoId) 
      });
      
      if (ordenTrabajo) {
        const avancesOrden = await db.collection('avancesTrabajos')
          .find({ ordenTrabajoId: avance.ordenTrabajoId })
          .toArray();
        
        const superficieTotal = avancesOrden.reduce((sum, a) => sum + a.superficie, 0);
        
        let nuevoEstado = ordenTrabajo.estado;
        if (avance.estado === 'C' && superficieTotal >= ordenTrabajo.superficie) {
          nuevoEstado = 3; // Finalizado
        } else if (avance.estado === 'P') {
          nuevoEstado = 2; // Pendiente
        }
        
        await db.collection('ordenesTrabajoAPI').updateOne(
          { _id: new ObjectId(avance.ordenTrabajoId) },
          { $set: { estado: nuevoEstado } }
        );
      }
    }

    res.json({ mensaje: 'Avance actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar avance:', error);
    res.status(500).json({ error: 'Error al actualizar avance' });
  }
}) as RequestHandler);

// Eliminar avance (solo ADMIN)
app.delete('/api/avancesTrabajos/:id', (async (req: Request, res: Response) => {
  try {
    // TODO: Implementar verificación de rol ADMIN
    const db = await getDB();
    const id = new ObjectId(req.params.id);
    
    const avance = await db.collection('avancesTrabajos').findOne({ _id: id });
    if (!avance) {
      return res.status(404).json({ error: 'Avance no encontrado' });
    }

    const result = await db.collection('avancesTrabajos').deleteOne({ _id: id });
    
    // Actualizar estado de la orden de trabajo
    if (avance) {
      const ordenTrabajo = await db.collection('ordenesTrabajoAPI').findOne({ 
        _id: new ObjectId(avance.ordenTrabajoId) 
      });
      
      if (ordenTrabajo) {
        const avancesOrden = await db.collection('avancesTrabajos')
          .find({ ordenTrabajoId: avance.ordenTrabajoId })
          .toArray();
        
        const superficieTotal = avancesOrden.reduce((sum, a) => sum + a.superficie, 0);
        
        let nuevoEstado = ordenTrabajo.estado;
        if (superficieTotal >= ordenTrabajo.superficie) {
          nuevoEstado = 3; // Finalizado
        } else if (superficieTotal > 0) {
          nuevoEstado = 2; // Pendiente
        } else {
          nuevoEstado = 1; // Inicial
        }
        
        await db.collection('ordenesTrabajoAPI').updateOne(
          { _id: new ObjectId(avance.ordenTrabajoId) },
          { $set: { estado: nuevoEstado } }
        );
      }
    }

    res.json({ mensaje: 'Avance eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar avance:', error);
    res.status(500).json({ error: 'Error al eliminar avance' });
  }
}) as RequestHandler);

// Obtener avances por orden de trabajo
app.get('/api/avancesTrabajos/orden/:ordenTrabajoId', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const ordenTrabajoId = req.params.ordenTrabajoId;
    const avances = await db.collection('avancesTrabajos')
      .find({ ordenTrabajoId })
      .sort({ fecha: -1 })
      .toArray();
    res.json(avances);
  } catch (error) {
    console.error('Error al obtener avances por orden:', error);
    res.status(500).json({ error: 'Error al obtener avances por orden' });
  }
}) as RequestHandler);

// Obtener avances por proveedor
app.get('/api/avancesTrabajos/proveedor/:proveedorId', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const proveedorId = req.params.proveedorId;
    const avances = await db.collection('avancesTrabajos')
      .find({ proveedorId })
      .sort({ fecha: -1 })
      .toArray();
    res.json(avances);
  } catch (error) {
    console.error('Error al obtener avances por proveedor:', error);
    res.status(500).json({ error: 'Error al obtener avances por proveedor' });
  }
}) as RequestHandler);

// Obtener avances por cuadrilla
app.get('/api/avancesTrabajos/cuadrilla/:cuadrillaId', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const cuadrillaId = req.params.cuadrillaId;
    const avances = await db.collection('avancesTrabajos')
      .find({ cuadrillaId })
      .sort({ fecha: -1 })
      .toArray();
    res.json(avances);
  } catch (error) {
    console.error('Error al obtener avances por cuadrilla:', error);
    res.status(500).json({ error: 'Error al obtener avances por cuadrilla' });
  }
}) as RequestHandler);

// Obtener avances por rango de fechas
app.get('/api/avancesTrabajos/fecha/:inicio/:fin', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const { inicio, fin } = req.params;
    const avances = await db.collection('avancesTrabajos')
      .find({
        fecha: {
          $gte: new Date(inicio),
          $lte: new Date(fin)
        }
      })
      .sort({ fecha: -1 })
      .toArray();
    res.json(avances);
  } catch (error) {
    console.error('Error al obtener avances por fecha:', error);
    res.status(500).json({ error: 'Error al obtener avances por fecha' });
  }
}) as RequestHandler);

// Rutas para plantillas
// Obtener todas las plantillas
app.get('/api/plantillas', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const plantillas = await db.collection('plantillas')
      .find({ activo: true })
      .sort({ nombre: 1 })
      .toArray();
    res.json(plantillas);
  } catch (error) {
    console.error('Error al obtener plantillas:', error);
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
}) as RequestHandler);

// Obtener plantilla por ID
app.get('/api/plantillas/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = new ObjectId(req.params.id);
    const plantilla = await db.collection('plantillas').findOne({ _id: id });
    if (!plantilla) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    res.json(plantilla);
  } catch (error) {
    console.error('Error al obtener plantilla:', error);
    res.status(500).json({ error: 'Error al obtener plantilla' });
  }
}) as RequestHandler);

// Obtener plantilla por código de actividad
app.get('/api/plantillas/actividad/:codigo', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const codigo = req.params.codigo;
    const plantilla = await db.collection('plantillas').findOne({ 
      actividadCodigo: codigo,
      activo: true 
    });
    if (!plantilla) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    res.json(plantilla);
  } catch (error) {
    console.error('Error al obtener plantilla por código:', error);
    res.status(500).json({ error: 'Error al obtener plantilla por código' });
  }
}) as RequestHandler);

// Crear nueva plantilla
app.post('/api/plantillas', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const plantilla = {
      ...req.body,
      fechaCreacion: new Date(),
      fechaModificacion: new Date()
    };

    // Validaciones
    if (!plantilla.nombre || !plantilla.actividadCodigo) {
      return res.status(400).json({ error: 'Nombre y código de actividad son requeridos' });
    }

    // Verificar unicidad de nombre y código
    const existente = await db.collection('plantillas').findOne({
      $or: [
        { nombre: plantilla.nombre },
        { actividadCodigo: plantilla.actividadCodigo }
      ]
    });

    if (existente) {
      return res.status(400).json({ 
        error: 'Ya existe una plantilla con ese nombre o código de actividad' 
      });
    }

    const result = await db.collection('plantillas').insertOne(plantilla);
    res.status(201).json({ 
      mensaje: 'Plantilla creada exitosamente',
      id: result.insertedId 
    });
  } catch (error) {
    console.error('Error al crear plantilla:', error);
    res.status(500).json({ error: 'Error al crear plantilla' });
  }
}) as RequestHandler);

// Actualizar plantilla
app.put('/api/plantillas/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = new ObjectId(req.params.id);
    const actualizacion = {
      ...req.body,
      fechaModificacion: new Date()
    };
    delete actualizacion._id;
    console.log('Actualización recibida para plantilla:', JSON.stringify(actualizacion, null, 2));

    // Validaciones
    if (!actualizacion.nombre || !actualizacion.actividadCodigo) {
      return res.status(400).json({ error: 'Nombre y código de actividad son requeridos' });
    }

    // Verificar unicidad de nombre y código
    const existente = await db.collection('plantillas').findOne({
      _id: { $ne: id },
      $or: [
        { nombre: actualizacion.nombre },
        { actividadCodigo: actualizacion.actividadCodigo }
      ]
    });

    if (existente) {
      return res.status(400).json({ 
        error: 'Ya existe otra plantilla con ese nombre o código de actividad' 
      });
    }

    const result = await db.collection('plantillas').updateOne(
      { _id: id },
      { $set: actualizacion }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    res.json({ mensaje: 'Plantilla actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar plantilla:', error);
    res.status(500).json({ error: 'Error al actualizar plantilla' });
  }
}) as RequestHandler);

// Eliminar plantilla (soft delete)
app.delete('/api/plantillas/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = new ObjectId(req.params.id);
    
    const result = await db.collection('plantillas').updateOne(
      { _id: id },
      { 
        $set: { 
          activo: false,
          fechaModificacion: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    res.json({ mensaje: 'Plantilla eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar plantilla:', error);
    res.status(500).json({ error: 'Error al eliminar plantilla' });
  }
}) as RequestHandler);

// Inicializar índices y datos de plantillas
async function inicializarPlantillas() {
  try {
    const db = await getDB();
    
    // Crear índices
    await db.collection('plantillas').createIndex({ actividadCodigo: 1 }, { unique: true });
    await db.collection('plantillas').createIndex({ nombre: 1 }, { unique: true });
    await db.collection('plantillas').createIndex({ activo: 1 });

    // Verificar si ya existen datos
    const count = await db.collection('plantillas').countDocuments();
    if (count === 0) {
      // Datos iniciales
      const plantillasIniciales = [
        {
          nombre: "PODA",
          descripcion: "Plantilla para actividades de poda de árboles",
          actividadCodigo: "SAP001",
          categoria: "Silvicultura",
          unidad: "Ha",
          patronesCoincidencia: ["PRIMERA PODA", "SEGUNDA PODA", "TERCERA PODA", "PODA"],
          campos: [
            {
              id: "fecha",
              nombre: "Fecha",
              tipo: "fecha",
              requerido: true,
              orden: 1,
              placeholder: "Seleccione la fecha de trabajo"
            },
            {
              id: "especie",
              nombre: "Especie",
              tipo: "seleccion",
              opciones: ["Pino", "Eucalipto", "Araucaria", "Otra"],
              requerido: true,
              orden: 2,
              placeholder: "Seleccione la especie"
            },
            {
              id: "superficie",
              nombre: "Superficie (Ha)",
              tipo: "numero",
              requerido: true,
              orden: 3,
              placeholder: "Ingrese la superficie en hectáreas",
              validacion: { min: 0.1, max: 1000 }
            },
            {
              id: "altura_poda",
              nombre: "Altura de Poda (m)",
              tipo: "numero",
              requerido: true,
              orden: 4,
              placeholder: "Altura en metros",
              validacion: { min: 1, max: 20 }
            },
            {
              id: "observaciones",
              nombre: "Observaciones",
              tipo: "textarea",
              requerido: false,
              orden: 5,
              placeholder: "Observaciones adicionales sobre el trabajo realizado"
            }
          ],
          activo: true,
          fechaCreacion: new Date(),
          fechaModificacion: new Date()
        },
        {
          nombre: "RALEO",
          descripcion: "Plantilla para actividades de raleo de plantaciones",
          actividadCodigo: "SAP002",
          categoria: "Silvicultura",
          unidad: "Ha",
          patronesCoincidencia: ["RALEO", "PRIMER RALEO", "SEGUNDO RALEO"],
          campos: [
            {
              id: "fecha",
              nombre: "Fecha",
              tipo: "fecha",
              requerido: true,
              orden: 1,
              placeholder: "Seleccione la fecha de trabajo"
            },
            {
              id: "especie",
              nombre: "Especie",
              tipo: "seleccion",
              opciones: ["Pino", "Eucalipto", "Araucaria"],
              requerido: true,
              orden: 2,
              placeholder: "Seleccione la especie"
            },
            {
              id: "superficie",
              nombre: "Superficie (Ha)",
              tipo: "numero",
              requerido: true,
              orden: 3,
              placeholder: "Superficie raleada en hectáreas",
              validacion: { min: 0.1, max: 1000 }
            },
            {
              id: "volumen_extraido",
              nombre: "Volumen Extraído (m³)",
              tipo: "numero",
              requerido: true,
              orden: 4,
              placeholder: "Volumen en metros cúbicos",
              validacion: { min: 1, max: 10000 }
            },
            {
              id: "intensidad_raleo",
              nombre: "Intensidad de Raleo (%)",
              tipo: "numero",
              requerido: true,
              orden: 5,
              placeholder: "Porcentaje de árboles extraídos",
              validacion: { min: 10, max: 70 }
            },
            {
              id: "observaciones",
              nombre: "Observaciones",
              tipo: "textarea",
              requerido: false,
              orden: 6,
              placeholder: "Observaciones sobre el raleo realizado"
            }
          ],
          activo: true,
          fechaCreacion: new Date(),
          fechaModificacion: new Date()
        },
        {
          nombre: "PLANTACION",
          descripcion: "Plantilla para actividades de plantación",
          actividadCodigo: "SAP003",
          categoria: "Silvicultura",
          unidad: "Ha",
          patronesCoincidencia: ["PLANTACION", "PLANTACIÓN", "REFORESTACION"],
          campos: [
            {
              id: "fecha",
              nombre: "Fecha",
              tipo: "fecha",
              requerido: true,
              orden: 1,
              placeholder: "Fecha de plantación"
            },
            {
              id: "especie",
              nombre: "Especie",
              tipo: "seleccion",
              opciones: ["Pino", "Eucalipto", "Araucaria", "Nativa"],
              requerido: true,
              orden: 2,
              placeholder: "Especie plantada"
            },
            {
              id: "superficie",
              nombre: "Superficie (Ha)",
              tipo: "numero",
              requerido: true,
              orden: 3,
              placeholder: "Superficie plantada",
              validacion: { min: 0.1, max: 1000 }
            },
            {
              id: "densidad",
              nombre: "Densidad (plantas/ha)",
              tipo: "numero",
              requerido: true,
              orden: 4,
              placeholder: "Número de plantas por hectárea",
              validacion: { min: 500, max: 3000 }
            },
            {
              id: "tipo_plantula",
              nombre: "Tipo de Plántula",
              tipo: "seleccion",
              opciones: ["Contenedor", "Raíz desnuda", "Estaca"],
              requerido: true,
              orden: 5,
              placeholder: "Tipo de material vegetal"
            },
            {
              id: "observaciones",
              nombre: "Observaciones",
              tipo: "textarea",
              requerido: false,
              orden: 6,
              placeholder: "Condiciones del terreno, clima, etc."
            }
          ],
          activo: true,
          fechaCreacion: new Date(),
          fechaModificacion: new Date()
        },
        {
          nombre: "COSECHA",
          descripcion: "Plantilla para actividades de cosecha forestal",
          actividadCodigo: "SAP004",
          categoria: "Cosecha",
          unidad: "m³",
          patronesCoincidencia: ["COSECHA", "CORTE", "TALA", "APROVECHAMIENTO"],
          campos: [
            {
              id: "fecha",
              nombre: "Fecha",
              tipo: "fecha",
              requerido: true,
              orden: 1,
              placeholder: "Fecha de cosecha"
            },
            {
              id: "especie",
              nombre: "Especie",
              tipo: "seleccion",
              opciones: ["Pino", "Eucalipto", "Araucaria"],
              requerido: true,
              orden: 2,
              placeholder: "Especie cosechada"
            },
            {
              id: "superficie",
              nombre: "Superficie (Ha)",
              tipo: "numero",
              requerido: true,
              orden: 3,
              placeholder: "Superficie cosechada",
              validacion: { min: 0.1, max: 1000 }
            },
            {
              id: "volumen_cosechado",
              nombre: "Volumen Cosechado (m³)",
              tipo: "numero",
              requerido: true,
              orden: 4,
              placeholder: "Volumen total cosechado",
              validacion: { min: 1, max: 50000 }
            },
            {
              id: "tipo_producto",
              nombre: "Tipo de Producto",
              tipo: "seleccion",
              opciones: ["Rollizo aserrío", "Rollizo pulpa", "Leña", "Postes", "Mixto"],
              requerido: true,
              orden: 5,
              placeholder: "Destino del producto"
            },
            {
              id: "observaciones",
              nombre: "Observaciones",
              tipo: "textarea",
              requerido: false,
              orden: 6,
              placeholder: "Condiciones de cosecha, accesos, etc."
            }
          ],
          activo: true,
          fechaCreacion: new Date(),
          fechaModificacion: new Date()
        },
        {
          nombre: "MANTENIMIENTO",
          descripcion: "Plantilla para actividades de mantenimiento general",
          actividadCodigo: "SAP005",
          categoria: "Mantenimiento",
          unidad: "Ha",
          patronesCoincidencia: ["MANTENIMIENTO", "LIMPIEZA", "DESMALEZADO", "FERTILIZACION"],
          campos: [
            {
              id: "fecha",
              nombre: "Fecha",
              tipo: "fecha",
              requerido: true,
              orden: 1,
              placeholder: "Fecha del mantenimiento"
            },
            {
              id: "tipo_mantenimiento",
              nombre: "Tipo de Mantenimiento",
              tipo: "seleccion",
              opciones: ["Desmalezado", "Fertilización", "Control de plagas", "Limpieza", "Otro"],
              requerido: true,
              orden: 2,
              placeholder: "Tipo de trabajo realizado"
            },
            {
              id: "superficie",
              nombre: "Superficie (Ha)",
              tipo: "numero",
              requerido: true,
              orden: 3,
              placeholder: "Superficie trabajada",
              validacion: { min: 0.1, max: 1000 }
            },
            {
              id: "insumos_utilizados",
              nombre: "Insumos Utilizados",
              tipo: "textarea",
              requerido: false,
              orden: 4,
              placeholder: "Detalle de productos químicos, fertilizantes, etc."
            },
            {
              id: "observaciones",
              nombre: "Observaciones",
              tipo: "textarea",
              requerido: false,
              orden: 5,
              placeholder: "Observaciones adicionales del trabajo"
            }
          ],
          activo: true,
          fechaCreacion: new Date(),
          fechaModificacion: new Date()
        }
      ];

      await db.collection('plantillas').insertMany(plantillasIniciales);
      console.log('Datos iniciales de plantillas insertados correctamente');
    }
  } catch (error) {
    console.error('Error al inicializar plantillas:', error);
  }
}

// Iniciar el servidor después de conectarse a la base de datos
// y exportar el handler para Vercel
if (process.env.VERCEL) {
  // Exporta el handler para Vercel
  module.exports = app;
} else {
  async function iniciarServidor() {
    try {
      db = await conectarBaseDatos();
      await inicializarPlantillas(); // Inicializar plantillas
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