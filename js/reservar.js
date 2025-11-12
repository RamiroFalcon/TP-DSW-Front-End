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
        userName.textContent = `Bienvenido, ${usuarioActual.nombre} ${usuarioActual.apellido}`;
    }
}

// PASO 1: DEPORTES
async function cargarDeportes() {
    try {
        const response = await fetch(`${API_URL}/tipo-canchas`);
        const result = await response.json();
        
        console.log('Respuesta deportes:', result);
        
        // Manejar diferentes estructuras de respuesta
        const tipos = Array.isArray(result) ? result : (result.data || []);
        
        const grid = document.querySelector('.deportes-grid');
        if (grid) {
            if (tipos.length === 0) {
                grid.innerHTML = '<p>No hay deportes disponibles</p>';
                return;
            }
            
            grid.innerHTML = tipos.map(tipo => `
                <div class="deporte-card" onclick="seleccionarDeporte('${tipo.deporte}')">
                    <div class="deporte-icon">${getEmoji(tipo.deporte)}</div>
                    <h3>${tipo.deporte}</h3>
                    <p>Disponible</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error cargando deportes:', error);
    }
}

function getEmoji(deporte) {
    const deporteLower = deporte.toLowerCase();
    if (deporteLower.includes('fút')) return '⚽';
    if (deporteLower.includes('ten')) return '🎾';
    if (deporteLower.includes('hoc')) return '🏑';
    if (deporteLower.includes('pád')) return '🏓';
    if (deporteLower.includes('bás')) return '🏀';
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

// PASO 2: LOCALIDADES
async function cargarLocalidades() {
    try {
        const response = await fetch(`${API_URL}/localidades`);
        const result = await response.json();
        
        console.log('Respuesta localidades:', result);
        
        const localidades = Array.isArray(result) ? result : (result.data || []);
        
        const grid = document.querySelector('.localidades-grid');
        if (grid) {
            if (localidades.length === 0) {
                grid.innerHTML = '<p>No hay localidades disponibles</p>';
                return;
            }
            
            grid.innerHTML = localidades.map(loc => `
                <div class="localidad-card" onclick="seleccionarLocalidad('${loc.nombre}')">
                    <div class="localidad-icon">📍</div>
                    <h3>${loc.nombre}</h3>
                    <p>Canchas disponibles</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error cargando localidades:', error);
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

// PASO 3: BUSCAR CANCHAS - USAR POST EN LUGAR DE GET
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
    if (fechaSpan) fechaSpan.textContent = formatearFecha(fecha);
    
    mostrar('seccionCanchas');
    
    const loading = document.getElementById('loading');
    const noCanchas = document.getElementById('noCanchas');
    if (loading) loading.style.display = 'block';
    if (noCanchas) noCanchas.style.display = 'none';
    
    try {
        // CAMBIO: Usar POST con body en lugar de query params
        const response = await fetch(`${API_URL}/buscar-canchas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                deporte: deporteActual,
                localidad: localidadActual
            })
        });
        
        const result = await response.json();
        console.log('Respuesta búsqueda completa:', result);
        
        // Manejar diferentes estructuras de respuesta
        const canchas = Array.isArray(result) ? result : (result.data || result.canchas || []);
        
        console.log('Canchas procesadas:', canchas);
        
        if (loading) loading.style.display = 'none';
        
        if (!Array.isArray(canchas) || canchas.length === 0) {
            if (noCanchas) noCanchas.style.display = 'block';
        } else {
            await mostrarCanchasConDisponibilidad(canchas, fecha);
        }
    } catch (error) {
        console.error('Error buscando canchas:', error);
        if (loading) loading.style.display = 'none';
        if (noCanchas) noCanchas.style.display = 'block';
    }
}

// Mostrar canchas con disponibilidad
async function mostrarCanchasConDisponibilidad(canchas, fecha) {
    const grid = document.getElementById('canchasGrid');
    if (!grid) return;
    
    grid.innerHTML = '<p>Cargando horarios disponibles...</p>';
    
    const canchasConHorarios = await Promise.all(
        canchas.map(async (cancha) => {
            try {
                // Usar GET con query params para disponibilidad
                const url = `${API_URL}/disponibilidad?id_cancha=${cancha.id_cancha}&fecha=${fecha}`;
                console.log('Consultando disponibilidad:', url);
                
                const response = await fetch(url);
                const result = await response.json();
                
                console.log('Respuesta disponibilidad:', result);
                
                // Manejar diferentes estructuras
                let horariosDisponibles = [];
                if (Array.isArray(result)) {
                    horariosDisponibles = result;
                } else if (result.horariosDisponibles) {
                    horariosDisponibles = Array.isArray(result.horariosDisponibles) 
                        ? result.horariosDisponibles 
                        : [];
                } else if (result.data) {
                    horariosDisponibles = Array.isArray(result.data) ? result.data : [];
                } else {
                    horariosDisponibles = generarHorarios();
                }
                
                return {
                    ...cancha,
                    horariosDisponibles: horariosDisponibles
                };
            } catch (error) {
                console.error('Error obteniendo disponibilidad:', error);
                return {
                    ...cancha,
                    horariosDisponibles: generarHorarios()
                };
            }
        })
    );
    
    grid.innerHTML = canchasConHorarios.map(cancha => `
        <div class="cancha-card">
            <h4>${cancha.nombre}</h4>
            <div class="cancha-info">
                <p>📍 ${localidadActual}</p>
                <p>⚽ ${deporteActual}</p>
            </div>
            <div class="horarios-disponibles">
                <h5>Horarios disponibles:</h5>
                <div class="horarios-grid">
                    ${Array.isArray(cancha.horariosDisponibles) && cancha.horariosDisponibles.length > 0 ? 
                        cancha.horariosDisponibles.map(horario => `
                            <button class="horario-btn" onclick="reservar(${cancha.id_cancha}, '${cancha.nombre}', '${fecha}', '${horario}')">
                                ${horario}
                            </button>
                        `).join('') :
                        '<p style="color: #999;">No hay horarios disponibles</p>'
                    }
                </div>
            </div>
        </div>
    `).join('');
}

function generarHorarios() {
    const horarios = [];
    for (let h = 9; h <= 22; h++) {
        horarios.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return horarios;
}

// PASO 4: RESERVAR
async function reservar(canchaId, nombreCancha, fecha, horario) {
    const [hora, minuto] = horario.split(':').map(Number);
    const horaFin = `${(hora + 1).toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
    
    const reservaData = {
        id_usuario: usuarioActual.id_usuario || usuarioActual.id,
        id_cancha: canchaId,
        fecha: fecha,
        hora_inicio: horario,
        hora_fin: horaFin,
        estado: 'confirmada'
    };
    
    console.log('Enviando reserva:', reservaData);
    
    try {
        const response = await fetch(`${API_URL}/reservas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reservaData)
        });
        
        const result = await response.json();
        console.log('Respuesta reserva:', result);
        
        if (response.ok) {
            alert(`✅ ¡Reserva confirmada!\n\nCancha: ${nombreCancha}\nFecha: ${formatearFecha(fecha)}\nHorario: ${horario} - ${horaFin}`);
            buscarCanchas();
        } else {
            alert('❌ Error: ' + (result.message || 'No se pudo realizar la reserva'));
        }
    } catch (error) {
        console.error('Error al reservar:', error);
        alert('❌ Error de conexión');
    }
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
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

function formatearFecha(fecha) {
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', opciones);
}

function cerrarSesion() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'index.html';    
}