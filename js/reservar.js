    const API_BASE = 'http://localhost:3000';
    const API = {
      'localidades': API_BASE + '/api/localidades',
      'tipo-canchas': API_BASE + '/api/tipo-canchas',
      'canchas': API_BASE + '/api/canchas',
      'servicios': API_BASE + '/api/servicios',
      'precios': API_BASE + '/api/precios',
      'reservas': API_BASE + '/api/reservas',
      'buscar-canchas': API_BASE + '/api/buscar-canchas',
      'pagos': API_BASE + '/api/pagos'
    };

    // Estado de la aplicación
    let currentUser = null;
    let currentSection = 'mis-reservas';
    let dataCache = {};
    let reservaActual = {
      localidad: null,
      deporte: null,
      fecha: null,
      horario: null,
      cancha: null,
      servicios: [],
      precio_total: 0
    };
    let reservaSeleccionadaPago = null;
    let pagoActual = null;
    let currentStep = 1;

    // Inicialización
    document.addEventListener('DOMContentLoaded', function() {
      init();
    });

    function init() {
      console.log('Inicializando aplicación...');
      cargarUsuario();
      setupEventListeners();
      cargarSeccion('mis-reservas');
    }

    function cargarUsuario() {
      try {
        const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
        if (userData) {
          currentUser = JSON.parse(userData);
          document.getElementById('userName').textContent = `${currentUser.nombre} ${currentUser.apellido || ''}`;
          document.getElementById('userEmail').textContent = currentUser.email || currentUser.username || '';
          document.getElementById('userDisplayName').textContent = `${currentUser.nombre} ${currentUser.apellido || ''}`;
        } else {
          console.log('No se encontró usuario en localStorage/sessionStorage');
        }
      } catch (e) {
        console.error('Error cargando usuario:', e);
      }
    }

    function setupEventListeners() {
      // Menú lateral
      const menuItems = document.querySelectorAll('.menu li');
      menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
          menuItems.forEach(i => i.classList.remove('active'));
          e.currentTarget.classList.add('active');
          currentSection = e.currentTarget.dataset.entity;
          document.getElementById('mainTitle').textContent = getTitleFromSection(currentSection);
          cargarSeccion(currentSection);
        });
      });

      // Botón toggle sidebar
      document.getElementById('btnToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
      });
    }

    function getTitleFromSection(section) {
      const titles = {
        'mis-reservas': 'Mis Reservas',
        'nueva-reserva': 'Nueva Reserva',
        'canchas': 'Canchas Disponibles',
        'servicios': 'Servicios',
        'precios': 'Precios'
      };
      return titles[section] || section;
    }

    // CARGAR SECCIONES
    async function cargarSeccion(seccion) {
      const contentArea = document.getElementById('contentArea');
      contentArea.innerHTML = '<div class="muted">Cargando...</div>';

      try {
        switch(seccion) {
          case 'mis-reservas':
            await cargarMisReservas();
            break;
          case 'nueva-reserva':
            await cargarNuevaReserva();
            break;
          case 'canchas':
            await cargarCanchas();
            break;
          case 'servicios':
            await cargarServicios();
            break;
          case 'precios':
            await cargarPrecios();
            break;
        }
      } catch (error) {
        console.error(`Error cargando sección ${seccion}:`, error);
        contentArea.innerHTML = `<div class="table-empty">Error al cargar: ${error.message}</div>`;
      }
    }

    // MIS RESERVAS - CORREGIDO (sin columna deporte)
    async function cargarMisReservas() {
      if (!currentUser) {
        document.getElementById('contentArea').innerHTML = '<div class="table-empty">Debe iniciar sesión</div>';
        return;
      }

      try {
        const response = await fetch(API['reservas']);
        const result = await response.json();

        if (!result.success) throw new Error(result.message);

        const todasReservas = result.data || [];
        const misReservas = todasReservas.filter(r => r.id_usuario === currentUser.id_usuario);

        // Obtener información de pagos para cada reserva
        const reservasConPagos = await Promise.all(
          misReservas.map(async (reserva) => {
            try {
              const pagoResponse = await fetch(`${API['pagos']}/reserva/${reserva.id_reserva}`);
              const pagoResult = await pagoResponse.json();
              
              return {
                ...reserva,
                estado_pago: pagoResult.success && pagoResult.data ? pagoResult.data.estado : 'pendiente'
              };
            } catch (error) {
              return {
                ...reserva,
                estado_pago: 'pendiente'
              };
            }
          })
        );

        let html = `
                <table class="table">
                    <thead>
                    <tr>
                        <th>Cancha</th>
                        <th>Fecha</th>
                        <th>Horario</th>
                        <th>Duración</th>
                        <th>Servicios</th>
                        <th>Total</th>
                        <th>Estado Pago</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${reservasConPagos.map(reserva => `
                    <tr>
                        <td data-label="Cancha">${escapeHtml(reserva.cancha_nombre || `Cancha ${reserva.id_cancha}`)}</td>
                        <td data-label="Fecha">${escapeHtml(formatearFecha(reserva.fecha))}</td>
                        <td data-label="Horario">${escapeHtml(reserva.hora_inicio)} - ${escapeHtml(reserva.hora_fin)}</td>
                        <td data-label="Duración">${calcularDuracion(reserva.hora_inicio, reserva.hora_fin)}</td>
                        <td data-label="Servicios">${reserva.servicios && reserva.servicios.length > 0 ? 
                            (Array.isArray(reserva.servicios) ? 
                            reserva.servicios.map(s => typeof s === 'object' ? s.nombre : s).join(', ') : 
                            reserva.servicios) : '-'}</td>
                        <td data-label="Total">$${escapeHtml(reserva.precio_total)}</td>
                        <td data-label="Estado">
                            <span class="status-badge status-${reserva.estado_pago || 'pendiente'}">
                            ${reserva.estado_pago || 'pendiente'}
                            </span>
                        </td>
                        <td data-label="Acciones" class="actions">
                            ${reserva.estado_pago !== 'completado' ? `
                            <button title="Pagar" onclick="mostrarPago(${reserva.id_reserva})" class="btn success small">
                                <i class="fa fa-credit-card"></i>
                            </button>
                            <button title="Modificar" onclick="modificarReserva(${reserva.id_reserva})" class="btn warning small">
                                <i class="fa fa-edit"></i>
                            </button>
                            <button title="Cancelar" onclick="cancelarReserva(${reserva.id_reserva})" class="btn danger small">
                                <i class="fa fa-times"></i>
                            </button>
                            ` : `
                            <button title="Ver detalles" onclick="verReserva(${reserva.id_reserva})" class="btn small">
                                <i class="fa fa-eye"></i>
                            </button>
                            `}
                        </td>
                        </tr>
                    `).join('')}
                    </tbody>
                </table>
                `;

        document.getElementById('contentArea').innerHTML = html;
      } catch (error) {
        document.getElementById('contentArea').innerHTML = `<div class="table-empty">Error cargando reservas: ${error.message}</div>`;
      }
    }

    // NUEVA RESERVA - FLUJO PASO A PASO
    async function cargarNuevaReserva() {
      await Promise.all([
        fetchIfNeeded('localidades'),
        fetchIfNeeded('tipo-canchas'),
        fetchIfNeeded('servicios')
      ]);

      // Resetear estado de reserva
      reservaActual = {
        localidad: null,
        deporte: null,
        fecha: null,
        horario: null,
        cancha: null,
        servicios: [],
        precio_total: 0
      };
      currentStep = 1;

      mostrarPasoActual();
    }

    function mostrarPasoActual() {
      const contentArea = document.getElementById('contentArea');
      
      switch(currentStep) {
        case 1:
          mostrarPasoLocalidad();
          break;
        case 2:
          mostrarPasoDeporte();
          break;
        case 3:
          mostrarPasoFecha();
          break;
        case 4:
          mostrarPasoCanchas();
          break;
        case 5:
          mostrarPasoHorario();
          break;
        case 6:
          mostrarPasoServicios();
          break;
        case 7:
          mostrarResumenFinal();
          break;
      }
    }

    function mostrarPasoLocalidad() {
      const localidades = dataCache['localidades'] || [];
      
      const html = `
        <div class="reserva-flow">
          <div class="step">
            <div class="step-header">
              <div class="step-number">1</div>
              <h3 class="step-title">Paso 1: Seleccioná la Localidad</h3>
            </div>
            <div class="step-content">
              <p class="muted">Elegí en qué localidad querés jugar</p>
              <div class="options-grid" id="localidadesGrid">
                ${localidades.map((localidad, index) => `
                  <div class="option-card ${reservaActual.localidad?.id_localidad === localidad.id_localidad ? 'selected' : ''}" 
                       data-index="${index}">
                    <div class="option-icon">
                      <i class="fa fa-map-marker-alt"></i>
                    </div>
                    <div class="option-title">${escapeHtml(localidad.nombre)}</div>
                  </div>
                `).join('')}
              </div>
              <div class="navigation-buttons">
                <button class="btn" onclick="cargarSeccion('mis-reservas')">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('contentArea').innerHTML = html;
      
      // Agregar event listeners después de insertar el HTML
      setTimeout(() => {
        document.querySelectorAll('#localidadesGrid .option-card').forEach((card, index) => {
          card.addEventListener('click', () => {
            seleccionarLocalidad(localidades[index]);
          });
        });
      }, 0);
    }

    function mostrarPasoDeporte() {
      const tipos = dataCache['tipo-canchas'] || [];
      
      const html = `
        <div class="reserva-flow">
          <div class="step">
            <div class="step-header">
              <div class="step-number">2</div>
              <h3 class="step-title">Paso 2: Seleccioná el Deporte</h3>
            </div>
            <div class="step-content">
              <p class="muted"><strong>Localidad:</strong> ${escapeHtml(reservaActual.localidad?.nombre || '')}</p>
              <p class="muted">Elegí qué deporte querés practicar</p>
              <div class="options-grid" id="deportesGrid">
                ${tipos.map((tipo, index) => `
                  <div class="option-card ${reservaActual.deporte?.id_tipo === tipo.id_tipo ? 'selected' : ''}" 
                       data-index="${index}">
                    <div class="option-icon">
                      <i class="fa fa-futbol"></i>
                    </div>
                    <div class="option-title">${escapeHtml(tipo.nombre)}</div>
                    <div class="option-description">${escapeHtml(tipo.deporte || 'Varios deportes')}</div>
                  </div>
                `).join('')}
              </div>
              <div class="navigation-buttons">
                <button class="btn" onclick="anteriorPaso()"><i class="fa fa-arrow-left"></i> Anterior</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('contentArea').innerHTML = html;
      
      // Agregar event listeners
      setTimeout(() => {
        document.querySelectorAll('#deportesGrid .option-card').forEach((card, index) => {
          card.addEventListener('click', () => {
            seleccionarDeporte(tipos[index]);
          });
        });
      }, 0);
    }

    function mostrarPasoFecha() {
      const hoy = new Date().toISOString().split('T')[0];
      const maxFecha = new Date();
      maxFecha.setDate(maxFecha.getDate() + 30);
      const maxFechaStr = maxFecha.toISOString().split('T')[0];

      const html = `
        <div class="reserva-flow">
          <div class="step">
            <div class="step-header">
              <div class="step-number">3</div>
              <h3 class="step-title">Paso 3: Seleccioná la Fecha</h3>
            </div>
            <div class="step-content">
              <p class="muted"><strong>Localidad:</strong> ${escapeHtml(reservaActual.localidad?.nombre || '')}</p>
              <p class="muted"><strong>Deporte:</strong> ${escapeHtml(reservaActual.deporte?.deporte || reservaActual.deporte?.nombre || '')}</p>
              <br>
              <p class="muted">Elegí para qué día querés reservar</p>
              <input type="date" id="fechaReserva" 
                     value="${reservaActual.fecha || ''}" 
                     min="${hoy}" 
                     max="${maxFechaStr}"
                     style="padding: 12px; font-size: 16px; width: 100%; max-width: 300px;">
              <div class="navigation-buttons">
                <button class="btn" onclick="anteriorPaso()"><i class="fa fa-arrow-left"></i> Anterior</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('contentArea').innerHTML = html;
      
      // Agregar event listener para el cambio de fecha
      setTimeout(() => {
        const fechaInput = document.getElementById('fechaReserva');
        if (fechaInput) {
          fechaInput.addEventListener('change', (e) => {
            seleccionarFecha(e.target.value);
          });
        }
      }, 0);
    }

    async function mostrarPasoCanchas() {
      const html = `
        <div class="reserva-flow">
          <div class="step">
            <div class="step-header">
              <div class="step-number">4</div>
              <h3 class="step-title">Paso 4: Seleccioná la Cancha</h3>
            </div>
            <div class="step-content">
              <p class="muted"><strong>Localidad:</strong> ${escapeHtml(reservaActual.localidad?.nombre || '')}</p>
              <p class="muted"><strong>Deporte:</strong> ${escapeHtml(reservaActual.deporte?.deporte || reservaActual.deporte?.nombre || '')}</p>
              <p class="muted"><strong>Fecha:</strong> ${reservaActual.fecha || ''}</p>
              <br>
              <div id="canchasContainer">Cargando canchas disponibles...</div>
              <div class="navigation-buttons">
                <button class="btn" onclick="anteriorPaso()"><i class="fa fa-arrow-left"></i> Anterior</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('contentArea').innerHTML = html;
      await cargarCanchasParaSeleccionar();
    }

    async function cargarCanchasParaSeleccionar() {
      try {
        // Validar que tengamos todos los datos necesarios
        if (!reservaActual.fecha || !reservaActual.localidad || !reservaActual.deporte) {
          console.error('❌ Faltan datos:', {
            fecha: reservaActual.fecha,
            localidad: reservaActual.localidad,
            deporte: reservaActual.deporte
          });
          document.getElementById('canchasContainer').innerHTML = `
            <div class="table-empty">
              <p>Faltan datos para buscar canchas. Por favor volvé y completá todos los pasos.</p>
            </div>
          `;
          return;
        }

        // Preparar el body con nombres (no IDs) según el backend espera
        const body = {
          fecha: reservaActual.fecha,
          deporte: reservaActual.deporte.deporte || reservaActual.deporte.nombre,
          localidad: reservaActual.localidad.nombre
        };
        
        console.log('🔍 Buscando canchas con:', body);
        
        const response = await fetch(API['buscar-canchas'], {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📦 Respuesta buscar-canchas:', result);
        
        if (!result.success) {
          throw new Error(result.message || 'Error en la respuesta');
        }
        
        const canchas = result.data?.canchas || [];

        if (canchas.length === 0) {
          document.getElementById('canchasContainer').innerHTML = `
            <div class="table-empty">
              <p>No hay canchas disponibles para esta combinación</p>
            </div>
          `;
          return;
        }

        const canchasHTML = `
          <div class="canchas-grid" id="canchasGridSeleccion">
            ${canchas.map((cancha, index) => {
              const horariosDisponibles = cancha.horarios_disponibles?.filter(h => h.disponible === true).length || 0;
              return `
                <div class="cancha-card ${reservaActual.cancha?.id_cancha === cancha.id_cancha ? 'selected' : ''}"
                     data-index="${index}">
                  <h4>${escapeHtml(cancha.nombre)}</h4>
                  <p class="muted">${escapeHtml(cancha.localidad_nombre)} • ${escapeHtml(cancha.tipo_nombre)}</p>
                  <p><strong>Horario:</strong> ${cancha.hora_apertura?.substring(0,5) || '08:00'} - ${cancha.hora_cierre?.substring(0,5) || '22:00'}</p>
                  <p class="badge">${horariosDisponibles} horarios disponibles</p>
                </div>
              `;
            }).join('')}
          </div>
        `;

        document.getElementById('canchasContainer').innerHTML = canchasHTML;
        
        // Agregar event listeners
        setTimeout(() => {
          document.querySelectorAll('#canchasGridSeleccion .cancha-card').forEach((card, index) => {
            card.addEventListener('click', () => {
              seleccionarCancha(canchas[index]);
            });
          });
        }, 0);
      } catch (error) {
        console.error('❌ Error cargando canchas:', error);
        document.getElementById('canchasContainer').innerHTML = `
          <div class="table-empty">
            <p>Error: ${error.message}</p>
          </div>
        `;
      }
    }
    async function mostrarPasoHorario() {
      const html = `
        <div class="reserva-flow">
          <div class="step">
            <div class="step-header">
              <div class="step-number">5</div>
              <h3 class="step-title">Paso 5: Seleccioná el Horario</h3>
            </div>
            <div class="step-content">
              <p class="muted"><strong>Localidad:</strong> ${escapeHtml(reservaActual.localidad?.nombre || '')}</p>
              <p class="muted"><strong>Deporte:</strong> ${escapeHtml(reservaActual.deporte?.deporte || reservaActual.deporte?.nombre || '')}</p>
              <p class="muted"><strong>Fecha:</strong> ${reservaActual.fecha || ''}</p>
              <p class="muted"><strong>Cancha:</strong> ${escapeHtml(reservaActual.cancha?.nombre || '')}</p>
              <br>
              <div id="horariosContainer">Cargando horarios...</div>
              <div class="navigation-buttons">
                <button class="btn" onclick="anteriorPaso()"><i class="fa fa-arrow-left"></i> Anterior</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('contentArea').innerHTML = html;
      await cargarHorariosDisponibles();
    }

    async function cargarHorariosDisponibles() {
      try {
        if (!reservaActual.cancha || !reservaActual.fecha) {
          document.getElementById('horariosContainer').innerHTML = '<div class="table-empty"><p>Falta información de cancha o fecha</p></div>';
          return;
        }

        // La cancha ya tiene los horarios_disponibles desde el paso anterior
        const horarios = reservaActual.cancha.horarios_disponibles || [];
        
        // Filtrar solo los disponibles
        const horariosLibres = horarios.filter(h => h.disponible === true);

        if (horariosLibres.length === 0) {
          document.getElementById('horariosContainer').innerHTML = `
            <div class="table-empty">
              <p>No hay horarios disponibles para esta fecha en esta cancha</p>
            </div>
          `;
          return;
        }

        const horariosHTML = `
          <div class="horarios-grid" id="horariosGridSeleccion">
            ${horariosLibres.map((horario, index) => {
              const horaInicio = horario.hora_inicio.substring(0, 5);
              const horaFin = horario.hora_fin.substring(0, 5);
              return `
                <button class="horario-btn ${reservaActual.horario === horario.hora_inicio ? 'selected' : ''}" 
                        data-index="${index}" 
                        data-horario="${horario.hora_inicio}" 
                        data-fin="${horario.hora_fin}">
                  <div style="font-size: 18px; font-weight: 700;">${horaInicio}</div>
                  <div style="font-size: 14px; opacity: 0.7;">hasta</div>
                  <div style="font-size: 18px; font-weight: 700;">${horaFin}</div>
                  <span class="muted">1 hora</span>
                </button>
              `;
            }).join('')}
          </div>
        `;

        document.getElementById('horariosContainer').innerHTML = horariosHTML;
        
        // Agregar event listeners
        setTimeout(() => {
          document.querySelectorAll('#horariosGridSeleccion .horario-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              seleccionarHorario(btn.dataset.horario, btn.dataset.fin);
            });
          });
        }, 0);
      } catch (error) {
        console.error('❌ Error cargando horarios:', error);
        document.getElementById('horariosContainer').innerHTML = `
          <div class="table-empty">
            <p>Error: ${error.message}</p>
          </div>
        `;
      }
    }

    function mostrarPasoServicios() {
      const servicios = dataCache['servicios'] || [];

      const html = `
        <div class="reserva-flow">
          <div class="step">
            <div class="step-header">
              <div class="step-number">6</div>
              <h3 class="step-title">Servicios Adicionales</h3>
            </div>
            <div class="step-content">
              <p class="muted">Seleccioná servicios adicionales para tu reserva (opcional)</p>
              <div class="servicios-grid">
                ${servicios.map(servicio => {
                  const estaSeleccionado = reservaActual.servicios.some(s => s.id_servicio === servicio.id_servicio);
                  return `
                    <div class="servicio-card ${estaSeleccionado ? 'selected' : ''}" 
                         onclick="toggleServicio(${JSON.stringify(servicio).replace(/"/g, '&quot;')})">
                      <h4>${escapeHtml(servicio.nombre)}</h4>
                      <p class="price-total">$${servicio.precio_servicio || servicio.precio}</p>
                      <p class="muted">${servicio.descripcion || 'Servicio adicional'}</p>
                    </div>
                  `;
                }).join('')}
              </div>
              <div class="navigation-buttons">
                <button class="btn" onclick="anteriorPaso()"><i class="fa fa-arrow-left"></i> Anterior</button>
                <button class="btn primary" onclick="siguientePaso()">
                  Ver Resumen <i class="fa fa-arrow-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('contentArea').innerHTML = html;
    }

    async function mostrarResumenFinal() {
      // Calcular precio total
      await calcularPrecioFinal();

      const html = `
        <div class="reserva-flow">
          <div class="step">
            <div class="step-header">
              <div class="step-number">7</div>
              <h3 class="step-title">Confirmá tu Reserva</h3>
            </div>
            <div class="step-content">
              <div class="resumen-reserva">
                <h4>Detalles de la Reserva</h4>
                <div class="resumen-item">
                  <span>Localidad:</span>
                  <span>${reservaActual.localidad.nombre}</span>
                </div>
                <div class="resumen-item">
                  <span>Deporte:</span>
                  <span>${reservaActual.deporte.nombre}</span>
                </div>
                <div class="resumen-item">
                  <span>Fecha:</span>
                  <span>${formatearFecha(reservaActual.fecha)}</span>
                </div>
                <div class="resumen-item">
                  <span>Horario:</span>
                  <span>${reservaActual.horario.substring(0, 5)}</span>
                </div>
                <div class="resumen-item">
                  <span>Cancha:</span>
                  <span>${reservaActual.cancha.nombre}</span>
                </div>
                <div class="resumen-item">
                  <span>Servicios:</span>
                  <span>${reservaActual.servicios.length > 0 ? 
                    reservaActual.servicios.map(s => s.nombre).join(', ') : 'Ninguno'}</span>
                </div>
                <div class="resumen-item resumen-total">
                  <span>Total:</span>
                  <span>$${reservaActual.precio_total}</span>
                </div>
              </div>

              <div class="alerta-24h">
                <i class="fa fa-exclamation-triangle"></i>
                <strong>Importante:</strong> Si pasadas las 24 horas la reserva no se abona, la reserva se dará como cancelada automáticamente.
              </div>

              <div class="navigation-buttons">
                <button class="btn" onclick="anteriorPaso()"><i class="fa fa-arrow-left"></i> Anterior</button>
                <div style="display: flex; gap: 10px;">
                  <button class="btn warning" onclick="finalizarReserva(false)">
                    <i class="fa fa-clock"></i> Pagar Después
                  </button>
                  <button class="btn success" onclick="finalizarReserva(true)">
                    <i class="fa fa-credit-card"></i> Pagar Ahora
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('contentArea').innerHTML = html;
    }

    // FUNCIONES DE SELECCIÓN
    function seleccionarLocalidad(localidad) {
      // Normalizar el objeto para que siempre tenga id_localidad
      reservaActual.localidad = {
        id_localidad: localidad.id || localidad.id_localidad,
        id: localidad.id || localidad.id_localidad,
        nombre: localidad.nombre
      };
      console.log('✅ Localidad seleccionada:', reservaActual.localidad);
      siguientePaso();
    }

    function seleccionarDeporte(deporte) {
      reservaActual.deporte = deporte;
      console.log('✅ Deporte seleccionado:', deporte);
      siguientePaso();
    }

    function seleccionarFecha(fecha) {
      if (!fecha) {
        console.warn('⚠️ No se seleccionó fecha');
        return;
      }
      reservaActual.fecha = fecha;
      console.log('✅ Fecha seleccionada:', fecha);
      siguientePaso();
    }

    function seleccionarHorario(horario, horaFin) {
      reservaActual.horario = horario;
      reservaActual.hora_fin = horaFin;
      console.log('✅ Horario seleccionado:', horario, '-', horaFin);
      siguientePaso();
    }

    function seleccionarCancha(cancha) {
      reservaActual.cancha = cancha;
      console.log('✅ Cancha seleccionada:', cancha);
      siguientePaso();
    }

    function toggleServicio(servicio) {
      const index = reservaActual.servicios.findIndex(s => s.id_servicio === servicio.id_servicio);
      if (index > -1) {
        reservaActual.servicios.splice(index, 1);
      } else {
        reservaActual.servicios.push(servicio);
      }
      mostrarPasoActual();
    }

    // NAVEGACIÓN
    function siguientePaso() {
      if (currentStep < 7) {
        currentStep++;
        mostrarPasoActual();
      }
    }

    function anteriorPaso() {
      if (currentStep > 1) {
        currentStep--;
        mostrarPasoActual();
      }
    }

    // Funciones para manejar el sidebar en móvil
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// Actualizar setupEventListeners para incluir el cierre automático en móvil
function setupEventListeners() {
  // Menú lateral
  const menuItems = document.querySelectorAll('.menu li');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      menuItems.forEach(i => i.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentSection = e.currentTarget.dataset.entity;
      document.getElementById('mainTitle').textContent = getTitleFromSection(currentSection);
      cargarSeccion(currentSection);
      
      // Cerrar sidebar en móvil después de seleccionar
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });

  // Botón toggle sidebar
  document.getElementById('btnToggle').addEventListener('click', () => {
    closeSidebar();
  });
}

    // FUNCIONES AUXILIARES
    async function fetchIfNeeded(entity) {
      if (!dataCache[entity] || !Array.isArray(dataCache[entity]) || dataCache[entity].length === 0) {
        try {
          const response = await fetch(API[entity]);
          const result = await response.json();
          dataCache[entity] = Array.isArray(result) ? result : (result.data || []);
        } catch (error) {
          console.error(`Error cargando ${entity}:`, error);
          dataCache[entity] = [];
        }
      }
    }

    function calcularHoraFin(hora_inicio, horas = 1) {
      const [horasStr, minutosStr] = hora_inicio.split(':');
      let horasNum = parseInt(horasStr) + horas;
      return `${horasNum.toString().padStart(2, '0')}:${minutosStr}:00`;
    }

    function calcularDuracion(hora_inicio, hora_fin) {
      const inicio = new Date(`2000-01-01T${hora_inicio}`);
      const fin = new Date(`2000-01-01T${hora_fin}`);
      const diffMs = fin.getTime() - inicio.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);
      return `${diffHoras} hora${diffHoras !== 1 ? 's' : ''}`;
    }

    function formatearFecha(fecha) {
      try {
        let fechaObj;
        if (fecha.includes('T')) {
          fechaObj = new Date(fecha);
        } else {
          fechaObj = new Date(fecha + 'T00:00:00');
        }
        
        if (isNaN(fechaObj.getTime())) {
          return 'Fecha inválida';
        }
        
        return fechaObj.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch (e) {
        return 'Fecha inválida';
      }
    }

    function escapeHtml(str) {
      if (str === undefined || str === null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function openModal(modalId) {
      document.getElementById(modalId).classList.remove('hidden');
    }

    function closeModal(modalId) {
      document.getElementById(modalId).classList.add('hidden');
    }

    function showToast(msg, time = 3000) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), time);
    }

    function cerrarSesion() {
      if (confirm('¿Estás seguro de que querés cerrar sesión?')) {
        localStorage.removeItem('userData');
        sessionStorage.removeItem('userData');
        window.location.href = 'index.html';
      }
    }

    // Funciones placeholder para acciones futuras
    function modificarReserva(id) {
      showToast('Funcionalidad de modificación en desarrollo');
    }

    function cancelarReserva(id) {
      if (confirm('¿Estás seguro de que querés cancelar esta reserva?')) {
        showToast('Funcionalidad de cancelación en desarrollo');
      }
    }

    function verReserva(id) {
      showToast('Funcionalidad de visualización en desarrollo');
    }

    // Cálculo de precio final
    async function calcularPrecioFinal() {
      try {
        const hora_fin = calcularHoraFin(reservaActual.horario, 1);
        const id_servicios = reservaActual.servicios.map(s => s.id_servicio);

        const response = await fetch(API['reservas'] + '/calcular-precio', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            id_cancha: reservaActual.cancha.id_cancha,
            fecha: reservaActual.fecha,
            hora_inicio: reservaActual.horario,
            hora_fin: hora_fin,
            id_servicios: id_servicios
          })
        });

        const result = await response.json();
        
        if (result.success) {
          reservaActual.precio_total = result.data.precio_total;
        }
      } catch (error) {
        console.error('Error calculando precio:', error);
        // Precio por defecto si falla el cálculo
        reservaActual.precio_total = 5000;
      }
    }

    // Finalizar reserva
    async function finalizarReserva(pagarAhora = false) {
      if (!currentUser) {
        showToast('Debe iniciar sesión para hacer una reserva');
        return;
      }

      try {
        const hora_fin = reservaActual.hora_fin || calcularHoraFin(reservaActual.horario, 1);
        const id_servicios = reservaActual.servicios.map(s => s.id_servicio);

        const reservaData = {
          id_usuario: currentUser.id_usuario,
          id_cancha: reservaActual.cancha.id_cancha,
          fecha: reservaActual.fecha,
          hora_inicio: reservaActual.horario,
          hora_fin: hora_fin,
          precio_total: reservaActual.precio_total,
          id_servicios: id_servicios
        };

        console.log('📤 Enviando reserva:', reservaData);

        const response = await fetch(API['reservas'], {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(reservaData)
        });

        const result = await response.json();

        if (result.success) {
          // Crear pago automáticamente
          await crearPago(result.data.id_reserva, reservaActual.precio_total);
          
          if (pagarAhora) {
            // Mostrar modal de pago inmediatamente
            mostrarPago(result.data.id_reserva);
          } else {
            showToast('Reserva creada exitosamente. Tienes 24 horas para realizar el pago.');
            cargarSeccion('mis-reservas');
          }
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        showToast('Error creando reserva: ' + error.message);
      }
    }

    async function crearPago(id_reserva, monto) {
      try {
        const response = await fetch(API['pagos'], {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            id_reserva: id_reserva,
            monto: monto,
            metodo_pago: 'tarjeta'
          })
        });

        const result = await response.json();
        if (result.success) {
          pagoActual = result.data;
          return result.data;
        }
      } catch (error) {
        console.error('Error creando pago:', error);
      }
    }

    // Las funciones de otras secciones (canchas, servicios, precios) se mantienen igual
    async function cargarCanchas() {
      await fetchIfNeeded('canchas');
      const canchas = dataCache['canchas'] || [];

      const html = `
        <div class="table-controls">
          <div>
            <span class="badge">Canchas</span>
            <small>${canchas.length} canchas disponibles</small>
          </div>
        </div>
        <div class="canchas-grid">
          ${canchas.map(cancha => `
            <div class="cancha-card ${cancha.estado === 'disponible' ? 'disponible' : 'ocupada'}">
              <h4>${escapeHtml(cancha.nombre)}</h4>
              <p class="muted">${cancha.localidad_nombre || 'Sin localidad'} • ${cancha.tipo_nombre || 'Sin tipo'}</p>
              <p>Estado: <span class="status-badge status-${cancha.estado || 'desconocido'}">${cancha.estado || 'desconocido'}</span></p>
            </div>
          `).join('')}
        </div>
      `;

      document.getElementById('contentArea').innerHTML = html;
    }

    async function cargarServicios() {
      await fetchIfNeeded('servicios');
      const servicios = dataCache['servicios'] || [];

      const html = `
        <div class="table-controls">
          <div>
            <span class="badge">Servicios</span>
            <small>${servicios.length} servicios disponibles</small>
          </div>
        </div>
        <div class="canchas-grid">
          ${servicios.map(servicio => `
            <div class="cancha-card">
              <h4>${escapeHtml(servicio.nombre)}</h4>
              <p class="price-total">$${servicio.precio_servicio || servicio.precio}</p>
              <p class="muted">Servicio adicional para tu reserva</p>
            </div>
          `).join('')}
        </div>
      `;

      document.getElementById('contentArea').innerHTML = html;
    }

    async function cargarPrecios() {
      await fetchIfNeeded('precios');
      await fetchIfNeeded('canchas');
      
      const precios = dataCache['precios'] || [];
      const canchasMap = new Map((dataCache['canchas'] || []).map(c => [c.id_cancha, c]));

      const html = `
        <div class="table-controls">
          <div>
            <span class="badge">Precios</span>
            <small>${precios.length} precios configurados</small>
          </div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Cancha</th>
              <th>Valor por Hora</th>
              <th>Fecha de Vigencia</th>
            </tr>
          </thead>
          <tbody>
            ${precios.map(precio => {
              const cancha = canchasMap.get(precio.id_cancha);
              return `
                <tr>
                  <td>${cancha ? escapeHtml(cancha.nombre) : `Cancha ${precio.id_cancha}`}</td>
                  <td>$${escapeHtml(precio.valor_por_hora)}</td>
                  <td>${precio.fecha_vigencia ? formatearFecha(precio.fecha_vigencia) : 'Vigente'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      document.getElementById('contentArea').innerHTML = html;
    }
