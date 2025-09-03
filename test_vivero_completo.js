const axios = require('axios');

// Configuración
const API_BASE_URL = 'http://localhost:3001/api'; // Cambiar por tu URL de producción si es necesario

// Datos de prueba para un vivero completo
const viveroCompleto = {
  nombre: "Vivero Paul",
  ubicacion: "Misiones",
  contacto: "Juan Pérez",
  activo: true,
  especies: [
    "507f1f77bcf86cd799439011", // ID de especie existente (si existe)
    "Eucalyptus personalizado",  // Texto personalizado
    "Pino híbrido nuevo"         // Texto personalizado
  ],
  clones: [
    {
      _id: "1703123456789",
      codigo: "FA 13",
      especieAsociada: "Eucalipto",
      origen: "Forestal Argentina",
      descripcion: "Clon de alto rendimiento",
      caracteristicas: "Resistente a sequía",
      activo: true
    },
    {
      _id: "1703123456790",
      codigo: "INTA 36",
      especieAsociada: "Eucalipto",
      origen: "INTA",
      descripcion: "Clon de investigación",
      caracteristicas: "Alto crecimiento",
      activo: true
    },
    {
      _id: "1703123456791",
      codigo: "FA 15",
      especieAsociada: "Pino",
      origen: "Forestal Argentina",
      descripcion: "",
      caracteristicas: "",
      activo: true
    }
  ]
};

// Función para crear un vivero
async function crearVivero() {
  try {
    console.log('🔄 Creando vivero...');
    console.log('Datos a enviar:', JSON.stringify(viveroCompleto, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/viveros`, viveroCompleto);
    
    console.log('✅ Vivero creado exitosamente!');
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));
    
    return response.data.data._id;
  } catch (error) {
    console.error('❌ Error al crear vivero:', error.response?.data || error.message);
    throw error;
  }
}

// Función para obtener todos los viveros
async function obtenerViveros() {
  try {
    console.log('🔄 Obteniendo todos los viveros...');
    
    const response = await axios.get(`${API_BASE_URL}/viveros`);
    
    console.log('✅ Viveros obtenidos exitosamente!');
    console.log('Total de viveros:', response.data.total);
    console.log('Viveros:', JSON.stringify(response.data.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Error al obtener viveros:', error.response?.data || error.message);
    throw error;
  }
}

// Función para obtener un vivero específico
async function obtenerViveroPorId(id) {
  try {
    console.log(`🔄 Obteniendo vivero con ID: ${id}`);
    
    const response = await axios.get(`${API_BASE_URL}/viveros/${id}`);
    
    console.log('✅ Vivero obtenido exitosamente!');
    console.log('Vivero:', JSON.stringify(response.data.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Error al obtener vivero:', error.response?.data || error.message);
    throw error;
  }
}

// Función para obtener clones de un vivero
async function obtenerClonesDeVivero(id) {
  try {
    console.log(`🔄 Obteniendo clones del vivero: ${id}`);
    
    const response = await axios.get(`${API_BASE_URL}/viveros/${id}/clones`);
    
    console.log('✅ Clones obtenidos exitosamente!');
    console.log('Clones:', JSON.stringify(response.data.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Error al obtener clones:', error.response?.data || error.message);
    throw error;
  }
}

// Función para obtener estadísticas
async function obtenerEstadisticas() {
  try {
    console.log('🔄 Obteniendo estadísticas...');
    
    const response = await axios.get(`${API_BASE_URL}/viveros/estadisticas`);
    
    console.log('✅ Estadísticas obtenidas exitosamente!');
    console.log('Estadísticas:', JSON.stringify(response.data.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error.response?.data || error.message);
    throw error;
  }
}

// Función para actualizar un vivero
async function actualizarVivero(id) {
  try {
    console.log(`🔄 Actualizando vivero: ${id}`);
    
    const datosActualizacion = {
      nombre: "Vivero Paul Actualizado",
      ubicacion: "Misiones, Argentina",
      contacto: "Juan Pérez - Gerente",
      activo: true,
      especies: [
        "Eucalyptus actualizado",
        "Pino híbrido mejorado",
        "Nueva especie"
      ],
      clones: [
        {
          _id: "1703123456789",
          codigo: "FA 13",
          especieAsociada: "Eucalipto",
          origen: "Forestal Argentina",
          descripcion: "Clon de alto rendimiento actualizado",
          caracteristicas: "Resistente a sequía y enfermedades",
          activo: true
        },
        {
          _id: "1703123456792",
          codigo: "FA 20",
          especieAsociada: "Pino",
          origen: "Forestal Argentina",
          descripcion: "Nuevo clon",
          caracteristicas: "Crecimiento rápido",
          activo: true
        }
      ]
    };
    
    const response = await axios.put(`${API_BASE_URL}/viveros/${id}`, datosActualizacion);
    
    console.log('✅ Vivero actualizado exitosamente!');
    console.log('Vivero actualizado:', JSON.stringify(response.data.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Error al actualizar vivero:', error.response?.data || error.message);
    throw error;
  }
}

// Función para eliminar un vivero
async function eliminarVivero(id) {
  try {
    console.log(`🔄 Eliminando vivero: ${id}`);
    
    const response = await axios.delete(`${API_BASE_URL}/viveros/${id}`);
    
    console.log('✅ Vivero eliminado exitosamente!');
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Error al eliminar vivero:', error.response?.data || error.message);
    throw error;
  }
}

// Función principal que ejecuta todas las pruebas
async function ejecutarPruebasCompletas() {
  try {
    console.log('🚀 Iniciando pruebas completas del sistema de viveros...\n');
    
    // 1. Obtener estadísticas iniciales
    console.log('=== 1. ESTADÍSTICAS INICIALES ===');
    await obtenerEstadisticas();
    console.log('');
    
    // 2. Obtener viveros existentes
    console.log('=== 2. VIVEROS EXISTENTES ===');
    await obtenerViveros();
    console.log('');
    
    // 3. Crear nuevo vivero
    console.log('=== 3. CREAR NUEVO VIVERO ===');
    const viveroId = await crearVivero();
    console.log('');
    
    // 4. Obtener el vivero creado
    console.log('=== 4. OBTENER VIVERO CREADO ===');
    await obtenerViveroPorId(viveroId);
    console.log('');
    
    // 5. Obtener clones del vivero
    console.log('=== 5. OBTENER CLONES DEL VIVERO ===');
    await obtenerClonesDeVivero(viveroId);
    console.log('');
    
    // 6. Actualizar el vivero
    console.log('=== 6. ACTUALIZAR VIVERO ===');
    await actualizarVivero(viveroId);
    console.log('');
    
    // 7. Obtener estadísticas finales
    console.log('=== 7. ESTADÍSTICAS FINALES ===');
    await obtenerEstadisticas();
    console.log('');
    
    // 8. Eliminar el vivero (opcional - comentar si no quieres eliminar)
    console.log('=== 8. ELIMINAR VIVERO ===');
    await eliminarVivero(viveroId);
    console.log('');
    
    console.log('🎉 ¡Todas las pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('💥 Error en las pruebas:', error.message);
  }
}

// Ejecutar las pruebas si este archivo se ejecuta directamente
if (require.main === module) {
  ejecutarPruebasCompletas();
}

module.exports = {
  crearVivero,
  obtenerViveros,
  obtenerViveroPorId,
  obtenerClonesDeVivero,
  obtenerEstadisticas,
  actualizarVivero,
  eliminarVivero,
  ejecutarPruebasCompletas
};
