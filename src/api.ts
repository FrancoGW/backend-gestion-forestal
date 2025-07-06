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
    
    // Extraer campos básicos requeridos
    const {
      ordenTrabajoId,
      proveedorId,
      fecha,
      superficie,
      cuadrillaId,
      rodal,
      actividad,
      // ... resto de campos dinámicos
      ...camposDinamicos
    } = req.body;

    // Validar campos básicos requeridos
    if (!ordenTrabajoId) {
      return res.status(400).json({ error: 'El ID de la orden de trabajo es requerido' });
    }
    if (!proveedorId) {
      return res.status(400).json({ error: 'El ID del proveedor es requerido' });
    }
    if (!fecha) {
      return res.status(400).json({ error: 'La fecha es requerida' });
    }
    if (!superficie) {
      return res.status(400).json({ error: 'La superficie es requerida' });
    }
    if (!cuadrillaId) {
      return res.status(400).json({ error: 'El ID de la cuadrilla es requerido' });
    }
    if (!rodal) {
      return res.status(400).json({ error: 'El rodal es requerido' });
    }
    if (!actividad) {
      return res.status(400).json({ error: 'La actividad es requerida' });
    }

    // Validaciones de tipo y rango para campos básicos
    if (new Date(fecha) > new Date()) {
      return res.status(400).json({ error: 'La fecha no puede ser futura' });
    }
    if (typeof superficie !== 'number' || superficie <= 0) {
      return res.status(400).json({ error: 'La superficie debe ser un número mayor a 0' });
    }

    // Construir el documento de avance con todos los campos
    const avance = {
      // Campos básicos requeridos
      ordenTrabajoId,
      proveedorId,
      fecha: new Date(fecha),
      superficie,
      cuadrillaId,
      rodal,
      actividad,
      // Campos dinámicos adicionales
      ...camposDinamicos,
      // Campos de sistema
      fechaRegistro: new Date(),
      ultimaActualizacion: new Date()
    };

    // Insertar el avance
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
    const id = req.params.id;

    // Logging para debugging
    console.log('Intentando actualizar avance con ID:', id);
    console.log('ID es válido:', ObjectId.isValid(id));

    // Validar que el ID sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      console.log('ID inválido recibido:', id);
      return res.status(400).json({ error: 'ID de avance inválido' });
    }

    const objectId = new ObjectId(id);
    const actualizaciones = req.body;

    // Logging de datos recibidos
    console.log('Datos de actualización recibidos:', JSON.stringify(actualizaciones, null, 2));

    // Validar que el avance existe
    const avanceExistente = await db.collection('avancesTrabajos').findOne({ _id: objectId });
    if (!avanceExistente) {
      console.log('Avance no encontrado con ID:', id);
      return res.status(404).json({ error: 'Avance no encontrado' });
    }

    console.log('Avance existente encontrado:', JSON.stringify(avanceExistente, null, 2));

    // TODO: Implementar verificación de permisos del proveedor
    // Por ahora solo validamos que el proveedorId coincida
    if (actualizaciones.proveedorId && actualizaciones.proveedorId !== avanceExistente.proveedorId) {
      console.log('Intento de actualización sin permisos. ProveedorId:', actualizaciones.proveedorId);
      return res.status(403).json({ error: 'No tiene permisos para modificar este avance' });
    }

    // Validar campos requeridos si se están actualizando
    if (actualizaciones.fecha) {
      const fechaActualizacion = new Date(actualizaciones.fecha);
      if (fechaActualizacion > new Date()) {
        console.log('Fecha futura detectada:', actualizaciones.fecha);
        return res.status(400).json({ error: 'La fecha no puede ser futura' });
      }
    }

    if (actualizaciones.superficie) {
      if (typeof actualizaciones.superficie !== 'number' || actualizaciones.superficie <= 0) {
        console.log('Superficie inválida:', actualizaciones.superficie);
        return res.status(400).json({ error: 'La superficie debe ser un número mayor a 0' });
      }
    }

    if (actualizaciones.cuadrillaId && !actualizaciones.cuadrillaId) {
      console.log('CuadrillaId inválido:', actualizaciones.cuadrillaId);
      return res.status(400).json({ error: 'El ID de la cuadrilla es requerido' });
    }

    // Preparar la actualización
    const actualizacion = {
      ...actualizaciones,
      ultimaActualizacion: new Date()
    };
    delete actualizacion._id; // No permitir actualizar el ID

    console.log('Preparando actualización:', JSON.stringify(actualizacion, null, 2));

    // Realizar la actualización
    const result = await db.collection('avancesTrabajos').updateOne(
      { _id: objectId },
      { $set: actualizacion }
    );

    if (result.matchedCount === 0) {
      console.log('No se encontró el avance para actualizar. ID:', id);
      return res.status(404).json({ error: 'Avance no encontrado' });
    }

    console.log('Actualización realizada. Resultado:', JSON.stringify(result, null, 2));

    // Obtener el avance actualizado
    const avanceActualizado = await db.collection('avancesTrabajos').findOne({ _id: objectId });
    console.log('Avance actualizado:', JSON.stringify(avanceActualizado, null, 2));

    // Actualizar estado de la orden de trabajo si es necesario
    if (avanceActualizado) {
      try {
        const ordenTrabajo = await db.collection('ordenesTrabajoAPI').findOne({ 
          _id: new ObjectId(avanceActualizado.ordenTrabajoId) 
        });
        
        if (ordenTrabajo) {
          const avancesOrden = await db.collection('avancesTrabajos')
            .find({ ordenTrabajoId: avanceActualizado.ordenTrabajoId })
            .toArray();
          
          const superficieTotal = avancesOrden.reduce((sum, a) => sum + a.superficie, 0);
          
          let nuevoEstado = ordenTrabajo.estado;
          if (avanceActualizado.estado === 'C' && superficieTotal >= ordenTrabajo.superficie) {
            nuevoEstado = 3; // Finalizado
          } else if (avanceActualizado.estado === 'P') {
            nuevoEstado = 2; // Pendiente
          }
          
          console.log('Actualizando estado de orden de trabajo:', {
            ordenId: ordenTrabajo._id,
            nuevoEstado,
            superficieTotal,
            superficieObjetivo: ordenTrabajo.superficie
          });

          await db.collection('ordenesTrabajoAPI').updateOne(
            { _id: new ObjectId(avanceActualizado.ordenTrabajoId) },
            { $set: { estado: nuevoEstado } }
          );
        }
      } catch (error) {
        console.error('Error al actualizar estado de orden de trabajo:', error);
        // No fallamos la actualización del avance si falla la actualización del estado
      }
    }

    res.json({
      success: true,
      mensaje: 'Avance actualizado exitosamente',
      avance: avanceActualizado
    });
  } catch (error: any) {
    console.error('Error al actualizar avance:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al actualizar avance',
      details: error?.message || 'Error desconocido'
    });
  }
}) as RequestHandler);

