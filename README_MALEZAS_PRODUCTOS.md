# API de Productos de Malezas

## Descripción
Esta API proporciona endpoints CRUD para gestionar productos de malezas en el sistema de gestión forestal.

## Estructura del Documento

```json
{
  "_id": "ObjectId",
  "nombre": "string (requerido)",
  "descripcion": "string (opcional)",
  "tipo": "string (opcional)",
  "unidadMedida": "string (requerido)",
  "categoria": "string (opcional)",
  "activo": "boolean (default: true)",
  "fechaCreacion": "Date (auto)",
  "fechaActualizacion": "Date (auto)"
}
```

## Validaciones

### Campos Requeridos
- **nombre**: string, mínimo 2 caracteres
- **unidadMedida**: debe ser uno de: `cm3`, `ml`, `l`, `kg`, `g`

### Campos Opcionales
- **tipo**: debe ser uno de: `Sistémico`, `Contacto`, `Preemergente`, `Postemergente`, `Selectivo`, `No selectivo`, `Hormonal`
- **categoria**: debe ser uno de: `Herbicida total`, `Herbicida selectivo`, `Graminicida`, `Dicotiledónicida`, `Hormonal`, `Inhibidor fotosíntesis`
- **activo**: boolean, default `true`

## Endpoints

### 1. Obtener todos los productos
```http
GET /api/malezasProductos
```

**Respuesta:**
```json
[
  {
    "_id": "ObjectId",
    "nombre": "Glifosato 48%",
    "descripcion": "Herbicida sistémico no selectivo de amplio espectro",
    "tipo": "Sistémico",
    "unidadMedida": "cm3",
    "categoria": "Herbicida total",
    "activo": true,
    "fechaCreacion": "2024-01-01T00:00:00.000Z",
    "fechaActualizacion": "2024-01-01T00:00:00.000Z"
  }
]
```

### 2. Obtener producto por ID
```http
GET /api/malezasProductos/:id
```

**Parámetros:**
- `id`: ObjectId del producto

**Respuesta:**
```json
{
  "_id": "ObjectId",
  "nombre": "Glifosato 48%",
  "descripcion": "Herbicida sistémico no selectivo de amplio espectro",
  "tipo": "Sistémico",
  "unidadMedida": "cm3",
  "categoria": "Herbicida total",
  "activo": true,
  "fechaCreacion": "2024-01-01T00:00:00.000Z",
  "fechaActualizacion": "2024-01-01T00:00:00.000Z"
}
```

### 3. Crear nuevo producto
```http
POST /api/malezasProductos
```

**Body:**
```json
{
  "nombre": "Nuevo Herbicida",
  "descripcion": "Descripción del producto",
  "tipo": "Sistémico",
  "unidadMedida": "cm3",
  "categoria": "Herbicida total",
  "activo": true
}
```

**Respuesta:**
```json
{
  "mensaje": "Producto de malezas creado exitosamente",
  "id": "ObjectId",
  "producto": {
    "_id": "ObjectId",
    "nombre": "Nuevo Herbicida",
    "descripcion": "Descripción del producto",
    "tipo": "Sistémico",
    "unidadMedida": "cm3",
    "categoria": "Herbicida total",
    "activo": true,
    "fechaCreacion": "2024-01-01T00:00:00.000Z",
    "fechaActualizacion": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Actualizar producto
```http
PUT /api/malezasProductos/:id
```

**Parámetros:**
- `id`: ObjectId del producto

**Body:**
```json
{
  "nombre": "Herbicida Actualizado",
  "descripcion": "Nueva descripción",
  "tipo": "Contacto",
  "unidadMedida": "ml",
  "categoria": "Herbicida selectivo",
  "activo": false
}
```

**Respuesta:**
```json
{
  "mensaje": "Producto de malezas actualizado exitosamente",
  "producto": {
    "_id": "ObjectId",
    "nombre": "Herbicida Actualizado",
    "descripcion": "Nueva descripción",
    "tipo": "Contacto",
    "unidadMedida": "ml",
    "categoria": "Herbicida selectivo",
    "activo": false,
    "fechaCreacion": "2024-01-01T00:00:00.000Z",
    "fechaActualizacion": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Eliminar producto (soft delete)
```http
DELETE /api/malezasProductos/:id
```

**Parámetros:**
- `id`: ObjectId del producto

**Respuesta:**
```json
{
  "mensaje": "Producto de malezas eliminado exitosamente",
  "id": "ObjectId"
}
```

### 6. Obtener productos por tipo
```http
GET /api/malezasProductos/tipo/:tipo
```

**Parámetros:**
- `tipo`: Uno de los tipos válidos

**Respuesta:**
```json
[
  {
    "_id": "ObjectId",
    "nombre": "Glifosato 48%",
    "tipo": "Sistémico",
    "unidadMedida": "cm3",
    "categoria": "Herbicida total",
    "activo": true
  }
]
```

### 7. Obtener productos por categoría
```http
GET /api/malezasProductos/categoria/:categoria
```

**Parámetros:**
- `categoria`: Una de las categorías válidas

**Respuesta:**
```json
[
  {
    "_id": "ObjectId",
    "nombre": "Glifosato 48%",
    "tipo": "Sistémico",
    "unidadMedida": "cm3",
    "categoria": "Herbicida total",
    "activo": true
  }
]
```

## Códigos de Error

### 400 - Bad Request
- ID inválido
- Validaciones de campos fallidas
- Producto con nombre duplicado

### 404 - Not Found
- Producto no encontrado

### 500 - Internal Server Error
- Error interno del servidor

## Ejemplos de Uso

### Crear un nuevo producto
```bash
curl -X POST http://localhost:3001/api/malezasProductos \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Nuevo Herbicida",
    "descripcion": "Herbicida de prueba",
    "tipo": "Sistémico",
    "unidadMedida": "cm3",
    "categoria": "Herbicida total",
    "activo": true
  }'
```

### Obtener todos los productos
```bash
curl -X GET http://localhost:3001/api/malezasProductos
```

### Actualizar un producto
```bash
curl -X PUT http://localhost:3001/api/malezasProductos/PRODUCT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Herbicida Actualizado",
    "descripcion": "Nueva descripción"
  }'
```

### Eliminar un producto
```bash
curl -X DELETE http://localhost:3001/api/malezasProductos/PRODUCT_ID
```

## Datos Iniciales

Al iniciar el servidor, se insertan automáticamente los siguientes productos de ejemplo:

1. **Glifosato 48%** - Herbicida sistémico no selectivo
2. **2,4-D Amina** - Herbicida hormonal selectivo
3. **Atrazina 50%** - Herbicida preemergente
4. **Paraquat 20%** - Herbicida de contacto (inactivo)
5. **Fluazifop-P-Butil** - Graminicida sistémico

## Características

- ✅ Validación completa de campos
- ✅ Soft delete (marcar como inactivo en lugar de eliminar)
- ✅ Timestamps automáticos
- ✅ Índices de base de datos optimizados
- ✅ Logging de operaciones
- ✅ Manejo de errores robusto
- ✅ Respuestas JSON consistentes
- ✅ Validación de ObjectId
- ✅ Verificación de unicidad de nombres 