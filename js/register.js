const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Register.js cargado correctamente');
    
    const registerForm = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    // Cargar localidades al iniciar
    cargarLocalidades();
    
    // Validar coincidencia de contraseñas en tiempo real
    confirmPasswordInput.addEventListener('input', validarCoincidenciaPasswords);
    passwordInput.addEventListener('input', validarCoincidenciaPasswords);
    
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validarFormulario()) {
            return;
        }
        
        // Mostrar loading
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creando cuenta...';
        submitBtn.disabled = true;
        
        try {
            const formData = {
                dni: document.getElementById('dni').value.trim(),
                nombre: document.getElementById('nombre').value.trim(),
                apellido: document.getElementById('apellido').value.trim(),
                email: document.getElementById('email').value.trim(),
                username: document.getElementById('username').value.trim(),
                password: passwordInput.value,
                rol: 'cliente',
                id_localidad: parseInt(document.getElementById('localidad').value)
            };
            
            console.log('Enviando datos de registro:', { ...formData, password: '***' });
            
            const response = await fetch(`${API_URL}/usuarios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            console.log('Respuesta del backend:', data);

            if (response.ok && data.success) {
                mostrarMensaje('¡Cuenta creada exitosamente! Redirigiendo al login...', 'success');
                
                // Redirigir al login después de 2 segundos
                setTimeout(() => {
                    window.location.href = 'index.html?registro=exitoso';
                }, 2000);
            } else {
                const errorMsg = data.message || 'Error en el registro. Intente nuevamente.';
                mostrarMensaje(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Error en registro:', error);
            mostrarMensaje('Error de conexión. Verifique que el servidor esté funcionando en localhost:3000', 'error');
        } finally {
            // Restaurar botón
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // Validar DNI en tiempo real (solo números)
    document.getElementById('dni').addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
});

function validarFormulario() {
    const nombre = document.getElementById('nombre').value.trim();
    const apellido = document.getElementById('apellido').value.trim();
    const dni = document.getElementById('dni').value.trim();
    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const localidad = document.getElementById('localidad').value;
    
    // Validaciones básicas
    if (!nombre || !apellido || !dni || !email || !username || !password || !localidad) {
        mostrarMensaje('Por favor complete todos los campos obligatorios', 'error');
        return false;
    }
    
    if (dni.length < 7 || dni.length > 8) {
        mostrarMensaje('El DNI debe tener entre 7 y 8 dígitos', 'error');
        return false;
    }
    
    if (password.length < 6) {
        mostrarMensaje('La contraseña debe tener al menos 6 caracteres', 'error');
        return false;
    }
    
    if (password !== confirmPassword) {
        mostrarMensaje('Las contraseñas no coinciden', 'error');
        return false;
    }
    
    if (!validarEmail(email)) {
        mostrarMensaje('Por favor ingrese un email válido', 'error');
        return false;
    }
    
    return true;
}

function validarCoincidenciaPasswords() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmInput = document.getElementById('confirmPassword');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmInput.style.borderColor = '#e74c3c';
    } else if (confirmPassword && password === confirmPassword) {
        confirmInput.style.borderColor = '#27ae60';
    } else {
        confirmInput.style.borderColor = '#1ba97a';
    }
}

function validarEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function cargarLocalidades() {
    try {
        console.log('🔄 Cargando localidades desde:', `${API_URL}/localidades`);
        
        const response = await fetch(`${API_URL}/localidades`);
        console.log('📡 Respuesta HTTP:', response.status, response.statusText);
        
        const data = await response.json();
        console.log('📦 Datos recibidos de localidades:', data);
        
        const localidadSelect = document.getElementById('localidad');
        localidadSelect.innerHTML = '<option value="">Seleccione una localidad</option>';
        
       
        let localidadesArray = data;
        
        // Si la respuesta tiene estructura {data: [...]} usamos data, sino usamos el array directamente
        if (data && Array.isArray(data.data)) {
            localidadesArray = data.data;
        } else if (data && Array.isArray(data)) {
            localidadesArray = data;
        } else {
            console.error(' Formato de respuesta inesperado:', data);
            mostrarMensaje('Error en el formato de localidades', 'error');
            return;
        }
        
        console.log(' Localidades a mostrar:', localidadesArray);
        
        if (localidadesArray.length === 0) {
            mostrarMensaje('No hay localidades disponibles. Contacte al administrador.', 'error');
            return;
        }
        
        localidadesArray.forEach(localidad => {
            const option = document.createElement('option');
            // ✅ CORRECCIÓN: Tu entidad usa 'id' no 'id_localidad'
            option.value = localidad.id || localidad.id_localidad;
            option.textContent = localidad.nombre;
            console.log(`📍 Agregando localidad: ${localidad.nombre} (ID: ${localidad.id || localidad.id_localidad})`);
            localidadSelect.appendChild(option);
        });
        
        console.log('✅ Localidades cargadas correctamente');
        
    } catch (error) {
        console.error('❌ Error cargando localidades:', error);
        mostrarMensaje('Error cargando localidades. Verifique la conexión con el servidor.', 'error');
        
        // Opciones de emergencia
        const localidadSelect = document.getElementById('localidad');
        const opcionesEmergencia = [
            { id: 1, nombre: 'Rosario' },
            { id: 2, nombre: 'Santa Fe' },
            { id: 3, nombre: 'Buenos Aires' }
        ];
        
        opcionesEmergencia.forEach(localidad => {
            const option = document.createElement('option');
            option.value = localidad.id;
            option.textContent = localidad.nombre;
            localidadSelect.appendChild(option);
        });
    }
}

function mostrarMensaje(texto, tipo) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = texto;
        messageDiv.className = `message ${tipo}`;
        messageDiv.style.display = 'block';
        
        // Auto-ocultar después de 5 segundos para errores, mantener para éxito
        if (tipo !== 'success') {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }
}