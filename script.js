// ================== FIREBASE ==================
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, writeBatch, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, exigirLogin, sair, mostrarMensagem, unidade, calcularPace, formatarPace, formatarData } from "./comum.js";

const colecao = collection(db, "treinos");
let usuario = null; // usuário logado

// Aparência padrão dos gráficos (tema escuro)
Chart.defaults.color = "#8ea0b8";
Chart.defaults.borderColor = "#24344f";
Chart.defaults.font.family = "Barlow, sans-serif";

// ================== VARIÁVEIS GLOBAIS ==================
let treinos = [];          // lista local dos treinos
let idEmEdicao = null;     // guarda o id quando estamos editando
let graficoPace = null;
let graficoDistancia = null;

// Elementos da página
const form = document.getElementById("form-treino");
const campoModalidade = document.getElementById("modalidade");
const campoData = document.getElementById("data");
const campoDistancia = document.getElementById("distancia");
const campoTempo = document.getElementById("tempo");
const campoEsforco = document.getElementById("esforco");
const campoCidade = document.getElementById("cidade");
const filtro = document.getElementById("filtro");
const caixaMensagem = document.getElementById("mensagem");

// ================== FUNÇÕES AUXILIARES ==================

// ================== API EXTERNA: OPEN-METEO ==================
// Busca a temperatura média do dia na cidade informada
async function buscarTemperatura(cidade, data) {
  try {
    // 1) transforma o nome da cidade em coordenadas
    const respGeo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt`
    );
    if (!respGeo.ok) throw new Error("Erro ao buscar a cidade");
    const geo = await respGeo.json();
    if (!geo.results) throw new Error("Cidade não encontrada");
    const { latitude, longitude } = geo.results[0];

    // 2) busca a temperatura do dia (arquivo histórico para datas antigas)
    const dias = (Date.now() - new Date(data).getTime()) / 86400000;
    const base = dias > 80
      ? "https://archive-api.open-meteo.com/v1/archive"
      : "https://api.open-meteo.com/v1/forecast";
    const respClima = await fetch(
      `${base}?latitude=${latitude}&longitude=${longitude}&start_date=${data}&end_date=${data}&daily=temperature_2m_mean&timezone=auto`
    );
    if (!respClima.ok) throw new Error("Erro ao buscar o clima");
    const clima = await respClima.json();
    return clima.daily.temperature_2m_mean[0];
  } catch (erro) {
    mostrarMensagem("Não foi possível buscar a temperatura: " + erro.message, "erro");
    return null; // o treino ainda é salvo, só sem temperatura
  }
}

// ================== CRUD (FIRESTORE) ==================

// READ: carrega todos os treinos ordenados por data
async function carregarTreinos() {
  mostrarMensagem("Carregando treinos...");
  try {
    const resultado = await getDocs(query(colecao, where("uid", "==", usuario.uid)));
    treinos = resultado.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.data.localeCompare(b.data)); // mais antigos primeiro
    caixaMensagem.hidden = true;
    atualizarTela();

    // Veio da página "Meus treinos" com ?editar=ID? Abre o treino no formulário
    const idParaEditar = new URLSearchParams(location.search).get("editar");
    if (idParaEditar && treinos.some(t => t.id === idParaEditar)) iniciarEdicao(idParaEditar);
  } catch (erro) {
    mostrarMensagem("Erro ao carregar treinos. Confira o firebaseConfig e as regras do Firestore.", "erro");
    console.error(erro);
  }
}

// CREATE e UPDATE: salvar o formulário
form.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const treino = {
    modalidade: campoModalidade.value,
    data: campoData.value,
    distancia: Number(campoDistancia.value),
    tempo: Number(campoTempo.value),
    esforco: Number(campoEsforco.value),
    cidade: campoCidade.value.trim(),
    temperatura: null,
    uid: usuario.uid // dono do treino
  };

  mostrarMensagem("Salvando...");
  if (treino.cidade) treino.temperatura = await buscarTemperatura(treino.cidade, treino.data);

  try {
    if (idEmEdicao) {
      await updateDoc(doc(db, "treinos", idEmEdicao), treino);
      mostrarMensagem("Treino atualizado!", "sucesso");
      setTimeout(() => (location.href = "treinos.html"), 800);
    } else {
      await addDoc(colecao, treino);
      mostrarMensagem("Treino salvo!", "sucesso");
    }
    sairDaEdicao();
    await carregarTreinos();
  } catch (erro) {
    mostrarMensagem("Erro ao salvar o treino.", "erro");
    console.error(erro);
  }
});

// DELETE: excluir um treino
async function excluirTreino(id) {
  if (!confirm("Excluir este treino?")) return;
  try {
    await deleteDoc(doc(db, "treinos", id));
    mostrarMensagem("Treino excluído.", "sucesso");
    await carregarTreinos();
  } catch (erro) {
    mostrarMensagem("Erro ao excluir.", "erro");
  }
}

// Preenche o formulário para editar
function iniciarEdicao(id) {
  const t = treinos.find(item => item.id === id);
  idEmEdicao = id;
  campoModalidade.value = t.modalidade;
  campoData.value = t.data;
  campoDistancia.value = t.distancia;
  campoTempo.value = t.tempo;
  campoEsforco.value = t.esforco;
  campoCidade.value = t.cidade || "";
  atualizarRotuloDistancia();
  document.getElementById("titulo-form").textContent = "Editar treino";
  document.getElementById("btn-salvar").textContent = "Atualizar treino";
  document.getElementById("btn-cancelar").hidden = false;
  form.scrollIntoView({ behavior: "smooth" });
}

function sairDaEdicao() {
  idEmEdicao = null;
  form.reset();
  atualizarRotuloDistancia();
  document.getElementById("titulo-form").textContent = "Novo treino";
  document.getElementById("btn-salvar").textContent = "Salvar treino";
  document.getElementById("btn-cancelar").hidden = true;
}

document.getElementById("btn-cancelar").addEventListener("click", sairDaEdicao);

// ================== DADOS DE EXEMPLO ==================
// Gera 8 semanas de treinos com ritmo melhorando aos poucos
document.getElementById("btn-demo").addEventListener("click", async () => {
  mostrarMensagem("Gerando dados de exemplo...");
  const batch = writeBatch(db);
  const hoje = new Date();

  for (let semana = 7; semana >= 0; semana--) {
    const melhora = (7 - semana) * 0.08; // quanto o atleta melhorou até agora

    // Define 3 treinos por semana: dias, modalidade e distância
    const planos = [
      { diasAtras: semana * 7 + 5, modalidade: "corrida", distancia: 5 + Math.random() * 5 },
      { diasAtras: semana * 7 + 3, modalidade: "natacao", distancia: 800 + Math.round(Math.random() * 6) * 100 },
      { diasAtras: semana * 7 + 1, modalidade: "corrida", distancia: 6 + Math.random() * 6 }
    ];

    planos.forEach(plano => {
      const dia = new Date(hoje);
      dia.setDate(hoje.getDate() - plano.diasAtras);

      const ruido = (Math.random() - 0.5) * 0.15;
      const pace = plano.modalidade === "corrida"
        ? 6.2 - melhora + ruido      // min/km
        : 2.4 - melhora * 0.4 + ruido * 0.4; // min/100m
      const distancia = plano.modalidade === "corrida"
        ? Number(plano.distancia.toFixed(1))
        : plano.distancia;
      const tempo = plano.modalidade === "corrida"
        ? pace * distancia
        : pace * (distancia / 100);

      batch.set(doc(colecao), {
        uid: usuario.uid,
        modalidade: plano.modalidade,
        data: dia.toISOString().slice(0, 10),
        distancia,
        tempo: Number(tempo.toFixed(1)),
        esforco: Math.min(10, Math.max(3, Math.round(7 - melhora + Math.random() * 2))),
        cidade: "Exemplo",
        temperatura: Number((20 + Math.random() * 10).toFixed(1))
      });
    });
  }

  try {
    await batch.commit();
    mostrarMensagem("24 treinos de exemplo criados!", "sucesso");
    await carregarTreinos();
  } catch (erro) {
    mostrarMensagem("Erro ao gerar dados de exemplo.", "erro");
  }
});

// Apaga tudo (útil para limpar os dados de exemplo)
document.getElementById("btn-limpar").addEventListener("click", async () => {
  if (!confirm("Apagar TODOS os treinos?")) return;
  try {
    const batch = writeBatch(db);
    treinos.forEach(t => batch.delete(doc(db, "treinos", t.id)));
    await batch.commit();
    mostrarMensagem("Todos os treinos foram apagados.", "sucesso");
    await carregarTreinos();
  } catch (erro) {
    mostrarMensagem("Erro ao apagar.", "erro");
  }
});

// ================== TELA: LISTA E GRÁFICOS ==================
function atualizarTela() {
  desenharResumo();
  desenharGraficos();
}

// Cartões de resumo no topo da página
function desenharResumo() {
  const corridas = treinos.filter(t => t.modalidade === "corrida");
  const nados = treinos.filter(t => t.modalidade === "natacao");

  const kmCorridos = corridas.reduce((soma, t) => soma + t.distancia, 0);
  const metrosNadados = nados.reduce((soma, t) => soma + t.distancia, 0);
  const melhorRitmo = corridas.length ? Math.min(...corridas.map(calcularPace)) : null;

  document.getElementById("stats").innerHTML = `
    <div class="stat"><span>Treinos registrados</span><strong>${treinos.length}</strong></div>
    <div class="stat corrida"><span>Corrida total</span><strong>${kmCorridos.toFixed(1)} km</strong></div>
    <div class="stat natacao"><span>Natação total</span><strong>${metrosNadados} m</strong></div>
    <div class="stat corrida"><span>Melhor ritmo de corrida</span><strong>${melhorRitmo ? formatarPace(melhorRitmo) + " /km" : "--"}</strong></div>`;
}

function desenharGraficos() {
  const modalidade = filtro.value;
  const cor = modalidade === "corrida" ? "#ff7a45" : "#38bdf8";
  const doTipo = treinos.filter(t => t.modalidade === modalidade);
  const datas = doTipo.map(t => formatarData(t.data).slice(0, 5)); // dd/mm

  document.getElementById("titulo-pace").textContent =
    modalidade === "corrida" ? "Ritmo (min/km)" : "Ritmo (min/100m)";

  // Remove os gráficos antigos antes de desenhar novos
  if (graficoPace) graficoPace.destroy();
  if (graficoDistancia) graficoDistancia.destroy();

  graficoPace = new Chart(document.getElementById("grafico-pace"), {
    type: "line",
    data: {
      labels: datas,
      datasets: [{
        label: "Ritmo",
        data: doTipo.map(calcularPace),
        borderColor: cor,
        backgroundColor: cor,
        tension: 0.3
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        // reverse: ritmo menor (mais rápido) aparece mais alto
        y: { reverse: true, ticks: { callback: valor => formatarPace(valor) } }
      }
    }
  });

  graficoDistancia = new Chart(document.getElementById("grafico-distancia"), {
    type: "bar",
    data: {
      labels: datas,
      datasets: [{
        label: "Distância (" + unidade(modalidade) + ")",
        data: doTipo.map(t => t.distancia),
        backgroundColor: cor
      }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

// ================== EVENTOS GERAIS ==================
function atualizarRotuloDistancia() {
  const mod = campoModalidade.value;
  document.getElementById("rotulo-distancia").textContent =
    mod === "corrida" ? "Distância (km)" : "Distância (metros)";
  campoDistancia.step = mod === "corrida" ? "0.1" : "50";
}

campoModalidade.addEventListener("change", atualizarRotuloDistancia);
filtro.addEventListener("change", desenharGraficos);

// Início: data de hoje no formulário e carregar do banco
campoData.value = new Date().toISOString().slice(0, 10);

// Só carrega os dados depois de confirmar que há um usuário logado
exigirLogin((user) => {
  usuario = user;
  document.getElementById("email-usuario").textContent = user.email;
  carregarTreinos();
});
document.getElementById("btn-sair").addEventListener("click", sair);
