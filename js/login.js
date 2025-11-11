const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Login.js cargado correctamente');
    
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm.innerHTML.trim()) {
        loginForm.innerHTML = `
            <h2>Iniciar Sesión</h2>
            <div class="form-group">
                <label for="username">Usuario:</label>
                <input type="text" id="username" name="username" required>
            </div>
            
            <div class="form-group">
                <label for="password">Contraseña:</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <button type="submit" class="btn-login">Iniciar Sesión</button>
            
            <div id="message" class="message" style="display: none;"></div>
        `;
    }
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            console.log('Respuesta del backend:', data);

            // Tu backend devuelve data.data (no data.user)
            if (response.ok && data.success && data.data) {
                const user = data.data; // ← Cambio aquí
                
                // Guardar datos del usuario
                sessionStorage.setItem('userData', JSON.stringify({
                    id: user.id_usuario,
                    id_usuario: user.id_usuario,
                    username: user.username,
                    nombre: user.nombre,
                    apellido: user.apellido,
                    email: user.email,
                    dni: user.dni,
                    rol: user.rol
                }));
                
                mostrarMensaje('Login exitoso! Redirigiendo...', 'success');
                
                setTimeout(() => {
                    if (user.rol === 'administrador') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        window.location.href = 'reservar-turno.html';
                    }
                }, 1000);
            } else {
                mostrarMensaje(data.message || 'Usuario o contraseña incorrectos', 'error');
            }
        } catch (error) {
            console.error('Error en login:', error);
            mostrarMensaje('Error de conexión. Verifica que el backend esté funcionando en localhost:3000', 'error');
        }
    });
});

function mostrarMensaje(texto, tipo) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = texto;
        messageDiv.className = `message ${tipo}`;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}