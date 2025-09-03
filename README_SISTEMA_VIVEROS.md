# Sistema de Gestión de Viveros con Clones

## Descripción General

Este sistema implementa una gestión completa de viveros forestales que incluye la administración de clones. Permite crear, actualizar, eliminar y consultar viveros junto con sus clones asociados.

## Estructura del Sistema

### Modelos

#### 1. Modelo Vivero (`src/models/vivero.ts`)
```typescript
interface IVivero {
  nombre: string;           // Requerido, único
  ubicacion: string;        // Opcional
  contacto: string;         // Opcional
  activo: boolean;          // Por defecto: true
  especies: string[];       // Array de IDs o texto personalizado
  clones: IClone[];         // Array de clones
  fechaCreacion: Date;      // Automático
  fechaActualizacion: Date; // Automático
}
```

#### 2. Modelo Clone (`src/models/vivero.ts`)
```typescript
interface IClone {
  _id: string;              // Requerido
  codigo: string;           // Requerido, único dentro del vivero
  especieAsociada: string;  // Requerido
  origen: string;           // Opcional
  descripcion: string;      // Opcional
  caracteristicas: string;  // Opcional
  activo: boolean;          // Por defecto: true
}
```

## API Endpoints

### Rutas Principales

#### 1. Obtener todos los viveros
```
GET /api/viveros
```

**Parámetros de consulta:**
- `search`: Búsqueda en nombre, ubicación o contacto
- `activo`: Filtrar por estado (true/false)
- `ubicacion`: Filtrar por ubicación específica
- `especie`: Filtrar por especie
- `page`: Número de página (por defecto: 1)
- `limit`: Elementos por página (por defecto: 10)

**Ejemplo:**
```bash
GET /api/viveros?search=paul&activo=true&page=1&limit=5
```

**Respuesta:**
```json
{
  "success": true,
  "data": [...],
  "total": 10,
  "page": 1,
  "limit": 5,
  "totalPages": 2
}
```

#### 2. Crear nuevo vivero
```
POST /api/viveros
```

**Cuerpo de la petición:**
```json
{
  "nombre": "Vivero Paul",
  "ubicacion": "Misiones",
  "contacto": "Juan Pérez",
  "activo": true,
  "especies": [
    "507f1f77bcf86cd799439011",
    "Eucalyptus personalizado",
    "Pino híbrido nuevo"
  ],
  "clones": [
    {
      "_id": "1703123456789",
      "codigo": "FA 13",
      "especieAsociada": "Eucalipto",
      "origen": "Forestal Argentina",
      "descripcion": "Clon de alto rendimiento",
      "caracteristicas": "Resistente a sequía",
      "activo": true
    }
  ]
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {...},
  "message": "Vivero creado exitosamente"
}
```

#### 3. Obtener vivero específico
```
GET /api/viveros/:id
```

**Respuesta:**
```json
{
  "success": true,
  "data": {...}
}
```

#### 4. Actualizar vivero
```
PUT /api/viveros/:id
```

**Cuerpo de la petición:** Mismo formato que POST

**Respuesta:**
```json
{
  "success": true,
  "data": {...},
  "message": "Vivero actualizado exitosamente"
}
```

#### 5. Eliminar vivero
```
DELETE /api/viveros/:id
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Vivero eliminado exitosamente"
}
```

### Rutas Especializadas

#### 6. Obtener estadísticas
```
GET /api/viveros/estadisticas
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "activos": 8,
    "inactivos": 2,
    "totalClones": 45,
    "viverosConEspecies": 7,
    "viverosSinEspecies": 3
  }
}
```

#### 7. Obtener clones de un vivero
```
GET /api/viveros/:id/clones
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "viveroId": "507f1f77bcf86cd799439011",
    "viveroNombre": "Vivero Paul",
    "clones": [...]
  }
}
```

## Validaciones

### Validaciones de Vivero
- **nombre**: Requerido, único, no puede estar vacío
- **especies**: Array de strings (IDs de especies existentes o texto personalizado)
- **clones**: Array de objetos con estructura válida

### Validaciones de Clone
- **_id**: Requerido, string
- **codigo**: Requerido, único dentro del mismo vivero
- **especieAsociada**: Requerido, string
- **origen**: Opcional, string
- **descripcion**: Opcional, string
- **caracteristicas**: Opcional, string
- **activo**: Opcional, boolean

### Validaciones de Especies
- Si se envía un ID de especie (24 caracteres hexadecimales), se verifica que exista en la colección `especies`
- Si se envía texto personalizado, se acepta sin validación adicional

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Datos inválidos |
| 404 | Vivero no encontrado |
| 409 | Nombre de vivero duplicado |
| 422 | Código de clon duplicado en el mismo vivero |
| 500 | Error interno del servidor |

