// --- Utilidades de fecha y sanitización ---
function parseFechaDDMMYYYY(str) {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = regex.exec(str.trim());
  if (!match) return null;
  const d = parseInt(match[1], 10);
  const m = parseInt(match[2], 10) - 1;
  const y = parseInt(match[3], 10);
  const date = new Date(y, m, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function formatFechaDDMMYYYY(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function sanitizeText(str) {
  return String(str)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim();
}

function nowPretty() {
  const d = new Date();
  return (
    formatFechaDDMMYYYY(d) +
    " " +
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0")
  );
}

// --- Estado global ---
let palomas = [];
let config = {
  ultimaCarpeta: "",
};

const STORAGE_KEY = "registro_palomas_data_v1";
const CONFIG_KEY = "registro_palomas_config_v1";

function cargarDesdeStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      palomas = JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error leyendo palomas:", e);
  }
  try {
    const rawCfg = localStorage.getItem(CONFIG_KEY);
    if (rawCfg) {
      config = JSON.parse(rawCfg);
    }
  } catch (e) {
    console.error("Error leyendo config:", e);
  }
}

function guardarEnStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(palomas));
}

function guardarConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// --- Referencias DOM ---
const form = document.getElementById("pigeon-form");
const editIndexInput = document.getElementById("edit-index");
const nombreInput = document.getElementById("nombre");
const fechaInput = document.getElementById("fecha");
const colorInput = document.getElementById("color");
const capturasInput = document.getElementById("capturas");
const passwordInput = document.getElementById("password");
const notasInput = document.getElementById("notas");
const btnGuardar = document.getElementById("btn-guardar");
const btnLimpiar = document.getElementById("btn-limpiar");
const btnGenPass = document.getElementById("btn-gen-pass");

const ultimaCarpetaInput = document.getElementById("ultima-carpeta");
const btnGuardarConfig = document.getElementById("btn-guardar-config");

const filtroNombre = document.getElementById("filtro-nombre");
const filtroColor = document.getElementById("filtro-color");
const filtroDesde = document.getElementById("filtro-desde");
const filtroHasta = document.getElementById("filtro-hasta");
const btnResetFiltros = document.getElementById("btn-reset-filtros");

const tablaBody = document.getElementById("tabla-palomas");
const emptyState = document.getElementById("empty-state");

const statTotal = document.getElementById("stat-total");
const statCapturas = document.getElementById("stat-capturas");
const statPromedio = document.getElementById("stat-promedio");
const statUltima = document.getElementById("stat-ultima");

const logPopover = document.getElementById("log-popover");
const logTitleText = document.getElementById("log-title-text");
const logList = document.getElementById("log-list");
const btnCerrarLog = document.getElementById("btn-cerrar-log");

const errorNombre = document.getElementById("error-nombre");
const errorFecha = document.getElementById("error-fecha");
const errorColor = document.getElementById("error-color");
const errorCapturas = document.getElementById("error-capturas");

// --- Validación ---
function limpiarErrores() {
  [nombreInput, fechaInput, colorInput, capturasInput].forEach((el) =>
    el.classList.remove("error")
  );
  errorNombre.textContent = "";
  errorFecha.textContent = "";
  errorColor.textContent = "";
  errorCapturas.textContent = "";
}

function validarFormulario() {
  limpiarErrores();
  let valido = true;

  const nombre = sanitizeText(nombreInput.value);
  const fechaStr = fechaInput.value.trim();
  const color = sanitizeText(colorInput.value);
  const capturasStr = capturasInput.value.trim();

  if (!nombre) {
    errorNombre.textContent = "El nombre es obligatorio.";
    nombreInput.classList.add("error");
    valido = false;
  }

  const fecha = parseFechaDDMMYYYY(fechaStr);
  if (!fecha) {
    errorFecha.textContent = "Fecha inválida. Usa DD/MM/AAAA.";
    fechaInput.classList.add("error");
    valido = false;
  }

  if (!color) {
    errorColor.textContent = "El color es obligatorio.";
    colorInput.classList.add("error");
    valido = false;
  }

  const capturas = Number(capturasStr);
  if (!capturasStr || Number.isNaN(capturas) || capturas < 0 || !Number.isInteger(capturas)) {
    errorCapturas.textContent = "Capturas debe ser un entero mayor o igual a 0.";
    capturasInput.classList.add("error");
    valido = false;
  }

  return {
    valido,
    datos: {
      nombre,
      fecha,
      fechaStr: fecha ? formatFechaDDMMYYYY(fecha) : "",
      color,
      capturas: Number.isNaN(Number(capturasStr)) ? 0 : Number(capturasStr),
      password: sanitizeText(passwordInput.value),
      notas: sanitizeText(notasInput.value),
    },
  };
}

