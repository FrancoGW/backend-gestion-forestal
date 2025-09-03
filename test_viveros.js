const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Datos de prueba para viveros
const viveroPrueba = {
  nombre: "Vivero Paul",
  ubicacion: "Misiones",
  contacto: "Juan Pérez",
  activo: true,
  especies: [
    "507f1f77bcf86cd799439011", // ID de especie existente
    "Eucalyptus personalizado",  // Texto personalizado
    "Pino híbrido nuevo"         // Texto personalizado
  ],
  clones: [
    {
      "_id": "1703123456789",
      "codigo": "FA 13",
      "especieAsociada": "Eucalipto",
      "origen": "Forestal Argentina",
      "descripcion": "Clon de alto rendimiento",
      "caracteristicas": "Resistente a sequía",
      "activo": true
    },
    {
      "_id": "1703123456790",
      "codigo": "INTA 36",
      "especieAsociada": "Eucalipto",
      "origen": "INTA",
      "descripcion": "",
      "caracteristicas": "",
      "activo": true
    }
  ]
};

async function testViveros() {
  console.log('🧪 Iniciando pruebas del sistema de viveros...\n');

  try {
    // 1. Obtener estadísticas iniciales
    console.log('1. Obteniendo estadísticas iniciales...');
    const statsIniciales = await axios.get(`${BASE_URL}/viveros/estadisticas`);
    console.log('✅ Estadísticas iniciales:', statsIniciales.data);
    console.log('');

    // 2. Crear vivero
    console.log('2. Creando vivero de prueba...');
    const viveroCreado = await axios.post(`${BASE_URL}/viveros`, viveroPrueba);
    console.log('✅ Vivero creado:', viveroCreado.data);
    const viveroId = viveroCreado.data.data._id;
    console.log('');

    // 3. Obtener todos los viveros
    console.log('3. Obteniendo todos los viveros...');
    const todosViveros = await axios.get(`${BASE_URL}/viveros`);
    console.log('✅ Total de viveros:', todosViveros.data.total);
    console.log('');

    // 4. Obtener vivero específico
    console.log('4. Obteniendo vivero específico...');
    const viveroEspecifico = await axios.get(`${BASE_URL}/viveros/${viveroId}`);
    console.log('✅ Vivero específico:', viveroEspecifico.data.data.nombre);
    console.log('');

    // 5. Obtener clones del vivero
    console.log('5. Obteniendo clones del vivero...');
    const clonesVivero = await axios.get(`${BASE_URL}/viveros/${viveroId}/clones`);
    console.log('✅ Clones del vivero:', clonesVivero.data.data.clones.length);
    console.log('');

    // 6. Buscar viveros con filtros
    console.log('6. Probando búsqueda con filtros...');
    const viverosFiltrados = await axios.get(`${BASE_URL}/viveros?search=paul&activo=true`);
    console.log('✅ Viveros encontrados con filtros:', viverosFiltrados.data.total);
    console.log('');

    // 7. Actualizar vivero
    console.log('7. Actualizando vivero...');
    const actualizacion = {
      ...viveroPrueba,
      nombre: "Vivero Paul Actualizado",
      contacto: "María González"
    };
    const viveroActualizado = await axios.put(`${BASE_URL}/viveros/${viveroId}`, actualizacion);
    console.log('✅ Vivero actualizado:', viveroActualizado.data.message);
    console.log('');

    // 8. Obtener estadísticas finales
    console.log('8. Obteniendo estadísticas finales...');
    const statsFinales = await axios.get(`${BASE_URL}/viveros/estadisticas`);
    console.log('✅ Estadísticas finales:', statsFinales.data);
    console.log('');

    // 9. Eliminar vivero
    console.log('9. Eliminando vivero de prueba...');
    const viveroEliminado = await axios.delete(`${BASE_URL}/viveros/${viveroId}`);
    console.log('✅ Vivero eliminado:', viveroEliminado.data.message);
    console.log('');

    console.log('🎉 ¡Todas las pruebas completadas exitosamente!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.response?.data || error.message);
  }
}

// Ejecutar pruebas
testViveros();
