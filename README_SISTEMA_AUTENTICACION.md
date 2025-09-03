# Sistema de Autenticación - Gestión Forestal

## Descripción

Este documento describe el nuevo sistema de autenticación implementado para el backend de gestión forestal, que reemplaza el sistema anterior de usuarios hardcodeados por una base de datos MongoDB.

## Estructura de la Base de Datos

### Colección: `usuarios_admin`

```javascript
{
  _id: ObjectId,
  nombre: String (requerido, mínimo 2 caracteres),
  apellido: String (requerido, mínimo 2 caracteres),
  email: String (requerido, único),
  password: String (requerido, mínimo 4 caracteres),
  rol: String (requerido, "admin" | "supervisor" | "provider"),
  cuit: String (opcional, solo para providers),
  telefono: String (opcional, solo para providers),
  activo: Boolean (por defecto true),
  fechaCreacion: Date,
  fechaActualizacion: Date
}
```

### Índices

- `email`: Índice único para validar emails únicos
- `rol`: Índice para consultas por rol
- `activo`: Índice para filtrar usuarios activos

## Endpoints de la API

### Autenticación

#### POST `/api/usuarios_admin/login`
Autentica un usuario con email y contraseña.

**Request:**
```json
{
  "email": "admin@sistema.com",
  "password": "admin123"
}
```

**Response (éxito):**
```json
{
  "success": true,
  "message": "Autenticación exitosa",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "nombre": "Admin",
    "apellido": "Sistema",
    "email": "admin@sistema.com",
    "rol": "admin",
    "cuit": null,
    "telefono": null,
    "activo": true,
    "fechaCreacion": "2024-01-01T00:00:00.000Z",
    "fechaActualizacion": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (error):**
```json
{
  "success": false,
  "message": "Credenciales inválidas"
}
```

### Gestión de Usuarios

#### GET `/api/usuarios_admin`
Obtiene todos los usuarios activos.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "nombre": "Admin",
      "apellido": "Sistema",
      "email": "admin@sistema.com",
      "rol": "admin",
      "activo": true
    }
  ]
}
```

#### GET `/api/usuarios_admin/:id`
Obtiene un usuario específico por ID.

#### POST `/api/usuarios_admin`
Crea un nuevo usuario.

**Request:**
```json
{
  "nombre": "Nuevo",
  "apellido": "Usuario",
  "email": "nuevo@usuario.com",
  "password": "password123",
  "rol": "provider",
  "cuit": "20-12345678-9",
  "telefono": "+54 11 1234-5678",
  "activo": true
}
```

#### PUT `/api/usuarios_admin/:id`
Actualiza un usuario existente.

#### DELETE `/api/usuarios_admin/:id`
Elimina un usuario (soft delete - marca como inactivo).

#### GET `/api/usuarios_admin/rol/:rol`
Obtiene usuarios por rol específico.

## Roles y Permisos

### Admin
- Acceso completo al sistema
- Puede gestionar usuarios
- Puede ver todos los datos

### Supervisor
- Acceso limitado a funcionalidades de supervisión
- No puede gestionar usuarios
- Puede ver datos de sus proveedores asignados

### Provider
- Acceso limitado a funcionalidades de proveedor
- Solo puede ver y gestionar sus propios datos
- Campos adicionales: CUIT y teléfono

## Migración de Datos

### Ejecutar Migración

```bash
npm run migrar:usuarios
```

### Datos de Migración

El script migra los siguientes usuarios hardcodeados:

| Email | Password | Rol | CUIT | Teléfono |
|-------|----------|-----|------|----------|
| admin@sistema.com | admin123 | admin | - | - |
| juan.perez@empresa.com | supervisor123 | supervisor | - | - |
| maria.gonzalez@empresa.com | supervisor456 | supervisor | - | - |
| carlos.lopez@proveedor.com | provider123 | provider | 20-12345678-9 | +54 11 1234-5678 |
| ana.martinez@proveedor.com | provider456 | provider | 20-87654321-0 | +54 11 8765-4321 |
| roberto.fernandez@proveedor.com | provider789 | provider | 20-11223344-5 | +54 11 1122-3344 |

## Validaciones

### Crear/Actualizar Usuario

- **Nombre**: Requerido, mínimo 2 caracteres
- **Apellido**: Requerido, mínimo 2 caracteres
- **Email**: Requerido, formato válido, único
- **Password**: Requerido, mínimo 4 caracteres
- **Rol**: Requerido, debe ser "admin", "supervisor" o "provider"
- **CUIT**: Opcional, solo para providers
- **Teléfono**: Opcional, solo para providers

