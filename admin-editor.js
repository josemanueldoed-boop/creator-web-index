// ============================================================
//  admin-editor.js
//  Todas las funciones de edición del panel de administración.
//  Depende de firebase-connect.js para la comunicación con DB.
// ============================================================

import {
  REFS,
  readDoc,
  writeDoc,
  addDocument,
  removeDoc,
  readCollection,
  watchDoc,
  watchCollection,
} from "./firebase-connect.js";

// ══════════════════════════════════════════════════════════════
//  UTILIDADES UI
// ══════════════════════════════════════════════════════════════

/**
 * Muestra un toast de notificación.
 * @param {string} msg - Mensaje a mostrar
 * @param {'success'|'error'|''} type
 */
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = "toast"; }, 3000);
}

/**
 * Vacía un input por su id.
 */
function clearInput(id) {
  const el = document.getElementById(id);
  if (el) el.value = "";
}

// ══════════════════════════════════════════════════════════════
//  ESTADO DE FIREBASE
// ══════════════════════════════════════════════════════════════

function setFirebaseStatus(connected) {
  const dot  = document.getElementById("firebase-status");
  const text = document.getElementById("firebase-status-text");
  if (!dot || !text) return;
  dot.className  = `status-dot ${connected ? "connected" : "error"}`;
  text.textContent = connected ? "Conectado" : "Sin conexión";
}

// ══════════════════════════════════════════════════════════════
//  NAVEGACIÓN SIDEBAR
// ══════════════════════════════════════════════════════════════

const panelMeta = {
  title:      { heading: "Título & Hero",    sub: "Edita el nombre y subtítulo del sitio" },
  sections:   { heading: "Secciones",        sub: "Agrega o elimina secciones del sitio" },
  containers: { heading: "Contenedores",     sub: "Gestiona los contenedores dentro de cada sección" },
  footer:     { heading: "Footer",           sub: "Edita la información del pie de página" },
};

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const panelId = btn.dataset.panel;

    // Activar botón
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Mostrar panel
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.getElementById(`panel-${panelId}`)?.classList.add("active");

    // Actualizar encabezado
    const meta = panelMeta[panelId];
    document.getElementById("panel-heading").textContent    = meta.heading;
    document.getElementById("panel-subheading").textContent = meta.sub;
  });
});

// ══════════════════════════════════════════════════════════════
//  1. TÍTULO & HERO
// ══════════════════════════════════════════════════════════════

/** Carga los valores actuales del título en los inputs */
async function loadTitleInputs() {
  try {
    const data = await readDoc(REFS.siteConfig());
    if (!data) return;
    setValue("input-title",    data.title    || "");
    setValue("input-subtitle", data.subtitle || "");
    setValue("input-nav-logo", data.navLogo  || "");
    setFirebaseStatus(true);
  } catch (e) {
    setFirebaseStatus(false);
    console.error("loadTitleInputs:", e);
  }
}

document.getElementById("btn-save-title")?.addEventListener("click", async () => {
  const data = {
    title   : getValue("input-title"),
    subtitle: getValue("input-subtitle"),
    navLogo : getValue("input-nav-logo"),
  };
  try {
    await writeDoc(REFS.siteConfig(), data);
    showToast("✓ Título guardado correctamente");
    setFirebaseStatus(true);
  } catch (e) {
    showToast("✗ Error al guardar: " + e.message, "error");
    setFirebaseStatus(false);
  }
});

// ══════════════════════════════════════════════════════════════
//  2. SECCIONES
// ══════════════════════════════════════════════════════════════

