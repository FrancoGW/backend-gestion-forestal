import { Request, Response } from 'express';
import { Vivero, IVivero } from '../models/vivero';
import { MongoClient, ObjectId } from 'mongodb';

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'gestion_forestal';

// Función para obtener conexión a la base de datos
async function getDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db(DB_NAME);
}

// Función para validar si una especie existe en la colección especies
async function validarEspecies(especies: string[]): Promise<string[]> {
  const db = await getDB();
  const especiesValidas: string[] = [];
  
  for (const especie of especies) {
    // Si es un ObjectId válido, verificar si existe en la colección especies
    if (ObjectId.isValid(especie) && especie.length === 24) {
      const especieExistente = await db.collection('especies').findOne({ _id: new ObjectId(especie) });
      if (especieExistente) {
        especiesValidas.push(especie);
      }
    } else {
      // Si no es un ObjectId, es texto personalizado, lo aceptamos
      especiesValidas.push(especie);
    }
  }
  
  return especiesValidas;
}

// Función de prueba para verificar conexión
export const testConnection = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 Probando conexión a MongoDB...');
    
    // Intentar conectar a la base de datos
    const db = await getDB();
    console.log('✅ Conexión a MongoDB exitosa');
    
    // Intentar hacer una consulta simple
    const count = await Vivero.countDocuments();
    console.log('✅ Consulta a colección viveros exitosa, total:', count);
    
    res.json({
      success: true,
      message: 'Conexión exitosa',
      totalViveros: count
    });
    
  } catch (error) {
    console.error('❌ Error en prueba de conexión:', error);
    res.status(500).json({
      success: false,
      error: 'Error de conexión a la base de datos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// 1. Obtener todos los viveros con filtros opcionales
export const getAllViveros = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, activo, ubicacion, especie, page = 1, limit = 10 } = req.query;
    
    // Obtener conexión directa a MongoDB
    const db = await getDB();
    const viverosCollection = db.collection('viveros');
    
    // Construir filtros
    const filtros: any = {};
    
    if (search) {
      filtros.$or = [
        { nombre: { $regex: search as string, $options: 'i' } },
        { ubicacion: { $regex: search as string, $options: 'i' } },
        { contacto: { $regex: search as string, $options: 'i' } }
      ];
    }
    
    if (activo !== undefined) {
      filtros.activo = activo === 'true';
    }
    
    if (ubicacion) {
      filtros.ubicacion = { $regex: ubicacion as string, $options: 'i' };
    }
    
    if (especie) {
      filtros.especies = { $regex: especie as string, $options: 'i' };
    }
    
    // Calcular paginación
    const skip = (Number(page) - 1) * Number(limit);
    
    // Ejecutar consulta usando MongoDB nativo
    const viveros = await viverosCollection
      .find(filtros)
      .sort({ fechaCreacion: -1 })
      .skip(skip)
      .limit(Number(limit))
      .toArray();
    
    const total = await viverosCollection.countDocuments(filtros);
    
    res.json({
      success: true,
      data: viveros,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
    
  } catch (error) {
    console.error('Error al obtener viveros:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los viveros'
    });
  }
};

// 2. Crear nuevo vivero
export const createVivero = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, ubicacion, contacto, activo, especies, clones } = req.body;

    // Validaciones básicas
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      res.status(400).json({ success: false, error: 'El nombre del vivero es requerido' });
      return;
    }

    // Usar MongoDB nativo para evitar timeouts de Mongoose en serverless
    const db = await getDB();
    const viverosCollection = db.collection('viveros');

    // Unicidad por nombre
    const nombreNormalizado = nombre.trim();
    const existente = await viverosCollection.findOne({ nombre: nombreNormalizado });
    if (existente) {
      res.status(409).json({ success: false, error: 'Ya existe un vivero con ese nombre' });
      return;
    }

    // Validar especies si se proporcionan
    let especiesValidadas: string[] = [];
    if (Array.isArray(especies)) {
      especiesValidadas = await validarEspecies(especies);
    }

    // Validar clones si se proporcionan
    let clonesValidados: any[] = [];
    if (Array.isArray(clones)) {
      // códigos únicos
      const codigos = clones.map((c: any) => c?.codigo).filter(Boolean);
      const setCodigos = new Set(codigos);
      if (codigos.length !== setCodigos.size) {
        res.status(422).json({ success: false, error: 'Los códigos de clones deben ser únicos dentro del mismo vivero' });
        return;
      }

      // estructura mínima: solo exigir codigo string no vacío; especieAsociada es opcional
      for (let i = 0; i < clones.length; i++) {
        const c = clones[i];
        if (!c || typeof c.codigo !== 'string' || c.codigo.trim() === '') {
          res.status(400).json({ success: false, error: `El clon en posición ${i} debe tener un código válido` });
          return;
        }
      }
      clonesValidados = clones;
    }

    // Construir documento
    const ahora = new Date();
    const doc = {
      nombre: nombreNormalizado,
      ubicacion: typeof ubicacion === 'string' ? ubicacion : '',
      contacto: typeof contacto === 'string' ? contacto : '',
      activo: typeof activo === 'boolean' ? activo : true,
      especies: especiesValidadas,
      clones: clonesValidados,
      fechaCreacion: ahora,
      fechaActualizacion: ahora
    } as any;

    // Insertar y devolver
    const resultado = await viverosCollection.insertOne(doc);
    const creado = await viverosCollection.findOne({ _id: resultado.insertedId });

    res.status(201).json({ success: true, data: creado, message: 'Vivero creado exitosamente' });
  } catch (error: any) {
    console.error('Error al crear vivero:', error);

    if (error?.code === 11000) {
      res.status(409).json({ success: false, error: 'Ya existe un vivero con ese nombre' });
      return;
    }

    if (error?.message === 'Los códigos de clones deben ser únicos dentro del mismo vivero') {
      res.status(422).json({ success: false, error: error.message });
      return;
    }

    res.status(500).json({ success: false, error: 'Error interno del servidor', message: 'No se pudo crear el vivero' });
  }
};