// Eliminar avance
app.delete('/api/avancesTrabajos/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = req.params.id;

    // Logging para debugging
    console.log('Intentando eliminar avance con ID:', id);
    console.log('ID es válido:', ObjectId.isValid(id));

    // Validar que el ID sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      console.log('ID inválido recibido:', id);
      return res.status(400).json({ error: 'ID de avance inválido' });
    }

    const objectId = new ObjectId(id);

    // Verificar que la colección existe
    const collections = await db.listCollections().toArray();
    const collectionExists = collections.some(col => col.name === 'avancesTrabajos');
    if (!collectionExists) {
      console.error('La colección avancesTrabajos no existe');
      return res.status(500).json({ error: 'Error de configuración: colección no encontrada' });
    }

    // Validar que el avance existe
    const avanceExistente = await db.collection('avancesTrabajos').findOne({ _id: objectId });
    if (!avanceExistente) {
      console.log('Avance no encontrado con ID:', id);
      return res.status(404).json({ error: 'Avance no encontrado' });
    }

    console.log('Avance encontrado:', JSON.stringify(avanceExistente, null, 2));

    // TODO: Implementar verificación de permisos del proveedor
    // Por ahora solo validamos que el proveedorId coincida con el del request
    if (req.body.proveedorId && req.body.proveedorId !== avanceExistente.proveedorId) {
      console.log('Intento de eliminación sin permisos. ProveedorId:', req.body.proveedorId);
      return res.status(403).json({ error: 'No tiene permisos para eliminar este avance' });
    }

    // Eliminar el avance
    console.log('Eliminando avance con ID:', id);
    const result = await db.collection('avancesTrabajos').deleteOne({ _id: objectId });
    
    if (result.deletedCount === 0) {
      console.log('No se pudo eliminar el avance. ID:', id);
      return res.status(404).json({ error: 'Avance no encontrado' });
    }

    console.log('Avance eliminado exitosamente. Resultado:', JSON.stringify(result, null, 2));

    // Actualizar estado de la orden de trabajo
    try {
      const ordenTrabajo = await db.collection('ordenesTrabajoAPI').findOne({ 
        _id: new ObjectId(avanceExistente.ordenTrabajoId) 
      });
      
      if (ordenTrabajo) {
        const avancesOrden = await db.collection('avancesTrabajos')
          .find({ ordenTrabajoId: avanceExistente.ordenTrabajoId })
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
        
        console.log('Actualizando estado de orden de trabajo:', {
          ordenId: ordenTrabajo._id,
          nuevoEstado,
          superficieTotal,
          superficieObjetivo: ordenTrabajo.superficie
        });

        await db.collection('ordenesTrabajoAPI').updateOne(
          { _id: new ObjectId(avanceExistente.ordenTrabajoId) },
          { $set: { estado: nuevoEstado } }
        );
      }
    } catch (error) {
      console.error('Error al actualizar estado de orden de trabajo:', error);
      // No fallamos la eliminación del avance si falla la actualización del estado
    }

    res.status(200).json({ 
      success: true,
      mensaje: 'Avance eliminado exitosamente',
      deletedId: id 
    });
  } catch (error: any) {
    console.error('Error al eliminar avance:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al eliminar avance',
      details: error?.message || 'Error desconocido'
    });
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