/** Renderiza la lista de secciones en el panel admin */
function renderSectionsList(sections) {
  const list = document.getElementById("sections-list");
  if (!list) return;

  if (!sections.length) {
    list.innerHTML = '<p class="empty-msg">No hay secciones aún. ¡Agrega la primera!</p>';
    return;
  }

  list.innerHTML = "";
  sections.forEach(sec => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <div>
        <div class="item-label">${escapeHtml(sec.name)}</div>
        ${sec.subtitle ? `<div class="item-meta">${escapeHtml(sec.subtitle)}</div>` : ""}
      </div>
      <div class="item-actions">
        <span class="item-meta">orden: ${sec.order}</span>
        <button class="btn-danger" data-id="${sec.id}">Eliminar</button>
      </div>
    `;
    row.querySelector(".btn-danger").addEventListener("click", () => deleteSection(sec.id));
    list.appendChild(row);
  });

  // Actualizar select de contenedores
  updateSectionSelect(sections);
}

/** Agrega una nueva sección */
document.getElementById("btn-add-section")?.addEventListener("click", async () => {
  const name     = getValue("input-section-name").trim();
  const subtitle = getValue("input-section-subtitle").trim();
  const order    = parseInt(getValue("input-section-order")) || 1;

  if (!name) { showToast("El nombre de la sección es obligatorio", "error"); return; }

  try {
    await addDocument(REFS.sections(), { name, subtitle, order, createdAt: Date.now() });
    clearInput("input-section-name");
    clearInput("input-section-subtitle");
    showToast("✓ Sección agregada");
    setFirebaseStatus(true);
  } catch (e) {
    showToast("✗ Error: " + e.message, "error");
    setFirebaseStatus(false);
  }
});

/** Elimina una sección y sus contenedores */
async function deleteSection(id) {
  if (!confirm("¿Eliminar esta sección y todos sus contenedores?")) return;
  try {
    // Eliminar contenedores de la sección
    const all = await readCollection(REFS.containers(), "order");
    const toDelete = all.filter(c => c.sectionId === id);
    await Promise.all(toDelete.map(c => removeDoc(REFS.containerDoc(c.id))));

    await removeDoc(REFS.sectionDoc(id));
    showToast("✓ Sección eliminada");
    setFirebaseStatus(true);
  } catch (e) {
    showToast("✗ Error al eliminar: " + e.message, "error");
    setFirebaseStatus(false);
  }
}

// Escucha cambios en tiempo real de secciones
watchCollection(REFS.sections(), "order", (sections) => {
  renderSectionsList(sections);
  setFirebaseStatus(true);
});

// ══════════════════════════════════════════════════════════════
//  3. CONTENEDORES
// ══════════════════════════════════════════════════════════════

/** Actualiza el <select> de secciones para el panel de contenedores */
function updateSectionSelect(sections) {
  const sel = document.getElementById("select-section-for-container");
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">-- Seleccionar sección --</option>';
  sections.forEach(sec => {
    const opt = document.createElement("option");
    opt.value       = sec.id;
    opt.textContent = sec.name;
    sel.appendChild(opt);
  });
  if (prev) sel.value = prev;
}

/** Renderiza la lista de contenedores */
function renderContainersList(containers) {
  const list = document.getElementById("containers-list");
  if (!list) return;

  if (!containers.length) {
    list.innerHTML = '<p class="empty-msg">No hay contenedores aún.</p>';
    return;
  }

  list.innerHTML = "";
  containers.forEach(c => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <div>
        <div class="item-label">${escapeHtml(c.title || "(sin título)")}</div>
        <div class="item-meta">${escapeHtml(c.type)} · ${escapeHtml(c.size)} · ${c.cols} col(s)</div>
      </div>
      <div class="item-actions">
        <button class="btn-danger" data-id="${c.id}">Eliminar</button>
      </div>
    `;
    row.querySelector(".btn-danger").addEventListener("click", () => deleteContainer(c.id));
    list.appendChild(row);
  });
}

/** Agrega un nuevo contenedor */
document.getElementById("btn-add-container")?.addEventListener("click", async () => {
  const sectionId = getValue("select-section-for-container");
  const title     = getValue("input-container-title").trim();
  const text      = getValue("input-container-text").trim();
  const imageUrl  = getValue("input-container-image").trim();
  const type      = getValue("input-container-type") || "text";
  const size      = getValue("input-container-size") || "medium";
  const cols      = parseInt(getValue("input-container-cols")) || 3;

  if (!sectionId) { showToast("Selecciona una sección", "error"); return; }
  if (!title && type !== "image") { showToast("El título es obligatorio", "error"); return; }

  try {
    await addDocument(REFS.containers(), {
      sectionId, title, text, imageUrl, type, size,
      cols: Math.max(1, Math.min(4, cols)),
      order: Date.now(),
      createdAt: Date.now(),
    });
    clearInput("input-container-title");
    clearInput("input-container-text");
    clearInput("input-container-image");
    showToast("✓ Contenedor agregado");
    setFirebaseStatus(true);
  } catch (e) {
    showToast("✗ Error: " + e.message, "error");
    setFirebaseStatus(false);
  }
});

