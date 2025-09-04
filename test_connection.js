const axios = require('axios');

// Configuración
const API_BASE_URL = 'https://backend-gestion-forestal.vercel.app/api';

async function testConnection() {
  try {
    console.log('🔍 Probando conexión al backend...');
    console.log('URL:', `${API_BASE_URL}/viveros/test`);
    
    const response = await axios.get(`${API_BASE_URL}/viveros/test`);
    
    console.log('✅ Conexión exitosa!');
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error de conexión:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

async function testGetViveros() {
  try {
    console.log('\n🔍 Probando GET /api/viveros...');
    
    const response = await axios.get(`${API_BASE_URL}/viveros`);
    
    console.log('✅ GET viveros exitoso!');
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error en GET viveros:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas de conexión...\n');
  
  await testConnection();
  await testGetViveros();
  
  console.log('\n🏁 Pruebas completadas');
}

runTests();
