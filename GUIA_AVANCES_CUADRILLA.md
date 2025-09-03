# 📋 Guía para Enviar Datos de Cuadrilla en Avances de Trabajo

## 🔧 Cambios Realizados en el Backend

El backend ahora requiere **ambos campos** para la cuadrilla y el proveedor:
- `cuadrillaId`: ID único de la cuadrilla
- `cuadrillaNombre`: Nombre descriptivo de la cuadrilla
- `proveedorId`: ID único del proveedor
- `proveedorNombre`: Nombre descriptivo del proveedor

## 📤 Cómo Enviar desde el Frontend

### **Ejemplo de Request para Crear Avance**

```javascript
// Ejemplo con fetch
const response = await fetch('/api/avancesTrabajos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    ordenTrabajoId: '507f1f77bcf86cd799439011',
    proveedorId: '507f1f77bcf86cd799439012',   // ✅ REQUERIDO
    proveedorNombre: 'Proveedor ABC',           // ✅ REQUERIDO
    fecha: '2024-01-15',
    superficie: 25.5,
    cuadrillaId: '507f1f77bcf86cd799439013',   // ✅ REQUERIDO
    cuadrillaNombre: 'Cuadrilla Norte',         // ✅ REQUERIDO
    rodal: 'Rodal A',
    actividad: 'Plantación',
    // ... otros campos
  })
});
```

### **Ejemplo con Axios**

```javascript
const response = await axios.post('/api/avancesTrabajos', {
  ordenTrabajoId: '507f1f77bcf86cd799439011',
  proveedorId: '507f1f77bcf86cd799439012',   // ✅ REQUERIDO
  proveedorNombre: 'Proveedor ABC',           // ✅ REQUERIDO
  fecha: '2024-01-15',
  superficie: 25.5,
  cuadrillaId: '507f1f77bcf86cd799439013',   // ✅ REQUERIDO
  cuadrillaNombre: 'Cuadrilla Norte',         // ✅ REQUERIDO
  rodal: 'Rodal A',
  actividad: 'Plantación',
  // ... otros campos
});
```

### **Ejemplo de Request para Actualizar Avance**

```javascript
const response = await axios.put(`/api/avancesTrabajos/${avanceId}`, {
  proveedorId: '507f1f77bcf86cd799439012',   // ✅ REQUERIDO
  proveedorNombre: 'Proveedor ABC',           // ✅ REQUERIDO (si se actualiza proveedorId)
  cuadrillaId: '507f1f77bcf86cd799439013',   // ✅ REQUERIDO
  cuadrillaNombre: 'Cuadrilla Norte',         // ✅ REQUERIDO (si se actualiza cuadrillaId)
  superficie: 30.0,
  // ... otros campos a actualizar
});
```

## 🎯 Implementación en Componentes React

### **Ejemplo de Formulario de Avance**

```typescript
import { useState, useEffect } from 'react';

interface Cuadrilla {
  _id: string;
  nombre: string;
  proveedorId: string;
  activa: boolean;
}

const AvanceForm = () => {
  const [formData, setFormData] = useState({
    ordenTrabajoId: '',
    proveedorId: '',
    proveedorNombre: '',
    fecha: '',
    superficie: 0,
    cuadrillaId: '',
    cuadrillaNombre: '',
    rodal: '',
    actividad: '',
    // ... otros campos
  });

  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);

  // Cargar cuadrillas del proveedor
  useEffect(() => {
    if (formData.proveedorId) {
      fetch(`/api/cuadrillas/por-proveedor/${formData.proveedorId}`)
        .then(res => res.json())
        .then(data => setCuadrillas(data));
    }
  }, [formData.proveedorId]);

  // Manejar cambio de proveedor
  const handleProveedorChange = (proveedorId: string, proveedorNombre: string) => {
    setFormData(prev => ({
      ...prev,
      proveedorId: proveedorId,
      proveedorNombre: proveedorNombre,
      cuadrillaId: '', // Resetear cuadrilla cuando cambia proveedor
      cuadrillaNombre: ''
    }));
  };

  // Manejar cambio de cuadrilla
  const handleCuadrillaChange = (cuadrillaId: string) => {
    const cuadrilla = cuadrillas.find(c => c._id === cuadrillaId);
    setFormData(prev => ({
      ...prev,
      cuadrillaId: cuadrillaId,
      cuadrillaNombre: cuadrilla ? cuadrilla.nombre : ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/avancesTrabajos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('Avance creado exitosamente:', data);
        // Limpiar formulario o redirigir
      } else {
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Otros campos del formulario */}
      
      <div>
        <label>Cuadrilla:</label>
        <select 
          value={formData.cuadrillaId}
          onChange={(e) => handleCuadrillaChange(e.target.value)}
          required
        >
          <option value="">Seleccionar cuadrilla</option>
          {cuadrillas.map(cuadrilla => (
            <option key={cuadrilla._id} value={cuadrilla._id}>
              {cuadrilla.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Campo oculto para el nombre de la cuadrilla */}
      <input 
        type="hidden" 
        name="cuadrillaNombre" 
        value={formData.cuadrillaNombre} 
      />

      <button type="submit">Crear Avance</button>
    </form>
  );
};
```

