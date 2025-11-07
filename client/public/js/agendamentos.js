import { API_URL } from './config.js';

// Verificar autenticação
document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('token');
  if (!token) {
    Swal.fire({
      title: 'Erro',
      text: 'Você precisa estar logado para acessar esta página',
      icon: 'error',
      confirmButtonText: 'Ir para Login',
      confirmButtonColor: '#002A42'
    }).then(() => {
      window.location.href = '/client/views/login.html';
    });
    return;
  }

  inicializarEventos();
  carregarPacientes();
  carregarAgendamentos();
  carregarEstatisticas();
});

// Variáveis globais
let agendamentos = [];
let pacientes = [];
let agendamentoEditando = null;

// Inicializar eventos
function inicializarEventos() {
  // Botão novo agendamento
  document.getElementById('novoAgendamentoBtn').addEventListener('click', () => {
    abrirModalAgendamento();
  });

  // Fechar modais
  document.getElementById('fecharModal').addEventListener('click', fecharModalAgendamento);
  document.getElementById('fecharModalDetalhes').addEventListener('click', fecharModalDetalhes);
  document.getElementById('fecharDetalhesBtn').addEventListener('click', fecharModalDetalhes);
  document.getElementById('cancelarFormBtn').addEventListener('click', fecharModalAgendamento);

  // Filtros
  document.getElementById('aplicarFiltrosBtn').addEventListener('click', aplicarFiltros);
  document.getElementById('limparFiltrosBtn').addEventListener('click', limparFiltros);

  // Formulário
  document.getElementById('formAgendamento').addEventListener('submit', salvarAgendamento);

  // Tipo de consulta - mostrar/ocultar campos condicionais
  document.getElementById('tipoConsulta').addEventListener('change', function() {
    const tipo = this.value;
    const enderecoFields = document.getElementById('enderecoFields');
    const linkVideoFields = document.getElementById('linkVideoFields');

    if (tipo === 'presencial' || tipo === 'domiciliar') {
      enderecoFields.style.display = 'block';
      linkVideoFields.style.display = 'none';
    } else if (tipo === 'online') {
      enderecoFields.style.display = 'none';
      linkVideoFields.style.display = 'block';
    } else {
      enderecoFields.style.display = 'none';
      linkVideoFields.style.display = 'none';
    }
  });

  // Botão editar nos detalhes
  document.getElementById('editarDetalhesBtn').addEventListener('click', function() {
    if (agendamentoEditando) {
      fecharModalDetalhes();
      abrirModalAgendamento(agendamentoEditando);
    }
  });

  // Fechar modal ao clicar fora
  document.getElementById('modalAgendamento').addEventListener('click', function(e) {
    if (e.target === this) {
      fecharModalAgendamento();
    }
  });

  document.getElementById('modalDetalhes').addEventListener('click', function(e) {
    if (e.target === this) {
      fecharModalDetalhes();
    }
  });
}

// Carregar pacientes
async function carregarPacientes() {
  try {
    const response = await fetch(`${API_URL}/api/pacientes/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao carregar pacientes');
    }

    pacientes = await response.json();
    preencherSelectPacientes();
  } catch (error) {
    console.error('Erro ao carregar pacientes:', error);
    Swal.fire({
      title: 'Erro',
      text: 'Erro ao carregar lista de pacientes',
      icon: 'error',
      confirmButtonColor: '#002A42'
    });
  }
}

// Preencher select de pacientes
function preencherSelectPacientes() {
  const select = document.getElementById('pacienteId');
  select.innerHTML = '<option value="">Selecione um paciente</option>';
  
  pacientes.forEach(paciente => {
    const option = document.createElement('option');
    option.value = paciente._id || paciente.id;
    option.textContent = paciente.name || paciente.nome || 'Paciente sem nome';
    select.appendChild(option);
  });
}

// Carregar agendamentos
async function carregarAgendamentos() {
  const loading = document.getElementById('loadingAgendamentos');
  const lista = document.getElementById('listaAgendamentos');
  const emptyState = document.getElementById('semAgendamentos');

  try {
    loading.style.display = 'block';
    lista.innerHTML = '';
    emptyState.style.display = 'none';

    const response = await fetch(`${API_URL}/api/agendamentos/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao carregar agendamentos');
    }

    const data = await response.json();
    agendamentos = data.agendamentos || data || [];

    loading.style.display = 'none';

    if (agendamentos.length === 0) {
      emptyState.style.display = 'block';
    } else {
      renderizarAgendamentos(agendamentos);
    }
  } catch (error) {
    console.error('Erro ao carregar agendamentos:', error);
    loading.style.display = 'none';
    Swal.fire({
      title: 'Erro',
      text: 'Erro ao carregar agendamentos',
      icon: 'error',
      confirmButtonColor: '#002A42'
    });
  }
}

