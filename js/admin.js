const API_URL = 'http://localhost:3000/api';

window.onload = function() {
    verificarAdmin();
    cargarLocalidades();
    cargarTiposCanchas();
    cargarCanchas();
    cargarServicios();
    cargarPrecios();
};

// ✅ Verificar sesión de administrador
function verificarAdmin() {
    const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }

    const usuario = JSON.parse(userData);
    if (usuario.rol !== 'admin') {
        alert('Acceso restringido a administradores.');
        window.location.href = 'index.html';
        return;
    }

    const adminName = document.getElementById('adminName');
    if (adminName) {
        adminName.textContent = `Panel de administración - ${usuario.nombre}`;
    }
}

// 🏙️ LOCALIDADES
async function cargarLocalidades() {
    try {
        const response = await fetch(`${API_URL}/localidades`);
        const localidades = await response.json();

        const lista = document.getElementById('listaLocalidades');
        if (lista) {
            lista.innerHTML = localidades.map(l => `<li>${l.nombre}</li>`).join('');
        }
    } catch (error) {
        console.error('Error cargando localidades:', error);
    }
}

async function agregarLocalidad() {
    const input = document.getElementById('nuevaLocalidad');
    if (!input.value.trim()) return alert('Escribí un nombre de localidad.');

    try {
        const response = await fetch(`${API_URL}/localidades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: input.value })
        });

        if (!response.ok) throw new Error('Error al crear localidad');
        input.value = '';
        cargarLocalidades();
    } catch (error) {
        console.error('Error agregando localidad:', error);
    }
}

// 🏟️ TIPOS DE CANCHA
async function cargarTiposCanchas() {
    try {
        const response = await fetch(`${API_URL}/tipo-canchas`);
        const tipos = await response.json();

        const lista = document.getElementById('listaTiposCanchas');
        if (lista) {
            lista.innerHTML = tipos.map(t => `<li>${t.nombre}</li>`).join('');
        }
    } catch (error) {
        console.error('Error cargando tipos de cancha:', error);
    }
}

async function agregarTipoCancha() {
    const input = document.getElementById('nuevoTipoCancha');
    if (!input.value.trim()) return alert('Escribí un nombre de tipo de cancha.');

    try {
        const response = await fetch(`${API_URL}/tipo-canchas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: input.value })
        });

        if (!response.ok) throw new Error('Error al crear tipo de cancha');
        input.value = '';
        cargarTiposCanchas();
    } catch (error) {
        console.error('Error agregando tipo de cancha:', error);
    }
}

// ⚽ CANCHAS
async function cargarCanchas() {
    try {
        const response = await fetch(`${API_URL}/canchas`);
        const canchas = await response.json();

        const lista = document.getElementById('listaCanchas');
        if (lista) {
            lista.innerHTML = canchas.map(c => `<li>${c.nombre} - ${c.localidad} (${c.tipo})</li>`).join('');
        }
    } catch (error) {
        console.error('Error cargando canchas:', error);
    }
}

async function agregarCancha() {
    const nombre = document.getElementById('nombreCancha').value;
    const localidad = document.getElementById('selectLocalidad').value;
    const tipo = document.getElementById('selectTipoCancha').value;

    if (!nombre || !localidad || !tipo) return alert('Completá todos los campos.');

    try {
        const response = await fetch(`${API_URL}/canchas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, id_localidad: localidad, id_tipo_cancha: tipo })
        });

        if (!response.ok) throw new Error('Error al crear cancha');
        document.getElementById('nombreCancha').value = '';
        cargarCanchas();
    } catch (error) {
        console.error('Error agregando cancha:', error);
    }
}

// 💰 PRECIOS
async function cargarPrecios() {
    try {
        const response = await fetch(`${API_URL}/precios`);
        const precios = await response.json();

        const lista = document.getElementById('listaPrecios');
        if (lista) {
            lista.innerHTML = precios.map(p => `<li>${p.descripcion}: $${p.valor}</li>`).join('');
        }
    } catch (error) {
        console.error('Error cargando precios:', error);
    }
}

async function agregarPrecio() {
    const descripcion = document.getElementById('descripcionPrecio').value;
    const valor = document.getElementById('valorPrecio').value;

    if (!descripcion || !valor) return alert('Completá todos los campos.');

    try {
        const response = await fetch(`${API_URL}/precios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descripcion, valor })
        });

        if (!response.ok) throw new Error('Error al crear precio');
        document.getElementById('descripcionPrecio').value = '';
        document.getElementById('valorPrecio').value = '';
        cargarPrecios();
    } catch (error) {
        console.error('Error agregando precio:', error);
    }
}

// 🧴 SERVICIOS
async function cargarServicios() {
    try {
        const response = await fetch(`${API_URL}/servicios`);
        const servicios = await response.json();

        const lista = document.getElementById('listaServicios');
        if (lista) {
            lista.innerHTML = servicios.map(s => `<li>${s.nombre} - $${s.precio || 0}</li>`).join('');
        }
    } catch (error) {
        console.error('Error cargando servicios:', error);
    }
}

async function agregarServicio() {
    const nombre = document.getElementById('nombreServicio').value;
    const precio = document.getElementById('precioServicio').value;

    if (!nombre || !precio) return alert('Completá todos los campos.');

    try {
        const response = await fetch(`${API_URL}/servicios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, precio })
        });

        if (!response.ok) throw new Error('Error al crear servicio');
        document.getElementById('nombreServicio').value = '';
        document.getElementById('precioServicio').value = '';
        cargarServicios();
    } catch (error) {
        console.error('Error agregando servicio:', error);
    }
}

// 🔐 Cerrar sesión
function cerrarSesion() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'index.html';    
}