### **Ejemplo con Select de Cuadrillas**

```typescript
// Componente de selección de cuadrilla
const CuadrillaSelector = ({ 
  proveedorId, 
  value, 
  onChange 
}: {
  proveedorId: string;
  value: string;
  onChange: (cuadrillaId: string, cuadrillaNombre: string) => void;
}) => {
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);

  useEffect(() => {
    if (proveedorId) {
      fetch(`/api/cuadrillas/por-proveedor/${proveedorId}`)
        .then(res => res.json())
        .then(data => setCuadrillas(data));
    }
  }, [proveedorId]);

  return (
    <select 
      value={value}
      onChange={(e) => {
        const cuadrilla = cuadrillas.find(c => c._id === e.target.value);
        onChange(e.target.value, cuadrilla ? cuadrilla.nombre : '');
      }}
    >
      <option value="">Seleccionar cuadrilla</option>
      {cuadrillas.map(cuadrilla => (
        <option key={cuadrilla._id} value={cuadrilla._id}>
          {cuadrilla.nombre}
        </option>
      ))}
    </select>
  );
};
```

## ⚠️ Validaciones del Backend

### **Campos Requeridos para Crear Avance:**
- ✅ `ordenTrabajoId`
- ✅ `proveedorId`
- ✅ `proveedorNombre` ← **NUEVO**
- ✅ `fecha`
- ✅ `superficie`
- ✅ `cuadrillaId` ← **NUEVO**
- ✅ `cuadrillaNombre` ← **NUEVO**
- ✅ `rodal`
- ✅ `actividad`

### **Validaciones para Actualizar:**
- Si se actualiza `proveedorId`, también debe enviarse `proveedorNombre`
- Si se actualiza `cuadrillaId`, también debe enviarse `cuadrillaNombre`
- Ambos campos son validados antes de procesar la actualización

## 🔄 Flujo Recomendado

1. **Cargar proveedores** disponibles
2. **Al seleccionar proveedor**, automáticamente obtener su nombre
3. **Cargar cuadrillas** del proveedor seleccionado
4. **Mostrar select** con las cuadrillas disponibles
5. **Al seleccionar cuadrilla**, automáticamente obtener su nombre
6. **Enviar todos los campos** (`proveedorId`, `proveedorNombre`, `cuadrillaId`, `cuadrillaNombre`) al backend
7. **Validar respuesta** del backend para confirmar éxito

## 📝 Notas Importantes

- El `proveedorNombre` debe coincidir con el nombre real del proveedor en la base de datos
- El `cuadrillaNombre` debe coincidir con el nombre real de la cuadrilla en la base de datos
- Si cambias el `proveedorId`, asegúrate de actualizar también el `proveedorNombre`
- Si cambias el `cuadrillaId`, asegúrate de actualizar también el `cuadrillaNombre`
- El backend validará que todos los campos estén presentes
- Los endpoints de cuadrillas (`/api/cuadrillas/por-proveedor/:proveedorId`) devuelven el nombre de la cuadrilla 