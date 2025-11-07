const API_URL = 'http://localhost:3000/api';

// ⚙️ MODO DE PRUEBA
const MODO_PRUEBA = true;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Login.js cargado correctamente');
    
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Formulario enviado');
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        console.log('Usuario:', username);
        
        if (MODO_PRUEBA) {
            // Usuarios de prueba
            const usuariosPrueba = {
                'admin': { password: 'admin123', rol: 'admin', nombre: 'Administrador' },
                'cliente': { password: 'cliente123', rol: 'cliente', nombre: 'Juan Pérez' },
                'test': { password: 'test', rol: 'cliente', nombre: 'Usuario Test' }
            };
            
            const usuario = usuariosPrueba[username];
            
            if (usuario && usuario.password === password) {
                // Login exitoso
                const storage = remember ? localStorage : sessionStorage;
                storage.setItem('token', 'token-de-prueba-123');
                storage.setItem('userData', JSON.stringify({
                    username: username,
                    nombre: usuario.nombre,
                    rol: usuario.rol
                }));
                
                mostrarMensaje('Login exitoso! Redirigiendo...', 'success');
                
                setTimeout(() => {
                    if (usuario.rol === 'admin') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        window.location.href = 'reservar-turno.html';
                    }
                }, 1000);
            } else {
                mostrarMensaje('Usuario o contraseña incorrectos', 'error');
            }
            return;
        }
    });
});

function mostrarMensaje(texto, tipo) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = texto;
    messageDiv.className = `message ${tipo}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}