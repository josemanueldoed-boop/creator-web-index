// ============================================================
//  index-render.js
//  Escucha Firestore en tiempo real y renderiza la página
//  principal (index.html) sin recargar.
// ============================================================

import {
  REFS,
  watchDoc,
  watchCollection,
  readCollection,
} from "./firebase-connect.js";

// ── Referencias al DOM ───────────────────────────────────────
const mainTitle     = document.getElementById("main-title");
const mainSubtitle  = document.getElementById("main-subtitle");
const navLogoText   = document.getElementById("nav-logo-text");
const navLinks      = document.getElementById("nav-links-container");
const mainContent   = document.getElementById("main-content");
const pageTitle     = document.getElementById("page-title-tag");

const footerBrand   = document.getElementById("footer-brand-name");
const footerAddress = document.getElementById("footer-address");
const footerCopy    = document.getElementById("footer-copyright");
const footerSocial  = document.getElementById("footer-social-links");

// ══════════════════════════════════════════════════════════════
//  1. TÍTULO / HERO (tiempo real)
// ══════════════════════════════════════════════════════════════
watchDoc(REFS.siteConfig(), (data) => {
  if (!data) return;
  if (mainTitle)    mainTitle.textContent    = data.title    || "Bienvenido";
  if (mainSubtitle) mainSubtitle.textContent = data.subtitle || "";
  if (navLogoText)  navLogoText.textContent  = data.navLogo  || data.title || "Mi Sitio";
  if (pageTitle)    pageTitle.textContent    = data.title    || "Mi Sitio Web";
});

// ══════════════════════════════════════════════════════════════
//  2. FOOTER (tiempo real)
// ══════════════════════════════════════════════════════════════
watchDoc(REFS.footerConfig(), (data) => {
  if (!data) return;
  if (footerBrand)   footerBrand.textContent   = data.brand     || "";
  if (footerAddress) footerAddress.textContent = data.address   || "";
  if (footerCopy)    footerCopy.textContent    = data.copyright || "";

  if (footerSocial) {
    footerSocial.innerHTML = "";
    (data.socialLinks || []).forEach(link => {
      if (!link.url) return;
      const a = document.createElement("a");
      a.href   = link.url;
      a.target = "_blank";
      a.rel    = "noopener noreferrer";
      a.textContent = link.label || link.url;
      footerSocial.appendChild(a);
    });
  }
});

// ══════════════════════════════════════════════════════════════
//  3. SECCIONES + CONTENEDORES (tiempo real)
// ══════════════════════════════════════════════════════════════
watchCollection(REFS.sections(), "order", async (sections) => {
  if (!mainContent) return;
  mainContent.innerHTML = "";

  // Reconstruir links de navegación
  if (navLinks) {
    navLinks.innerHTML = "";
    sections.forEach(sec => {
      const a = document.createElement("a");
      a.href        = `#sec-${sec.id}`;
      a.textContent = sec.name;
      navLinks.appendChild(a);
    });
  }

  // Cargar todos los contenedores una sola vez para distribuirlos
  let allContainers = [];
  try {
    allContainers = await readCollection(REFS.containers(), "order");
  } catch (_) {}

  // Renderizar cada sección con sus contenedores
  sections.forEach(sec => {
    const containers = allContainers.filter(c => c.sectionId === sec.id);
    mainContent.appendChild(buildSection(sec, containers));
  });
});

// ══════════════════════════════════════════════════════════════
//  BUILDERS
// ══════════════════════════════════════════════════════════════

/**
 * Construye el bloque <section> de una sección.
 */
function buildSection(sec, containers) {
  const section = document.createElement("section");
  section.className = "section-block";
  section.id = `sec-${sec.id}`;

  // Encabezado de sección
  const accent = document.createElement("div");
  accent.className = "section-title-accent";

  const title = document.createElement("h2");
  title.className   = "section-title";
  title.textContent = sec.name;

  section.appendChild(accent);
  section.appendChild(title);

  if (sec.subtitle) {
    const sub = document.createElement("p");
    sub.className   = "section-subtitle";
    sub.textContent = sec.subtitle;
    section.appendChild(sub);
  }

  // Grid de contenedores
  if (containers.length > 0) {
    const cols = containers[0].cols || 3;
    const grid = document.createElement("div");
    grid.className = "containers-grid";
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    containers.forEach(c => grid.appendChild(buildCard(c)));
    section.appendChild(grid);
  }

  return section;
}

/**
 * Construye una tarjeta de contenedor.
 */
function buildCard(c) {
  const card = document.createElement("div");
  card.className = "container-card";

  // Determinar altura de imagen según tamaño
  const heights = { small: "140px", medium: "200px", large: "280px", full: "360px" };
  const imgH    = heights[c.size] || "200px";

  // Imagen
  if ((c.type === "image" || c.type === "both") && c.imageUrl) {
    const img  = document.createElement("img");
    img.src    = c.imageUrl;
    img.alt    = c.title || "";
    img.className = "card-image";
    img.style.height = imgH;
    img.onerror = () => img.style.display = "none";
    card.appendChild(img);
  }

  // Cuerpo de texto
  if (c.type === "text" || c.type === "both") {
    const body = document.createElement("div");
    body.className = "card-body";

    if (c.title) {
      const h = document.createElement("h3");
      h.className   = "card-title";
      h.textContent = c.title;
      body.appendChild(h);
    }
    if (c.text) {
      const p = document.createElement("p");
      p.className   = "card-text";
      p.textContent = c.text;
      body.appendChild(p);
    }
    card.appendChild(body);
  }

  return card;
}
