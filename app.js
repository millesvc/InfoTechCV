const UI = {
  loginModal: document.getElementById("loginModal"),
  inscripcionModal: document.getElementById("inscripcionModal"),
  mobileMenuToggle: document.getElementById("mobileMenuToggle"),
  mobileMenuPanel: document.getElementById("mobileMenuPanel"),
  loginError: document.getElementById("loginError"),
  loginContent: document.getElementById("loginContent"),
  loginSuccessBox: document.getElementById("loginSuccessBox"),
  loginSuccessName: document.getElementById("loginSuccessName"),
  inscripcionForm: document.getElementById("inscripcionForm"),
  inscripcionStatus: document.getElementById("inscripcionStatus")
};

function openModal(modal) {
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.add("modal-open");
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");

  const anyModalOpen = document.querySelector("#loginModal.flex, #inscripcionModal.flex");
  if (!anyModalOpen) {
    document.body.classList.remove("modal-open");
  }
}

function openLoginModal() {
  resetLoginState();
  openModal(UI.loginModal);
}

function closeLoginModal() {
  closeModal(UI.loginModal);
}

function openInscripcionModal() {
  openModal(UI.inscripcionModal);
}

function closeInscripcionModal() {
  closeModal(UI.inscripcionModal);
}

function resetLoginState() {
  if (UI.loginError) UI.loginError.textContent = "";
  if (UI.loginContent) UI.loginContent.classList.remove("hidden");
  if (UI.loginSuccessBox) UI.loginSuccessBox.classList.add("hidden");
}

function setLoginLoading(isLoading) {
  const button = UI.loginModal?.querySelector('button[onclick="login()"]');
  if (!button) return;

  button.disabled = isLoading;
  button.textContent = isLoading ? "Entrando..." : "Entrar";
}

function mapAuthError(error) {
  const message = String(error?.message || "");
  const code = String(error?.code || "");

  if (message.includes("no tiene perfil cargado")) {
    return "La cuenta existe, pero no tiene perfil cargado.";
  }

  if (
    code.includes("invalid-login-credentials") ||
    code.includes("wrong-password") ||
    code.includes("user-not-found") ||
    code.includes("invalid-credential")
  ) {
    return "Correo o contraseña incorrectos.";
  }

  if (code.includes("invalid-email")) {
    return "El correo no es válido.";
  }

  if (code.includes("too-many-requests")) {
    return "Demasiados intentos. Intenta nuevamente en unos minutos.";
  }

  if (code.includes("network-request-failed")) {
    return "Error de red. Revisa tu conexión e inténtalo otra vez.";
  }

  return `${code || "error"} | ${message || "No se pudo iniciar sesión."}`;
}

async function login() {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const email = emailInput?.value.trim().toLowerCase() || "";
  const password = passwordInput?.value || "";

  if (UI.loginError) UI.loginError.textContent = "";

  if (!email || !password) {
    if (UI.loginError) {
      UI.loginError.textContent = "Completa correo y contraseña.";
    }
    return;
  }

  try {
    setLoginLoading(true);

    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const correo = String(userCredential.user?.email || "").trim().toLowerCase();

    if (!correo) {
      await auth.signOut();
      throw new Error("No se pudo obtener el correo del usuario autenticado.");
    }

    const docRef = db.collection("alumnos").doc(correo);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      await auth.signOut();
      throw new Error("La cuenta existe, pero no tiene perfil cargado.");
    }

    const data = docSnap.data() || {};
    const nombre = data.nombre || "Alumno";
    const rol = String(data.rol || "alumno").toLowerCase();

    if (UI.loginContent) UI.loginContent.classList.add("hidden");
    if (UI.loginSuccessName) UI.loginSuccessName.textContent = nombre;
    if (UI.loginSuccessBox) UI.loginSuccessBox.classList.remove("hidden");

    setTimeout(() => {
      window.location.href = rol === "admin" ? "admin.html" : "panel-alumno.html";
    }, 700);
  } catch (error) {
    console.error("LOGIN ERROR REAL:", error);
    console.error("LOGIN CODE:", error?.code);
    console.error("LOGIN MESSAGE:", error?.message);

    if (UI.loginError) {
      UI.loginError.textContent = mapAuthError(error);
    }
  } finally {
    setLoginLoading(false);
  }
}

async function goToCurso(ruta) {
  const user = auth.currentUser;

  if (!user) {
    openLoginModal();
    return;
  }

  try {
    const correo = String(user.email || "").trim().toLowerCase();
    const docSnap = await db.collection("alumnos").doc(correo).get();

    if (!docSnap.exists) {
      await auth.signOut();
      openLoginModal();
      return;
    }

    const rol = String(docSnap.data()?.rol || "alumno").toLowerCase();

    if (rol !== "admin" && rol !== "alumno") {
      openLoginModal();
      return;
    }

    window.location.href = ruta;
  } catch (error) {
    console.error("Error al entrar al curso:", error);
    openLoginModal();
  }
}

