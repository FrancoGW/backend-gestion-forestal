import mongoose from 'mongoose';
import { Cuadrilla } from '../models/cuadrilla';

// Configuración de la conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'gestion_forestal';

export const conectarBaseDatos = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    
    // Crear índices para la colección de cuadrillas
    await Cuadrilla.createIndexes();
    
    return mongoose.connection;
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    throw error;
  }
};

export const desconectarBaseDatos = async () => {
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error al desconectar de MongoDB:', error);
    throw error;
  }
}; 