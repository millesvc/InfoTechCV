function safeText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function safeWidth(id, value) {
  const element = document.getElementById(id);
  if (element) element.style.width = `${value}%`;
}

function clampPercent(value) {
  const num = Number(value || 0);
  return Math.max(0, Math.min(100, num));
}

function getEstadoByProgress(value) {
  if (value >= 100) return "Completado";
  if (value >= 60) return "Avanzado";
  if (value >= 20) return "En progreso";
  return "Iniciando";
}

function getNextStep(web, ia, ciber) {
  if (web < 100) return {
    titulo: "Sigue con Desarrollo Web",
    texto: "Tu ruta principal sigue siendo Desarrollo Web. Completa el siguiente módulo para subir tu progreso general."
  };
  if (ia < 100) return {
    titulo: "Activa Inteligencia Artificial",
    texto: "Ya tienes buena base web. Ahora puedes fortalecer tu perfil con IA y automatización."
  };
  if (ciber < 100) return {
    titulo: "Refuerza Ciberseguridad",
    texto: "Completa tu ruta ciber para tener un perfil más completo y profesional dentro de la plataforma."
  };
  return {
    titulo: "Ruta completa",
    texto: "Ya terminaste todas las rutas activas. Tu perfil quedó sólido dentro de InfoTechVC."
  };
}

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    const correo = String(user.email || "").trim().toLowerCase();
    const docSnap = await db.collection("alumnos").doc(correo).get();

    if (!docSnap.exists) {
      await auth.signOut();
      window.location.href = "index.html";
      return;
    }

    const data = docSnap.data() || {};
    const rol = String(data.rol || "alumno").toLowerCase();
    if (rol === "admin") {
      window.location.href = "admin.html";
      return;
    }

    const nombre = data.nombre || "Alumno";
    const curso = data.curso || "Desarrollo Web";
    const nivel = data.nivel || "Inicial";

    const web = clampPercent(data.progreso?.web);
    const ia = clampPercent(data.progreso?.ia);
    const ciber = clampPercent(data.progreso?.ciber);
    const total = Math.round((web + ia + ciber) / 3);
    const estado = getEstadoByProgress(total);
    const next = getNextStep(web, ia, ciber);

    safeText("saludoAlumno", `Bienvenido ${nombre} 👋`);
    safeText("correoAlumno", correo);
    safeText("correoAlumnoCard", correo);
    safeText("cursoAlumno", curso);
    safeText("cursoAlumnoCard", curso);
    safeText("cursoHero", curso);
    safeText("nivelAlumno", nivel);
    safeText("nivelAlumnoCard", nivel);
    safeText("nivelHero", nivel);
    safeText("progresoAlumno", `${total}%`);
    safeText("progresoAlumnoCard", `${total}%`);
    safeText("estadoAlumno", estado);
    safeText("ritmoAlumno", total >= 60 ? "Alto" : total >= 20 ? "Constante" : "Comenzando");

    safeText("textoProgresoWeb", `${web}%`);
    safeText("textoProgresoWebCard", `${web}%`);
    safeWidth("barraProgresoWeb", web);

    safeText("textoProgresoIA", `${ia}%`);
    safeWidth("barraProgresoIA", ia);

    safeText("textoProgresoCiber", `${ciber}%`);
    safeWidth("barraProgresoCiber", ciber);

    safeWidth("barraProgresoGeneral", total);

    safeText("siguientePasoTitulo", next.titulo);
    safeText("siguientePasoTexto", next.texto);

    const badgeIA = document.getElementById("badgeIA");
    const badgeCiber = document.getElementById("badgeCiber");
    const btnIA = document.getElementById("btnIA");
    const btnCiber = document.getElementById("btnCiber");

    if (badgeIA) badgeIA.textContent = ia > 0 ? "Activa" : "Disponible";
    if (badgeCiber) badgeCiber.textContent = ciber > 0 ? "Activa" : "Disponible";
    if (btnIA) btnIA.textContent = ia > 0 ? "Continuar ruta IA" : "Ver ruta IA";
    if (btnCiber) btnCiber.textContent = ciber > 0 ? "Continuar ruta Ciber" : "Ver ruta Ciber";
  } catch (error) {
    console.error("Error cargando panel:", error);
  }
});

function logout() {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
}
