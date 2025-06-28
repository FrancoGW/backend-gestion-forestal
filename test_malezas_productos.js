const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
let createdProductId = null;

// Colores para console.log
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
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

// Test 1: Obtener todos los productos
async function testGetAllProducts() {
  const response = await axios.get(`${BASE_URL}/malezasProductos`);
  log(`   Productos encontrados: ${response.data.length}`);
  response.data.forEach(product => {
    log(`   - ${product.nombre} (${product.tipo})`);
  });
}

// Test 2: Crear nuevo producto
async function testCreateProduct() {
  const newProduct = {
    nombre: "Test Herbicida",
    descripcion: "Herbicida de prueba para testing",
    tipo: "Sistémico",
    unidadMedida: "cm3",
    categoria: "Herbicida total",
    activo: true
  };

  const response = await axios.post(`${BASE_URL}/malezasProductos`, newProduct);
  createdProductId = response.data.id;
  log(`   Producto creado con ID: ${createdProductId}`);
  log(`   Nombre: ${response.data.producto.nombre}`);
}

// Test 3: Obtener producto por ID
async function testGetProductById() {
  if (!createdProductId) {
    throw new Error('No hay ID de producto creado');
  }

  const response = await axios.get(`${BASE_URL}/malezasProductos/${createdProductId}`);
  log(`   Producto encontrado: ${response.data.nombre}`);
  log(`   Tipo: ${response.data.tipo}`);
  log(`   Categoría: ${response.data.categoria}`);
}

// Test 4: Actualizar producto
async function testUpdateProduct() {
  if (!createdProductId) {
    throw new Error('No hay ID de producto creado');
  }

  const updates = {
    nombre: "Test Herbicida Actualizado",
    descripcion: "Descripción actualizada",
    tipo: "Contacto",
    categoria: "Herbicida selectivo"
  };

  const response = await axios.put(`${BASE_URL}/malezasProductos/${createdProductId}`, updates);
  log(`   Producto actualizado: ${response.data.producto.nombre}`);
  log(`   Nuevo tipo: ${response.data.producto.tipo}`);
}

// Test 5: Obtener productos por tipo
async function testGetProductsByType() {
  const response = await axios.get(`${BASE_URL}/malezasProductos/tipo/Sistémico`);
  log(`   Productos sistémicos encontrados: ${response.data.length}`);
  response.data.forEach(product => {
    log(`   - ${product.nombre}`);
  });
}

// Test 6: Obtener productos por categoría
async function testGetProductsByCategory() {
  const response = await axios.get(`${BASE_URL}/malezasProductos/categoria/Herbicida total`);
  log(`   Productos de categoría 'Herbicida total': ${response.data.length}`);
  response.data.forEach(product => {
    log(`   - ${product.nombre}`);
  });
}

// Test 7: Validación de campos requeridos
async function testValidationRequiredFields() {
  try {
    await axios.post(`${BASE_URL}/malezasProductos`, {
      // Sin nombre (requerido)
      descripcion: "Sin nombre",
      tipo: "Sistémico"
    });
    throw new Error('Debería haber fallado por falta de nombre');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      log(`   ✅ Validación de nombre requerido funciona`);
    } else {
      throw error;
    }
  }
}

// Test 8: Validación de unidad de medida
async function testValidationUnitMeasure() {
  try {
    await axios.post(`${BASE_URL}/malezasProductos`, {
      nombre: "Test Invalid Unit",
      unidadMedida: "invalid_unit", // Unidad inválida
      tipo: "Sistémico"
    });
    throw new Error('Debería haber fallado por unidad de medida inválida');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      log(`   ✅ Validación de unidad de medida funciona`);
    } else {
      throw error;
    }
  }
}

// Test 9: Validación de tipo
async function testValidationType() {
  try {
    await axios.post(`${BASE_URL}/malezasProductos`, {
      nombre: "Test Invalid Type",
      unidadMedida: "cm3",
      tipo: "Tipo Invalido" // Tipo inválido
    });
    throw new Error('Debería haber fallado por tipo inválido');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      log(`   ✅ Validación de tipo funciona`);
    } else {
      throw error;
    }
  }
}

// Test 10: Validación de nombre duplicado
async function testValidationDuplicateName() {
  try {
    await axios.post(`${BASE_URL}/malezasProductos`, {
      nombre: "Test Herbicida Actualizado", // Nombre que ya existe
      unidadMedida: "cm3",
      tipo: "Sistémico"
    });
    throw new Error('Debería haber fallado por nombre duplicado');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      log(`   ✅ Validación de nombre duplicado funciona`);
    } else {
      throw error;
    }
  }
}

// Test 11: Eliminar producto (soft delete)
async function testDeleteProduct() {
  if (!createdProductId) {
    throw new Error('No hay ID de producto creado');
  }

  const response = await axios.delete(`${BASE_URL}/malezasProductos/${createdProductId}`);
  log(`   Producto eliminado (soft delete): ${response.data.id}`);
  
  // Verificar que el producto ya no aparece en la lista activa
  const allProducts = await axios.get(`${BASE_URL}/malezasProductos`);
  const deletedProduct = allProducts.data.find(p => p._id === createdProductId);
  if (!deletedProduct) {
    log(`   ✅ Producto correctamente marcado como inactivo`);
  } else {
    throw new Error('El producto sigue apareciendo como activo');
  }
}

// Test 12: Obtener producto con ID inválido
async function testInvalidId() {
  try {
    await axios.get(`${BASE_URL}/malezasProductos/invalid_id`);
    throw new Error('Debería haber fallado por ID inválido');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      log(`   ✅ Validación de ID inválido funciona`);
    } else {
      throw error;
    }
  }
}

// Ejecutar todos los tests
async function runAllTests() {
  log('🚀 Iniciando pruebas de la API de Productos de Malezas', 'yellow');
  
  await testEndpoint('Obtener todos los productos', testGetAllProducts);
  await testEndpoint('Crear nuevo producto', testCreateProduct);
  await testEndpoint('Obtener producto por ID', testGetProductById);
  await testEndpoint('Actualizar producto', testUpdateProduct);
  await testEndpoint('Obtener productos por tipo', testGetProductsByType);
  await testEndpoint('Obtener productos por categoría', testGetProductsByCategory);
  await testEndpoint('Validación de campos requeridos', testValidationRequiredFields);
  await testEndpoint('Validación de unidad de medida', testValidationUnitMeasure);
  await testEndpoint('Validación de tipo', testValidationType);
  await testEndpoint('Validación de nombre duplicado', testValidationDuplicateName);
  await testEndpoint('Eliminar producto (soft delete)', testDeleteProduct);
  await testEndpoint('Validación de ID inválido', testInvalidId);
  
  log('\n🎉 Pruebas completadas', 'green');
}

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
  log(`❌ Error no manejado: ${error.message}`, 'red');
  process.exit(1);
});

// Ejecutar las pruebas
runAllTests().catch(error => {
  log(`❌ Error en las pruebas: ${error.message}`, 'red');
  process.exit(1);
}); 