// Carregar estatísticas
async function carregarEstatisticas() {
  try {
    const response = await fetch(`${API_URL}/api/agendamentos/estatisticas`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      // Se não houver rota de estatísticas, calcular localmente
      calcularEstatisticasLocais();
      return;
    }

    const stats = await response.json();
    atualizarEstatisticas(stats);
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
    calcularEstatisticasLocais();
  }
}

// Calcular estatísticas localmente
function calcularEstatisticasLocais() {
  const stats = {
    agendadas: agendamentos.filter(a => a.status === 'agendada').length,
    confirmadas: agendamentos.filter(a => a.status === 'confirmada').length,
    realizadas: agendamentos.filter(a => a.status === 'realizada').length,
    canceladas: agendamentos.filter(a => a.status === 'cancelada').length
  };
  atualizarEstatisticas(stats);
}

// Atualizar estatísticas na tela
function atualizarEstatisticas(stats) {
  // Se stats for um objeto com a estrutura da API
  if (stats && typeof stats === 'object') {
    document.getElementById('statAgendadas').textContent = stats.agendadas || 0;
    document.getElementById('statConfirmadas').textContent = stats.confirmadas || 0;
    document.getElementById('statRealizadas').textContent = stats.realizadas || 0;
    document.getElementById('statCanceladas').textContent = stats.canceladas || 0;
  }
}

// Renderizar agendamentos
function renderizarAgendamentos(agendamentosList) {
  const lista = document.getElementById('listaAgendamentos');
  lista.innerHTML = '';

  agendamentosList.forEach(agendamento => {
    const card = criarCardAgendamento(agendamento);
    lista.appendChild(card);
  });
}

