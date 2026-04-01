let cacheUsuarios = [];
let currentProgressUserId = null;
let currentDeleteUserId = null;
let unsubscribeSolicitudes = null;
let unsubscribeUsers = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clampPercent(value) {
  const num = Number(value || 0);
  return Math.max(0, Math.min(100, Number.isFinite(num) ? num : 0));
}

function averageProgress(user) {
  const p = user?.progreso || {};
  return Math.round((clampPercent(p.web) + clampPercent(p.ia) + clampPercent(p.ciber)) / 3);
}

function initials(name, email) {
  const src = String(name || email || "U").trim();
  return src.slice(0, 2).toUpperCase();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function ensureOverlayUi() {
  if (!document.getElementById("toastWrap")) {
    const toastWrap = document.createElement("div");
    toastWrap.id = "toastWrap";
    toastWrap.className = "toast-wrap";
    document.body.appendChild(toastWrap);
  }

  if (!document.getElementById("progressModal")) {
    const progressModal = document.createElement("div");
    progressModal.id = "progressModal";
    progressModal.className = "admin-modal hidden";
    progressModal.innerHTML = `
      <div class="admin-modal-backdrop" onclick="closeProgressModal()"></div>
      <div class="admin-modal-card">
        <div class="admin-modal-icon">📈</div>
        <p class="admin-modal-kicker">Gestión académica</p>
        <h3 class="admin-modal-title">Editar progreso</h3>
        <p class="admin-modal-text" id="progressModalUser">Actualiza el avance del alumno.</p>

        <div class="admin-modal-grid">
          <div>
            <label class="admin-modal-label" for="progressWeb">Desarrollo Web</label>
            <input id="progressWeb" class="admin-modal-input" type="number" min="0" max="100" placeholder="0 - 100" />
          </div>
          <div>
            <label class="admin-modal-label" for="progressIA">Inteligencia Artificial</label>
            <input id="progressIA" class="admin-modal-input" type="number" min="0" max="100" placeholder="0 - 100" />
          </div>
          <div>
            <label class="admin-modal-label" for="progressCiber">Ciberseguridad</label>
            <input id="progressCiber" class="admin-modal-input" type="number" min="0" max="100" placeholder="0 - 100" />
          </div>
        </div>

        <div class="admin-modal-actions">
          <button class="admin-modal-btn admin-modal-btn-secondary" onclick="closeProgressModal()">Cancelar</button>
          <button class="admin-modal-btn admin-modal-btn-primary" onclick="saveProgressModal()">Guardar cambios</button>
        </div>
      </div>
    `;
    document.body.appendChild(progressModal);
  }

  if (!document.getElementById("deleteModal")) {
    const deleteModal = document.createElement("div");
    deleteModal.id = "deleteModal";
    deleteModal.className = "admin-modal hidden";
    deleteModal.innerHTML = `
      <div class="admin-modal-backdrop" onclick="closeDeleteModal()"></div>
      <div class="admin-modal-card">
        <div class="admin-modal-icon danger">🗑️</div>
        <p class="admin-modal-kicker">Gestión de usuarios</p>
        <h3 class="admin-modal-title">Eliminar usuario</h3>
        <p class="admin-modal-text" id="deleteModalText">¿Seguro que quieres eliminar este usuario?</p>
        <div class="admin-modal-actions">
          <button class="admin-modal-btn admin-modal-btn-secondary" onclick="closeDeleteModal()">Cancelar</button>
          <button class="admin-modal-btn admin-modal-btn-danger" onclick="confirmDeleteUser()">Eliminar</button>
        </div>
      </div>
    `;
    document.body.appendChild(deleteModal);
  }
}

function showModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("hidden");
  document.body.classList.add("admin-modal-open");
}

function hideModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("hidden");
  const anyOpen = document.querySelector(".admin-modal:not(.hidden)");
  if (!anyOpen) {
    document.body.classList.remove("admin-modal-open");
  }
}