// 3. Obtener vivero por ID
export const getViveroById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'ID de vivero inválido'
      });
      return;
    }
    
    const vivero = await Vivero.findById(id).lean();
    
    if (!vivero) {
      res.status(404).json({
        success: false,
        error: 'Vivero no encontrado'
      });
      return;
    }
    
    res.json({
      success: true,
      data: vivero
    });
    
  } catch (error) {
    console.error('Error al obtener vivero:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudo obtener el vivero'
    });
  }
};

// 4. Actualizar vivero
export const updateVivero = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, ubicacion, contacto, activo, especies, clones } = req.body;
    
    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'ID de vivero inválido'
      });
      return;
    }
    
    // Obtener conexión directa a MongoDB
    const db = await getDB();
    const viverosCollection = db.collection('viveros');
    
    // Verificar si el vivero existe
    const viveroExistente = await viverosCollection.findOne({ _id: new ObjectId(id) });
    if (!viveroExistente) {
      res.status(404).json({
        success: false,
        error: 'Vivero no encontrado'
      });
      return;
    }
    
    // Si se está cambiando el nombre, verificar que no exista otro con ese nombre
    if (nombre && nombre !== viveroExistente.nombre) {
      const viveroConMismoNombre = await viverosCollection.findOne({ 
        nombre: nombre.trim(),
        _id: { $ne: new ObjectId(id) }
      });
      
      if (viveroConMismoNombre) {
        res.status(409).json({
          success: false,
          error: 'Ya existe un vivero con ese nombre'
        });
        return;
      }
    }
    
    // Validar especies si se proporcionan
    let especiesValidas: string[] = [];
    if (especies && Array.isArray(especies)) {
      especiesValidas = await validarEspecies(especies);
    }
    
    // Validar clones si se proporcionan
    if (clones && Array.isArray(clones)) {
      // Verificar códigos únicos
      const codigos = clones.map((clone: any) => clone.codigo);
      const codigosUnicos = new Set(codigos);
      
      if (codigos.length !== codigosUnicos.size) {
        res.status(422).json({
          success: false,
          error: 'Los códigos de clones deben ser únicos dentro del mismo vivero'
        });
        return;
      }
      
      // Validar estructura de clones
      for (const clone of clones) {
        if (!clone.codigo) {
          res.status(400).json({
            success: false,
            error: 'Cada clon debe tener un código válido'
          });
          return;
        }
      }
    }
    
    // Preparar datos de actualización
    const datosActualizacion: any = {
      fechaActualizacion: new Date()
    };
    
    if (nombre !== undefined) datosActualizacion.nombre = nombre.trim();
    if (ubicacion !== undefined) datosActualizacion.ubicacion = ubicacion;
    if (contacto !== undefined) datosActualizacion.contacto = contacto;
    if (activo !== undefined) datosActualizacion.activo = activo;
    if (especies !== undefined) datosActualizacion.especies = especiesValidas;
    if (clones !== undefined) datosActualizacion.clones = clones;
    
    // Actualizar el vivero usando MongoDB nativo
    const resultado = await viverosCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: datosActualizacion }
    );
    
    if (resultado.matchedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Vivero no encontrado'
      });
      return;
    }
    
    // Obtener el vivero actualizado
    const viveroActualizado = await viverosCollection.findOne({ _id: new ObjectId(id) });
    
    res.json({
      success: true,
      data: viveroActualizado,
      message: 'Vivero actualizado exitosamente'
    });
    
  } catch (error: any) {
    console.error('Error al actualizar vivero:', error);
    
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: 'Ya existe un vivero con ese nombre'
      });
      return;
    }
    
    if (error.message === 'Los códigos de clones deben ser únicos dentro del mismo vivero') {
      res.status(422).json({
        success: false,
        error: error.message
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudo actualizar el vivero'
    });
  }
};