// Criar card de agendamento
function criarCardAgendamento(agendamento) {
  const card = document.createElement('div');
  card.className = `agendamento-card ${agendamento.status}`;
  
  // Tratar pacienteId que pode ser objeto ou string
  let paciente = {};
  if (agendamento.pacienteId) {
    if (typeof agendamento.pacienteId === 'object' && agendamento.pacienteId !== null) {
      paciente = agendamento.pacienteId;
    } else {
      // Se for apenas ID, usar dados do agendamento
      paciente = {
        _id: agendamento.pacienteId,
        name: agendamento.pacienteNome,
        email: agendamento.pacienteEmail,
        phone: agendamento.pacienteTelefone
      };
    }
  }
  
  const dataHora = new Date(agendamento.dataHora);
  const dataFormatada = formatarData(dataHora);
  const horaFormatada = formatarHora(dataHora);
  const tipoConsultaLabels = {
    presencial: 'Presencial',
    online: 'Online',
    domiciliar: 'Domiciliar'
  };

  card.innerHTML = `
    <div class="agendamento-header">
      <div class="agendamento-paciente">
        <div class="paciente-nome">
          <i class="fas fa-user"></i>
          ${paciente.name || paciente.nome || agendamento.pacienteNome || 'Paciente não informado'}
        </div>
        <div class="paciente-info">
          ${(paciente.email || agendamento.pacienteEmail) ? `<span><i class="fas fa-envelope"></i> ${paciente.email || agendamento.pacienteEmail}</span>` : ''}
          ${(paciente.phone || agendamento.pacienteTelefone) ? `<span><i class="fas fa-phone"></i> ${paciente.phone || agendamento.pacienteTelefone}</span>` : ''}
        </div>
      </div>
      <span class="agendamento-status status-${agendamento.status}">
        ${formatarStatus(agendamento.status)}
      </span>
    </div>
    <div class="agendamento-body">
      <div class="agendamento-info-item">
        <i class="fas fa-calendar-alt"></i>
        <div>
          <span class="info-label">Data</span>
          <span class="info-value">${dataFormatada}</span>
        </div>
      </div>
      <div class="agendamento-info-item">
        <i class="fas fa-clock"></i>
        <div>
          <span class="info-label">Hora</span>
          <span class="info-value">${horaFormatada}</span>
        </div>
      </div>
      <div class="agendamento-info-item">
        <i class="fas fa-hourglass-half"></i>
        <div>
          <span class="info-label">Duração</span>
          <span class="info-value">${agendamento.duracao || 30} min</span>
        </div>
      </div>
      <div class="agendamento-info-item">
        <i class="fas fa-stethoscope"></i>
        <div>
          <span class="info-label">Tipo</span>
          <span class="info-value">${tipoConsultaLabels[agendamento.tipoConsulta] || agendamento.tipoConsulta}</span>
        </div>
      </div>
    </div>
    ${agendamento.motivoConsulta ? `
      <div class="agendamento-motivo">
        <div class="agendamento-motivo-label">Motivo da Consulta</div>
        <div class="agendamento-motivo-text">${agendamento.motivoConsulta}</div>
      </div>
    ` : ''}
    <div class="agendamento-actions">
      <button class="btn-action btn-view" onclick="verDetalhes('${agendamento._id}')">
        <i class="fas fa-eye"></i> Ver Detalhes
      </button>
      ${agendamento.status !== 'cancelada' && agendamento.status !== 'realizada' ? `
        <button class="btn-action btn-edit" onclick="editarAgendamento('${agendamento._id}')">
          <i class="fas fa-edit"></i> Editar
        </button>
      ` : ''}
      ${agendamento.status === 'agendada' ? `
        <button class="btn-action btn-confirm" onclick="confirmarAgendamento('${agendamento._id}')">
          <i class="fas fa-check"></i> Confirmar
        </button>
      ` : ''}
      ${agendamento.status !== 'cancelada' && agendamento.status !== 'realizada' ? `
        <button class="btn-action btn-cancel" onclick="cancelarAgendamento('${agendamento._id}')">
          <i class="fas fa-times"></i> Cancelar
        </button>
      ` : ''}
      ${agendamento.status === 'confirmada' ? `
        <button class="btn-action btn-confirm" onclick="marcarRealizada('${agendamento._id}')">
          <i class="fas fa-check-double"></i> Marcar como Realizada
        </button>
      ` : ''}
    </div>
  `;

  return card;
}

// Formatar status
function formatarStatus(status) {
  const statusMap = {
    agendada: 'Agendada',
    confirmada: 'Confirmada',
    realizada: 'Realizada',
    cancelada: 'Cancelada',
    remarcada: 'Remarcada'
  };
  return statusMap[status] || status;
}

// Formatar data
function formatarData(data) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    weekday: 'long'
  }).format(data);
}

// Formatar hora
function formatarHora(data) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(data);
}