function mostrarToast(msg, type = "info") {
  const wrap = document.getElementById("toastWrap");
  if (!wrap) return;

  const iconMap = {
    success: "✅",
    danger: "❌",
    warning: "⚠️",
    info: "✨"
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${iconMap[type] || "✨"}</div>
    <div class="toast-text">${escapeHtml(msg)}</div>
  `;

  wrap.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hide");

    setTimeout(() => {
      toast.remove();
    }, 250);
  }, 2400);
}

function renderSolicitudCard(item) {
  const nombre = escapeHtml(item.nombre || "Sin nombre");
  const correo = escapeHtml(item.correo || "Sin correo");
  const curso = escapeHtml(item.curso || "No definido");
  const mensaje = escapeHtml(item.mensaje || "Sin mensaje");
  const edad = item.edad ? `<span class="chip">Edad: ${item.edad}</span>` : "";

  return `
    <article class="user-card card-split">
      <div class="user-main">
        <div class="title-row">
          <h4 class="user-name">${nombre}</h4>
          <span class="chip chip-warning">Pendiente</span>
        </div>
        <p class="user-email">${correo}</p>
        <div class="chip-row">
          <span class="chip chip-cyan">${curso}</span>
          ${edad}
        </div>
        <p class="description">${mensaje}</p>
      </div>
      <div class="action-col">
        <button onclick="aprobarSolicitud('${encodeURIComponent(item.id)}')" class="btn btn-success">Aprobar</button>
        <button onclick="rechazarSolicitud('${encodeURIComponent(item.id)}')" class="btn btn-danger">Eliminar</button>
      </div>
    </article>
  `;
}

function renderUserCard(item, type) {
  const nombre = escapeHtml(item.nombre || "Sin nombre");
  const correo = escapeHtml(item.correo || item.id || "Sin correo");
  const curso = escapeHtml(item.curso || "Sin curso");
  const nivel = escapeHtml(item.nivel || "Inicial");
  const rol = String(item.rol || type).toLowerCase();
  const progress = averageProgress(item);
  const nextRole = rol === "admin" ? "alumno" : "admin";
  const roleLabel = rol === "admin" ? "Pasar a alumno" : "Hacer profesor";

  return `
    <article class="user-card users-split">
      <div class="identity-row">
        <div class="avatar">${initials(item.nombre, correo)}</div>
        <div class="user-main">
          <h4 class="user-name">${nombre}</h4>
          <p class="user-email">${correo}</p>
          <div class="chip-row">
            <span class="chip chip-cyan">${escapeHtml(rol)}</span>
            <span class="chip">${curso}</span>
            <span class="chip">Nivel: ${nivel}</span>
          </div>
          <div class="progress-wrap">
            <div class="progress-head">
              <span class="theme-muted">Progreso general</span>
              <strong>${progress}%</strong>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${progress}%"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="action-col">
        <button onclick="cambiarRol('${encodeURIComponent(item.id)}','${nextRole}')" class="btn btn-cyan">${roleLabel}</button>
        <button onclick="editarProgreso('${encodeURIComponent(item.id)}')" class="btn btn-warning">Editar progreso</button>
        <button onclick="eliminarUsuario('${encodeURIComponent(item.id)}')" class="btn btn-danger">Eliminar</button>
      </div>
    </article>
  `;
}

function matchesTerm(term) {
  return (item) => {
    if (!term) return true;
    return [item.nombre, item.correo, item.curso, item.nivel, item.rol]
      .join(" ")
      .toLowerCase()
      .includes(term);
  };
}

function renderContainer(id, items, type, emptyText) {
  const container = document.getElementById(id);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<div class="empty-box">${emptyText}</div>`;
    return;
  }

  container.innerHTML = items.map((item) => renderUserCard(item, type)).join("");
}

function getAverageTotal(items) {
  if (!items.length) return 0;
  return Math.round(items.reduce((sum, item) => sum + averageProgress(item), 0) / items.length);
}