// Rutas para clones
// Obtener todos los clones
app.get('/api/clones', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const clones = await db.collection('clones').find().toArray();
    res.json(clones);
  } catch (error) {
    console.error('Error al obtener clones:', error);
    res.status(500).json({ error: 'Error al obtener clones' });
  }
}) as RequestHandler);

// Obtener clone por ID
app.get('/api/clones/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = new ObjectId(req.params.id);
    const clone = await db.collection('clones').findOne({ _id: id });
    if (!clone) {
      return res.status(404).json({ error: 'Clone no encontrado' });
    }
    res.json(clone);
  } catch (error) {
    console.error('Error al obtener clone:', error);
    res.status(500).json({ error: 'Error al obtener clone' });
  }
}) as RequestHandler);

// Crear nuevo clone
app.post('/api/clones', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const clone = {
      ...req.body,
      fechaCreacion: new Date(),
      fechaModificacion: new Date()
    };
    const result = await db.collection('clones').insertOne(clone);
    res.status(201).json({ 
      mensaje: 'Clone creado exitosamente',
      id: result.insertedId 
    });
  } catch (error) {
    console.error('Error al crear clone:', error);
    res.status(500).json({ error: 'Error al crear clone' });
  }
}) as RequestHandler);

// Actualizar clone
app.put('/api/clones/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = new ObjectId(req.params.id);
    const actualizacion = {
      ...req.body,
      fechaModificacion: new Date()
    };
    delete actualizacion._id;

    const result = await db.collection('clones').updateOne(
      { _id: id },
      { $set: actualizacion }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Clone no encontrado' });
    }

    res.json({ mensaje: 'Clone actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar clone:', error);
    res.status(500).json({ error: 'Error al actualizar clone' });
  }
}) as RequestHandler);

// Eliminar clone
app.delete('/api/clones/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = new ObjectId(req.params.id);
    const result = await db.collection('clones').deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Clone no encontrado' });
    }

    res.json({ mensaje: 'Clone eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar clone:', error);
    res.status(500).json({ error: 'Error al eliminar clone' });
  }
}) as RequestHandler);

// Rutas para viveros
// Obtener todos los viveros
app.get('/api/viveros', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const viveros = await db.collection('viveros').find().toArray();
    res.json(viveros);
  } catch (error) {
    console.error('Error al obtener viveros:', error);
    res.status(500).json({ error: 'Error al obtener viveros' });
  }
}) as RequestHandler);

// Obtener vivero por ID
app.get('/api/viveros/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = new ObjectId(req.params.id);
    const vivero = await db.collection('viveros').findOne({ _id: id });
    if (!vivero) {
      return res.status(404).json({ error: 'Vivero no encontrado' });
    }
    res.json(vivero);
  } catch (error) {
    console.error('Error al obtener vivero:', error);
    res.status(500).json({ error: 'Error al obtener vivero' });
  }
}) as RequestHandler);

// Crear nuevo vivero
app.post('/api/viveros', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const vivero = {
      ...req.body,
      fechaCreacion: new Date(),
      fechaModificacion: new Date()
    };
    const result = await db.collection('viveros').insertOne(vivero);
    res.status(201).json({ 
      mensaje: 'Vivero creado exitosamente',
      id: result.insertedId 
    });
  } catch (error) {
    console.error('Error al crear vivero:', error);
    res.status(500).json({ error: 'Error al crear vivero' });
  }
}) as RequestHandler);

// Actualizar vivero
app.put('/api/viveros/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = new ObjectId(req.params.id);
    const actualizacion = {
      ...req.body,
      fechaModificacion: new Date()
    };
    delete actualizacion._id;

    const result = await db.collection('viveros').updateOne(
      { _id: id },
      { $set: actualizacion }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Vivero no encontrado' });
    }

    res.json({ mensaje: 'Vivero actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar vivero:', error);
    res.status(500).json({ error: 'Error al actualizar vivero' });
  }
}) as RequestHandler);

