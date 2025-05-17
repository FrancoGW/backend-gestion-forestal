import { Schema, model, Document } from 'mongoose';

export interface ICuadrilla extends Document {
  nombre: string;
  proveedorId: string;
  proveedorNombre: string;
  activa: boolean;
  fechaCreacion: Date;
  ultimaActualizacion: Date;
}

const cuadrillaSchema = new Schema<ICuadrilla>({
  nombre: {
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
  activa: {
    type: Boolean,
    default: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  ultimaActualizacion: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar ultimaActualizacion antes de cada actualización
cuadrillaSchema.pre('findOneAndUpdate', function() {
  this.set({ ultimaActualizacion: new Date() });
});

export const Cuadrilla = model<ICuadrilla>('Cuadrilla', cuadrillaSchema); 