function getTopCourse(items) {
  const counts = new Map();
  items.forEach((item) => {
    const key = item.curso || "Sin curso";
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  let top = "-";
  let max = 0;

  counts.forEach((count, course) => {
    if (count > max) {
      top = course;
      max = count;
    }
  });

  return top;
}

function renderLists() {
  const term = String(document.getElementById("buscador")?.value || "").trim().toLowerCase();

  const profesores = cacheUsuarios.filter((u) => String(u.rol).toLowerCase() === "admin");
  const alumnos = cacheUsuarios.filter((u) => String(u.rol).toLowerCase() !== "admin");

  const filteredProfes = profesores.filter(matchesTerm(term));
  const filteredAlumnos = alumnos.filter(matchesTerm(term));

  renderContainer("listaProfesores", filteredProfes, "profesor", "No hay profesores cargados.");
  renderContainer("listaAlumnos", filteredAlumnos, "alumno", "No hay alumnos cargados.");

  setText("totalProfesores", String(profesores.length));
  setText("totalAlumnos", String(alumnos.length));
  setText("promedioProgreso", `${getAverageTotal(cacheUsuarios)}%`);
  setText("cursoTop", getTopCourse(cacheUsuarios));
}

function loadSolicitudes() {
  const container = document.getElementById("listaSolicitudes");
  if (!container) return;

  if (unsubscribeSolicitudes) unsubscribeSolicitudes();

  unsubscribeSolicitudes = db.collection("solicitudes").onSnapshot(
    (snap) => {
      const solicitudes = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));

      setText("totalSolicitudes", String(solicitudes.length));

      if (!solicitudes.length) {
        container.innerHTML = '<div class="empty-box">No hay solicitudes pendientes.</div>';
        return;
      }

      container.innerHTML = solicitudes.map(renderSolicitudCard).join("");
    },
    (error) => {
      console.error("Error cargando solicitudes:", error);
      container.innerHTML = '<div class="empty-box">No se pudieron cargar las solicitudes.</div>';
      mostrarToast("Error al sincronizar solicitudes", "danger");
    }
  );
}

function loadUsers() {
  if (unsubscribeUsers) unsubscribeUsers();

  unsubscribeUsers = db.collection("alumnos").onSnapshot(
    (snap) => {
      cacheUsuarios = snap.docs
        .map((doc) => ({ id: doc.id, correo: doc.id, ...doc.data() }))
        .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));

      renderLists();
    },
    (error) => {
      console.error("Error cargando usuarios:", error);
      mostrarToast("Error al sincronizar alumnos", "danger");
    }
  );
}

