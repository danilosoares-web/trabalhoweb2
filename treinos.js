import { collection, getDocs, doc, deleteDoc, query, where }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, exigirLogin, sair, mostrarMensagem, unidade, calcularPace, formatarPace, formatarData } from "./comum.js";

let treinos = [];
let usuario = null;
const lista = document.getElementById("lista");
const filtro = document.getElementById("filtro");

// READ: busca só os treinos do usuário logado
async function carregarTreinos() {
  mostrarMensagem("Carregando treinos...");
  try {
    const resultado = await getDocs(query(collection(db, "treinos"), where("uid", "==", usuario.uid)));
    treinos = resultado.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.data.localeCompare(a.data)); // mais recentes primeiro
    document.getElementById("mensagem").hidden = true;
    desenharLista();
  } catch (erro) {
    mostrarMensagem("Erro ao carregar treinos.", "erro");
    console.error(erro);
  }
}

function desenharLista() {
  const modalidade = filtro.value;
  const visiveis = modalidade === "todos" ? treinos : treinos.filter(t => t.modalidade === modalidade);
  document.getElementById("contador").textContent = `${visiveis.length} treino(s)`;

  if (visiveis.length === 0) {
    lista.innerHTML = '<p class="vazio">Nenhum treino encontrado. Registre o primeiro no Painel.</p>';
    return;
  }

  lista.innerHTML = visiveis.map(t => {
    const nome = t.modalidade === "corrida" ? "Corrida" : "Natação";
    const unidadePace = t.modalidade === "corrida" ? "min/km" : "min/100m";
    const temp = t.temperatura != null ? ` • ${t.temperatura.toFixed(1)}°C` : "";
    return `
      <article class="treino ${t.modalidade}">
        <h3>${nome} • ${formatarData(t.data)}</h3>
        <p>${t.distancia} ${unidade(t.modalidade)} em ${t.tempo} min${temp}</p>
        <p class="pace">Ritmo: ${formatarPace(calcularPace(t))} ${unidadePace}</p>
        <p>Esforço: ${t.esforco}/10</p>
        <div class="botoes">
          <a href="index.html?editar=${t.id}">Editar</a>
          <button data-id="${t.id}" class="perigo">Excluir</button>
        </div>
      </article>`;
  }).join("");
}

// DELETE
lista.addEventListener("click", async (evento) => {
  const botao = evento.target.closest("button[data-id]");
  if (!botao || !confirm("Excluir este treino?")) return;
  try {
    await deleteDoc(doc(db, "treinos", botao.dataset.id));
    mostrarMensagem("Treino excluído.", "sucesso");
    await carregarTreinos();
  } catch (erro) {
    mostrarMensagem("Erro ao excluir.", "erro");
  }
});

filtro.addEventListener("change", desenharLista);
document.getElementById("btn-sair").addEventListener("click", sair);

exigirLogin((user) => {
  usuario = user;
  document.getElementById("email-usuario").textContent = user.email;
  carregarTreinos();
});
