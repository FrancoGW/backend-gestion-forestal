import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';

// Middleware para validar datos de entrada de viveros
export const validateViveroData = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { nombre, especies, clones } = req.body;
    
    // Validar nombre
    if (req.method === 'POST' && (!nombre || nombre.trim() === '')) {
      res.status(400).json({
        success: false,
        error: 'El nombre del vivero es requerido'
      });
      return;
    }
    
    // Validar especies si se proporcionan
    if (especies && !Array.isArray(especies)) {
      res.status(400).json({
        success: false,
        error: 'El campo especies debe ser un array'
      });
      return;
    }
    
    // Validar clones si se proporcionan
    if (clones && !Array.isArray(clones)) {
      res.status(400).json({
        success: false,
        error: 'El campo clones debe ser un array'
      });
      return;
    }
    
    // Validar estructura de clones
    if (clones && Array.isArray(clones)) {
      for (let i = 0; i < clones.length; i++) {
        const clone = clones[i];
        
        if (!clone._id || typeof clone._id !== 'string') {
          res.status(400).json({
            success: false,
            error: `El clon en posición ${i} debe tener un _id válido`
          });
          return;
        }
        
        if (!clone.codigo || typeof clone.codigo !== 'string') {
          res.status(400).json({
            success: false,
            error: `El clon en posición ${i} debe tener un código válido`
          });
          return;
        }
        
        // Validar especieAsociada solo si está presente y no es string vacío
        if (clone.especieAsociada !== undefined && typeof clone.especieAsociada !== 'string') {
          res.status(400).json({
            success: false,
            error: `El clon en posición ${i} debe tener una especie asociada válida (debe ser una cadena de texto)`
          });
          return;
        }
        
        // Validar campos opcionales
        if (clone.origen !== undefined && typeof clone.origen !== 'string') {
          res.status(400).json({
            success: false,
            error: `El campo origen del clon en posición ${i} debe ser una cadena de texto`
          });
          return;
        }
        
        if (clone.descripcion !== undefined && typeof clone.descripcion !== 'string') {
          res.status(400).json({
            success: false,
            error: `El campo descripción del clon en posición ${i} debe ser una cadena de texto`
          });
          return;
        }
        
        if (clone.caracteristicas !== undefined && typeof clone.caracteristicas !== 'string') {
          res.status(400).json({
            success: false,
            error: `El campo características del clon en posición ${i} debe ser una cadena de texto`
          });
          return;
        }
        
        if (clone.activo !== undefined && typeof clone.activo !== 'boolean') {
          res.status(400).json({
            success: false,
            error: `El campo activo del clon en posición ${i} debe ser un valor booleano`
          });
          return;
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
export const validateViveroId = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'ID de vivero requerido'
      });
      return;
    }
    
    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'ID de vivero inválido'
      });
      return;
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
export const viveroErrorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error en viveros:', err);
  
  // Error de duplicado (código 11000)
  if (err.code === 11000) {
    res.status(409).json({
      success: false,
      error: 'Ya existe un vivero con ese nombre'
    });
    return;
  }
  
  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((error: any) => error.message);
    res.status(400).json({
      success: false,
      error: 'Error de validación',
      details: errors
    });
    return;
  }
  
  // Error de cast de ObjectId
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: 'ID de vivero inválido'
    });
    return;
  }
  
  // Error personalizado de códigos duplicados
  if (err.message === 'Los códigos de clones deben ser únicos dentro del mismo vivero') {
    res.status(422).json({
      success: false,
      error: err.message
    });
    return;
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: 'Ocurrió un error inesperado'
  });
};
