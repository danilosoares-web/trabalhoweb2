import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// COLE AQUI o seu firebaseConfig (o mesmo que estava no script.js)
const firebaseConfig = {
  apiKey: "AIzaSyDhCBZ7BpZdUnl1c-27dmAtOpTHFDV1NC0",
  authDomain: "diario-de-treinos-82702.firebaseapp.com",
  projectId: "diario-de-treinos-82702",
  storageBucket: "diario-de-treinos-82702.firebasestorage.app",
  messagingSenderId: "950274445519",
  appId: "1:950274445519:web:dc36f16b9a9a7e590de7ba"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Protege a página: sem login, volta para a tela de login
export function exigirLogin(aoEntrar) {
  onAuthStateChanged(auth, (usuario) => {
    if (usuario) aoEntrar(usuario);
    else location.href = "login.html";
  });
}

export async function sair() {
  await signOut(auth);
  location.href = "login.html";
}

// ===== Funções auxiliares =====
export function mostrarMensagem(texto, tipo = "") {
  const caixa = document.getElementById("mensagem");
  caixa.textContent = texto;
  caixa.className = tipo;
  caixa.hidden = false;
  if (tipo) setTimeout(() => (caixa.hidden = true), 3500);
}

export function unidade(modalidade) {
  return modalidade === "corrida" ? "km" : "m";
}

// Corrida: min/km. Natação: min/100m
export function calcularPace(treino) {
  if (treino.modalidade === "corrida") return treino.tempo / treino.distancia;
  return treino.tempo / (treino.distancia / 100);
}

// 5.5 (minutos) -> "5:30"
export function formatarPace(minutos) {
  const min = Math.floor(minutos);
  const seg = Math.round((minutos - min) * 60);
  return `${min}:${String(seg).padStart(2, "0")}`;
}

// "2025-03-09" -> "09/03/2025"
export function formatarData(dataIso) {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}
