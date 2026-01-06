const { createApp } = Vue;
const API_URL = 'http://localhost:3000/api';

createApp({
  data() {
    return { 
      form: { username: '', password: '' }, 
      loading: false, 
      message: '', 
      messageType: '' 
    };
  },
  methods: {
    async handleLogin() {
      this.message = ''; 
      this.messageType = '';
      
      if (!this.form.username || !this.form.password) {
        this.message = 'Completá usuario y contraseña.'; 
        this.messageType = 'error'; 
        return;
      }
      
      this.loading = true;
      
      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: this.form.username, 
            password: this.form.password 
          })
        });
        
        const data = await res.json();
        console.log('Respuesta del backend:', data); // DEBUG

        if (res.ok && data.success) {
          // Guardar token JWT si existe
          if (data.token) {
            localStorage.setItem('authToken', data.token);
          }
          
          // Extraer datos del usuario (maneja diferentes formatos de respuesta)
          const user = data.data || data.user || data.usuario;
          
          if (!user) {
            console.error('No se encontraron datos de usuario en:', data);
            this.message = 'Error: no se recibieron datos del usuario';
            this.messageType = 'error';
            return;
          }

          // Normalizar y guardar datos del usuario
          const userData = {
            id: user.id_usuario || user.id,
            id_usuario: user.id_usuario || user.id,
            username: user.username,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            dni: user.dni,
            rol: user.rol
          };
          
          sessionStorage.setItem('userData', JSON.stringify(userData));
          
          this.message = 'Login exitoso! Redirigiendo...'; 
          this.messageType = 'success';
          
          setTimeout(() => {
            if (userData.rol === 'administrador') {
              window.location.href = 'admin-dashboard.html';
            } else {
              window.location.href = 'reservar-turno.html';
            }
          }, 700);
        } else {
          this.message = data.message || 'Usuario o contraseña incorrectos';
          this.messageType = 'error';
        }
      } catch (e) {
        console.error('Error de login:', e);
        this.message = 'Error de conexión. Verificá que el backend esté en localhost:3000';
        this.messageType = 'error';
      } finally {
        this.loading = false;
      }
    }
  }
}).mount('#app');