// Eliminar vivero
app.delete('/api/viveros/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = new ObjectId(req.params.id);
    const result = await db.collection('viveros').deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Vivero no encontrado' });
    }

    res.json({ mensaje: 'Vivero eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar vivero:', error);
    res.status(500).json({ error: 'Error al eliminar vivero' });
  }
}) as RequestHandler);

// Rutas para productos de malezas
// Obtener todos los productos de malezas
app.get('/api/malezasProductos', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const productos = await db.collection('malezasProductos')
      .find({ activo: true })
      .sort({ nombre: 1 })
      .toArray();
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos de malezas:', error);
    res.status(500).json({ error: 'Error al obtener productos de malezas' });
  }
}) as RequestHandler);

// Obtener producto de malezas por ID
app.get('/api/malezasProductos/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = req.params.id;

    // Validar que el ID sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    const objectId = new ObjectId(id);
    const producto = await db.collection('malezasProductos').findOne({ _id: objectId });
    
    if (!producto) {
      return res.status(404).json({ error: 'Producto de malezas no encontrado' });
    }
    
    res.json(producto);
  } catch (error) {
    console.error('Error al obtener producto de malezas:', error);
    res.status(500).json({ error: 'Error al obtener producto de malezas' });
  }
}) as RequestHandler);

// Crear nuevo producto de malezas
app.post('/api/malezasProductos', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const {
      nombre,
      descripcion,
      tipo,
      unidadMedida,
      categoria,
      activo = true
    } = req.body;

    // Validaciones
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return res.status(400).json({ 
        error: 'El nombre es requerido y debe tener al menos 2 caracteres' 
      });
    }

    if (!unidadMedida || !['cm3', 'ml', 'l', 'kg', 'g'].includes(unidadMedida)) {
      return res.status(400).json({ 
        error: 'La unidad de medida es requerida y debe ser: cm3, ml, l, kg, g' 
      });
    }

    if (tipo && !['Sistémico', 'Contacto', 'Preemergente', 'Postemergente', 'Selectivo', 'No selectivo', 'Hormonal'].includes(tipo)) {
      return res.status(400).json({ 
        error: 'El tipo debe ser uno de: Sistémico, Contacto, Preemergente, Postemergente, Selectivo, No selectivo, Hormonal' 
      });
    }

    if (categoria && !['Herbicida total', 'Herbicida selectivo', 'Graminicida', 'Dicotiledónicida', 'Hormonal', 'Inhibidor fotosíntesis'].includes(categoria)) {
      return res.status(400).json({ 
        error: 'La categoría debe ser una de: Herbicida total, Herbicida selectivo, Graminicida, Dicotiledónicida, Hormonal, Inhibidor fotosíntesis' 
      });
    }

    // Verificar que no exista un producto con el mismo nombre
    const productoExistente = await db.collection('malezasProductos').findOne({ 
      nombre: nombre.trim(),
      activo: true 
    });

    if (productoExistente) {
      return res.status(400).json({ 
        error: 'Ya existe un producto con ese nombre' 
      });
    }

    const producto = {
      nombre: nombre.trim(),
      descripcion: descripcion ? descripcion.trim() : '',
      tipo: tipo || '',
      unidadMedida,
      categoria: categoria || '',
      activo: Boolean(activo),
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };

    const result = await db.collection('malezasProductos').insertOne(producto);
    
    console.log('Producto de malezas creado:', {
      id: result.insertedId,
      nombre: producto.nombre
    });

    res.status(201).json({ 
      mensaje: 'Producto de malezas creado exitosamente',
      id: result.insertedId,
      producto
    });
  } catch (error) {
    console.error('Error al crear producto de malezas:', error);
    res.status(500).json({ error: 'Error al crear producto de malezas' });
  }
}) as RequestHandler);