// Abrir modal de agendamento
function abrirModalAgendamento(agendamento = null) {
  agendamentoEditando = agendamento;
  const modal = document.getElementById('modalAgendamento');
  const form = document.getElementById('formAgendamento');
  const titulo = document.getElementById('modalTitulo');

  if (agendamento) {
    titulo.textContent = 'Editar Agendamento';
    preencherFormulario(agendamento);
  } else {
    titulo.textContent = 'Novo Agendamento';
    form.reset();
    document.getElementById('agendamentoId').value = '';
    document.getElementById('enderecoFields').style.display = 'none';
    document.getElementById('linkVideoFields').style.display = 'none';
  }

  modal.style.display = 'flex';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Fechar modal de agendamento
function fecharModalAgendamento() {
  const modal = document.getElementById('modalAgendamento');
  modal.style.display = 'none';
  modal.classList.remove('active');
  document.body.style.overflow = '';
  agendamentoEditando = null;
}

// Preencher formulário
function preencherFormulario(agendamento) {
  document.getElementById('agendamentoId').value = agendamento._id;
  
  // Tratar pacienteId que pode ser objeto ou string
  let pacienteIdValue = agendamento.pacienteId;
  if (typeof pacienteIdValue === 'object' && pacienteIdValue !== null) {
    pacienteIdValue = pacienteIdValue._id || pacienteIdValue.id;
  }
  document.getElementById('pacienteId').value = pacienteIdValue || '';
  
  document.getElementById('dataHora').value = formatarDataHoraInput(agendamento.dataHora);
  document.getElementById('duracao').value = agendamento.duracao || 30;
  document.getElementById('tipoConsulta').value = agendamento.tipoConsulta;
  document.getElementById('motivoConsulta').value = agendamento.motivoConsulta || '';
  document.getElementById('observacoes').value = agendamento.observacoes || '';

  // Campos condicionais
  const tipo = agendamento.tipoConsulta;
  if (tipo === 'presencial' || tipo === 'domiciliar') {
    document.getElementById('enderecoFields').style.display = 'block';
    if (agendamento.endereco) {
      document.getElementById('enderecoCep').value = agendamento.endereco.cep || '';
      document.getElementById('enderecoLogradouro').value = agendamento.endereco.logradouro || '';
      document.getElementById('enderecoNumero').value = agendamento.endereco.numero || '';
      document.getElementById('enderecoComplemento').value = agendamento.endereco.complemento || '';
      document.getElementById('enderecoBairro').value = agendamento.endereco.bairro || '';
      document.getElementById('enderecoCidade').value = agendamento.endereco.cidade || '';
      document.getElementById('enderecoEstado').value = agendamento.endereco.estado || '';
    }
  } else if (tipo === 'online') {
    document.getElementById('linkVideoFields').style.display = 'block';
    document.getElementById('linkVideochamada').value = agendamento.linkVideochamada || '';
  }
}

// Formatar data/hora para input datetime-local
function formatarDataHoraInput(data) {
  const d = new Date(data);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Salvar agendamento
async function salvarAgendamento(e) {
  e.preventDefault();

  const form = e.target;
  const agendamentoId = document.getElementById('agendamentoId').value;
  const tipoConsulta = document.getElementById('tipoConsulta').value;

  const dados = {
    pacienteId: document.getElementById('pacienteId').value,
    dataHora: document.getElementById('dataHora').value,
    duracao: parseInt(document.getElementById('duracao').value),
    tipoConsulta: tipoConsulta,
    motivoConsulta: document.getElementById('motivoConsulta').value,
    observacoes: document.getElementById('observacoes').value
  };

  // Campos condicionais
  if (tipoConsulta === 'presencial' || tipoConsulta === 'domiciliar') {
    dados.endereco = {
      cep: document.getElementById('enderecoCep').value,
      logradouro: document.getElementById('enderecoLogradouro').value,
      numero: document.getElementById('enderecoNumero').value,
      complemento: document.getElementById('enderecoComplemento').value,
      bairro: document.getElementById('enderecoBairro').value,
      cidade: document.getElementById('enderecoCidade').value,
      estado: document.getElementById('enderecoEstado').value
    };
  } else if (tipoConsulta === 'online') {
    dados.linkVideochamada = document.getElementById('linkVideochamada').value;
  }

  try {
    const url = agendamentoId 
      ? `${API_URL}/api/agendamentos/${agendamentoId}`
      : `${API_URL}/api/agendamentos/`;
    
    const method = agendamentoId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(dados)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Erro ao salvar agendamento');
    }

    Swal.fire({
      title: 'Sucesso!',
      text: result.message || 'Agendamento salvo com sucesso',
      icon: 'success',
      confirmButtonColor: '#002A42'
    });

    fecharModalAgendamento();
    carregarAgendamentos();
    carregarEstatisticas();
  } catch (error) {
    console.error('Erro ao salvar agendamento:', error);
    Swal.fire({
      title: 'Erro',
      text: error.message || 'Erro ao salvar agendamento',
      icon: 'error',
      confirmButtonColor: '#002A42'
    });
  }
}

// Ver detalhes
async function verDetalhes(id) {
  try {
    const response = await fetch(`${API_URL}/api/agendamentos/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao carregar detalhes');
    }

    const agendamento = await response.json();
    agendamentoEditando = agendamento;
    mostrarDetalhes(agendamento);
  } catch (error) {
    console.error('Erro ao carregar detalhes:', error);
    Swal.fire({
      title: 'Erro',
      text: 'Erro ao carregar detalhes do agendamento',
      icon: 'error',
      confirmButtonColor: '#002A42'
    });
  }
}

// Mostrar detalhes
function mostrarDetalhes(agendamento) {
  const modal = document.getElementById('modalDetalhes');
  const conteudo = document.getElementById('detalhesConteudo');
  
  const paciente = agendamento.pacienteId || {};
  const dataHora = new Date(agendamento.dataHora);
  const tipoConsultaLabels = {
    presencial: 'Presencial',
    online: 'Online',
    domiciliar: 'Domiciliar'
  };

  conteudo.innerHTML = `
    <div class="detalhes-item">
      <div class="detalhes-label">Paciente</div>
      <div class="detalhes-value">${paciente.name || paciente.nome || agendamento.pacienteNome || 'Não informado'}</div>
    </div>
    <div class="detalhes-item">
      <div class="detalhes-label">Email</div>
      <div class="detalhes-value">${paciente.email || agendamento.pacienteEmail || 'Não informado'}</div>
    </div>
    <div class="detalhes-item">
      <div class="detalhes-label">Telefone</div>
      <div class="detalhes-value">${paciente.phone || agendamento.pacienteTelefone || 'Não informado'}</div>
    </div>
    <div class="detalhes-item">
      <div class="detalhes-label">Data e Hora</div>
      <div class="detalhes-value">${formatarData(dataHora)} às ${formatarHora(dataHora)}</div>
    </div>
    <div class="detalhes-item">
      <div class="detalhes-label">Duração</div>
      <div class="detalhes-value">${agendamento.duracao || 30} minutos</div>
    </div>
    <div class="detalhes-item">
      <div class="detalhes-label">Tipo de Consulta</div>
      <div class="detalhes-value">${tipoConsultaLabels[agendamento.tipoConsulta] || agendamento.tipoConsulta}</div>
    </div>
    <div class="detalhes-item">
      <div class="detalhes-label">Status</div>
      <div class="detalhes-value">${formatarStatus(agendamento.status)}</div>
    </div>
    <div class="detalhes-item">
      <div class="detalhes-label">Motivo da Consulta</div>
      <div class="detalhes-value">${agendamento.motivoConsulta || 'Não informado'}</div>
    </div>
    ${agendamento.observacoes ? `
      <div class="detalhes-item">
        <div class="detalhes-label">Observações</div>
        <div class="detalhes-value">${agendamento.observacoes}</div>
      </div>
    ` : ''}
    ${agendamento.endereco && Object.keys(agendamento.endereco).length > 0 ? `
      <div class="detalhes-item">
        <div class="detalhes-label">Endereço</div>
        <div class="detalhes-value">
          ${agendamento.endereco.logradouro || ''} ${agendamento.endereco.numero || ''}, 
          ${agendamento.endereco.complemento || ''} ${agendamento.endereco.bairro || ''}, 
          ${agendamento.endereco.cidade || ''} - ${agendamento.endereco.estado || ''} 
          ${agendamento.endereco.cep ? `CEP: ${agendamento.endereco.cep}` : ''}
        </div>
      </div>
    ` : ''}
    ${agendamento.linkVideochamada ? `
      <div class="detalhes-item">
        <div class="detalhes-label">Link da Videochamada</div>
        <div class="detalhes-value">
          <a href="${agendamento.linkVideochamada}" target="_blank">${agendamento.linkVideochamada}</a>
        </div>
      </div>
    ` : ''}
  `;

  modal.style.display = 'flex';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Fechar modal de detalhes
function fecharModalDetalhes() {
  const modal = document.getElementById('modalDetalhes');
  modal.style.display = 'none';
  modal.classList.remove('active');
  document.body.style.overflow = '';
  agendamentoEditando = null;
}

// Editar agendamento
function editarAgendamento(id) {
  const agendamento = agendamentos.find(a => a._id === id);
  if (agendamento) {
    abrirModalAgendamento(agendamento);
  }
}

// Confirmar agendamento
async function confirmarAgendamento(id) {
  try {
    const response = await fetch(`${API_URL}/api/agendamentos/${id}/confirmar`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao confirmar agendamento');
    }

    Swal.fire({
      title: 'Sucesso!',
      text: 'Agendamento confirmado com sucesso',
      icon: 'success',
      confirmButtonColor: '#002A42'
    });

    carregarAgendamentos();
    carregarEstatisticas();
  } catch (error) {
    console.error('Erro ao confirmar agendamento:', error);
    Swal.fire({
      title: 'Erro',
      text: 'Erro ao confirmar agendamento',
      icon: 'error',
      confirmButtonColor: '#002A42'
    });
  }
}

// Cancelar agendamento
async function cancelarAgendamento(id) {
  const { value: motivo } = await Swal.fire({
    title: 'Cancelar Agendamento',
    text: 'Informe o motivo do cancelamento',
    input: 'textarea',
    inputPlaceholder: 'Digite o motivo do cancelamento',
    inputAttributes: {
      'aria-label': 'Motivo do cancelamento'
    },
    showCancelButton: true,
    confirmButtonText: 'Confirmar Cancelamento',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#002A42',
    inputValidator: (value) => {
      if (!value) {
        return 'O motivo do cancelamento é obrigatório';
      }
    }
  });

  if (!motivo) return;

  try {
    const response = await fetch(`${API_URL}/api/agendamentos/${id}/cancelar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ motivoCancelamento: motivo })
    });

    if (!response.ok) {
      throw new Error('Erro ao cancelar agendamento');
    }

    Swal.fire({
      title: 'Sucesso!',
      text: 'Agendamento cancelado com sucesso',
      icon: 'success',
      confirmButtonColor: '#002A42'
    });

    carregarAgendamentos();
    carregarEstatisticas();
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    Swal.fire({
      title: 'Erro',
      text: 'Erro ao cancelar agendamento',
      icon: 'error',
      confirmButtonColor: '#002A42'
    });
  }
}

