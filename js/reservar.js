const API_URL = 'http://localhost:3000/api';

let deporteActual = null;
let localidadActual = null;
let usuarioActual = null;

window.onload = function() {
    verificarUsuario();
    cargarDeportes();
};

function verificarUsuario() {
    const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }
    usuarioActual = JSON.parse(userData);
    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = `Bienvenido, ${usuarioActual.nombre || usuarioActual.username}`;
    }
}

// DEPORTES
async function cargarDeportes() {
    try {
        const response = await fetch(`${API_URL}/deportes`);
        const deportes = await response.json();
        
        const grid = document.querySelector('.deportes-grid');
        if (grid) {
            grid.innerHTML = deportes.map(d => `
                <div class="deporte-card" onclick="seleccionarDeporte('${d.deporte}')">
                    <div class="deporte-icon">${getEmoji(d.deporte)}</div>
                    <h3>${d.deporte}</h3>
                    <p>Disponible</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error cargando deportes:', error);
        // Fallback: mostrar deportes por defecto
        const grid = document.querySelector('.deportes-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="deporte-card" onclick="seleccionarDeporte('Fútbol')">
                    <div class="deporte-icon">⚽</div>
                    <h3>Fútbol</h3>
                    <p>Disponible</p>
                </div>
                <div class="deporte-card" onclick="seleccionarDeporte('Tenis')">
                    <div class="deporte-icon">🎾</div>
                    <h3>Tenis</h3>
                    <p>Disponible</p>
                </div>
                <div class="deporte-card" onclick="seleccionarDeporte('Hockey')">
                    <div class="deporte-icon">🏑</div>
                    <h3>Hockey</h3>
                    <p>Disponible</p>
                </div>
            `;
        }
    }
}

function getEmoji(deporte) {
    if (deporte.includes('Fút')) return '⚽';
    if (deporte.includes('Ten')) return '🎾';
    if (deporte.includes('Hoc')) return '🏑';
    return '🏟️';
}

function seleccionarDeporte(deporte) {
    deporteActual = deporte;
    const deporteSpan = document.getElementById('deporteSeleccionado');
    if (deporteSpan) {
        deporteSpan.textContent = deporte;
    }
    cargarLocalidades();
    mostrar('seccionLocalidad');
}

// LOCALIDADES
async function cargarLocalidades() {
    try {
        const response = await fetch(`${API_URL}/localidades?deporte=${encodeURIComponent(deporteActual)}`);
        const localidades = await response.json();
        
        const grid = document.querySelector('.localidades-grid');
        if (grid) {
            grid.innerHTML = localidades.map(l => `
                <div class="localidad-card" onclick="seleccionarLocalidad('${l.nombre}')">
                    <div class="localidad-icon">📍</div>
                    <h3>${l.nombre}</h3>
                    <p>Canchas disponibles</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error cargando localidades:', error);
        // Fallback: mostrar localidades por defecto
        const grid = document.querySelector('.localidades-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="localidad-card" onclick="seleccionarLocalidad('Buenos Aires')">
                    <div class="localidad-icon">📍</div>
                    <h3>Buenos Aires</h3>
                    <p>Canchas disponibles</p>
                </div>
                <div class="localidad-card" onclick="seleccionarLocalidad('Rosario')">
                    <div class="localidad-icon">📍</div>
                    <h3>Rosario</h3>
                    <p>Canchas disponibles</p>
                </div>
                <div class="localidad-card" onclick="seleccionarLocalidad('Córdoba')">
                    <div class="localidad-icon">📍</div>
                    <h3>Córdoba</h3>
                    <p>Canchas disponibles</p>
                </div>
            `;
        }
    }
}

function seleccionarLocalidad(localidad) {
    localidadActual = localidad;
    
    const deporteSpan2 = document.getElementById('deporteSeleccionado2');
    const localidadSpan = document.getElementById('localidadSeleccionada');
    
    if (deporteSpan2) deporteSpan2.textContent = deporteActual;
    if (localidadSpan) localidadSpan.textContent = localidad;
    
    const hoy = new Date().toISOString().split('T')[0];
    const fechaInput = document.getElementById('fechaInput');
    if (fechaInput) {
        fechaInput.min = hoy;
        fechaInput.value = hoy;
    }
    
    mostrar('seccionFecha');
}

// CANCHAS
async function buscarCanchas() {
    const fechaInput = document.getElementById('fechaInput');
    const fecha = fechaInput ? fechaInput.value : '';
    
    if (!deporteActual || !localidadActual || !fecha) {
        alert('Completa todos los campos');
        return;
    }
    
    const deporteSpan3 = document.getElementById('deporteSeleccionado3');
    const localidadSpan2 = document.getElementById('localidadSeleccionada2');
    const fechaSpan = document.getElementById('fechaSeleccionada');
    
    if (deporteSpan3) deporteSpan3.textContent = deporteActual;
    if (localidadSpan2) localidadSpan2.textContent = localidadActual;
    if (fechaSpan) fechaSpan.textContent = fecha;
    
    mostrar('seccionCanchas');
    
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';
    
    try {
        const url = `${API_URL}/canchas/disponibles?deporte=${encodeURIComponent(deporteActual)}&localidad=${encodeURIComponent(localidadActual)}&fecha=${fecha}`;
        const response = await fetch(url);
        const canchas = await response.json();
        
        if (loading) loading.style.display = 'none';
        
        if (canchas.length === 0) {
            const noCanchas = document.getElementById('noCanchas');
            if (noCanchas) noCanchas.style.display = 'block';
        } else {
            mostrarCanchas(canchas, fecha);
        }
    } catch (error) {
        console.error('Error cargando canchas:', error);
        if (loading) loading.style.display = 'none';
        const noCanchas = document.getElementById('noCanchas');
        if (noCanchas) noCanchas.style.display = 'block';
    }
}

function mostrarCanchas(canchas, fecha) {
    const grid = document.getElementById('canchasGrid');
    if (grid) {
        grid.innerHTML = canchas.map(cancha => `
            <div class="cancha-card">
                <h4>${cancha.nombre}</h4>
                <div class="cancha-info">
                    <p>📍 ${cancha.localidad || localidadActual}</p>
                    <p>💰 $${cancha.precio || cancha.valor_por_hora || 0}</p>
                </div>
                <div class="horarios-disponibles">
                    <h5>Horarios disponibles:</h5>
                    <div class="horarios-grid">
                        ${generarHorarios().map(h => `
                            <button class="horario-btn" onclick="reservar(${cancha.id_cancha || cancha.id}, '${cancha.nombre}', ${cancha.precio || 0}, '${fecha}', '${h}')">
                                ${h}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function generarHorarios() {
    const horarios = [];
    for (let h = 9; h <= 21; h++) {
        horarios.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return horarios;
}

// RESERVAR
function reservar(canchaId, nombre, precio, fecha, horario) {
    const reserva = {
        usuarioId: usuarioActual.id,
        id_cancha: canchaId,
        deporte: deporteActual,
        localidad: localidadActual,
        fecha: fecha,
        hora_inicio: horario,
        precio_total: precio
    };
    
    sessionStorage.setItem('reserva', JSON.stringify(reserva));
    window.location.href = 'confirmar-reserva.html';
}

// UTILIDADES
function mostrar(id) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.style.display = 'block';
        elemento.scrollIntoView({ behavior: 'smooth' });
    }
}

function cambiarDeporte() {
    deporteActual = null;
    localidadActual = null;
    const seccionLocalidad = document.getElementById('seccionLocalidad');
    const seccionFecha = document.getElementById('seccionFecha');
    const seccionCanchas = document.getElementById('seccionCanchas');
    
    if (seccionLocalidad) seccionLocalidad.style.display = 'none';
    if (seccionFecha) seccionFecha.style.display = 'none';
    if (seccionCanchas) seccionCanchas.style.display = 'none';
}

function cambiarLocalidad() {
    localidadActual = null;
    const seccionFecha = document.getElementById('seccionFecha');
    const seccionCanchas = document.getElementById('seccionCanchas');
    
    if (seccionFecha) seccionFecha.style.display = 'none';
    if (seccionCanchas) seccionCanchas.style.display = 'none';
}

function cambiarFecha() {
    const seccionCanchas = document.getElementById('seccionCanchas');
    if (seccionCanchas) seccionCanchas.style.display = 'none';
}

function cerrarSesion() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'index.html';    
}