async function handleInscripcionSubmit(event) {
  event.preventDefault();

  if (!UI.inscripcionForm || !UI.inscripcionStatus) return;

  const nombre = document.getElementById("nombre")?.value.trim() || "";
  const correo = document.getElementById("correo")?.value.trim().toLowerCase() || "";
  const curso = document.getElementById("curso")?.value || "Desarrollo Web";
  const edad = Number(document.getElementById("edad")?.value || 0);
  const mensaje = document.getElementById("mensaje")?.value.trim() || "";

  if (!nombre || !correo) {
    UI.inscripcionStatus.textContent = "Completa nombre y correo.";
    UI.inscripcionStatus.className = "sm:col-span-2 text-sm text-red-400 min-h-[20px]";
    return;
  }

  if (edad && (edad < 1 || edad > 100)) {
    UI.inscripcionStatus.textContent = "La edad debe estar entre 1 y 100.";
    UI.inscripcionStatus.className = "sm:col-span-2 text-sm text-red-400 min-h-[20px]";
    return;
  }

  try {
    UI.inscripcionStatus.textContent = "Enviando solicitud...";
    UI.inscripcionStatus.className = "sm:col-span-2 text-sm text-cyan-300 min-h-[20px]";

    await db.collection("solicitudes").doc(correo).set(
      {
        nombre,
        correo,
        curso,
        edad: edad || null,
        mensaje,
        estado: "pendiente",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    UI.inscripcionForm.reset();
    UI.inscripcionStatus.textContent = "Solicitud enviada correctamente.";
    UI.inscripcionStatus.className = "sm:col-span-2 text-sm text-emerald-400 min-h-[20px]";
  } catch (error) {
    console.error("Error enviando solicitud:", error);
    UI.inscripcionStatus.textContent = "No se pudo enviar la solicitud.";
    UI.inscripcionStatus.className = "sm:col-span-2 text-sm text-red-400 min-h-[20px]";
  }
}

function initMenu() {
  if (!UI.mobileMenuToggle || !UI.mobileMenuPanel) return;

  UI.mobileMenuToggle.addEventListener("click", () => {
    const isOpen = !UI.mobileMenuPanel.classList.contains("hidden");
    UI.mobileMenuPanel.classList.toggle("hidden", isOpen);
    UI.mobileMenuToggle.setAttribute("aria-expanded", String(!isOpen));
  });

  UI.mobileMenuPanel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      UI.mobileMenuPanel.classList.add("hidden");
      UI.mobileMenuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function initAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show", "visible");
        }
      });
    },
    { threshold: 0.12 }
  );

  document
    .querySelectorAll(".fade-up, .fade-left, .fade-right, .fade-in")
    .forEach((element) => observer.observe(element));
}

function initModalCloseEvents() {
  [UI.loginModal, UI.inscripcionModal].forEach((modal) => {
    if (!modal) return;

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeLoginModal();
    closeInscripcionModal();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initAnimations();
  initModalCloseEvents();

  if (UI.inscripcionForm) {
    UI.inscripcionForm.addEventListener("submit", handleInscripcionSubmit);
  }
});

window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openInscripcionModal = openInscripcionModal;
window.closeInscripcionModal = closeInscripcionModal;
window.login = login;
window.goToCurso = goToCurso;

function actualizarEstadoSoporte() {
  const estado = document.getElementById("estado-soporte");
  const boton = document.querySelector("#soporte a");
  if (!estado) return;

  const ahoraChile = new Date();
  const hora = parseInt(
    ahoraChile.toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      hour: "2-digit",
      hour12: false,
    })
  );

  console.log("Hora Chile:", hora);

  if (hora >= 10 && hora < 20) {
    estado.innerHTML = "🟢 Soporte en línea";
    estado.className = "mt-3 text-green-400 font-semibold";
    if (boton) boton.innerHTML = "💬 Soporte WhatsApp";
  } else if (hora >= 8 && hora < 10) {
    estado.innerHTML = "🟡 Respondemos pronto";
    estado.className = "mt-3 text-yellow-400 font-semibold";
    if (boton) boton.innerHTML = "💬 Escríbenos por WhatsApp";
  } else {
    estado.innerHTML = "🔴 Estamos fuera de horario, pero puedes escribirnos";
    estado.className = "mt-3 text-red-400 font-semibold";
    if (boton) boton.innerHTML = "💬 Dejar mensaje en WhatsApp";
  }
}

document.addEventListener("DOMContentLoaded", actualizarEstadoSoporte);