// Marcar como realizada
async function marcarRealizada(id) {
  try {
    const response = await fetch(`${API_URL}/api/agendamentos/${id}/realizada`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao marcar como realizada');
    }

    Swal.fire({
      title: 'Sucesso!',
      text: 'Consulta marcada como realizada',
      icon: 'success',
      confirmButtonColor: '#002A42'
    });

    carregarAgendamentos();
    carregarEstatisticas();
  } catch (error) {
    console.error('Erro ao marcar como realizada:', error);
    Swal.fire({
      title: 'Erro',
      text: 'Erro ao marcar como realizada',
      icon: 'error',
      confirmButtonColor: '#002A42'
    });
  }
}

// Aplicar filtros
function aplicarFiltros() {
  const status = document.getElementById('filtroStatus').value;
  const dataInicio = document.getElementById('filtroDataInicio').value;
  const dataFim = document.getElementById('filtroDataFim').value;

  let agendamentosFiltrados = [...agendamentos];

  if (status) {
    agendamentosFiltrados = agendamentosFiltrados.filter(a => a.status === status);
  }

  if (dataInicio) {
    const inicio = new Date(dataInicio);
    agendamentosFiltrados = agendamentosFiltrados.filter(a => new Date(a.dataHora) >= inicio);
  }

  if (dataFim) {
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);
    agendamentosFiltrados = agendamentosFiltrados.filter(a => new Date(a.dataHora) <= fim);
  }

  renderizarAgendamentos(agendamentosFiltrados);
  
  // Atualizar empty state
  const emptyState = document.getElementById('semAgendamentos');
  const lista = document.getElementById('listaAgendamentos');
  if (agendamentosFiltrados.length === 0) {
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
  }
}

// Limpar filtros
function limparFiltros() {
  document.getElementById('filtroStatus').value = '';
  document.getElementById('filtroDataInicio').value = '';
  document.getElementById('filtroDataFim').value = '';
  renderizarAgendamentos(agendamentos);
  
  const emptyState = document.getElementById('semAgendamentos');
  if (agendamentos.length === 0) {
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
  }
}

// Exportar funções para uso global
window.verDetalhes = verDetalhes;
window.editarAgendamento = editarAgendamento;
window.confirmarAgendamento = confirmarAgendamento;
window.cancelarAgendamento = cancelarAgendamento;
window.marcarRealizada = marcarRealizada;

