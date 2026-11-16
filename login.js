import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth, mostrarMensagem } from "./comum.js";

const form = document.getElementById("form-login");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");

// Se já estiver logado (ou assim que entrar), vai para o painel
onAuthStateChanged(auth, (usuario) => {
  if (usuario) location.href = "painel.html";
});

// Traduz os códigos de erro do Firebase
const mensagensErro = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/email-already-in-use": "Este e-mail já está cadastrado.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco."
};

async function autenticar(funcao) {
  mostrarMensagem("Aguarde...");
  try {
    await funcao(auth, campoEmail.value.trim(), campoSenha.value);
  } catch (erro) {
    mostrarMensagem(mensagensErro[erro.code] || "Erro ao entrar. Tente novamente.", "erro");
    console.error(erro);
  }
}

// Entrar
form.addEventListener("submit", (evento) => {
  evento.preventDefault();
  autenticar(signInWithEmailAndPassword);
});

// Criar conta
document.getElementById("btn-cadastrar").addEventListener("click", () => {
  if (form.reportValidity()) autenticar(createUserWithEmailAndPassword);
});