### Seguridad

- Las contraseñas se almacenan en texto plano (como estaban hardcodeadas)
- No se puede eliminar el último usuario admin
- Solo usuarios activos pueden autenticarse
- Los emails se normalizan (lowercase, trim)

## Implementación en el Frontend

### Hook de Autenticación

El hook `use-auth.ts` debe ser modificado para:

1. Eliminar arrays hardcodeados (`providerData`, `supervisorData`)
2. Modificar `login()` para hacer consulta a `/api/usuarios_admin/login`
3. Mantener funcionalidad de sessionStorage

### Ejemplo de Implementación

```typescript
// hooks/use-auth.ts
const login = async (email: string, password: string) => {
  try {
    const response = await fetch('/api/usuarios_admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (data.success) {
      const user = data.data;
      sessionStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return { success: true, user };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error) {
    return { success: false, error: 'Error de conexión' };
  }
};
```

### Cliente API

Agregar a `lib/api-client.ts`:

```typescript
export const usuariosAdminAPI = {
  getAll: () => fetch('/api/usuarios_admin').then(res => res.json()),
  getById: (id: string) => fetch(`/api/usuarios_admin/${id}`).then(res => res.json()),
  create: (user: any) => fetch('/api/usuarios_admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  }).then(res => res.json()),
  update: (id: string, user: any) => fetch(`/api/usuarios_admin/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  }).then(res => res.json()),
  delete: (id: string) => fetch(`/api/usuarios_admin/${id}`, {
    method: 'DELETE'
  }).then(res => res.json()),
  getByRole: (role: string) => fetch(`/api/usuarios_admin/rol/${role}`).then(res => res.json()),
  login: (email: string, password: string) => fetch('/api/usuarios_admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }).then(res => res.json())
};
```

## Página de Administración

### app/admin/usuarios/page.tsx

La página debe incluir:

1. **Lista de usuarios** con opciones de editar/eliminar
2. **Formulario de creación/edición** con campos:
   - Nombre (requerido)
   - Apellido (requerido)
   - Email (requerido, único)
   - Password (requerido)
   - Rol (select: admin, supervisor, provider)
   - CUIT (opcional, solo visible si rol = provider)
   - Teléfono (opcional, solo visible si rol = provider)
   - Activo (checkbox, por defecto true)

3. **Validaciones en tiempo real**
4. **Mensajes de éxito/error**
5. **Confirmación para eliminar**

### Ejemplo de Formulario

```typescript
const [formData, setFormData] = useState({
  nombre: '',
  apellido: '',
  email: '',
  password: '',
  rol: 'provider',
  cuit: '',
  telefono: '',
  activo: true
});

const [errors, setErrors] = useState({});

const validateForm = () => {
  const newErrors = {};
  
  if (!formData.nombre.trim()) newErrors.nombre = 'Nombre requerido';
  if (!formData.apellido.trim()) newErrors.apellido = 'Apellido requerido';
  if (!formData.email.trim()) newErrors.email = 'Email requerido';
  if (!formData.password.trim()) newErrors.password = 'Password requerido';
  if (!formData.rol) newErrors.rol = 'Rol requerido';
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

## Consideraciones de Seguridad

1. **Contraseñas**: Por ahora en texto plano (como estaban hardcodeadas)
2. **Autenticación**: Solo usuarios activos pueden autenticarse
3. **Autorización**: Solo admins pueden gestionar usuarios
4. **Validación**: Emails únicos, roles válidos
5. **Soft Delete**: Los usuarios se marcan como inactivos, no se eliminan físicamente

## Próximos Pasos

1. Implementar hash de contraseñas (bcrypt)
2. Agregar tokens JWT para sesiones
3. Implementar middleware de autorización
4. Agregar logs de auditoría
5. Implementar recuperación de contraseñas

## Troubleshooting

### Error: "Email ya existe"
- Verificar que el email no esté en uso por otro usuario activo
- Los emails se normalizan automáticamente

### Error: "No se puede eliminar el último admin"
- Asegurar que siempre haya al menos un usuario admin activo
- Crear un nuevo admin antes de eliminar el actual

### Error: "Credenciales inválidas"
- Verificar que el usuario esté activo
- Verificar que el email y contraseña sean correctos
- Los emails se normalizan automáticamente 