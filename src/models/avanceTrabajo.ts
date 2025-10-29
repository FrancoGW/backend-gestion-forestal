import { Schema, model, Document } from 'mongoose';

export interface IAvanceTrabajo extends Document {
  ordenTrabajoId?: string;
  numeroOrden?: string;
  proveedorId: string;
  proveedorNombre: string;
  fecha: Date;
  actividad: string;
  predio?: string;
  rodal?: string;
  superficie: number;
  cantidadPlantas?: number;
  cuadrillaId: string;
  cuadrillaNombre: string;
  cantPersonal: number;
  jornada: number;
  estado: string;
  observaciones?: string;
  fechaRegistro: Date;
  ultimaActualizacion: Date;
  imagenes?: string[];
  coordenadas?: {
    lat: number;
    lng: number;
  };
  // Campos para actividades sin orden
  sinOrden?: boolean;
  ubicacion?: string;
  empresa?: string;
  vecino?: string;
  horaR29?: string;
  horaR8?: string;
  horaR7?: string;
  horaR28?: string;
  tiempoHs?: number | string;
  jornadaHs?: number | string;
  comentarios?: string;
  cuadrilla?: string;
}

const avanceTrabajoSchema = new Schema<IAvanceTrabajo>({
  ordenTrabajoId: {
    type: String,
    required: false, // Opcional para actividades sin orden
    ref: 'OrdenTrabajo'
  },
  numeroOrden: {
    type: String,
    required: false, // Opcional para actividades sin orden
    trim: true
  },
  proveedorId: {
    type: String,
    required: true,
    ref: 'Proveedor'
  },
  proveedorNombre: {
    type: String,
    required: false, // Opcional
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
    required: false, // Opcional
    trim: true
  },
  rodal: {
    type: String,
    required: false, // Opcional para actividades sin orden
    trim: true
  },
  superficie: {
    type: Number,
    required: true,
    min: 0
  },
  cantidadPlantas: {
    type: Number,
    required: false, // Opcional
    min: 0
  },
  cuadrillaId: {
    type: String,
    required: true,
    ref: 'Cuadrilla'
  },
  cuadrillaNombre: {
    type: String,
    required: false, // Opcional
    trim: true
  },
  cantPersonal: {
    type: Number,
    required: false, // Opcional
    min: 1
  },
  jornada: {
    type: Number,
    required: false, // Opcional
    min: 0
  },
  estado: {
    type: String,
    required: true,
    default: 'Pendiente'
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
  },
  // Campos para actividades sin orden
  sinOrden: {
    type: Boolean,
    default: false
  },
  ubicacion: {
    type: String,
    trim: true
  },
  empresa: {
    type: String,
    trim: true
  },
  vecino: {
    type: String,
    trim: true
  },
  horaR29: {
    type: String,
    trim: true
  },
  horaR8: {
    type: String,
    trim: true
  },
  horaR7: {
    type: String,
    trim: true
  },
  horaR28: {
    type: String,
    trim: true
  },
  tiempoHs: {
    type: Schema.Types.Mixed // Puede ser número o string
  },
  jornadaHs: {
    type: Schema.Types.Mixed // Puede ser número o string
  },
  comentarios: {
    type: String,
    trim: true
  },
  cuadrilla: {
    type: String,
    trim: true
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