// Actualizar producto de malezas
app.put('/api/malezasProductos/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = req.params.id;

    // Validar que el ID sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    const objectId = new ObjectId(id);
    const {
      nombre,
      descripcion,
      tipo,
      unidadMedida,
      categoria,
      activo
    } = req.body;

    // Validar que el producto existe
    const productoExistente = await db.collection('malezasProductos').findOne({ _id: objectId });
    if (!productoExistente) {
      return res.status(404).json({ error: 'Producto de malezas no encontrado' });
    }

    // Validaciones
    if (nombre !== undefined) {
      if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
        return res.status(400).json({ 
          error: 'El nombre debe tener al menos 2 caracteres' 
        });
      }

      // Verificar que no exista otro producto con el mismo nombre
      const productoConMismoNombre = await db.collection('malezasProductos').findOne({ 
        nombre: nombre.trim(),
        _id: { $ne: objectId },
        activo: true 
      });

      if (productoConMismoNombre) {
        return res.status(400).json({ 
          error: 'Ya existe otro producto con ese nombre' 
        });
      }
    }

    if (unidadMedida !== undefined && !['cm3', 'ml', 'l', 'kg', 'g'].includes(unidadMedida)) {
      return res.status(400).json({ 
        error: 'La unidad de medida debe ser: cm3, ml, l, kg, g' 
      });
    }

    if (tipo !== undefined && !['Sistémico', 'Contacto', 'Preemergente', 'Postemergente', 'Selectivo', 'No selectivo', 'Hormonal'].includes(tipo)) {
      return res.status(400).json({ 
        error: 'El tipo debe ser uno de: Sistémico, Contacto, Preemergente, Postemergente, Selectivo, No selectivo, Hormonal' 
      });
    }

    if (categoria !== undefined && !['Herbicida total', 'Herbicida selectivo', 'Graminicida', 'Dicotiledónicida', 'Hormonal', 'Inhibidor fotosíntesis'].includes(categoria)) {
      return res.status(400).json({ 
        error: 'La categoría debe ser una de: Herbicida total, Herbicida selectivo, Graminicida, Dicotiledónicida, Hormonal, Inhibidor fotosíntesis' 
      });
    }

    // Preparar la actualización
    const actualizacion: any = {
      fechaActualizacion: new Date()
    };

    if (nombre !== undefined) actualizacion.nombre = nombre.trim();
    if (descripcion !== undefined) actualizacion.descripcion = descripcion.trim();
    if (tipo !== undefined) actualizacion.tipo = tipo;
    if (unidadMedida !== undefined) actualizacion.unidadMedida = unidadMedida;
    if (categoria !== undefined) actualizacion.categoria = categoria;
    if (activo !== undefined) actualizacion.activo = Boolean(activo);

    const result = await db.collection('malezasProductos').updateOne(
      { _id: objectId },
      { $set: actualizacion }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Producto de malezas no encontrado' });
    }

    console.log('Producto de malezas actualizado:', {
      id: objectId,
      nombre: actualizacion.nombre || productoExistente.nombre
    });

    // Obtener el producto actualizado
    const productoActualizado = await db.collection('malezasProductos').findOne({ _id: objectId });

    res.json({
      mensaje: 'Producto de malezas actualizado exitosamente',
      producto: productoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar producto de malezas:', error);
    res.status(500).json({ error: 'Error al actualizar producto de malezas' });
  }
}) as RequestHandler);

// Eliminar producto de malezas (soft delete)
app.delete('/api/malezasProductos/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = req.params.id;

    // Validar que el ID sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    const objectId = new ObjectId(id);

    // Verificar que el producto existe
    const productoExistente = await db.collection('malezasProductos').findOne({ _id: objectId });
    if (!productoExistente) {
      return res.status(404).json({ error: 'Producto de malezas no encontrado' });
    }

    // Soft delete - marcar como inactivo
    const result = await db.collection('malezasProductos').updateOne(
      { _id: objectId },
      { 
        $set: { 
          activo: false,
          fechaActualizacion: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Producto de malezas no encontrado' });
    }

    console.log('Producto de malezas eliminado (soft delete):', {
      id: objectId,
      nombre: productoExistente.nombre
    });

    res.json({ 
      mensaje: 'Producto de malezas eliminado exitosamente',
      id: objectId
    });
  } catch (error) {
    console.error('Error al eliminar producto de malezas:', error);
    res.status(500).json({ error: 'Error al eliminar producto de malezas' });
  }
}) as RequestHandler);

// Obtener productos de malezas por tipo
app.get('/api/malezasProductos/tipo/:tipo', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const tipo = req.params.tipo;
    
    const tiposValidos = ['Sistémico', 'Contacto', 'Preemergente', 'Postemergente', 'Selectivo', 'No selectivo', 'Hormonal'];
    
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ 
        error: 'Tipo inválido. Debe ser uno de: ' + tiposValidos.join(', ') 
      });
    }

    const productos = await db.collection('malezasProductos')
      .find({ 
        tipo: tipo,
        activo: true 
      })
      .sort({ nombre: 1 })
      .toArray();
    
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos por tipo:', error);
    res.status(500).json({ error: 'Error al obtener productos por tipo' });
  }
}) as RequestHandler);

// Obtener productos de malezas por categoría
app.get('/api/malezasProductos/categoria/:categoria', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const categoria = req.params.categoria;
    
    const categoriasValidas = ['Herbicida total', 'Herbicida selectivo', 'Graminicida', 'Dicotiledónicida', 'Hormonal', 'Inhibidor fotosíntesis'];
    
    if (!categoriasValidas.includes(categoria)) {
      return res.status(400).json({ 
        error: 'Categoría inválida. Debe ser una de: ' + categoriasValidas.join(', ') 
      });
    }

    const productos = await db.collection('malezasProductos')
      .find({ 
        categoria: categoria,
        activo: true 
      })
      .sort({ nombre: 1 })
      .toArray();
    
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos por categoría:', error);
    res.status(500).json({ error: 'Error al obtener productos por categoría' });
  }
}) as RequestHandler);

