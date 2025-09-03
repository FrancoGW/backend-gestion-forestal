import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';

// Middleware para validar datos de entrada de viveros
export const validateViveroData = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, especies, clones } = req.body;
    
    // Validar nombre
    if (req.method === 'POST' && (!nombre || nombre.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del vivero es requerido'
      });
    }
    
    // Validar especies si se proporcionan
    if (especies && !Array.isArray(especies)) {
      return res.status(400).json({
        success: false,
        error: 'El campo especies debe ser un array'
      });
    }
    
    // Validar clones si se proporcionan
    if (clones && !Array.isArray(clones)) {
      return res.status(400).json({
        success: false,
        error: 'El campo clones debe ser un array'
      });
    }
    
    // Validar estructura de clones
    if (clones && Array.isArray(clones)) {
      for (let i = 0; i < clones.length; i++) {
        const clone = clones[i];
        
        if (!clone._id || typeof clone._id !== 'string') {
          return res.status(400).json({
            success: false,
            error: `El clon en posición ${i} debe tener un _id válido`
          });
        }
        
        if (!clone.codigo || typeof clone.codigo !== 'string') {
          return res.status(400).json({
            success: false,
            error: `El clon en posición ${i} debe tener un código válido`
          });
        }
        
        if (!clone.especieAsociada || typeof clone.especieAsociada !== 'string') {
          return res.status(400).json({
            success: false,
            error: `El clon en posición ${i} debe tener una especie asociada válida`
          });
        }
        
        // Validar campos opcionales
        if (clone.origen !== undefined && typeof clone.origen !== 'string') {
          return res.status(400).json({
            success: false,
            error: `El campo origen del clon en posición ${i} debe ser una cadena de texto`
          });
        }
        
        if (clone.descripcion !== undefined && typeof clone.descripcion !== 'string') {
          return res.status(400).json({
            success: false,
            error: `El campo descripción del clon en posición ${i} debe ser una cadena de texto`
          });
        }
        
        if (clone.caracteristicas !== undefined && typeof clone.caracteristicas !== 'string') {
          return res.status(400).json({
            success: false,
            error: `El campo características del clon en posición ${i} debe ser una cadena de texto`
          });
        }
        
        if (clone.activo !== undefined && typeof clone.activo !== 'boolean') {
          return res.status(400).json({
            success: false,
            error: `El campo activo del clon en posición ${i} debe ser un valor booleano`
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error en validación de datos de vivero:', error);
    res.status(500).json({
      success: false,
      error: 'Error en validación de datos'
    });
  }
};

// Middleware para validar ID de vivero
export const validateViveroId = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID de vivero requerido'
      });
    }
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de vivero inválido'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error en validación de ID de vivero:', error);
    res.status(500).json({
      success: false,
      error: 'Error en validación de ID'
    });
  }
};

// Middleware para manejar errores específicos de viveros
export const viveroErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error en viveros:', err);
  
  // Error de duplicado (código 11000)
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Ya existe un vivero con ese nombre'
    });
  }
  
  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((error: any) => error.message);
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      details: errors
    });
  }
  
  // Error de cast de ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'ID de vivero inválido'
    });
  }
  
  // Error personalizado de códigos duplicados
  if (err.message === 'Los códigos de clones deben ser únicos dentro del mismo vivero') {
    return res.status(422).json({
      success: false,
      error: err.message
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: 'Ocurrió un error inesperado'
  });
};
