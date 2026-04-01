function clampPercent(value) {
  const num = Number(value || 0);
  return Math.max(0, Math.min(100, num));
}

async function requireStudent() {
  return new Promise((resolve) => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = "index.html";
        resolve(null);
        return;
      }

      const correo = String(user.email || "").trim().toLowerCase();
      const docSnap = await db.collection("alumnos").doc(correo).get();

      if (!docSnap.exists) {
        await auth.signOut();
        window.location.href = "index.html";
        resolve(null);
        return;
      }

      resolve({ user, data: docSnap.data() || {}, correo });
    });
  });
}

async function updateNestedProgress(correo, field, value) {
  const docRef = db.collection("alumnos").doc(correo);
  const docSnap = await docRef.get();

  if (docSnap.exists) {
    await docRef.update({ [field]: value });
  } else {
    const [, nestedKey] = field.split(".");
    await docRef.set({ progreso: { [nestedKey]: value } }, { merge: true });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireStudent();
  if (!session) return;

  const progreso = clampPercent(session.data.progreso?.web);
  const text = document.getElementById("textoProgreso");
  const bar = document.getElementById("barraCurso");
  if (text) text.textContent = `${progreso}%`;
  if (bar) bar.style.width = `${progreso}%`;
});

async function guardarProgreso(valor) {
  const user = auth.currentUser;
  if (!user) return;

  const correo = String(user.email || "").trim().toLowerCase();
  const nuevoValor = clampPercent(valor);

  try {
    await updateNestedProgress(correo, "progreso.web", nuevoValor);
    const text = document.getElementById("textoProgreso");
    const bar = document.getElementById("barraCurso");
    if (text) text.textContent = `${nuevoValor}%`;
    if (bar) bar.style.width = `${nuevoValor}%`;
  } catch (error) {
    console.error("Error guardando progreso web:", error);
  }
}