// Obtener todos los supervisores
app.get('/api/supervisores', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const supervisores = await db.collection('supervisores')
      .find({ activo: true })
      .sort({ nombre: 1 })
      .toArray();
    
    res.json({
      success: true,
      data: supervisores
    });
  } catch (error: any) {
    console.error('Error al obtener supervisores:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener supervisores',
      error: error.message
    });
  }
}) as RequestHandler);

// Obtener proveedores asignados a un supervisor por nombre
app.get('/api/supervisores/:nombre/proveedores', (async (req, res) => {
  try {
    const db = await getDB();
    const { nombre } = req.params;

    // Buscar en la colección 'supervisores'
    const supervisor = await db.collection('supervisores').findOne({
      nombre: decodeURIComponent(nombre),
      activo: true
    });

    if (!supervisor) {
      return res.status(404).json({
        success: false,
        message: 'Supervisor no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        supervisor: {
          nombre: supervisor.nombre,
          email: supervisor.email,
          telefono: supervisor.telefono
        },
        proveedores: supervisor.proveedoresAsignados || []
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos del supervisor',
      error: error.message
    });
  }
}) as RequestHandler);

// Rutas para usuarios admin
// Obtener todos los usuarios admin
app.get('/api/usuarios_admin', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const usuarios = await db.collection('usuarios_admin')
      .find({ activo: true })
      .sort({ nombre: 1 })
      .toArray();
    
    // No devolver las contraseñas en la respuesta
    const usuariosSinPassword = usuarios.map(usuario => {
      const { password, ...usuarioSinPassword } = usuario;
      return usuarioSinPassword;
    });
    
    res.json({
      success: true,
      data: usuariosSinPassword
    });
  } catch (error: any) {
    console.error('Error al obtener usuarios admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios admin',
      error: error.message
    });
  }
}) as RequestHandler);

// Obtener usuario admin por ID
app.get('/api/usuarios_admin/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = req.params.id;

    // Validar que el ID sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'ID de usuario inválido' 
      });
    }

    const objectId = new ObjectId(id);
    const usuario = await db.collection('usuarios_admin').findOne({ _id: objectId });
    
    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        message: 'Usuario no encontrado' 
      });
    }
    
    // No devolver la contraseña
    const { password, ...usuarioSinPassword } = usuario;
    res.json({
      success: true,
      data: usuarioSinPassword
    });
  } catch (error: any) {
    console.error('Error al obtener usuario admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario admin',
      error: error.message
    });
  }
}) as RequestHandler);

// Autenticación de usuario
app.post('/api/usuarios_admin/login', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const { email, password } = req.body;

    // Validaciones
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario por email
    const usuario = await db.collection('usuarios_admin').findOne({ 
      email: email.toLowerCase().trim(),
      activo: true 
    });

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña (por ahora en texto plano)
    if (usuario.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // No devolver la contraseña en la respuesta
    const { password: _, ...usuarioSinPassword } = usuario;

    res.json({
      success: true,
      message: 'Autenticación exitosa',
      data: usuarioSinPassword
    });
  } catch (error: any) {
    console.error('Error en autenticación:', error);
    res.status(500).json({
      success: false,
      message: 'Error en autenticación',
      error: error.message
    });
  }
}) as RequestHandler);

// Crear nuevo usuario admin
app.post('/api/usuarios_admin', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const {
      nombre,
      apellido,
      email,
      password,
      rol,
      cuit,
      telefono,
      activo = true
    } = req.body;

    // Validaciones
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es requerido y debe tener al menos 2 caracteres'
      });
    }

    if (!apellido || typeof apellido !== 'string' || apellido.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El apellido es requerido y debe tener al menos 2 caracteres'
      });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'El email es requerido y debe ser válido'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña es requerida y debe tener al menos 4 caracteres'
      });
    }

    if (!rol || !['admin', 'supervisor', 'provider'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'El rol es requerido y debe ser: admin, supervisor, o provider'
      });
    }

    // Verificar que el email sea único
    const usuarioExistente = await db.collection('usuarios_admin').findOne({ 
      email: email.toLowerCase().trim(),
      activo: true 
    });

    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con ese email'
      });
    }

    const usuario = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.toLowerCase().trim(),
      password: password, // Por ahora en texto plano
      rol,
      cuit: cuit ? cuit.trim() : null,
      telefono: telefono ? telefono.trim() : null,
      activo: Boolean(activo),
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };

    const result = await db.collection('usuarios_admin').insertOne(usuario);
    
    console.log('Usuario admin creado:', {
      id: result.insertedId,
      email: usuario.email,
      rol: usuario.rol
    });

    // No devolver la contraseña en la respuesta
    const { password: _, ...usuarioSinPassword } = usuario;

    res.status(201).json({
      success: true,
      message: 'Usuario admin creado exitosamente',
      data: {
        _id: result.insertedId,
        ...usuarioSinPassword
      }
    });
  } catch (error: any) {
    console.error('Error al crear usuario admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario admin',
      error: error.message
    });
  }
}) as RequestHandler);