// --- Generación de contraseña segura ---
function generarPasswordSegura(longitud = 12) {
  const mayus = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const minus = "abcdefghijkmnopqrstuvwxyz";
  const nums = "23456789";
  const simbolos = "!@#$%&*?";
  const all = mayus + minus + nums + simbolos;

  let pass = "";
  pass += mayus[Math.floor(Math.random() * mayus.length)];
  pass += minus[Math.floor(Math.random() * minus.length)];
  pass += nums[Math.floor(Math.random() * nums.length)];
  pass += simbolos[Math.floor(Math.random() * simbolos.length)];

  for (let i = pass.length; i < longitud; i++) {
    pass += all[Math.floor(Math.random() * all.length)];
  }

  return pass
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

// --- CRUD ---
function agregarPaloma(datos) {
  const nueva = {
    id: Date.now(),
    nombre: datos.nombre,
    fecha: datos.fechaStr,
    color: datos.color,
    capturas: datos.capturas,
    password: datos.password,
    notas: datos.notas,
    creadoEn: nowPretty(),
    actualizadoEn: nowPretty(),
    log: [],
  };
  nueva.log.push({
    tipo: "add",
    fecha: nowPretty(),
    detalle: `Creada con ${nueva.capturas} capturas.`,
  });
  palomas.push(nueva);
  guardarEnStorage();
  render();
}

function editarPaloma(index, datos) {
  const p = palomas[index];
  if (!p) return;
  const antes = { ...p };
  p.nombre = datos.nombre;
  p.fecha = datos.fechaStr;
  p.color = datos.color;
  p.capturas = datos.capturas;
  p.password = datos.password;
  p.notas = datos.notas;
  p.actualizadoEn = nowPretty();
  p.log = p.log || [];
  p.log.push({
    tipo: "edit",
    fecha: nowPretty(),
    detalle: `Editada. Capturas: ${antes.capturas} → ${p.capturas}.`,
  });
  guardarEnStorage();
  render();
}

function eliminarPaloma(index) {
  const p = palomas[index];
  if (!p) return;
  const confirmacion = confirm(
    `¿Seguro que quieres eliminar a "${p.nombre}"? Esta acción no se puede deshacer.`
  );
  if (!confirmacion) return;
  p.log = p.log || [];
  p.log.push({
    tipo: "delete",
    fecha: nowPretty(),
    detalle: "Registro eliminado.",
  });
  palomas.splice(index, 1);
  guardarEnStorage();
  render();
}

// --- Filtros ---
function aplicarFiltros(lista) {
  const nombreF = filtroNombre.value.trim().toLowerCase();
  const colorF = filtroColor.value.trim().toLowerCase();
  const desdeStr = filtroDesde.value.trim();
  const hastaStr = filtroHasta.value.trim();

  let desde = null;
  let hasta = null;

  if (desdeStr) {
    desde = parseFechaDDMMYYYY(desdeStr);
  }
  if (hastaStr) {
    hasta = parseFechaDDMMYYYY(hastaStr);
  }

  return lista.filter((p) => {
    if (nombreF && !p.nombre.toLowerCase().includes(nombreF)) return false;
    if (colorF && !p.color.toLowerCase().includes(colorF)) return false;

    if (desde || hasta) {
      const fechaP = parseFechaDDMMYYYY(p.fecha);
      if (!fechaP) return false;
      if (desde && fechaP < desde) return false;
      if (hasta && fechaP > hasta) return false;
    }

    return true;
  });
}

// --- Render ---
function render() {
  const filtradas = aplicarFiltros(palomas);
  tablaBody.innerHTML = "";

  if (filtradas.length === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
  }

  filtradas.forEach((p, idx) => {
    const tr = document.createElement("tr");

    const indexReal = palomas.findIndex((x) => x.id === p.id);

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <span>${sanitizeText(p.nombre)}</span>
          ${
            p.notas
              ? `<span class="hint" style="font-size:0.7rem;">${sanitizeText(
                  p.notas
                )}</span>`
              : ""
          }
        </div>
      </td>
      <td>${p.fecha}</td>
      <td><span class="tag tag-color">${sanitizeText(p.color)}</span></td>
      <td><span class="tag tag-capturas">${p.capturas}</span></td>
      <td>
        <button type="button" class="btn btn-outline btn-sm btn-log" data-index="${indexReal}">
          Ver historial
        </button>
      </td>
      <td>
        <div style="display:flex;gap:4px;">
          <button type="button" class="btn btn-outline btn-sm btn-editar" data-index="${indexReal}">
            Editar
          </button>
          <button type="button" class="btn btn-danger btn-sm btn-eliminar" data-index="${indexReal}">
            Eliminar
          </button>
        </div>
      </td>
    `;

    tablaBody.appendChild(tr);
  });

  // Estadísticas
  const total = palomas.length;
  const totalCapturas = palomas.reduce((acc, p) => acc + (p.capturas || 0), 0);
  const promedio = total > 0 ? (totalCapturas / total).toFixed(2) : 0;
  statTotal.textContent = total;
  statCapturas.textContent = totalCapturas;
  statPromedio.textContent = promedio;

  const ultima = palomas
    .map((p) => p.actualizadoEn || p.creadoEn)
    .sort()
    .slice(-1)[0];
  statUltima.textContent = ultima || "—";

  // Eventos de botones de la tabla
  document.querySelectorAll(".btn-editar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.getAttribute("data-index"));
      cargarEnFormulario(index);
    });
  });

  document.querySelectorAll(".btn-eliminar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.getAttribute("data-index"));
      eliminarPaloma(index);
    });
  });

  document.querySelectorAll(".btn-log").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.getAttribute("data-index"));
      mostrarHistorial(index);
    });
  });
}

function cargarEnFormulario(index) {
  const p = palomas[index];
  if (!p) return;
  editIndexInput.value = index;
  nombreInput.value = p.nombre;
  fechaInput.value = p.fecha;
  colorInput.value = p.color;
  capturasInput.value = p.capturas;
  passwordInput.value = p.password || "";
  notasInput.value = p.notas || "";
  btnGuardar.textContent = "Actualizar paloma";
}

function limpiarFormulario() {
  form.reset();
  editIndexInput.value = "";
  btnGuardar.textContent = "Guardar paloma";
  limpiarErrores();
}

// --- Historial ---
function mostrarHistorial(index) {
  const p = palomas[index];
  if (!p) return;
  logTitleText.textContent = `Historial de "${p.nombre}"`;
  logList.innerHTML = "";
  const log = p.log || [];
  if (log.length === 0) {
    const div = document.createElement("div");
    div.className = "log-item";
    div.textContent = "No hay cambios registrados para esta paloma.";
    logList.appendChild(div);
  } else {
    log
      .slice()
      .reverse()
      .forEach((item) => {
        const div = document.createElement("div");
        div.className = "log-item";
        const tipoClass =
          item.tipo === "add"
            ? "add"
            : item.tipo === "edit"
            ? "edit"
            : "delete";
        div.innerHTML = `
          <small>${item.fecha}
            <span class="pill-type ${tipoClass}">
              ${item.tipo === "add" ? "Creación" : item.tipo === "edit" ? "Edición" : "Eliminación"}
            </span>
          </small>
          <div>${sanitizeText(item.detalle)}</div>
        `;
        logList.appendChild(div);
      });
  }
  logPopover.classList.add("active");
}

// --- Eventos ---
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const { valido, datos } = validarFormulario();
  if (!valido) return;

  const editIndex = editIndexInput.value;
  if (editIndex !== "") {
    editarPaloma(Number(editIndex), datos);
  } else {
    agregarPaloma(datos);
  }
  limpiarFormulario();
});

btnLimpiar.addEventListener("click", () => {
  limpiarFormulario();
});

btnGenPass.addEventListener("click", () => {
  const pass = generarPasswordSegura(14);
  passwordInput.value = pass;
});

btnGuardarConfig.addEventListener("click", () => {
  config.ultimaCarpeta = sanitizeText(ultimaCarpetaInput.value);
  guardarConfig();
  alert("Configuración guardada.");
});

[filtroNombre, filtroColor, filtroDesde, filtroHasta].forEach((input) => {
  input.addEventListener("input", () => {
    render();
  });
});

btnResetFiltros.addEventListener("click", () => {
  filtroNombre.value = "";
  filtroColor.value = "";
  filtroDesde.value = "";
  filtroHasta.value = "";
  render();
});

btnCerrarLog.addEventListener("click", () => {
  logPopover.classList.remove("active");
});

logPopover.addEventListener("click", (e) => {
  if (e.target === logPopover) {
    logPopover.classList.remove("active");
  }
});

// --- Inicialización ---
cargarDesdeStorage();
if (config.ultimaCarpeta) {
  ultimaCarpetaInput.value = config.ultimaCarpeta;
}
render();
