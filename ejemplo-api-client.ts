// ejemplo-api-client.ts
// Este archivo muestra cómo implementar el cliente API para usuarios admin en el frontend

// Tipos TypeScript
interface UsuarioAdmin {
  _id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'admin' | 'supervisor' | 'provider';
  cuit?: string;
  telefono?: string;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface CreateUserRequest {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: 'admin' | 'supervisor' | 'provider';
  cuit?: string;
  telefono?: string;
  activo?: boolean;
}

interface UpdateUserRequest extends Partial<CreateUserRequest> {
  // Campos opcionales para actualización
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Cliente API para usuarios admin
export const usuariosAdminAPI = {
  // Autenticación
  login: async (credentials: LoginRequest): Promise<ApiResponse<UsuarioAdmin>> => {
    try {
      const response = await fetch('/api/usuarios_admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: 'Error de conexión'
      };
    }
  },

  // Obtener todos los usuarios
  getAll: async (): Promise<ApiResponse<UsuarioAdmin[]>> => {
    try {
      const response = await fetch('/api/usuarios_admin');
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: 'Error de conexión'
      };
    }
  },

  // Obtener usuario por ID
  getById: async (id: string): Promise<ApiResponse<UsuarioAdmin>> => {
    try {
      const response = await fetch(`/api/usuarios_admin/${id}`);
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: 'Error de conexión'
      };
    }
  },

  // Crear nuevo usuario
  create: async (userData: CreateUserRequest): Promise<ApiResponse<UsuarioAdmin>> => {
    try {
      const response = await fetch('/api/usuarios_admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: 'Error de conexión'
      };
    }
  },

  // Actualizar usuario
  update: async (id: string, userData: UpdateUserRequest): Promise<ApiResponse<UsuarioAdmin>> => {
    try {
      const response = await fetch(`/api/usuarios_admin/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: 'Error de conexión'
      };
    }
  },

  // Eliminar usuario (soft delete)
  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    try {
      const response = await fetch(`/api/usuarios_admin/${id}`, {
        method: 'DELETE',
      });
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: 'Error de conexión'
      };
    }
  },

  // Obtener usuarios por rol
  getByRole: async (role: string): Promise<ApiResponse<UsuarioAdmin[]>> => {
    try {
      const response = await fetch(`/api/usuarios_admin/rol/${role}`);
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: 'Error de conexión'
      };
    }
  }
};

// Hook de autenticación actualizado
export const useAuth = () => {
  const [user, setUser] = useState<UsuarioAdmin | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar usuario desde sessionStorage al inicializar
  useEffect(() => {
    const savedUser = sessionStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error al cargar usuario desde sessionStorage:', error);
        sessionStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await usuariosAdminAPI.login({ email, password });
      
      if (response.success && response.data) {
        const userData = response.data;
        sessionStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return { success: true, user: userData };
      } else {
        const errorMessage = response.message || 'Error de autenticación';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = 'Error de conexión';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('user');
    setUser(null);
    setError(null);
  };

  const isAuthenticated = () => {
    return user !== null;
  };

  const hasRole = (role: string) => {
    return user?.rol === role;
  };

  const isAdmin = () => {
    return hasRole('admin');
  };

  const isSupervisor = () => {
    return hasRole('supervisor');
  };

  const isProvider = () => {
    return hasRole('provider');
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    hasRole,
    isAdmin,
    isSupervisor,
    isProvider
  };
};

// Ejemplo de uso del hook
export const useUsuariosAdmin = () => {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarUsuarios = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await usuariosAdminAPI.getAll();
      
      if (response.success && response.data) {
        setUsuarios(response.data);
      } else {
        setError(response.message || 'Error al cargar usuarios');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const crearUsuario = async (userData: CreateUserRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await usuariosAdminAPI.create(userData);
      
      if (response.success) {
        await cargarUsuarios(); // Recargar lista
        return { success: true };
      } else {
        setError(response.message || 'Error al crear usuario');
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage = 'Error de conexión';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const actualizarUsuario = async (id: string, userData: UpdateUserRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await usuariosAdminAPI.update(id, userData);
      
      if (response.success) {
        await cargarUsuarios(); // Recargar lista
        return { success: true };
      } else {
        setError(response.message || 'Error al actualizar usuario');
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage = 'Error de conexión';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const eliminarUsuario = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await usuariosAdminAPI.delete(id);
      
      if (response.success) {
        await cargarUsuarios(); // Recargar lista
        return { success: true };
      } else {
        setError(response.message || 'Error al eliminar usuario');
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage = 'Error de conexión';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    usuarios,
    loading,
    error,
    cargarUsuarios,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario
  };
};

// Ejemplo de componente de login
export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await login(email, password);
    
    if (result.success) {
      // Redirigir según el rol
      const user = result.user;
      if (user.rol === 'admin') {
        // Redirigir a panel admin
        window.location.href = '/admin';
      } else if (user.rol === 'supervisor') {
        // Redirigir a panel supervisor
        window.location.href = '/supervisor';
      } else {
        // Redirigir a panel provider
        window.location.href = '/provider';
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label htmlFor="password">Contraseña:</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
    </form>
  );
};

// Ejemplo de componente de gestión de usuarios
export const UsuariosAdminPage = () => {
  const { usuarios, loading, error, cargarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario } = useUsuariosAdmin();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin()) {
      cargarUsuarios();
    }
  }, [isAdmin]);

  const handleEdit = (usuario: UsuarioAdmin) => {
    // Implementar lógica de edición
    console.log('Editar usuario:', usuario);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este usuario?')) {
      await eliminarUsuario(id);
    }
  };

  if (!isAdmin()) {
    return <div>Acceso denegado. Solo administradores pueden ver esta página.</div>;
  }

  if (loading) {
    return <div>Cargando usuarios...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Gestión de Usuarios</h1>
      
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map(usuario => (
            <tr key={usuario._id}>
              <td>{usuario.nombre} {usuario.apellido}</td>
              <td>{usuario.email}</td>
              <td>{usuario.rol}</td>
              <td>{usuario.activo ? 'Activo' : 'Inactivo'}</td>
              <td>
                <button onClick={() => handleEdit(usuario)}>Editar</button>
                <button onClick={() => handleDelete(usuario._id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Nota: Este archivo es solo un ejemplo
// Necesitas importar React y useState, useEffect según tu framework
// import React, { useState, useEffect } from 'react';
//
// Para usar este archivo en un proyecto real:
// 1. Cambiar la extensión a .tsx si usas JSX
// 2. Agregar las importaciones necesarias
// 3. Configurar TypeScript para JSX
// 4. Ajustar la sintaxis según tu framework (React, Vue, etc.) 