// Actualizar usuario admin
app.put('/api/usuarios_admin/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = req.params.id;

    // Validar que el ID sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    const objectId = new ObjectId(id);
    const {
      nombre,
      apellido,
      email,
      password,
      rol,
      cuit,
      telefono,
      activo
    } = req.body;

    // Verificar que el usuario existe
    const usuarioExistente = await db.collection('usuarios_admin').findOne({ _id: objectId });
    if (!usuarioExistente) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Validaciones
    if (nombre !== undefined) {
      if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'El nombre debe tener al menos 2 caracteres'
        });
      }
    }

    if (apellido !== undefined) {
      if (!apellido || typeof apellido !== 'string' || apellido.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'El apellido debe tener al menos 2 caracteres'
        });
      }
    }

    if (email !== undefined) {
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({
          success: false,
          message: 'El email debe ser válido'
        });
      }

      // Verificar que el email sea único (excluyendo el usuario actual)
      const usuarioConMismoEmail = await db.collection('usuarios_admin').findOne({ 
        email: email.toLowerCase().trim(),
        _id: { $ne: objectId },
        activo: true 
      });

      if (usuarioConMismoEmail) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro usuario con ese email'
        });
      }
    }

    if (password !== undefined) {
      if (!password || typeof password !== 'string' || password.length < 4) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 4 caracteres'
        });
      }
    }

    if (rol !== undefined) {
      if (!['admin', 'supervisor', 'provider'].includes(rol)) {
        return res.status(400).json({
          success: false,
          message: 'El rol debe ser: admin, supervisor, o provider'
        });
      }
    }

    // Preparar la actualización
    const actualizacion: any = {
      fechaActualizacion: new Date()
    };

    if (nombre !== undefined) actualizacion.nombre = nombre.trim();
    if (apellido !== undefined) actualizacion.apellido = apellido.trim();
    if (email !== undefined) actualizacion.email = email.toLowerCase().trim();
    if (password !== undefined) actualizacion.password = password;
    if (rol !== undefined) actualizacion.rol = rol;
    if (cuit !== undefined) actualizacion.cuit = cuit ? cuit.trim() : null;
    if (telefono !== undefined) actualizacion.telefono = telefono ? telefono.trim() : null;
    if (activo !== undefined) actualizacion.activo = Boolean(activo);

    const result = await db.collection('usuarios_admin').updateOne(
      { _id: objectId },
      { $set: actualizacion }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log('Usuario admin actualizado:', {
      id: objectId,
      email: actualizacion.email || usuarioExistente.email
    });

    // Obtener el usuario actualizado
    const usuarioActualizado = await db.collection('usuarios_admin').findOne({ _id: objectId });
    const { password: _, ...usuarioSinPassword } = usuarioActualizado!;

    res.json({
      success: true,
      message: 'Usuario admin actualizado exitosamente',
      data: usuarioSinPassword
    });
  } catch (error: any) {
    console.error('Error al actualizar usuario admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario admin',
      error: error.message
    });
  }
}) as RequestHandler);

// Eliminar usuario admin (soft delete)
app.delete('/api/usuarios_admin/:id', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const id = req.params.id;

    // Validar que el ID sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    const objectId = new ObjectId(id);

    // Verificar que el usuario existe
    const usuarioExistente = await db.collection('usuarios_admin').findOne({ _id: objectId });
    if (!usuarioExistente) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar que no se elimine el último usuario admin
    if (usuarioExistente.rol === 'admin') {
      const adminsActivos = await db.collection('usuarios_admin').countDocuments({
        rol: 'admin',
        activo: true
      });

      if (adminsActivos <= 1) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar el último usuario administrador'
        });
      }
    }

    // Soft delete - marcar como inactivo
    const result = await db.collection('usuarios_admin').updateOne(
      { _id: objectId },
      { 
        $set: { 
          activo: false,
          fechaActualizacion: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log('Usuario admin eliminado (soft delete):', {
      id: objectId,
      email: usuarioExistente.email
    });

    res.json({
      success: true,
      message: 'Usuario admin eliminado exitosamente',
      data: { id: objectId }
    });
  } catch (error: any) {
    console.error('Error al eliminar usuario admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario admin',
      error: error.message
    });
  }
}) as RequestHandler);

