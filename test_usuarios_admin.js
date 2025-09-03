const axios = require('axios');
require('dotenv').config();

// Configuración
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Colores para console.log
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, testFunction) {
  try {
    log(`\n🧪 Probando: ${name}`, 'blue');
    await testFunction();
    log(`✅ ${name} - EXITOSO`, 'green');
  } catch (error) {
    log(`❌ ${name} - FALLÓ: ${error.message}`, 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
  }
}

// Variables globales para almacenar datos de prueba
let testUserId = null;
let testUserEmail = 'test@usuario.com';

async function testLogin() {
  const response = await axios.post(`${API_BASE_URL}/api/usuarios_admin/login`, {
    email: 'admin@sistema.com',
    password: 'admin123'
  });
  
  if (!response.data.success) {
    throw new Error('Login falló');
  }
  
  log(`   Usuario autenticado: ${response.data.data.email}`, 'cyan');
}

async function testLoginInvalidCredentials() {
  try {
    await axios.post(`${API_BASE_URL}/api/usuarios_admin/login`, {
      email: 'admin@sistema.com',
      password: 'password_incorrecto'
    });
    throw new Error('Debería haber fallado con credenciales inválidas');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      log(`   Credenciales inválidas rechazadas correctamente`, 'cyan');
    } else {
      throw error;
    }
  }
}

async function testGetAllUsers() {
  const response = await axios.get(`${API_BASE_URL}/api/usuarios_admin`);
  
  if (!response.data.success) {
    throw new Error('Obtener usuarios falló');
  }
  
  log(`   Usuarios encontrados: ${response.data.data.length}`, 'cyan');
  response.data.data.forEach(user => {
    log(`   - ${user.email} (${user.rol})`, 'cyan');
  });
}

async function testCreateUser() {
  const userData = {
    nombre: 'Test',
    apellido: 'Usuario',
    email: testUserEmail,
    password: 'test123',
    rol: 'provider',
    cuit: '20-99999999-9',
    telefono: '+54 11 9999-9999',
    activo: true
  };
  
  const response = await axios.post(`${API_BASE_URL}/api/usuarios_admin`, userData);
  
  if (!response.data.success) {
    throw new Error('Crear usuario falló');
  }
  
  testUserId = response.data.data._id;
  log(`   Usuario creado con ID: ${testUserId}`, 'cyan');
}

async function testCreateUserDuplicateEmail() {
  const userData = {
    nombre: 'Test',
    apellido: 'Duplicado',
    email: testUserEmail, // Email duplicado
    password: 'test123',
    rol: 'provider',
    activo: true
  };
  
  try {
    await axios.post(`${API_BASE_URL}/api/usuarios_admin`, userData);
    throw new Error('Debería haber fallado con email duplicado');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      log(`   Email duplicado rechazado correctamente`, 'cyan');
    } else {
      throw error;
    }
  }
}

async function testGetUserById() {
  if (!testUserId) {
    throw new Error('No hay ID de usuario de prueba');
  }
  
  const response = await axios.get(`${API_BASE_URL}/api/usuarios_admin/${testUserId}`);
  
  if (!response.data.success) {
    throw new Error('Obtener usuario por ID falló');
  }
  
  log(`   Usuario encontrado: ${response.data.data.email}`, 'cyan');
}

async function testUpdateUser() {
  if (!testUserId) {
    throw new Error('No hay ID de usuario de prueba');
  }
  
  const updateData = {
    nombre: 'Test Actualizado',
    telefono: '+54 11 8888-8888'
  };
  
  const response = await axios.put(`${API_BASE_URL}/api/usuarios_admin/${testUserId}`, updateData);
  
  if (!response.data.success) {
    throw new Error('Actualizar usuario falló');
  }
  
  log(`   Usuario actualizado: ${response.data.data.nombre}`, 'cyan');
}

async function testGetUsersByRole() {
  const response = await axios.get(`${API_BASE_URL}/api/usuarios_admin/rol/provider`);
  
  if (!response.data.success) {
    throw new Error('Obtener usuarios por rol falló');
  }
  
  log(`   Providers encontrados: ${response.data.data.length}`, 'cyan');
  response.data.data.forEach(user => {
    log(`   - ${user.nombre} ${user.apellido} (${user.email})`, 'cyan');
  });
}

async function testDeleteUser() {
  if (!testUserId) {
    throw new Error('No hay ID de usuario de prueba');
  }
  
  const response = await axios.delete(`${API_BASE_URL}/api/usuarios_admin/${testUserId}`);
  
  if (!response.data.success) {
    throw new Error('Eliminar usuario falló');
  }
  
  log(`   Usuario eliminado: ${testUserId}`, 'cyan');
}

async function testDeleteLastAdmin() {
  // Primero obtener todos los admins
  const response = await axios.get(`${API_BASE_URL}/api/usuarios_admin/rol/admin`);
  
  if (response.data.data.length === 1) {
    const adminId = response.data.data[0]._id;
    
    try {
      await axios.delete(`${API_BASE_URL}/api/usuarios_admin/${adminId}`);
      throw new Error('Debería haber fallado al eliminar el último admin');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        log(`   Eliminación del último admin rechazada correctamente`, 'cyan');
      } else {
        throw error;
      }
    }
  } else {
    log(`   Hay ${response.data.data.length} admins, no es el último`, 'cyan');
  }
}

async function runTests() {
  log('🚀 Iniciando pruebas de usuarios admin...', 'bright');
  log(`📍 API Base URL: ${API_BASE_URL}`, 'yellow');
  
  // Pruebas de autenticación
  await testEndpoint('Login válido', testLogin);
  await testEndpoint('Login con credenciales inválidas', testLoginInvalidCredentials);
  
  // Pruebas de gestión de usuarios
  await testEndpoint('Obtener todos los usuarios', testGetAllUsers);
  await testEndpoint('Crear usuario', testCreateUser);
  await testEndpoint('Crear usuario con email duplicado', testCreateUserDuplicateEmail);
  await testEndpoint('Obtener usuario por ID', testGetUserById);
  await testEndpoint('Actualizar usuario', testUpdateUser);
  await testEndpoint('Obtener usuarios por rol', testGetUsersByRole);
  await testEndpoint('Eliminar usuario', testDeleteUser);
  await testEndpoint('Intentar eliminar último admin', testDeleteLastAdmin);
  
  log('\n🎉 Todas las pruebas completadas!', 'bright');
}

// Ejecutar pruebas
if (require.main === module) {
  runTests().catch(error => {
    log(`\n💥 Error general: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  testLogin,
  testGetAllUsers,
  testCreateUser,
  testUpdateUser,
  testDeleteUser
}; 