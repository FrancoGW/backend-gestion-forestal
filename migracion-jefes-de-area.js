const { MongoClient } = require('mongodb');
require('dotenv').config();

// Configuración
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'gestion_forestal';

// Datos de jefes de área
const jefesDeArea = [
  {
    "_id": 1234,
    "nombre": "Alejandro",
    "email": "alejandro@sistema.com",
    "telefono": "+54 11 3333-3333",
    "activo": true,
    "supervisoresAsignados": [
      {
        "supervisorId": 42,
        "nombre": "Luis Arriola",
        "fechaAsignacion": new Date("2024-01-15T00:00:00.000Z")
      },
      {
        "supervisorId": 69,
        "nombre": "Fabio Cancian",
        "fechaAsignacion": new Date("2024-01-15T00:00:00.000Z")
      },
      {
        "supervisorId": 47,
        "nombre": "Gonzalo Álvarez",
        "fechaAsignacion": new Date("2024-01-20T00:00:00.000Z")
      }
    ],
    "fechaCreacion": new Date("2024-01-15T00:00:00.000Z"),
    "ultimaActualizacion": new Date("2024-07-04T00:00:00.000Z")
  },
  {
    "_id": 5678,
    "nombre": "María Elena",
    "email": "maria.elena@sistema.com",
    "telefono": "+54 11 4444-4444",
    "activo": true,
    "supervisoresAsignados": [
      {
        "supervisorId": 44,
        "nombre": "Cecilia Pizzini",
        "fechaAsignacion": new Date("2024-01-15T00:00:00.000Z")
      },
      {
        "supervisorId": 21,
        "nombre": "Alejandro Wayer",
        "fechaAsignacion": new Date("2024-01-15T00:00:00.000Z")
      },
      {
        "supervisorId": 56,
        "nombre": "Diego Nonino",
        "fechaAsignacion": new Date("2024-01-20T00:00:00.000Z")
      }
    ],
    "fechaCreacion": new Date("2024-01-15T00:00:00.000Z"),
    "ultimaActualizacion": new Date("2024-07-04T00:00:00.000Z")
  },
  {
    "_id": 9012,
    "nombre": "Carlos Roberto",
    "email": "carlos.roberto@sistema.com",
    "telefono": "+54 11 5555-5555",
    "activo": true,
    "supervisoresAsignados": [
      {
        "supervisorId": 39,
        "nombre": "Beatriz Reitano",
        "fechaAsignacion": new Date("2024-01-20T00:00:00.000Z")
      },
      {
        "supervisorId": 65,
        "nombre": "Carlos Bardelli",
        "fechaAsignacion": new Date("2024-02-01T00:00:00.000Z")
      },
      {
        "supervisorId": 49,
        "nombre": "Armando Gamboa",
        "fechaAsignacion": new Date("2024-02-01T00:00:00.000Z")
      }
    ],
    "fechaCreacion": new Date("2024-01-20T00:00:00.000Z"),
    "ultimaActualizacion": new Date("2024-07-04T00:00:00.000Z")
  },
  {
    "_id": 3456,
    "nombre": "Ana Patricia",
    "email": "ana.patricia@sistema.com",
    "telefono": "+54 11 6666-6666",
    "activo": true,
    "supervisoresAsignados": [
      {
        "supervisorId": 36,
        "nombre": "Gabriel Cardozo",
        "fechaAsignacion": new Date("2024-02-01T00:00:00.000Z")
      },
      {
        "supervisorId": 45,
        "nombre": "Helian Lytwyn",
        "fechaAsignacion": new Date("2024-02-01T00:00:00.000Z")
      },
      {
        "supervisorId": 33,
        "nombre": "Martin Spriegel",
        "fechaAsignacion": new Date("2024-02-01T00:00:00.000Z")
      }
    ],
    "fechaCreacion": new Date("2024-02-01T00:00:00.000Z"),
    "ultimaActualizacion": new Date("2024-07-04T00:00:00.000Z")
  },
  {
    "_id": 7890,
    "nombre": "Roberto Daniel",
    "email": "roberto.daniel@sistema.com",
    "telefono": "+54 11 7777-7777",
    "activo": true,
    "supervisoresAsignados": [
      {
        "supervisorId": 50,
        "nombre": "Martin Alvarez",
        "fechaAsignacion": new Date("2024-02-01T00:00:00.000Z")
      },
      {
        "supervisorId": 38,
        "nombre": "Paula Montenegro",
        "fechaAsignacion": new Date("2024-02-01T00:00:00.000Z")
      },
      {
        "supervisorId": 52,
        "nombre": "Santiago Gouin",
        "fechaAsignacion": new Date("2024-02-01T00:00:00.000Z")
      }
    ],
    "fechaCreacion": new Date("2024-02-01T00:00:00.000Z"),
    "ultimaActualizacion": new Date("2024-07-04T00:00:00.000Z")
  }
];

async function migrarJefesDeArea() {
  let client;
  
  try {
    console.log('🔗 Conectando a MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const coleccion = db.collection('jefes_de_area');
    
    console.log('📊 Verificando si ya existen jefes de área...');
    const count = await coleccion.countDocuments();
    
    if (count > 0) {
      console.log(`⚠️  Ya existen ${count} jefes de área en la base de datos.`);
      console.log('🔄 Actualizando datos existentes...');
      
      // Actualizar cada jefe de área existente
      for (const jefe of jefesDeArea) {
        await coleccion.updateOne(
          { _id: jefe._id },
          { $set: jefe },
          { upsert: true }
        );
        console.log(`✅ Jefe de área "${jefe.nombre}" actualizado/creado`);
      }
    } else {
      console.log('📝 Insertando jefes de área iniciales...');
      
      // Crear índices
      await coleccion.createIndex({ email: 1 }, { unique: true });
      await coleccion.createIndex({ activo: 1 });
      await coleccion.createIndex({ nombre: 1 });
      
      // Insertar datos
      const result = await coleccion.insertMany(jefesDeArea);
      console.log(`✅ ${result.insertedCount} jefes de área insertados exitosamente`);
      
      // Mostrar los jefes insertados
      jefesDeArea.forEach(jefe => {
        console.log(`   - ${jefe.nombre} (${jefe.email})`);
      });
    }
    
    console.log('🎉 Migración de jefes de área completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Conexión a MongoDB cerrada');
    }
  }
}

// Ejecutar migración
if (require.main === module) {
  migrarJefesDeArea();
}

module.exports = { migrarJefesDeArea }; 