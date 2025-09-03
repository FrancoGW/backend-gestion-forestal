import { Schema, model, Document } from 'mongoose';

// Interfaz para los clones
export interface IClone {
  _id: string;
  codigo: string;
  especieAsociada: string;
  origen: string;
  descripcion: string;
  caracteristicas: string;
  activo: boolean;
}

// Interfaz principal del vivero
export interface IVivero extends Document {
  nombre: string;
  ubicacion: string;
  contacto: string;
  activo: boolean;
  especies: string[];
  clones: IClone[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

const cloneSchema = new Schema<IClone>({
  _id: {
    type: String,
    required: true
  },
  codigo: {
    type: String,
    required: true,
    trim: true
  },
  especieAsociada: {
    type: String,
    required: true,
    trim: true
  },
  origen: {
    type: String,
    default: ""
  },
  descripcion: {
    type: String,
    default: ""
  },
  caracteristicas: {
    type: String,
    default: ""
  },
  activo: {
    type: Boolean,
    default: true
  }
});

const viveroSchema = new Schema<IVivero>({
  nombre: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  ubicacion: {
    type: String,
    default: ""
  },
  contacto: {
    type: String,
    default: ""
  },
  activo: {
    type: Boolean,
    default: true
  },
  especies: [{
    type: String,
    // Puede contener IDs de especies existentes O texto personalizado
  }],
  clones: [cloneSchema],
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar fechaActualizacion antes de cada actualización
viveroSchema.pre('findOneAndUpdate', function() {
  this.set({ fechaActualizacion: new Date() });
});

viveroSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  next();
});

// Validación personalizada para códigos únicos de clones dentro del mismo vivero
viveroSchema.pre('save', function(next) {
  if (this.clones && this.clones.length > 0) {
    const codigos = this.clones.map(clone => clone.codigo);
    const codigosUnicos = new Set(codigos);
    
    if (codigos.length !== codigosUnicos.size) {
      return next(new Error('Los códigos de clones deben ser únicos dentro del mismo vivero'));
    }
  }
  next();
});

// Índices para optimizar consultas
viveroSchema.index({ activo: 1 });
viveroSchema.index({ especies: 1 });
viveroSchema.index({ 'clones.codigo': 1 });

export const Vivero = model<IVivero>('Vivero', viveroSchema);