## Índices de Base de Datos

Se crean automáticamente los siguientes índices:
```javascript
// Índice único en nombre
db.viveros.createIndex({ "nombre": 1 }, { unique: true })

// Índice en estado activo
db.viveros.createIndex({ "activo": 1 })

// Índice en especies
db.viveros.createIndex({ "especies": 1 })

// Índice en códigos de clones
db.viveros.createIndex({ "clones.codigo": 1 })
```

## Middleware

### 1. Validación de Datos (`src/middleware/viveroMiddleware.ts`)
- Valida estructura de datos de entrada
- Verifica tipos de datos
- Valida campos requeridos

### 2. Validación de ID
- Verifica que el ID sea un ObjectId válido
- Maneja errores de ID inválido

### 3. Manejo de Errores
- Maneja errores específicos de viveros
- Proporciona mensajes de error consistentes

## Controladores

### Funciones Implementadas

1. **getAllViveros**: Obtiene todos los viveros con filtros y paginación
2. **createVivero**: Crea un nuevo vivero con validaciones
3. **getViveroById**: Obtiene un vivero específico por ID
4. **updateVivero**: Actualiza un vivero existente
5. **deleteVivero**: Elimina un vivero
6. **getEstadisticas**: Obtiene estadísticas generales
7. **getClonesByVivero**: Obtiene clones de un vivero específico

## Características Especiales

### 1. Especies Mixtas
El sistema permite manejar tanto IDs de especies existentes como texto personalizado:
```json
{
  "especies": [
    "507f1f77bcf86cd799439011", // ID de especie existente
    "Eucalyptus personalizado",  // Texto personalizado
    "Pino híbrido nuevo"         // Texto personalizado
  ]
}
```

### 2. Clones Únicos
Cada código de clon debe ser único dentro del mismo vivero, pero puede repetirse en otros viveros.

### 3. Timestamps Automáticos
- `fechaCreacion`: Se establece automáticamente al crear
- `fechaActualizacion`: Se actualiza automáticamente en cada modificación

### 4. Búsqueda Avanzada
Soporta búsqueda en múltiples campos:
- Nombre del vivero
- Ubicación
- Contacto

### 5. Filtros Múltiples
- Por estado activo/inactivo
- Por ubicación
- Por especie
- Combinación de filtros

## Testing

### Archivo de Pruebas
Se incluye `test_viveros.js` con pruebas completas que verifican:
1. Estadísticas iniciales
2. Creación de viveros
3. Consultas con filtros
4. Actualización de datos
5. Eliminación de viveros

### Ejecutar Pruebas
```bash
node test_viveros.js
```

## Integración con Frontend

El sistema está diseñado para integrarse perfectamente con el frontend existente:

### Formato de Respuesta Esperado
```json
{
  "success": true,
  "data": [...],
  "total": 10,
  "message": "Mensaje opcional"
}
```

### Endpoints Utilizados por el Frontend
- `GET /api/viveros` - Listar viveros
- `POST /api/viveros` - Crear vivero
- `PUT /api/viveros/:id` - Actualizar vivero
- `DELETE /api/viveros/:id` - Eliminar vivero
- `GET /api/especies` - Obtener especies disponibles

## Instalación y Configuración

### 1. Dependencias
El sistema utiliza las dependencias existentes del proyecto:
- `express`
- `mongoose`
- `mongodb`

### 2. Variables de Entorno
```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=gestion_forestal
PORT=3001
```

### 3. Inicialización
Los índices se crean automáticamente al iniciar la aplicación.

## Consideraciones de Rendimiento

1. **Índices Optimizados**: Se crean índices en campos frecuentemente consultados
2. **Paginación**: Todas las consultas de listado incluyen paginación
3. **Proyecciones**: Se utilizan proyecciones para optimizar consultas específicas
4. **Validaciones Eficientes**: Las validaciones se realizan de forma eficiente

## Mantenimiento

### Logs
El sistema registra logs detallados para:
- Errores de validación
- Errores de base de datos
- Operaciones exitosas

### Monitoreo
Se recomienda monitorear:
- Tiempo de respuesta de consultas
- Uso de memoria
- Errores de validación
- Crecimiento de la colección

## Futuras Mejoras

1. **Soft Delete**: Implementar eliminación lógica en lugar de física
2. **Auditoría**: Agregar logs de auditoría para cambios
3. **Caché**: Implementar caché para consultas frecuentes
4. **Búsqueda Full-Text**: Agregar búsqueda de texto completo
5. **Exportación**: Agregar endpoints para exportar datos
6. **Importación**: Agregar endpoints para importar datos masivos
