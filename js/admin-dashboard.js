    /***********************
     * Config inicial
     ***********************/
    const API_BASE = 'http://localhost:3000';
    const API = {
      'localidades': API_BASE + '/api/localidades',
      'tipo-canchas': API_BASE + '/api/tipo-canchas',
      'canchas': API_BASE + '/api/canchas',
      'precios': API_BASE + '/api/precios',
      'servicios': API_BASE + '/api/servicios',
      'usuarios': API_BASE + '/api/usuarios',
      'reservas': API_BASE + '/api/reservas',
      'reserva-servicio': API_BASE + '/reserva-servicio',
      // Nuevos endpoints (los vamos a crear con filtros en el frontend)
      'canchas-por-tipo': API_BASE + '/api/canchas',
      'reservas-por-fecha': API_BASE + '/api/reservas'
    };

    // id field mapping (para identificar registros)
    const idField = {
      'localidades': 'id_localidad',
      'tipo-canchas': 'id_tipo',
      'canchas': 'id_cancha',
      'precios': 'id_precio',
      'servicios': 'id_servicio',
      'usuarios': 'id_usuario',
      'reservas': 'id_reserva'
    };

    // estado/campo defaults
    const estadoOptions = ['disponible','ocupada','mantenimiento'];

    let currentEntity = 'localidades';
    let dataCache = {};
    let currentPage = 1, pageSize = 12;

    // Variables para los filtros
    let filtroTipoCancha = '';
    let filtroFechaInicio = '';
    let filtroFechaFin = '';

    // DOM refs
    const menuItems = document.querySelectorAll('.menu li');
    const mainTitle = document.getElementById('mainTitle');
    const tableWrap = document.getElementById('tableWrap');
    const btnAddNew = document.getElementById('btnAddNew');
    const searchInput = document.getElementById('searchInput');
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const modalSave = document.getElementById('modalSave');
    const modalCancel = document.getElementById('modalCancel');
    const closeModalBtn = document.getElementById('closeModal');
    const toast = document.getElementById('toast');
    const sidebar = document.getElementById('sidebar');
    const btnToggle = document.getElementById('btnToggle');
    const menuToggle = document.getElementById('menuToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const adminName = document.getElementById('adminName');
    const paginationDiv = document.getElementById('pagination');

    // init
    window.addEventListener('load', init);
    btnAddNew.addEventListener('click', () => openModal('create'));
    searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
    modalCancel.addEventListener('click', closeModal);
    closeModalBtn.addEventListener('click', closeModal);
    modalSave.addEventListener('click', onModalSave);
    
    // Toggle sidebar desde botón X interno
    btnToggle.addEventListener('click', ()=> {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
    });
    
    // Toggle sidebar desde botón hamburguesa
    menuToggle.addEventListener('click', ()=> {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('show');
    });
    
    // Cerrar sidebar al hacer click en overlay
    sidebarOverlay.addEventListener('click', ()=> {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
    });

    menuItems.forEach(item => item.addEventListener('click', (e) => {
      menuItems.forEach(i => i.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentEntity = e.currentTarget.dataset.entity;
      currentPage = 1;
      mainTitle.textContent = titleFromEntity(currentEntity);
      
      // Manejar los nuevos items especiales
      if (currentEntity === 'canchas-por-tipo') {
        // Precargar datos necesarios
        Promise.all([
          fetchIfNeeded('canchas'),
          fetchIfNeeded('tipo-canchas')
        ]).then(() => {
          mostrarFiltroCanchasPorTipo();
        });
      } else if (currentEntity === 'reservas-por-fecha') {
        // Precargar datos necesarios
        Promise.all([
          fetchIfNeeded('reservas'),
          fetchIfNeeded('usuarios'),
          fetchIfNeeded('canchas')
        ]).then(() => {
          mostrarFiltroReservasPorFecha();
        });
      } else {
        // Entidades normales
        loadEntity(currentEntity);
      }
    }));

    function titleFromEntity(entity){
      switch(entity){
        case 'localidades': return 'Localidades';
        case 'tipo-canchas': return 'Tipos de Cancha';
        case 'canchas': return 'Canchas';
        case 'precios': return 'Precios';
        case 'servicios': return 'Servicios';
        case 'usuarios': return 'Usuarios';
        case 'reservas': return 'Reservas';
        // NUEVOS TÍTULOS
        case 'canchas-por-tipo': return 'Canchas Filtradas por Tipo';
        case 'reservas-por-fecha': return 'Reservas Filtradas por Fecha';
        default: return entity;
      }
    }

    function init(){
      verificarAdmin();
      // precargar algunas lists (to populate selects)
      loadEntity(currentEntity);
      // prefetch other small lists so selects are ready
      fetchIfNeeded('localidades');
      fetchIfNeeded('tipo-canchas');
      fetchIfNeeded('canchas');
    }

    function verificarAdmin(){
      try{
        const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
        if(!userData){ adminName.textContent = 'Admin'; return; }
        const usuario = JSON.parse(userData);
        adminName.textContent = `${usuario.nombre || usuario.firstName || ''} ${usuario.apellido || usuario.lastName || ''}`.trim();
      }catch(e){ adminName.textContent = 'Admin'; }
    }

    function cerrarSesion() {
      if(confirm('¿Estás seguro de que querés cerrar sesión?')) {
        localStorage.removeItem('userData');
        sessionStorage.removeItem('userData');
        window.location.href = 'index.html';
      }
    }

    /***********************
     * Fetch helpers
     ***********************/
    async function fetchIfNeeded(entity){
      if(!dataCache[entity] || !Array.isArray(dataCache[entity]) || dataCache[entity].length===0){
        await loadEntity(entity);
      }
    }

    async function loadEntity(entity){
      showLoading();
      try {
        console.log(`🔄 Cargando entidad: ${entity} desde ${API[entity]}`);
        const res = await fetch(API[entity]);
        
        if(!res.ok) {
          const errorText = await res.text();
          console.error(`❌ Error HTTP ${res.status} cargando ${entity}:`, errorText);
          throw new Error(`Error ${res.status} cargando ${entity}: ${errorText}`);
        }
        
        const json = await res.json();
        console.log(`✅ Datos cargados para ${entity}:`, json);
        
        // Manejar diferentes formatos de respuesta
        if (Array.isArray(json)) {
          dataCache[entity] = json;
        } else if (json.data) {
          dataCache[entity] = json.data;
        } else if (json.success && json.data) {
          dataCache[entity] = json.data;
        } else {
          dataCache[entity] = [];
        }
        
        console.log(`📊 ${entity} cargados:`, dataCache[entity].length, 'registros');
        renderTable();
      } catch(err){
        console.error(`❌ Error cargando ${entity}:`, err);
        showToast('Error al cargar ' + entity + ': ' + err.message);
        tableWrap.innerHTML = `<div class="table-empty">No se pudieron cargar los datos: ${err.message}</div>`;
      } finally {
        hideLoading();
      }
    }

    // generic delete (assume DELETE /api/entity/:id)
    async function deleteEntity(entity, id){
      const idKey = idField[entity];
      if(!confirm('Seguro querés eliminar este registro?')) return;
      try{
        const path = (entity === 'reserva-servicio') ? API['reserva-servicio'] : (API[entity] + '/' + id);
        const options = { method: 'DELETE' };
        // reserva-servicio deletion needs body {id_reserva, id_servicio}
        if(entity === 'reserva-servicio' && typeof id === 'object'){
          options.headers = {'Content-Type':'application/json'};
          options.body = JSON.stringify(id);
        }
        const res = await fetch(path, options);
        if(!res.ok) throw new Error('Error al eliminar');
        showToast('Eliminado correctamente');
        // recargar lista del entity relacionado
        if(entity === 'reserva-servicio'){
          loadEntity('reservas'); // refrescar reservas
        } else {
          loadEntity(entity);
        }
      }catch(err){
        console.error(err);
        showToast('Error al eliminar, ver consola');
      }
    }

    /***********************
     * Nuevas funciones de filtrado
     ***********************/

    // Función para mostrar el modal de filtro de canchas por tipo
    function mostrarFiltroCanchasPorTipo() {
      modalTitle.textContent = 'Filtrar Canchas por Tipo';
      const tipos = dataCache['tipo-canchas'] || [];
      
      modalBody.innerHTML = `
        <label>Seleccionar Tipo de Cancha</label>
        <select id="filtroTipoCancha">
          <option value="">-- Todos los tipos --</option>
          ${tipos.map(tipo => 
            `<option value="${tipo.id_tipo || tipo.id}">${escapeHtml(tipo.nombre)} - ${escapeHtml(tipo.deporte || '')}</option>`
          ).join('')}
        </select>
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
          <small>Se mostrarán las canchas filtradas por el tipo seleccionado</small>
        </div>
      `;
      
      modalSave.textContent = 'Aplicar Filtro';
      modal.classList.remove('hidden');
      
      // Guardar referencia temporal de las funciones
      modalSave.onclick = function() {
        aplicarFiltroCanchasPorTipo();
      };
    }

    // Función para aplicar el filtro de canchas por tipo
    function aplicarFiltroCanchasPorTipo() {
      const select = document.getElementById('filtroTipoCancha');
      filtroTipoCancha = select ? select.value : '';
      closeModal();
      renderCanchasFiltradasPorTipo();
    }

    // Función para renderizar canchas filtradas por tipo
    function renderCanchasFiltradasPorTipo() {
      const todasCanchas = dataCache['canchas'] || [];
      const tipos = dataCache['tipo-canchas'] || [];
      
      let canchasFiltradas = todasCanchas;
      
      if (filtroTipoCancha) {
        canchasFiltradas = todasCanchas.filter(cancha => 
          String(cancha.id_tipo) === String(filtroTipoCancha)
        );
      }
      
      const tipoSeleccionado = tipos.find(t => String(t.id_tipo || t.id) === String(filtroTipoCancha));
      const tituloTipo = tipoSeleccionado ? ` - ${tipoSeleccionado.nombre}` : ' - Todos los tipos';
      
      let html = `
        <div class="table-controls">
          <div>
            <span class="badge">Canchas por Tipo</span> 
            &nbsp; 
            <small>${canchasFiltradas.length} canchas${tituloTipo}</small>
            &nbsp;
            <button onclick="mostrarFiltroCanchasPorTipo()" class="btn primary small">
              <i class="fa fa-filter"></i> Cambiar Filtro
            </button>
          </div>
          <div></div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Tipo de Cancha</th>
              <th>Deporte</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${canchasFiltradas.map(cancha => {
              const tipo = tipos.find(t => String(t.id_tipo || t.id) === String(cancha.id_tipo));
              return `
                <tr>
                  <td>${escapeHtml(cancha.id_cancha || cancha.id)}</td>
                  <td>${escapeHtml(cancha.nombre)}</td>
                  <td>${escapeHtml(tipo ? tipo.nombre : 'N/A')}</td>
                  <td>${escapeHtml(tipo ? tipo.deporte : 'N/A')}</td>
                  <td>
                    <span style="
                      padding: 4px 8px; 
                      border-radius: 12px; 
                      font-size: 12px;
                      background: ${cancha.estado === 'disponible' ? '#d4edda' : cancha.estado === 'ocupada' ? '#f8d7da' : '#fff3cd'};
                      color: ${cancha.estado === 'disponible' ? '#155724' : cancha.estado === 'ocupada' ? '#721c24' : '#856404'};
                    ">
                      ${escapeHtml(cancha.estado || 'desconocido')}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
      
      if (canchasFiltradas.length === 0) {
        html = `
          <div class="table-empty">
            <p>No se encontraron canchas con el filtro aplicado</p>
            <button onclick="mostrarFiltroCanchasPorTipo()" class="btn primary">Cambiar Filtro</button>
          </div>
        `;
      }
      
      tableWrap.innerHTML = html;
      paginationDiv.innerHTML = ''; // No paginación para filtros
    }

    // Función para mostrar el modal de filtro de reservas por fecha
    function mostrarFiltroReservasPorFecha() {
      modalTitle.textContent = 'Filtrar Reservas por Fecha';
      const hoy = new Date().toISOString().split('T')[0];
      
      modalBody.innerHTML = `
        <label>Fecha de Inicio</label>
        <input type="date" id="filtroFechaInicio" value="${hoy}" />
        
        <label>Fecha de Fin</label>
        <input type="date" id="filtroFechaFin" value="${hoy}" />
        
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
          <small>Se mostrarán las reservas dentro del rango de fechas seleccionado</small>
        </div>
      `;
      
      modalSave.textContent = 'Aplicar Filtro';
      modal.classList.remove('hidden');
      
      // Guardar referencia temporal de las funciones
      modalSave.onclick = function() {
        aplicarFiltroReservasPorFecha();
      };
    }

    // Función para aplicar el filtro de reservas por fecha
    function aplicarFiltroReservasPorFecha() {
      const inputInicio = document.getElementById('filtroFechaInicio');
      const inputFin = document.getElementById('filtroFechaFin');
      
      filtroFechaInicio = inputInicio ? inputInicio.value : '';
      filtroFechaFin = inputFin ? inputFin.value : '';
      
      closeModal();
      renderReservasFiltradasPorFecha();
    }

    // Función para renderizar reservas filtradas por fecha
    function renderReservasFiltradasPorFecha() {
      const todasReservas = dataCache['reservas'] || [];
      const usuarios = dataCache['usuarios'] || [];
      const canchas = dataCache['canchas'] || [];
      
      let reservasFiltradas = todasReservas;
      
      if (filtroFechaInicio && filtroFechaFin) {
        reservasFiltradas = todasReservas.filter(reserva => {
          const fechaReserva = reserva.fecha;
          return fechaReserva >= filtroFechaInicio && fechaReserva <= filtroFechaFin;
        });
      }
      
      // Ordenar por fecha y hora
      reservasFiltradas.sort((a, b) => {
        const fechaA = new Date(a.fecha + 'T' + a.hora_inicio);
        const fechaB = new Date(b.fecha + 'T' + b.hora_inicio);
        return fechaA - fechaB;
      });
      
      let html = `
        <div class="table-controls">
          <div>
            <span class="badge">Reservas por Fecha</span> 
            &nbsp; 
            <small>${reservasFiltradas.length} reservas</small>
            ${filtroFechaInicio && filtroFechaFin ? 
              `<small>(${filtroFechaInicio} al ${filtroFechaFin})</small>` : ''}
            &nbsp;
            <button onclick="mostrarFiltroReservasPorFecha()" class="btn primary small">
              <i class="fa fa-filter"></i> Cambiar Filtro
            </button>
          </div>
          <div></div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th># Cancha</th>
              <th>Nombre Cancha</th>
              <th>Fecha</th>
              <th>Hora Inicio</th>
              <th>Hora Fin</th>
              <th>Cliente</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${reservasFiltradas.map(reserva => {
              const cancha = canchas.find(c => String(c.id_cancha || c.id) === String(reserva.id_cancha));
              const usuario = usuarios.find(u => String(u.id_usuario || u.id) === String(reserva.id_usuario));
              const nombreCliente = usuario ? `${usuario.nombre} ${usuario.apellido || ''}` : 'N/A';
              const nombreCancha = cancha ? cancha.nombre : `Cancha ${reserva.id_cancha}`;
              
              return `
                <tr>
                  <td>${escapeHtml(reserva.id_cancha)}</td>
                  <td>${escapeHtml(nombreCancha)}</td>
                  <td>${escapeHtml(reserva.fecha)}</td>
                  <td>${escapeHtml(reserva.hora_inicio)}</td>
                  <td>${escapeHtml(reserva.hora_fin)}</td>
                  <td>${escapeHtml(nombreCliente)}</td>
                  <td>$ ${escapeHtml(reserva.precio_total || 0)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
      
      if (reservasFiltradas.length === 0) {
        html = `
          <div class="table-empty">
            <p>No se encontraron reservas en el rango de fechas seleccionado</p>
            <button onclick="mostrarFiltroReservasPorFecha()" class="btn primary">Cambiar Filtro</button>
          </div>
        `;
      }
      
      tableWrap.innerHTML = html;
      paginationDiv.innerHTML = ''; // No paginación para filtros
    }

    /***********************
     * Render tabla principal
     ***********************/
    function renderTable(){
      const items = (dataCache[currentEntity] || []).slice();
      const q = (searchInput.value || '').trim().toLowerCase();
      const filtered = items.filter(i => {
        return Object.values(i || {}).some(v => String(v || '').toLowerCase().includes(q));
      });

      const total = filtered.length;
      const start = (currentPage - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);

      let html = `
        <div class="table-controls">
          <div><span class="badge">${titleFromEntity(currentEntity)}</span> &nbsp; <small>${total} registros</small></div>
          <div></div>
        </div>
        <table class="table">
          ${renderTableHead(currentEntity)}
          <tbody>
            ${pageItems.map(item => renderRow(currentEntity, item)).join('')}
          </tbody>
        </table>
      `;
      if(total===0) html = `<div class="table-empty">No hay registros</div>`;
      tableWrap.innerHTML = html;
      renderPagination(Math.ceil(total / pageSize));
    }

    function renderTableHead(entity){
      switch(entity){
        case 'localidades':
          return `<thead><tr><th>#</th><th>Nombre</th><th>Acción</th></tr></thead>`;
        case 'tipo-canchas':
          return `<thead><tr><th>#</th><th>Nombre</th><th>Deporte</th><th>Acción</th></tr></thead>`;
        case 'canchas':
          return `<thead><tr><th>#</th><th>Nombre</th><th>Localidad</th><th>Tipo</th><th>Estado</th><th>Acción</th></tr></thead>`;
        case 'precios':
          return `<thead><tr><th>#</th><th>Cancha</th><th>Valor / hora</th><th>Fecha vigencia</th><th>Acción</th></tr></thead>`;
        case 'servicios':
          return `<thead><tr><th>#</th><th>Nombre</th><th>Precio</th><th>Acción</th></tr></thead>`;
        case 'usuarios':
          return `<thead><tr><th>#</th><th>Nombre</th><th>DNI</th><th>Localidad</th><th>Rol</th><th>Usuario</th><th>Acción</th></tr></thead>`;
        case 'reservas':
          return `<thead><tr><th>#</th><th>Usuario</th><th>Cancha</th><th>Fecha</th><th>Inicio</th><th>Fin</th><th>Total</th><th>Servicios</th><th>Acción</th></tr></thead>`;
        default:
          return `<thead><tr><th>#</th><th>Datos</th><th>Acción</th></tr></thead>`;
      }
    }

    function renderRow(entity, item){
      const id = item[idField[entity]] ?? item.id ?? '';
      if(entity==='localidades'){
        return `<tr>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(item.nombre)}</td>
          <td class="actions">
            <button title="Editar" onclick="openModal('edit', '${id}')"><i class="fa fa-pen"></i></button>
            <button title="Eliminar" onclick="deleteEntity('localidades','${id}')"><i class="fa fa-trash" style="color:var(--danger)"></i></button>
          </td>
        </tr>`;
      }
      if(entity==='tipo-canchas'){
        return `<tr>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(item.nombre)}</td>
          <td>${escapeHtml(item.deporte || '')}</td>
          <td class="actions">
            <button title="Editar" onclick="openModal('edit','${id}')"><i class="fa fa-pen"></i></button>
            <button title="Eliminar" onclick="deleteEntity('tipo-canchas','${id}')"><i class="fa fa-trash" style="color:var(--danger)"></i></button>
          </td>
        </tr>`;
      }
      if(entity==='canchas'){
        // Buscar nombres en los caches
        let locNombre = item.localidad_nombre || item.nombre_localidad || '';
        let tipoNombre = item.tipo_nombre || item.nombre_tipo || '';
        
        if (!locNombre && dataCache['localidades']) {
          const localidad = dataCache['localidades'].find(l => l.id_localidad == item.id_localidad);
          locNombre = localidad ? localidad.nombre : `ID: ${item.id_localidad}`;
        }
        
        if (!tipoNombre && dataCache['tipo-canchas']) {
          const tipo = dataCache['tipo-canchas'].find(t => t.id_tipo == item.id_tipo);
          tipoNombre = tipo ? tipo.nombre : `ID: ${item.id_tipo}`;
        }
        
        return `<tr>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(item.nombre)}</td>
          <td>${escapeHtml(locNombre)}</td>
          <td>${escapeHtml(tipoNombre)}</td>
          <td>${escapeHtml(item.estado || '')}</td>
          <td class="actions">
            <button title="Editar" onclick="openModal('edit','${id}')"><i class="fa fa-pen"></i></button>
            <button title="Eliminar" onclick="deleteEntity('canchas','${id}')"><i class="fa fa-trash" style="color:var(--danger)"></i></button>
          </td>
        </tr>`;
      }
      if(entity==='precios'){
        // Buscar nombre de cancha
        let canchaNombre = item.cancha_nombre || item.nombre_cancha || '';
        
        if (!canchaNombre && dataCache['canchas']) {
          const cancha = dataCache['canchas'].find(c => c.id_cancha == item.id_cancha);
          canchaNombre = cancha ? cancha.nombre : `ID: ${item.id_cancha}`;
        }
        
        const precio = item.valor_por_hora ?? item.valor ?? 0;
        const precioFormateado = new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS'
        }).format(precio);
        
        const fechaVigencia = item.fecha_vigencia ? 
          new Date(item.fecha_vigencia).toLocaleDateString('es-AR') : 
          'No definida';
        
        return `<tr>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(canchaNombre)}</td>
          <td>${precioFormateado}</td>
          <td>${escapeHtml(fechaVigencia)}</td>
          <td class="actions">
            <button title="Editar" onclick="openModal('edit','${id}')"><i class="fa fa-pen"></i></button>
            <button title="Eliminar" onclick="deleteEntity('precios','${id}')"><i class="fa fa-trash" style="color:var(--danger)"></i></button>
          </td>
        </tr>`;
      }
      if(entity==='servicios'){
        // CORREGIDO: usar precio_servicio en lugar de precio
        const precio = item.precio_servicio ?? item.precio ?? 0;
        return `<tr>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(item.nombre)}</td>
          <td>$ ${escapeHtml(precio)}</td>
          <td class="actions">
            <button title="Editar" onclick="openModal('edit','${id}')"><i class="fa fa-pen"></i></button>
            <button title="Eliminar" onclick="deleteEntity('servicios','${id}')"><i class="fa fa-trash" style="color:var(--danger)"></i></button>
          </td>
        </tr>`;
      }
      if(entity==='usuarios'){
        const localidadNombre = item.localidad_nombre || item.nombre_localidad || item.id_localidad || '';
        return `<tr>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(item.nombre)} ${escapeHtml(item.apellido || '')}</td>
          <td>${escapeHtml(item.dni || '')}</td>
          <td>${escapeHtml(localidadNombre)}</td>
          <td>${escapeHtml(item.rol || '')}</td>
          <td>${escapeHtml(item.username || item.email || '')}</td>
          <td class="actions">
            <button title="Editar" onclick="openModal('edit','${id}')"><i class="fa fa-pen"></i></button>
            <button title="Eliminar" onclick="deleteEntity('usuarios','${id}')"><i class="fa fa-trash" style="color:var(--danger)"></i></button>
          </td>
        </tr>`;
      }
      if(entity==='reservas'){
        // CORREGIDO: usar usuario_nombre y cancha_nombre que vienen del backend
        const usuario = item.usuario_nombre || item.id_usuario || '';
        const cancha = item.cancha_nombre || item.id_cancha || '';
        // CORREGIDO: manejar diferentes formatos de servicios
        let servicios = '-';
        if (item.servicios) {
          if (Array.isArray(item.servicios)) {
            servicios = item.servicios.map(s => s.nombre || s).join(', ');
          } else if (typeof item.servicios === 'string') {
            servicios = item.servicios;
          }
        }
        if (servicios === '' || servicios === '[]') servicios = '-';
        
        return `<tr>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(usuario)}</td>
          <td>${escapeHtml(cancha)}</td>
          <td>${escapeHtml(item.fecha || '')}</td>
          <td>${escapeHtml(item.hora_inicio || '')}</td>
          <td>${escapeHtml(item.hora_fin || '')}</td>
          <td>$ ${escapeHtml(item.precio_total ?? 0)}</td>
          <td>${escapeHtml(servicios)}</td>
          <td class="actions">
            <button title="Editar" onclick="openModal('edit','${id}')"><i class="fa fa-pen"></i></button>
            <button title="Eliminar" onclick="deleteEntity('reservas','${id}')"><i class="fa fa-trash" style="color:var(--danger)"></i></button>
          </td>
        </tr>`;
      }
      // default
      return `<tr><td>${escapeHtml(id)}</td><td>${escapeHtml(JSON.stringify(item)).slice(0,60)}</td><td><button onclick="openModal('edit','${id}')">Editar</button></td></tr>`;
    }

    function renderPagination(totalPages){
      if(!paginationDiv) return;
      if(totalPages <= 1){ paginationDiv.innerHTML = ''; return; }
      let html = '';
      for(let p=1;p<=totalPages;p++){
        html += `<button class="page-btn" data-page="${p}" ${p===currentPage? 'disabled' : ''}>${p}</button>`;
      }
      paginationDiv.innerHTML = html;
      paginationDiv.querySelectorAll('.page-btn').forEach(b=> b.addEventListener('click', (e)=> {
        currentPage = Number(e.currentTarget.dataset.page);
        renderTable();
      }));
    }

    /***********************
     * Modal: crear / editar
     ***********************/
    let modalMode = 'create';
    let modalEditingId = null;

    async function openModal(mode = 'create', id = null){
      modalMode = mode;
      modalEditingId = id;
      modalTitle.textContent = mode === 'create' ? `Nuevo ${titleFromEntity(currentEntity)}` : `Editar ${titleFromEntity(currentEntity)}`;

      modalBody.innerHTML = '<div class="muted">Cargando...</div>';
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden','false');

      try {
        // Cargar datos necesarios para los selects
        await loadRequiredDataForModal();
        
        let currentItem = null;
        if(mode === 'edit'){
          currentItem = await getCurrentItem(id);
        }

        // Construir el formulario
        modalBody.innerHTML = buildFormHTML(currentEntity, currentItem);
        
        // Setear valores si estamos editando
        if(mode === 'edit' && currentItem){
          setFormValues(currentEntity, currentItem);
        }

        // Para reservas, agregar cálculo de precio en tiempo real
        if(currentEntity === 'reservas') {
          setupPrecioCalculo();
        }
        
      } catch(error) {
        console.error('Error loading modal:', error);
        modalBody.innerHTML = '<div class="table-empty">Error al cargar el formulario</div>';
      }
    }

    // 🔹 NUEVA FUNCIÓN: Configurar cálculo de precio en tiempo real para reservas
    async function setupPrecioCalculo() {
      const id_cancha = document.getElementById('field_id_cancha');
      const fecha = document.getElementById('field_fecha');
      const hora_inicio = document.getElementById('field_hora_inicio');
      const hora_fin = document.getElementById('field_hora_fin');
      const serviciosSelect = document.getElementById('field_id_servicios');
      const precioTotalInput = document.getElementById('field_precio_total');
      const precioDisplay = document.getElementById('precio_calculado');

      if (!precioDisplay) {
        // Crear display de precio si no existe
        const precioHtml = `
          <div class="price-calculation">
            <div class="price-breakdown" id="precio_desglose">Seleccioná una cancha, fecha y horario para calcular el precio</div>
            <div class="price-total" id="precio_calculado">Total: $0</div>
          </div>
        `;
        if (precioTotalInput) {
          precioTotalInput.insertAdjacentHTML('beforebegin', precioHtml);
        }
      }

      // Función para calcular precio
      const calcularPrecio = async () => {
        if (!id_cancha || !fecha || !hora_inicio || !hora_fin) return;

        const selectedServicios = serviciosSelect ? 
          Array.from(serviciosSelect.selectedOptions).map(opt => parseInt(opt.value)) : [];

        try {
          const response = await fetch(API['reservas'] + '/calcular-precio', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              id_cancha: parseInt(id_cancha.value),
              fecha: fecha.value,
              hora_inicio: hora_inicio.value,
              hora_fin: hora_fin.value,
              id_servicios: selectedServicios
            })
          });

          const result = await response.json();
          
          if (result.success) {
            const { precio_total, precio_cancha, precio_servicios } = result.data;
            
            // Actualizar display
            const horas = calcularDiferenciaHoras(hora_inicio.value, hora_fin.value);
            document.getElementById('precio_desglose').innerHTML = `
              Cancha: $${precio_cancha} (${horas} horas)<br>
              Servicios: $${precio_servicios}<br>
              <strong>Total: $${precio_total}</strong>
            `;
            document.getElementById('precio_calculado').textContent = `Total: $${precio_total}`;
            
            // Actualizar campo de precio total (oculto para el usuario)
            if (precioTotalInput) {
              precioTotalInput.value = precio_total;
            }
          }
        } catch (error) {
          console.error('Error calculando precio:', error);
        }
      };

      // Agregar event listeners
      if (id_cancha) id_cancha.addEventListener('change', calcularPrecio);
      if (fecha) fecha.addEventListener('change', calcularPrecio);
      if (hora_inicio) hora_inicio.addEventListener('change', calcularPrecio);
      if (hora_fin) hora_fin.addEventListener('change', calcularPrecio);
      if (serviciosSelect) serviciosSelect.addEventListener('change', calcularPrecio);

      // Calcular precio inicial si hay valores
      if (id_cancha.value && fecha.value && hora_inicio.value && hora_fin.value) {
        calcularPrecio();
      }
    }

    // 🔹 FUNCIÓN AUXILIAR: Calcular diferencia de horas
    function calcularDiferenciaHoras(hora_inicio, hora_fin) {
      const inicio = new Date(`2000-01-01T${hora_inicio}`);
      const fin = new Date(`2000-01-01T${hora_fin}`);
      const diffMs = fin.getTime() - inicio.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);
      return Math.max(diffHoras, 1).toFixed(1);
    }

    async function loadRequiredDataForModal() {
      const dependencies = {
        'canchas': ['localidades', 'tipo-canchas'],
        'precios': ['canchas'],
        'usuarios': ['localidades'],
        'reservas': ['usuarios', 'canchas', 'servicios']
      };
      
      const entitiesToLoad = dependencies[currentEntity] || [];
      await Promise.all(entitiesToLoad.map(entity => fetchIfNeeded(entity)));
    }

    async function getCurrentItem(id) {
      const list = dataCache[currentEntity] || [];
      let currentItem = list.find(x => String(x[idField[currentEntity]] ?? x.id) === String(id));
      
      if(!currentItem){
        try {
          const res = await fetch(API[currentEntity] + '/' + id);
          if(res.ok) {
            const result = await res.json();
            currentItem = result.data || result;
          }
        } catch(e) { 
          console.warn('No se pudo cargar item individual:', e);
        }
      }
      return currentItem;
    }

    function buildFormHTML(entity, currentItem) {
      const currentValue = (field) => escapeHtml(currentItem ? currentItem[field] || '' : '');
      
      switch(entity){
        case 'localidades':
          return `
            <label>Nombre *</label>
            <input id="field_nombre" value="${currentValue('nombre')}" required />
          `;

        case 'tipo-canchas':
          return `
            <label>Nombre *</label>
            <input id="field_nombre" value="${currentValue('nombre')}" required />
            <label>Deporte</label>
            <input id="field_deporte" value="${currentValue('deporte')}" />
          `;

        case 'canchas':
          const locs = (dataCache['localidades'] || []);
          const tipos = (dataCache['tipo-canchas'] || []);
          return `
            <label>Nombre *</label>
            <input id="field_nombre" value="${currentValue('nombre')}" required />
            <label>Localidad *</label>
            <select id="field_id_localidad" required>
              <option value="">-- elegí localidad --</option>
              ${locs.map(l => `<option value="${l.id_localidad || l.id}">${escapeHtml(l.nombre)}</option>`).join('')}
            </select>
            <label>Tipo de Cancha *</label>
            <select id="field_id_tipo" required>
              <option value="">-- elegí tipo --</option>
              ${tipos.map(t => `<option value="${t.id_tipo || t.id}">${escapeHtml(t.nombre)}</option>`).join('')}
            </select>
            <label>Estado</label>
            <select id="field_estado">
              ${estadoOptions.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          `;

        case 'precios':
          const canchas = (dataCache['canchas'] || []);
          return `
            <label>Cancha *</label>
            <select id="field_id_cancha" required>
              <option value="">-- elegí cancha --</option>
              ${canchas.map(c => `<option value="${c.id_cancha || c.id}">${escapeHtml(c.nombre)}</option>`).join('')}
            </select>
            <label>Valor por hora *</label>
            <input id="field_valor_por_hora" type="number" step="0.01" min="0" value="${currentValue('valor_por_hora')}" required />
            <label>Fecha vigencia</label>
            <input id="field_fecha_vigencia" type="date" value="${currentValue('fecha_vigencia')}" />
          `;

        case 'servicios':
          // CORREGIDO: usar precio_servicio
          const precioActual = currentItem ? (currentItem.precio_servicio ?? currentItem.precio ?? '') : '';
          return `
            <label>Nombre *</label>
            <input id="field_nombre" value="${currentValue('nombre')}" required />
            <label>Precio *</label>
            <input id="field_precio_servicio" type="number" step="0.01" min="0" value="${precioActual}" required />
          `;

        case 'usuarios':
          const locs2 = (dataCache['localidades'] || []);
          return `
            <label>Nombre *</label>
            <input id="field_nombre" value="${currentValue('nombre')}" required />
            <label>Apellido *</label>
            <input id="field_apellido" value="${currentValue('apellido')}" required />
            <label>DNI *</label>
            <input id="field_dni" value="${currentValue('dni')}" required />
            <label>Localidad</label>
            <select id="field_id_localidad">
              <option value="">-- elegí localidad --</option>
              ${locs2.map(l => `<option value="${l.id_localidad || l.id}">${escapeHtml(l.nombre)}</option>`).join('')}
            </select>
            <label>Rol</label>
            <select id="field_rol">
              <option value="cliente">cliente</option>
              <option value="administrador">administrador</option>
            </select>
            <label>Username *</label>
            <input id="field_username" value="${currentValue('username')}" required />
            <label>Email</label>
            <input id="field_email" type="email" value="${currentValue('email')}" />
            <label>Password ${modalMode==='edit'? '(dejar vacío si no cambia)' : '*'}</label>
            <input id="field_password" type="password" ${modalMode==='create' ? 'required' : ''} />
          `;

        case 'reservas':
          const users = (dataCache['usuarios'] || []);
          const allCanchas = (dataCache['canchas'] || []);
          const servicios = (dataCache['servicios'] || []);
          return `
            <label>Usuario *</label>
            <select id="field_id_usuario" required>
              <option value="">-- elegí usuario --</option>
              ${users.map(u => `<option value="${u.id_usuario || u.id}">${escapeHtml(u.nombre+' '+(u.apellido||''))}</option>`).join('')}
            </select>
            <label>Cancha *</label>
            <select id="field_id_cancha" required>
              <option value="">-- elegí cancha --</option>
              ${allCanchas.map(c => `<option value="${c.id_cancha || c.id}">${escapeHtml(c.nombre)}</option>`).join('')}
            </select>
            <label>Fecha *</label>
            <input id="field_fecha" type="date" value="${currentValue('fecha')}" required />
            <label>Hora inicio *</label>
            <input id="field_hora_inicio" type="time" value="${currentValue('hora_inicio')}" required />
            <label>Hora fin *</label>
            <input id="field_hora_fin" type="time" value="${currentValue('hora_fin')}" required />
            <label>Servicios</label>
            <select id="field_id_servicios" multiple style="height: 120px;">
              ${servicios.map(s => {
                const precio = s.precio_servicio ?? s.precio ?? 0;
                return `<option value="${s.id_servicio || s.id}">${escapeHtml(s.nombre)} - $${precio}</option>`;
              }).join('')}
            </select>
            <small style="color: var(--muted);">Mantené Ctrl presionado para seleccionar múltiples servicios</small>
            <!-- El precio total se calculará automáticamente y se mostrará arriba -->
            <input id="field_precio_total" type="hidden" value="${currentValue('precio_total')}" />
          `;
      }
    }

    function setFormValues(entity, currentItem) {
      setTimeout(() => {
        if(entity === 'canchas'){
          const selL = document.getElementById('field_id_localidad');
          const selT = document.getElementById('field_id_tipo');
          const selEstado = document.getElementById('field_estado');
          if(selL) selL.value = currentItem.id_localidad || '';
          if(selT) selT.value = currentItem.id_tipo || '';
          if(selEstado) selEstado.value = currentItem.estado || 'disponible';
        }
        if(entity === 'precios'){
          const selCancha = document.getElementById('field_id_cancha');
          const inputValor = document.getElementById('field_valor_por_hora');
          const inputFecha = document.getElementById('field_fecha_vigencia');
          if(selCancha) selCancha.value = currentItem.id_cancha || '';
          if(inputValor) inputValor.value = currentItem.valor_por_hora || currentItem.valor || '';
          if(inputFecha) inputFecha.value = currentItem.fecha_vigencia || '';
        }
        if(entity === 'usuarios'){
          if(document.getElementById('field_id_localidad')) 
            document.getElementById('field_id_localidad').value = currentItem.id_localidad || '';
          if(document.getElementById('field_rol')) 
            document.getElementById('field_rol').value = currentItem.rol || 'cliente';
        }
        if(entity === 'reservas'){
          if(document.getElementById('field_id_usuario')) 
            document.getElementById('field_id_usuario').value = currentItem.id_usuario || '';
          if(document.getElementById('field_id_cancha')) 
            document.getElementById('field_id_cancha').value = currentItem.id_cancha || '';
          // Para servicios múltiples
          if(currentItem.servicios && Array.isArray(currentItem.servicios)) {
            const serviciosSelect = document.getElementById('field_id_servicios');
            if(serviciosSelect) {
              Array.from(serviciosSelect.options).forEach(option => {
                const servicio = currentItem.servicios.find(s => 
                  s.id_servicio == option.value || s.id == option.value
                );
                if(servicio) option.selected = true;
              });
            }
          }
        }
        if(entity === 'servicios'){
          const inputPrecio = document.getElementById('field_precio_servicio');
          if(inputPrecio) {
            inputPrecio.value = currentItem.precio_servicio ?? currentItem.precio ?? '';
          }
        }
      }, 100);
    }

    async function onModalSave(){
      modalSave.disabled = true;
      modalSave.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Guardando...';
      
      try{
        const payload = buildPayloadFromModal();
        if(!payload) { 
          showToast('Completá los campos obligatorios'); 
          modalSave.disabled = false;
          modalSave.innerHTML = 'Guardar';
          return; 
        }

        console.log('Enviando payload:', payload);

        let res;
        if(modalMode === 'create'){
          res = await fetch(API[currentEntity], {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(payload)
          });
        } else {
          const id = modalEditingId;
          const path = API[currentEntity] + '/' + id;
          res = await fetch(path, {
            method: 'PUT',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(payload)
          });
        }

        if(!res.ok) {
          const errorText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        showToast(modalMode === 'create' ? 'Creado correctamente' : 'Actualizado correctamente');
        closeModal();
        await loadEntity(currentEntity);
        
      } catch(err) {
        console.error('Error saving:', err);
        showToast('Error guardando: ' + err.message);
      } finally {
        modalSave.disabled = false;
        modalSave.innerHTML = 'Guardar';
      }
    }

    function buildPayloadFromModal(){
      try{
        switch(currentEntity){
          case 'localidades':
            const nombre = document.getElementById('field_nombre')?.value?.trim();
            if(!nombre) return null;
            return { nombre };
          case 'tipo-canchas':
            const tnombre = document.getElementById('field_nombre')?.value?.trim();
            const deporte = document.getElementById('field_deporte')?.value?.trim();
            if(!tnombre) return null;
            return { nombre: tnombre, deporte };
          case 'canchas':
            const cn = document.getElementById('field_nombre')?.value?.trim();
            const id_localidad = document.getElementById('field_id_localidad')?.value;
            const id_tipo = document.getElementById('field_id_tipo')?.value;
            const estado = document.getElementById('field_estado')?.value;
            if(!cn || !id_localidad || !id_tipo) return null;
            return { nombre: cn, id_localidad: parseInt(id_localidad), id_tipo: parseInt(id_tipo), estado };
          case 'precios':
            const id_cancha = document.getElementById('field_id_cancha')?.value;
            const valor_por_hora = Number(document.getElementById('field_valor_por_hora')?.value || 0);
            const fecha_vigencia = document.getElementById('field_fecha_vigencia')?.value;
            if(!id_cancha || !valor_por_hora) return null;
            return { id_cancha: parseInt(id_cancha), valor_por_hora: parseFloat(valor_por_hora), fecha_vigencia };
          case 'servicios':
            // CORREGIDO: usar precio_servicio
            const sname = document.getElementById('field_nombre')?.value?.trim();
            const sprice = Number(document.getElementById('field_precio_servicio')?.value || 0);
            if(!sname) return null;
            return { nombre: sname, precio_servicio: sprice };
          case 'usuarios':
            const unombre = document.getElementById('field_nombre')?.value?.trim();
            const uapellido = document.getElementById('field_apellido')?.value?.trim();
            const udni = document.getElementById('field_dni')?.value?.trim();
            const uid_localidad = document.getElementById('field_id_localidad')?.value;
            const urol = document.getElementById('field_rol')?.value;
            const username = document.getElementById('field_username')?.value?.trim();
            const email = document.getElementById('field_email')?.value?.trim();
            const password = document.getElementById('field_password')?.value;
            if(!unombre || !uapellido || !udni || !username) return null;
            const usuarioPayload = { nombre: unombre, apellido: uapellido, dni: udni, id_localidad: uid_localidad, rol: urol, username, email };
            if(password) usuarioPayload.password = password;
            return usuarioPayload;
          case 'reservas':
            const r_usuario = document.getElementById('field_id_usuario')?.value;
            const r_cancha = document.getElementById('field_id_cancha')?.value;
            const r_fecha = document.getElementById('field_fecha')?.value;
            const r_inicio = document.getElementById('field_hora_inicio')?.value;
            const r_fin = document.getElementById('field_hora_fin')?.value;
            const r_precio_total = Number(document.getElementById('field_precio_total')?.value || 0);
            const serviciosSelect = document.getElementById('field_id_servicios');
            const id_servicios = serviciosSelect ? 
              Array.from(serviciosSelect.selectedOptions).map(opt => parseInt(opt.value)) : [];
            
            if(!r_usuario || !r_cancha || !r_fecha || !r_inicio || !r_fin) return null;
            
            const reservaPayload = { 
              id_usuario: parseInt(r_usuario), 
              id_cancha: parseInt(r_cancha), 
              fecha: r_fecha, 
              hora_inicio: r_inicio, 
              hora_fin: r_fin, 
              precio_total: r_precio_total 
            };
            
            // Solo agregar servicios si hay alguno seleccionado
            if(id_servicios.length > 0) {
              reservaPayload.id_servicios = id_servicios;
            }

            // Si es edición, agregar el ID de la reserva
            if(modalMode === 'edit' && modalEditingId) {
              reservaPayload.id_reserva = parseInt(modalEditingId);
            }
            
            return reservaPayload;
        }
      }catch(e){
        console.error('buildPayload error', e);
        return null;
      }
      return null;
    }

    function closeModal(){
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden','true');
      modalBody.innerHTML = '';
      modalMode = 'create';
      modalEditingId = null;
    }

    /***********************
     * Utils
     ***********************/
    function showToast(msg, time = 3000){
      toast.textContent = msg;
      toast.classList.remove('hidden');
      setTimeout(()=> toast.classList.add('hidden'), time);
    }
    function escapeHtml(str){
      if(str === undefined || str === null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function showLoading(){
      // opcional: podés implementar un overlay
    }
    function hideLoading(){ }

    // expose some functions to HTML scope used in onclick
    window.openModal = openModal;
    window.deleteEntity = deleteEntity;
    window.mostrarFiltroCanchasPorTipo = mostrarFiltroCanchasPorTipo;
    window.mostrarFiltroReservasPorFecha = mostrarFiltroReservasPorFecha;
