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
    console.log('🔗 Conectando a MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    console.log('✅ Conectado a MongoDB');
    
    // Verificar si la colección ya existe y tiene datos
    const coleccion = db.collection('usuarios_admin');
    const count = await coleccion.countDocuments();
    
    if (count > 0) {
      console.log(`⚠️  La colección usuarios_admin ya existe con ${count} documentos`);
      console.log('¿Desea continuar y sobrescribir los datos existentes? (y/N)');
      
      // En un script real, aquí se podría leer input del usuario
      // Por ahora, asumimos que queremos continuar
      console.log('Continuando con la migración...');
    }
    
    // Crear índices
    console.log('📊 Creando índices...');
    await coleccion.createIndex({ email: 1 }, { unique: true });
    await coleccion.createIndex({ rol: 1 });
    await coleccion.createIndex({ activo: 1 });
    console.log('✅ Índices creados');
    
    // Limpiar colección existente si hay datos
    if (count > 0) {
      console.log('🗑️  Limpiando datos existentes...');
      await coleccion.deleteMany({});
      console.log('✅ Datos existentes eliminados');
    }
    
    // Insertar usuarios
    console.log('👥 Insertando usuarios...');
    const result = await coleccion.insertMany(usuariosHardcodeados);
    console.log(`✅ ${result.insertedCount} usuarios insertados exitosamente`);
    
    // Mostrar resumen
    console.log('\n📋 Resumen de la migración:');
    console.log('========================');
    
    const usuariosPorRol = await coleccion.aggregate([
      { $group: { _id: '$rol', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    usuariosPorRol.forEach(rol => {
      console.log(`${rol._id}: ${rol.count} usuarios`);
    });
    
    console.log('\n🎉 Migración completada exitosamente!');
    console.log('\n📝 Credenciales de acceso:');
    console.log('========================');
    console.log('Admin: admin@sistema.com / admin123');
    console.log('Supervisor 1: juan.perez@empresa.com / supervisor123');
    console.log('Supervisor 2: maria.gonzalez@empresa.com / supervisor456');
    console.log('Provider 1: carlos.lopez@proveedor.com / provider123');
    console.log('Provider 2: ana.martinez@proveedor.com / provider456');
    console.log('Provider 3: roberto.fernandez@proveedor.com / provider789');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar migración
if (require.main === module) {
  migrarUsuarios();
}

module.exports = { migrarUsuarios, usuariosHardcodeados }; 