async function aprobarSolicitud(encodedId) {
  try {
    const id = decodeURIComponent(encodedId);
    const solicitudRef = db.collection("solicitudes").doc(id);
    const solicitudSnap = await solicitudRef.get();
    if (!solicitudSnap.exists) return;

    const data = solicitudSnap.data() || {};
    const correo = String(data.correo || id).trim().toLowerCase();

    await db.collection("alumnos").doc(correo).set({
      nombre: data.nombre || "Alumno",
      correo,
      curso: data.curso || "Desarrollo Web",
      nivel: data.nivel || "Inicial",
      rol: "alumno",
      progreso: { web: 0, ia: 0, ciber: 0 },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await solicitudRef.delete();
    mostrarToast("Alumno aprobado correctamente", "success");
  } catch (error) {
    console.error("Error aprobando solicitud:", error);
    mostrarToast("Error al aprobar solicitud", "danger");
  }
}

async function rechazarSolicitud(encodedId) {
  try {
    const id = decodeURIComponent(encodedId);
    await db.collection("solicitudes").doc(id).delete();
    mostrarToast("Solicitud eliminada", "warning");
  } catch (error) {
    console.error("Error eliminando solicitud:", error);
    mostrarToast("Error al eliminar solicitud", "danger");
  }
}

async function cambiarRol(encodedId, nextRole) {
  try {
    const id = decodeURIComponent(encodedId);
    await db.collection("alumnos").doc(id).set({ rol: nextRole }, { merge: true });
    mostrarToast(`Rol cambiado a ${nextRole}`, "success");
  } catch (error) {
    console.error("Error cambiando rol:", error);
    mostrarToast("Error al cambiar rol", "danger");
  }
}

function editarProgreso(encodedId) {
  const id = decodeURIComponent(encodedId);
  const item = cacheUsuarios.find((user) => user.id === id);
  if (!item) {
    mostrarToast("Usuario no encontrado", "danger");
    return;
  }

  currentProgressUserId = id;

  const actualWeb = clampPercent(item.progreso?.web);
  const actualIA = clampPercent(item.progreso?.ia);
  const actualCiber = clampPercent(item.progreso?.ciber);

  const userLabel = document.getElementById("progressModalUser");
  const inputWeb = document.getElementById("progressWeb");
  const inputIA = document.getElementById("progressIA");
  const inputCiber = document.getElementById("progressCiber");

  if (userLabel) userLabel.textContent = `Actualiza el avance de ${item.nombre || id}.`;
  if (inputWeb) inputWeb.value = actualWeb;
  if (inputIA) inputIA.value = actualIA;
  if (inputCiber) inputCiber.value = actualCiber;

  showModal("progressModal");
}

function closeProgressModal() {
  hideModal("progressModal");
  currentProgressUserId = null;
}

async function saveProgressModal() {
  if (!currentProgressUserId) return;

  const inputWeb = document.getElementById("progressWeb");
  const inputIA = document.getElementById("progressIA");
  const inputCiber = document.getElementById("progressCiber");

  const web = clampPercent(inputWeb?.value);
  const ia = clampPercent(inputIA?.value);
  const ciber = clampPercent(inputCiber?.value);

  try {
    await db.collection("alumnos").doc(currentProgressUserId).set({
      progreso: { web, ia, ciber }
    }, { merge: true });

    closeProgressModal();
    mostrarToast("Progreso actualizado", "success");
  } catch (error) {
    console.error("Error al guardar progreso:", error);
    mostrarToast("Error al actualizar progreso", "danger");
  }
}

function eliminarUsuario(encodedId) {
  const id = decodeURIComponent(encodedId);
  const item = cacheUsuarios.find((user) => user.id === id);

  currentDeleteUserId = id;

  const text = document.getElementById("deleteModalText");
  if (text) {
    text.textContent = `¿Seguro que quieres eliminar a ${item?.nombre || id}? Esta acción no se puede deshacer.`;
  }

  showModal("deleteModal");
}

function closeDeleteModal() {
  hideModal("deleteModal");
  currentDeleteUserId = null;
}

async function confirmDeleteUser() {
  if (!currentDeleteUserId) return;

  try {
    await db.collection("alumnos").doc(currentDeleteUserId).delete();
    closeDeleteModal();
    mostrarToast("Usuario eliminado", "danger");
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    mostrarToast("Error al eliminar usuario", "danger");
  }
}

function filtrarUsuarios() {
  renderLists();
}

function bindNetworkStatus() {
  const text = document.getElementById("networkStatusText");
  const dot = document.getElementById("networkStatusDot");

  const update = () => {
    const online = navigator.onLine;
    if (text) text.textContent = online ? "Online" : "Offline";
    if (dot) {
      dot.classList.toggle("presence-online", online);
      dot.classList.toggle("presence-offline", !online);
    }
  };

  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    const correo = String(user.email || "").trim().toLowerCase();

    const adminSnap = await db.collection("admins").doc(correo).get();
    if (!adminSnap.exists || adminSnap.data()?.enabled !== true) {
      window.location.href = "panel-alumno.html";
      return;
    }

    const alumnoSnap = await db.collection("alumnos").doc(correo).get();
    setText("adminName", alumnoSnap.exists ? (alumnoSnap.data()?.nombre || "Profesor") : "Profesor");

    bindNetworkStatus();
    loadSolicitudes();
    loadUsers();

    const status = document.getElementById("appStatus");
    if (status) {
      status.innerHTML = "Panel de administración premium. Diseñado para gestionar la operación educativa con orden, rapidez y escalabilidad.";
    }
  } catch (error) {
    console.error("Error cargando panel admin:", error);
    mostrarToast("Error cargando panel admin", "danger");
  }
});

function logout() {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureOverlayUi();
});

window.aprobarSolicitud = aprobarSolicitud;
window.rechazarSolicitud = rechazarSolicitud;
window.cambiarRol = cambiarRol;
window.editarProgreso = editarProgreso;
window.eliminarUsuario = eliminarUsuario;
window.logout = logout;
window.closeProgressModal = closeProgressModal;
window.saveProgressModal = saveProgressModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDeleteUser = confirmDeleteUser;