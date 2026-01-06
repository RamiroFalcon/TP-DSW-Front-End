# Cambios de Integración JWT

## Resumen
Se implementó autenticación JWT en todo el frontend para integrarse correctamente con el backend que ahora requiere tokens de autenticación.

## Archivos Modificados

### 1. `js/login.js` (NUEVO)
- **Creado**: Archivo separado con la lógica de login usando Vue 3
- **Funcionalidad**:
  - Maneja el login del usuario contra `/api/auth/login`
  - Guarda el token JWT en `localStorage` como `authToken`
  - Guarda los datos del usuario en `sessionStorage` como `userData`
  - Normaliza diferentes formatos de respuesta del backend (data.data, data.user, data.usuario)
  - Redirige según el rol: administrador → admin-dashboard.html, cliente → reservar-turno.html

### 2. `index.html`
- **Cambio**: Separación de HTML y JavaScript
- **Antes**: Contenía ~50 líneas de código Vue inline
- **Ahora**: Referencia externa `<script src="js/login.js"></script>`

### 3. `js/admin-dashboard.js`
- **Función agregada**: `getAuthHeaders()` - Helper que retorna headers con token JWT
- **Endpoints actualizados** (todos incluyen ahora `Authorization: Bearer {token}`):
  - `loadEntity()` - GET de entidades
  - `deleteEntity()` - DELETE de registros
  - `getCurrentItem()` - GET de item individual
  - `setupPrecioCalculo()` - POST calcular-precio
  - `onModalSave()` - POST crear y PUT editar
- **Verificación de seguridad**:
  - `verificarAdmin()` ahora valida token + rol de administrador
  - Redirige automáticamente al login si no hay token o no es admin
- **Cerrar sesión**: Limpia `authToken` y `userData` de localStorage/sessionStorage

### 4. `js/reservar.js`
- **Función agregada**: `getAuthHeaders()` - Helper que retorna headers con token JWT
- **Endpoints actualizados** (15 fetch requests):
  - `cargarMisReservas()` - GET reservas y pagos
  - `eliminarReserva()` - DELETE reserva
  - `modificarReserva()` - GET reserva y pago para modificar
  - `cargarCanchasParaSeleccionar()` - POST buscar-canchas
  - `guardarReserva()` - POST crear reserva
  - `crearPago()` - POST crear pago
  - `mostrarPago()` - GET reserva y pago
  - `procesarPago()` - POST simular pago
  - `obtenerLocalidadDeCancha()` - GET cancha
  - `obtenerDeporteDeCancha()` - GET cancha
  - `obtenerCanchaCompleta()` - GET cancha
  - `obtenerServiciosDeReserva()` - GET servicios
  - `fetchIfNeeded()` - GET entidades genéricas
  - `calcularPrecioFinal()` - POST calcular-precio
- **Verificación de seguridad**:
  - `init()` ahora valida token antes de cargar la aplicación
  - Redirige al login si no hay token
- **Cerrar sesión**: Limpia `authToken` y `userData`

### 5. `js/register.js`
- **Función agregada**: `getAuthHeaders()` - Helper por consistencia
- **Nota**: El registro NO requiere token (usuario aún no está autenticado), pero se agregó la función por si en el futuro se protegen endpoints

## Flujo de Autenticación

```
1. Usuario ingresa credenciales en index.html
   ↓
2. login.js envía POST a /api/auth/login
   ↓
3. Backend retorna { success, token, data: { usuario } }
   ↓
4. Frontend guarda:
   - localStorage.setItem('authToken', token)
   - sessionStorage.setItem('userData', JSON.stringify(usuario))
   ↓
5. Usuario accede a admin-dashboard.html o reservar-turno.html
   ↓
6. verificarAdmin() / init() valida existencia de token
   ↓
7. Todos los fetch() incluyen header: Authorization: Bearer {token}
   ↓
8. Backend valida token en cada request
   ↓
9. Al cerrar sesión: se limpian token y userData
```

## Función Helper `getAuthHeaders()`

```javascript
function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  const headers = {'Content-Type': 'application/json'};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
```

**Uso en fetch:**
```javascript
// Antes
const res = await fetch(API[entity]);

// Ahora
const res = await fetch(API[entity], {
  headers: getAuthHeaders()
});
```

## Almacenamiento

| Dato | Storage | Key | Formato |
|------|---------|-----|---------|
| Token JWT | localStorage | `authToken` | String |
| Datos Usuario | sessionStorage | `userData` | JSON string |

**Razón**: 
- `localStorage` para token → persiste entre sesiones del navegador
- `sessionStorage` para userData → se limpia al cerrar pestaña (más seguro)

## Seguridad Implementada

✅ Verificación de token en páginas protegidas  
✅ Verificación de rol de administrador en admin-dashboard  
✅ Redirección automática al login si no hay autenticación  
✅ Token incluido en TODOS los requests al backend  
✅ Limpieza completa de datos al cerrar sesión  

## Compatibilidad Backwards

- Si el backend NO retorna token, el frontend seguirá funcionando pero sin protección
- La función `getAuthHeaders()` verifica si existe token antes de agregarlo
- Los endpoints que no requieren autenticación funcionan igual

## Testing Recomendado

1. **Login exitoso**: Verificar que se guarden token y userData
2. **Login fallido**: Verificar mensaje de error
3. **Acceso directo a admin-dashboard.html sin token**: Debe redirigir a login
4. **Acceso directo a reservar-turno.html sin token**: Debe redirigir a login
5. **Cliente intenta acceder a admin**: Debe mostrar alerta y redirigir
6. **CRUD de entidades**: Verificar que incluyan Authorization header
7. **Reservas y pagos**: Verificar que incluyan Authorization header
8. **Cerrar sesión**: Verificar limpieza de localStorage/sessionStorage
9. **Token expirado**: Backend debe retornar 401, frontend debe redirigir a login

## Próximos Pasos Sugeridos

- [ ] Implementar manejo de errores 401 (token expirado) con redirect automático
- [ ] Agregar refresh token para renovar sesión
- [ ] Considerar mover userData también a localStorage para persistencia
- [ ] Implementar interceptor global para manejar errores de autenticación
- [ ] Agregar loading states mientras se verifica token al cargar páginas
