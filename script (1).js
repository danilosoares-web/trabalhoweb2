// ================== FIREBASE ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, writeBatch, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// COLE AQUI a configuração do seu projeto (Firebase > Configurações do projeto > Seus apps > Web)
const firebaseConfig = {
  apiKey: "AIzaSyDhCBZ7BpZdUnl1c-27dmAtOpTHFDV1NC0",
  authDomain: "diario-de-treinos-82702.firebaseapp.com",
  projectId: "diario-de-treinos-82702",
  storageBucket: "diario-de-treinos-82702.firebasestorage.app",
  messagingSenderId: "950274445519",
  appId: "1:950274445519:web:dc36f16b9a9a7e590de7ba"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colecao = collection(db, "treinos");

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
const lista = document.getElementById("lista");
const caixaMensagem = document.getElementById("mensagem");

// ================== FUNÇÕES AUXILIARES ==================

// Mostra uma mensagem no topo (tipo: "sucesso", "erro" ou "")
function mostrarMensagem(texto, tipo = "") {
  caixaMensagem.textContent = texto;
  caixaMensagem.className = tipo;
  caixaMensagem.hidden = false;
  if (tipo) setTimeout(() => (caixaMensagem.hidden = true), 3500);
}

// Corrida usa km; natação usa metros
function unidade(modalidade) {
  return modalidade === "corrida" ? "km" : "m";
}

// Corrida: min/km. Natação: min/100m
function calcularPace(treino) {
  if (treino.modalidade === "corrida") return treino.tempo / treino.distancia;
  return treino.tempo / (treino.distancia / 100);
}

// Transforma 5.5 (minutos) em "5:30"
function formatarPace(minutos) {
  const min = Math.floor(minutos);
  const seg = Math.round((minutos - min) * 60);
  return `${min}:${String(seg).padStart(2, "0")}`;
}

// "2025-03-09" -> "09/03/2025"
function formatarData(dataIso) {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

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
    const resultado = await getDocs(query(colecao, orderBy("data")));
    treinos = resultado.docs.map(d => ({ id: d.id, ...d.data() }));
    caixaMensagem.hidden = true;
    atualizarTela();
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
    temperatura: null
  };

  mostrarMensagem("Salvando...");
  if (treino.cidade) treino.temperatura = await buscarTemperatura(treino.cidade, treino.data);

  try {
    if (idEmEdicao) {
      await updateDoc(doc(db, "treinos", idEmEdicao), treino);
      mostrarMensagem("Treino atualizado!", "sucesso");
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
  desenharLista();
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

function desenharLista() {
  if (treinos.length === 0) {
    lista.innerHTML = '<p class="vazio">Nenhum treino ainda. Cadastre o primeiro ou gere dados de exemplo.</p>';
    return;
  }

  // Mais recentes primeiro
  const ordenados = [...treinos].reverse();
  lista.innerHTML = ordenados.map(t => {
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
          <button data-acao="editar" data-id="${t.id}">Editar</button>
          <button data-acao="excluir" data-id="${t.id}" class="perigo">Excluir</button>
        </div>
      </article>`;
  }).join("");
}

// Um único "ouvinte" para os botões de editar e excluir
lista.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button");
  if (!botao) return;
  if (botao.dataset.acao === "editar") iniciarEdicao(botao.dataset.id);
  if (botao.dataset.acao === "excluir") excluirTreino(botao.dataset.id);
});

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
carregarTreinos();
