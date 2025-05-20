import { Schema, model, Document } from 'mongoose';

export interface IAvanceTrabajo extends Document {
  ordenTrabajoId: string;
  numeroOrden: string;
  proveedorId: string;
  proveedorNombre: string;
  fecha: Date;
  actividad: string;
  predio: string;
  rodal: string;
  superficie: number;
  cantidadPlantas: number;
  cuadrillaId: string;
  cuadrillaNombre: string;
  cantPersonal: number;
  jornada: number;
  estado: 'P' | 'C';
  observaciones?: string;
  fechaRegistro: Date;
  ultimaActualizacion: Date;
  imagenes?: string[];
  coordenadas?: {
    lat: number;
    lng: number;
  };
}

const avanceTrabajoSchema = new Schema<IAvanceTrabajo>({
  ordenTrabajoId: {
    type: String,
    required: true,
    ref: 'OrdenTrabajo'
  },
  numeroOrden: {
    type: String,
    required: true,
    trim: true
  },
  proveedorId: {
    type: String,
    required: true,
    ref: 'Proveedor'
  },
  proveedorNombre: {
    type: String,
    required: true,
    trim: true
  },
  fecha: {
    type: Date,
    required: true
  },
  actividad: {
    type: String,
    required: true,
    trim: true
  },
  predio: {
    type: String,
    required: true,
    trim: true
  },
  rodal: {
    type: String,
    required: true,
    trim: true
  },
  superficie: {
    type: Number,
    required: true,
    min: 0
  },
  cantidadPlantas: {
    type: Number,
    required: true,
    min: 0
  },
  cuadrillaId: {
    type: String,
    required: true,
    ref: 'Cuadrilla'
  },
  cuadrillaNombre: {
    type: String,
    required: true,
    trim: true
  },
  cantPersonal: {
    type: Number,
    required: true,
    min: 1
  },
  jornada: {
    type: Number,
    required: true,
    min: 0
  },
  estado: {
    type: String,
    required: true,
    enum: ['P', 'C'],
    default: 'P'
  },
  observaciones: {
    type: String,
    trim: true
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  },
  ultimaActualizacion: {
    type: Date,
    default: Date.now
  },
  imagenes: [{
    type: String,
    trim: true
  }],
  coordenadas: {
    lat: {
      type: Number,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      min: -180,
      max: 180
    }
  }
});

// Índices
avanceTrabajoSchema.index({ ordenTrabajoId: 1 });
avanceTrabajoSchema.index({ proveedorId: 1, fechaRegistro: -1 });
avanceTrabajoSchema.index({ cuadrillaId: 1, fecha: 1 });
avanceTrabajoSchema.index({ fecha: 1 });
avanceTrabajoSchema.index({ numeroOrden: 1 });

// Middleware para actualizar ultimaActualizacion antes de cada actualización
avanceTrabajoSchema.pre('findOneAndUpdate', function() {
  this.set({ ultimaActualizacion: new Date() });
});

// Validaciones personalizadas
avanceTrabajoSchema.pre('save', function(next) {
  if (this.fecha > new Date()) {
    next(new Error('La fecha no puede ser futura'));
  }
  next();
});

export const AvanceTrabajo = model<IAvanceTrabajo>('AvanceTrabajo', avanceTrabajoSchema); 