// 5. Eliminar vivero
export const deleteVivero = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'ID de vivero inválido'
      });
      return;
    }

    // Usar MongoDB nativo
    const db = await getDB();
    const viverosCollection = db.collection('viveros');

    const resultado = await viverosCollection.deleteOne({ _id: new ObjectId(id) });

    if (resultado.deletedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Vivero no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Vivero eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar vivero:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudo eliminar el vivero'
    });
  }
};

// 6. Obtener estadísticas
export const getEstadisticas = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDB();
    const viverosCollection = db.collection('viveros');

    const total = await viverosCollection.countDocuments();
    const activos = await viverosCollection.countDocuments({ activo: true });
    const inactivos = await viverosCollection.countDocuments({ activo: false });

    const viverosConClonesDocs = await viverosCollection.find({ 'clones.0': { $exists: true } }).toArray();
    const totalClones = viverosConClonesDocs.reduce((acc, v: any) => acc + (Array.isArray(v.clones) ? v.clones.length : 0), 0);

    const viverosConEspecies = await viverosCollection.countDocuments({ especies: { $exists: true, $ne: [], $size: { $gt: 0 } } });
    const viverosSinEspecies = total - viverosConEspecies;

    res.json({
      success: true,
      data: { total, activos, inactivos, totalClones, viverosConEspecies, viverosSinEspecies }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener las estadísticas'
    });
  }
};

// 7. Obtener clones de un vivero
export const getClonesByVivero = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'ID de vivero inválido'
      });
      return;
    }
    
    const vivero = await Vivero.findById(id).select('clones nombre').lean();
    
    if (!vivero) {
      res.status(404).json({
        success: false,
        error: 'Vivero no encontrado'
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        viveroId: id,
        viveroNombre: vivero.nombre,
        clones: vivero.clones || []
      }
    });
    
  } catch (error) {
    console.error('Error al obtener clones del vivero:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los clones'
    });
  }
};