// Obtener usuarios por rol
app.get('/api/usuarios_admin/rol/:rol', (async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const rol = req.params.rol;
    
    const rolesValidos = ['admin', 'supervisor', 'provider'];
    
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido. Debe ser uno de: ' + rolesValidos.join(', ')
      });
    }

    const usuarios = await db.collection('usuarios_admin')
      .find({ 
        rol: rol,
        activo: true 
      })
      .sort({ nombre: 1 })
      .toArray();
    
    // No devolver las contraseñas
    const usuariosSinPassword = usuarios.map(usuario => {
      const { password, ...usuarioSinPassword } = usuario;
      return usuarioSinPassword;
    });
    
    res.json({
      success: true,
      data: usuariosSinPassword
    });
  } catch (error: any) {
    console.error('Error al obtener usuarios por rol:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios por rol',
      error: error.message
    });
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

// Inicializar usuarios admin con datos de migración
async function inicializarUsuariosAdmin() {
  try {
    const db = await getDB();
    
    // Crear índices
    await db.collection('usuarios_admin').createIndex({ email: 1 }, { unique: true });
    await db.collection('usuarios_admin').createIndex({ rol: 1 });
    await db.collection('usuarios_admin').createIndex({ activo: 1 });

    // Verificar si ya existen datos
    const count = await db.collection('usuarios_admin').countDocuments();
    if (count === 0) {
      // Datos iniciales de migración (usuarios hardcodeados)
      const usuariosIniciales = [
        {
          _id: new ObjectId('507f1f77bcf86cd799439011'),
          nombre: 'Admin',
          apellido: 'Sistema',
          email: 'admin@sistema.com',
          password: 'admin123',
          rol: 'admin',
          cuit: null,
          telefono: null,
          activo: true,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        },
        {
          _id: new ObjectId('507f1f77bcf86cd799439012'),
          nombre: 'Juan',
          apellido: 'Pérez',
          email: 'juan.perez@empresa.com',
          password: 'supervisor123',
          rol: 'supervisor',
          cuit: null,
          telefono: null,
          activo: true,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        },
        {
          _id: new ObjectId('507f1f77bcf86cd799439013'),
          nombre: 'María',
          apellido: 'González',
          email: 'maria.gonzalez@empresa.com',
          password: 'supervisor456',
          rol: 'supervisor',
          cuit: null,
          telefono: null,
          activo: true,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        },
        {
          _id: new ObjectId('507f1f77bcf86cd799439014'),
          nombre: 'Carlos',
          apellido: 'López',
          email: 'carlos.lopez@proveedor.com',
          password: 'provider123',
          rol: 'provider',
          cuit: '20-12345678-9',
          telefono: '+54 11 1234-5678',
          activo: true,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        },
        {
          _id: new ObjectId('507f1f77bcf86cd799439015'),
          nombre: 'Ana',
          apellido: 'Martínez',
          email: 'ana.martinez@proveedor.com',
          password: 'provider456',
          rol: 'provider',
          cuit: '20-87654321-0',
          telefono: '+54 11 8765-4321',
          activo: true,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        },
        {
          _id: new ObjectId('507f1f77bcf86cd799439016'),
          nombre: 'Roberto',
          apellido: 'Fernández',
          email: 'roberto.fernandez@proveedor.com',
          password: 'provider789',
          rol: 'provider',
          cuit: '20-11223344-5',
          telefono: '+54 11 1122-3344',
          activo: true,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        }
      ];

      await db.collection('usuarios_admin').insertMany(usuariosIniciales);
      console.log('Datos iniciales de usuarios admin insertados correctamente');
    }
  } catch (error) {
    console.error('Error al inicializar usuarios admin:', error);
  }
}

// Obtener proveedores asignados a un supervisor por ID (ObjectId)
app.get('/api/supervisores/:id/proveedores', (async (req, res) => {
  try {
    const db = await getDB();
    const idParam = req.params.id;
    let supervisor = null;

    // Buscar solo por ObjectId (lo más común en MongoDB)
    try {
      supervisor = await db.collection('supervisores').findOne({
        _id: new ObjectId(idParam),
        activo: true
      });
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'ID de supervisor inválido'
      });
    }

    if (!supervisor) {
      return res.status(404).json({
        success: false,
        message: `Supervisor con ID ${idParam} no encontrado`
      });
    }

    // Obtener proveedores asignados y formatear
    const proveedores = (supervisor.proveedoresAsignados || []).map((p: any) => ({
      proveedorId: p.proveedorId ?? p.id ?? p._id ?? null,
      nombre: p.nombre ?? '',
      fechaAsignacion: p.fechaAsignacion ?? null
    }));

    res.json({
      success: true,
      data: {
        proveedores: proveedores
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}) as RequestHandler);

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
      await inicializarUsuariosAdmin(); // Inicializar usuarios admin
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