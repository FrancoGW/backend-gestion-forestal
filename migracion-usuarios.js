const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

// Configuración
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'gestion_forestal';

// Datos de migración (usuarios hardcodeados)
const usuariosHardcodeados = [
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

async function migrarUsuarios() {
  let client;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    
    // Verificar si la colección ya existe y tiene datos
    const coleccion = db.collection('usuarios_admin');
    const count = await coleccion.countDocuments();
    
    if (count > 0) {
      
      // En un script real, aquí se podría leer input del usuario
      // Por ahora, asumimos que queremos continuar
    }
    
    // Crear índices
    await coleccion.createIndex({ email: 1 }, { unique: true });
    await coleccion.createIndex({ rol: 1 });
    await coleccion.createIndex({ activo: 1 });
    
    // Limpiar colección existente si hay datos
    if (count > 0) {
      await coleccion.deleteMany({});
    }
    
    // Insertar usuarios
    const result = await coleccion.insertMany(usuariosHardcodeados);
    
    // Mostrar resumen
    
    const usuariosPorRol = await coleccion.aggregate([
      { $group: { _id: '$rol', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    usuariosPorRol.forEach(rol => {
    });
    
 
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Ejecutar migración
if (require.main === module) {
  migrarUsuarios();
}

module.exports = { migrarUsuarios, usuariosHardcodeados }; 