// ============================================================
//  firebase-connect.js
//  Módulo compartido: inicializa Firebase y exporta helpers
//  de lectura/escritura en Firestore.
// ============================================================

import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Configuración del proyecto ──────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyAhP8gjoeN1hqWmvc6RU-k22eMu7Y6eUOM",
  authDomain:        "editor-web-b32fd.firebaseapp.com",
  projectId:         "editor-web-b32fd",
  storageBucket:     "editor-web-b32fd.firebasestorage.app",
  messagingSenderId: "652329560348",
  appId:             "1:652329560348:web:72b363ded45ccb658df2d9",
};

// ── Inicialización ───────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Exportar db y utilidades de Firestore ───────────────────
export {
  db,
  doc, getDoc, setDoc, updateDoc,
  collection, getDocs, addDoc, deleteDoc,
  onSnapshot, query, orderBy,
};

// ── Colecciones y documentos usados ─────────────────────────
export const REFS = {
  siteConfig : () => doc(db, "site", "config"),          // título, subtítulo, logo nav
  footerConfig: () => doc(db, "site", "footer"),          // footer completo
  sections    : () => collection(db, "sections"),          // secciones del sitio
  containers  : () => collection(db, "containers"),        // contenedores de cada sección
  sectionDoc  : (id) => doc(db, "sections",   id),
  containerDoc: (id) => doc(db, "containers", id),
};

// ══════════════════════════════════════════════════════════════
//  HELPERS GENÉRICOS
// ══════════════════════════════════════════════════════════════

/** Lee un documento una sola vez. Devuelve null si no existe. */
export async function readDoc(ref) {
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Escribe/sobreescribe un documento. */
export async function writeDoc(ref, data) {
  await setDoc(ref, data, { merge: true });
}

/** Agrega un nuevo documento a una colección. Devuelve el id generado. */
export async function addDocument(colRef, data) {
  const docRef = await addDoc(colRef, data);
  return docRef.id;
}

/** Elimina un documento por su referencia. */
export async function removeDoc(ref) {
  await deleteDoc(ref);
}

/** Lee todos los docs de una colección ordenados por campo. */
export async function readCollection(colRef, orderField = "order") {
  const q    = query(colRef, orderBy(orderField));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Suscripción en tiempo real a un documento. Devuelve la función unsub. */
export function watchDoc(ref, callback) {
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

/** Suscripción en tiempo real a una colección ordenada. */
export function watchCollection(colRef, orderField, callback) {
  const q = query(colRef, orderBy(orderField));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