/** Elimina un contenedor */
async function deleteContainer(id) {
  if (!confirm("¿Eliminar este contenedor?")) return;
  try {
    await removeDoc(REFS.containerDoc(id));
    showToast("✓ Contenedor eliminado");
    setFirebaseStatus(true);
  } catch (e) {
    showToast("✗ Error al eliminar: " + e.message, "error");
    setFirebaseStatus(false);
  }
}

// Escucha cambios en tiempo real de contenedores
watchCollection(REFS.containers(), "order", (containers) => {
  renderContainersList(containers);
  setFirebaseStatus(true);
});

// ══════════════════════════════════════════════════════════════
//  4. FOOTER
// ══════════════════════════════════════════════════════════════

let socialLinks = []; // estado local de redes

/** Carga los datos del footer desde Firestore */
async function loadFooterInputs() {
  try {
    const data = await readDoc(REFS.footerConfig());
    if (!data) return;
    setValue("input-footer-brand",     data.brand     || "");
    setValue("input-footer-address",   data.address   || "");
    setValue("input-footer-copyright", data.copyright || "");
    socialLinks = data.socialLinks || [];
    renderSocialEditor();
    setFirebaseStatus(true);
  } catch (e) {
    setFirebaseStatus(false);
    console.error("loadFooterInputs:", e);
  }
}

/** Renderiza el editor de redes sociales */
function renderSocialEditor() {
  const container = document.getElementById("social-links-editor");
  if (!container) return;
  container.innerHTML = "";

  socialLinks.forEach((link, i) => {
    const row = document.createElement("div");
    row.className = "social-row";
    row.innerHTML = `
      <input type="text" placeholder="Etiqueta (ej: Instagram)" value="${escapeHtml(link.label || "")}" data-idx="${i}" data-field="label"/>
      <input type="text" placeholder="URL (https://...)"        value="${escapeHtml(link.url   || "")}" data-idx="${i}" data-field="url"/>
      <button class="btn-danger" data-idx="${i}">✕</button>
    `;
    row.querySelectorAll("input").forEach(inp => {
      inp.addEventListener("input", (e) => {
        const idx   = parseInt(e.target.dataset.idx);
        const field = e.target.dataset.field;
        socialLinks[idx][field] = e.target.value;
      });
    });
    row.querySelector(".btn-danger").addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      socialLinks.splice(idx, 1);
      renderSocialEditor();
    });
    container.appendChild(row);
  });
}

document.getElementById("btn-add-social")?.addEventListener("click", () => {
  socialLinks.push({ label: "", url: "" });
  renderSocialEditor();
});

document.getElementById("btn-save-footer")?.addEventListener("click", async () => {
  const data = {
    brand    : getValue("input-footer-brand"),
    address  : getValue("input-footer-address"),
    copyright: getValue("input-footer-copyright"),
    socialLinks: socialLinks.filter(l => l.url.trim() !== ""),
  };
  try {
    await writeDoc(REFS.footerConfig(), data);
    showToast("✓ Footer guardado correctamente");
    setFirebaseStatus(true);
  } catch (e) {
    showToast("✗ Error al guardar: " + e.message, "error");
    setFirebaseStatus(false);
  }
});

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════

function getValue(id) {
  return document.getElementById(id)?.value || "";
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;");
}

// ══════════════════════════════════════════════════════════════
//  INICIALIZACIÓN
// ══════════════════════════════════════════════════════════════

(async function init() {
  setFirebaseStatus(false);
  await Promise.all([loadTitleInputs(), loadFooterInputs()]);
})();
