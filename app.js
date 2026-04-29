let medidorCount = 0;
let techEtapaCount = 0;
let canvas, ctx, isDrawing = false;
let currentPdfBlob, currentPdfFilename;

const DIAGNOSTICOS = {
    'alto-consumo': [
        { val: 'normal', label: 'Consumo normal confirmado', rec: 'Nenhuma ação necessária. O consumo medido condiz com a utilização padrão da unidade.' },
        { val: 'possivel_vazamento', label: 'Possível vazamento identificado', rec: 'Recomenda-se contratar um encanador especializado (caça-vazamento) para investigar o interior da unidade e reparar o vazamento.' },
        { val: 'vazamento_confirmado', label: 'Vazamento confirmado', rec: 'Vazamento confirmado durante a vistoria. O morador/responsável foi orientado a providenciar o reparo imediato.' },
        { val: 'erro_leitura', label: 'Erro de leitura anterior', rec: 'Identificamos que houve um erro de leitura na fatura anterior. Os valores serão corrigidos no sistema.' },
        { val: 'leitura_corrigida', label: 'Leitura atual corrigida', rec: 'Leitura do medidor foi aferida e corrigida. Seguir o monitoramento para o próximo ciclo.' },
        { val: 'medidor_defeito', label: 'Medidor com possível defeito', rec: 'Foi agendada a troca do medidor para garantir a precisão da medição.' },
        { val: 'sem_acesso', label: 'Unidade sem acesso', rec: 'Não foi possível acessar a unidade e/ou medidores. Agendar nova tentativa de vistoria.' },
        { val: 'inconclusivo', label: 'Teste inconclusivo', rec: 'Não foi possível determinar a causa exata no momento. Requer nova análise ou teste mais aprofundado.' },
        { val: 'retorno', label: 'Necessário retorno técnico', rec: 'Necessário retornar com equipamento específico ou em horário agendado com o morador.' },
        { val: 'outro', label: 'Outro', rec: '' }
    ],
    'vazamento': [
        { val: 'confirmado', label: 'Vazamento confirmado', rec: 'Vazamento interno confirmado. Providenciar o reparo para evitar desperdício e cobranças elevadas.' },
        { val: 'nao_confirmado', label: 'Vazamento não confirmado', rec: 'Nenhum indício de vazamento aparente encontrado nos testes realizados.' },
        { val: 'possivel', label: 'Possível vazamento', rec: 'Suspeita de vazamento oculto. Recomenda-se serviço especializado em detecção de vazamentos.' },
        { val: 'sem_aparente', label: 'Sem vazamento aparente', rec: 'Não foram encontrados vazamentos nos pontos vistoriados. A infraestrutura visível encontra-se íntegra.' },
        { val: 'vazamento_agua', label: 'Vazamento em Água', rec: 'Reparo hidráulico necessário com urgência na rede de água.' },
        { val: 'vazamento_gas', label: 'Vazamento em Gás', rec: 'ATENÇÃO: Risco identificado! O registro geral foi fechado. Acionar assistência técnica credenciada para rede de gás IMEDIATAMENTE.' },
        { val: 'risco', label: 'Risco identificado', rec: 'Situação de risco potencial. Recomenda-se isolamento do ponto e ação corretiva imediata.' },
        { val: 'sem_acesso', label: 'Unidade sem acesso', rec: 'Não foi possível vistoriar. Agendar nova tentativa.' },
        { val: 'inconclusivo', label: 'Inconclusivo', rec: 'Necessário acompanhamento contínuo da pressão ou novas vistorias no local.' },
        { val: 'retorno', label: 'Necessário retorno técnico', rec: 'Retorno programado para verificação pós-obras/reparos ou averiguação adicional.' },
        { val: 'outro', label: 'Outro', rec: '' }
    ],
    'troca': [
        { val: 'sucesso', label: 'Troca realizada com sucesso', rec: 'O novo equipamento foi instalado e testado. Funcionamento normal.' },
        { val: 'parcial', label: 'Troca parcial realizada', rec: 'Apenas alguns componentes puderam ser trocados. Será necessário agendar um retorno para conclusão.' },
        { val: 'nao_realizada', label: 'Troca não realizada', rec: 'O equipamento antigo foi mantido no local. Ver observações para detalhes dos impeditivos.' },
        { val: 'inacessivel', label: 'Equipamento inacessível', rec: 'Não foi possível acessar o equipamento para a troca. Será necessário remover obstruções.' },
        { val: 'divergente', label: 'Equipamento divergente', rec: 'As especificações do novo equipamento divergem do local. Novo pedido deve ser feito para o modelo correto.' },
        { val: 'retorno', label: 'Necessário retorno técnico', rec: 'Agendar novo horário com o morador ou com equipe de infraestrutura.' },
        { val: 'outro', label: 'Outro', rec: '' }
    ]
};

// Estado da Aplicação
let tipoVistoriaAtual = 'geral'; 
let escopoVistoriaAtual = 'completa';

function iniciarVistoria(tipo, escopo) {
    tipoVistoriaAtual = tipo;
    escopoVistoriaAtual = escopo;
    
    // Ocultar Modal
    const modal = document.getElementById('homeModal');
    if(modal) modal.style.display = 'none';
    
    // Atualizar Tema
    document.body.className = ''; 
    if (tipo === 'alto-consumo') document.body.classList.add('theme-alto-consumo');
    else if (tipo === 'vazamento') document.body.classList.add('theme-vazamento');
    else if (tipo === 'troca') document.body.classList.add('theme-troca');
    
    // Atualizar Badge Superior
    let badgeText = 'GERAL';
    if (tipo === 'alto-consumo') badgeText = 'ALTO CONSUMO';
    else if (tipo === 'vazamento') badgeText = 'VAZAMENTO';
    else if (tipo === 'troca') badgeText = 'TROCA DE EQUIPAMENTO';
    
    if (escopo === 'agua') badgeText += ' (SÓ ÁGUA)';
    else if (escopo === 'gas') badgeText += ' (SÓ GÁS)';
    else if (escopo === 'agua-gas') badgeText += ' (ÁGUA E GÁS)';
    
    const badge = document.getElementById('header-badge');
    if (badge) badge.textContent = badgeText;
    
    // Controle de visibilidade das seções
    const isTech = ['alto-consumo', 'vazamento', 'troca'].includes(tipo);
    
    document.getElementById('campos-vistoria-geral').style.display = (tipo === 'geral') ? 'block' : 'none';
    document.getElementById('medidores-container').style.display = (tipo === 'geral') ? 'block' : 'none';
    document.getElementById('action-buttons').style.display = (tipo === 'geral') ? 'grid' : 'none';
    
    const techContainer = document.getElementById('tech-container');
    const diagSection = document.getElementById('diagnostico-tecnico-section');
    
    if (isTech) {
        techContainer.classList.remove('hidden');
        diagSection.classList.remove('hidden');
        popularDiagnosticos(tipo);
        atualizarLayoutTecnico(tipo, escopo);
    } else {
        techContainer.classList.add('hidden');
        diagSection.classList.add('hidden');
    }
}

function popularDiagnosticos(tipo) {
    const select = document.getElementById('diag-resultado');
    if (!select) return;
    select.innerHTML = '';
    const options = DIAGNOSTICOS[tipo] || [];
    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.val;
        o.textContent = opt.label;
        select.appendChild(o);
    });
    atualizarRecomendacao();
}

function atualizarRecomendacao() {
    const select = document.getElementById('diag-resultado');
    const textArea = document.getElementById('diag-recomendacao');
    if (!select || !textArea) return;
    
    const val = select.value;
    const options = DIAGNOSTICOS[tipoVistoriaAtual] || [];
    const opt = options.find(o => o.val === val);
    
    if (opt && opt.rec !== undefined) {
        textArea.value = opt.rec;
    }
}

function atualizarLayoutTecnico(tipo, escopo) {
    const textAdd = document.getElementById('text-add-etapa');
    if (tipo === 'alto-consumo') textAdd.textContent = 'Adicionar Teste';
    else if (tipo === 'vazamento') textAdd.textContent = 'Adicionar Ponto Vistoriado';
    else if (tipo === 'troca') textAdd.textContent = 'Adicionar Etapa de Troca';
    
    // Resumo de medidores para a vistoria técnica
    const medContainer = document.getElementById('tech-medidores-resumo');
    medContainer.innerHTML = '';
    if (tipo === 'alto-consumo') {
        if (escopo === 'agua' || escopo === 'agua-gas') adicionarMedidorResumo('Água');
        if (escopo === 'gas' || escopo === 'agua-gas') adicionarMedidorResumo('Gás');
    }

    // Etapas iniciais para Alto Consumo
    const etapasContainer = document.getElementById('tech-etapas-container');
    if (tipo === 'alto-consumo' && etapasContainer.children.length === 0) {
        adicionarEtapaTecnica(); // Teste 1
        adicionarEtapaTecnica(); // Teste 2
    }
}

function adicionarMedidorResumo(tipo) {
    const container = document.getElementById('tech-medidores-resumo');
    const div = document.createElement('div');
    div.className = 'card tech-stage-card';
    div.innerHTML = `
        <div class="card-header">Registro do Medidor de ${tipo}</div>
        <div class="card-body">
            <div class="tech-info-row">
                <div class="input-group"><label>Nº Medidor</label><input type="text" class="med-n-serie"></div>
                <div class="input-group"><label>Local</label><input type="text" class="med-local" placeholder="Ex: Abrigo"></div>
            </div>
            <div class="input-group">
                <label>Leitura Identificada</label>
                <input type="number" step="0.001" class="med-leitura">
            </div>
            <div class="fotos-etapa-container">
                <div class="lista-fotos"></div>
                <button class="btn-add-photo" style="height:60px;" onclick="adicionarFotoEtapa(this)">
                    <i class="fas fa-camera"></i> Foto do Medidor
                </button>
            </div>
        </div>
    `;
    container.appendChild(div);
}

function adicionarEtapaTecnica() {
    techEtapaCount++;
    const container = document.getElementById('tech-etapas-container');
    let templateId = '';
    
    if (tipoVistoriaAtual === 'alto-consumo') templateId = 'tmpl-alto-consumo-teste';
    else if (tipoVistoriaAtual === 'vazamento') templateId = 'tmpl-vazamento-ponto';
    else if (tipoVistoriaAtual === 'troca') templateId = 'tmpl-troca-equipamento';
    
    const tmpl = document.getElementById(templateId);
    if (tmpl) {
        const clone = tmpl.content.cloneNode(true);
        const idSpan = clone.querySelector('.num-id');
        if (idSpan) idSpan.textContent = techEtapaCount;
        container.appendChild(clone);
    }
}

function adicionarFotoEtapa(btn) {
    const lista = btn.previousElementSibling; // .lista-fotos
    const tmpl = document.getElementById('tmpl-tech-photo');
    if (tmpl && lista) {
        const clone = tmpl.content.cloneNode(true);
        lista.appendChild(clone);
    }
}

function adicionarFotoEtapaEspecial(btn, legendaPadrao) {
    const lista = btn.previousElementSibling; // .lista-fotos
    const tmpl = document.getElementById('tmpl-tech-photo');
    if (tmpl && lista) {
        const clone = tmpl.content.cloneNode(true);
        const inputLegenda = clone.querySelector('.photo-legenda');
        if (inputLegenda && legendaPadrao) {
            inputLegenda.value = legendaPadrao;
        }
        lista.appendChild(clone);
    }
}

function processarFotoTecnica(input) {
    const file = input.files[0];
    if (!file) return;
    
    const container = input.closest('.photo-meta-container');
    const preview = container.querySelector('.preview-img');
    const legendaInput = container.querySelector('.photo-legenda');
    
    resizeAndRotateImage(file, '', (b64) => {
        preview.src = b64;
        preview.style.display = 'block';
        input.dataset.b64 = b64;
        
        // Sugestão de legenda se estiver vazio
        if (legendaInput && !legendaInput.value) {
            const stage = input.closest('.tech-stage-card');
            if (stage) {
                const tipo = stage.dataset.tipo;
                if (tipo === 'teste-alto-consumo') legendaInput.value = 'Foto do Teste';
                else if (tipo === 'ponto-vazamento') legendaInput.value = 'Foto do Ponto';
                else if (tipo === 'troca-equipamento') legendaInput.value = 'Foto da Troca';
            } else {
                legendaInput.value = 'Evidência da Vistoria';
            }
        }

        // Auto-preencher Data/Hora baseado no momento da foto
        const leg = legendaInput ? legendaInput.value : '';
        const leituraBox = input.closest('.leitura-box');
        if (leituraBox) {
            const now = new Date();
            const tzOffset = now.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(now - tzOffset)).toISOString().slice(0,16);

            // Verifica se é o box inicial (Antes)
            const inputInicio = leituraBox.querySelector('.teste-inicio');
            if (inputInicio && leg.includes('Antes')) {
                inputInicio.value = localISOTime;
                calcularVazaoTecnica(inputInicio);
            }
            
            // Verifica se é o box final (Depois)
            const inputFim = leituraBox.querySelector('.teste-fim');
            if (inputFim && leg.includes('Depois')) {
                inputFim.value = localISOTime;
                calcularVazaoTecnica(inputFim);
            }
        }
    });
}

function calcularVazaoTecnica(el) {
    const card = el.closest('.tech-stage-card');
    if (!card || card.dataset.tipo !== 'teste-alto-consumo') return;
    
    const leituraInic = parseFloat(card.querySelector('.teste-leitura-inic').value);
    const leituraFim = parseFloat(card.querySelector('.teste-leitura-fim').value);
    const inicioStr = card.querySelector('.teste-inicio').value;
    const fimStr = card.querySelector('.teste-fim').value;
    
    const displayConsumo = card.querySelector('.calc-consumo');
    const displayVazao = card.querySelector('.calc-vazao');
    const displayVazaoH = card.querySelector('.calc-vazao-h');
    const displayResultado = card.querySelector('.calc-resultado');
    
    if (isNaN(leituraInic) || isNaN(leituraFim) || !inicioStr || !fimStr) return;
    
    const consumo = leituraFim - leituraInic;
    const inicio = new Date(inicioStr);
    const fim = new Date(fimStr);
    const diffMs = fim - inicio;
    const diffMin = diffMs / 60000;
    
    if (consumo < 0) {
        displayResultado.textContent = 'Inconsistente (Leitura final menor)';
        displayResultado.className = 'calc-resultado grav-alta';
        return;
    }
    
    if (diffMin <= 0) {
        displayResultado.textContent = 'Inconsistente (Tempo inválido)';
        displayResultado.className = 'calc-resultado grav-alta';
        return;
    }
    
    const vazaoMin = consumo / diffMin;
    const vazaoHora = vazaoMin * 60;
    
    displayConsumo.textContent = formatValue(consumo);
    displayVazao.textContent = formatValue(vazaoMin);
    displayVazaoH.textContent = formatValue(vazaoHora);
    
    // Sugestão de resultado
    const tipoTeste = card.querySelector('.teste-tipo').value;
    if (consumo === 0) {
        displayResultado.textContent = 'Sem consumo identificado no período';
        displayResultado.className = 'calc-resultado grav-baixa';
    } else if (tipoTeste === 'pontos_fechados' && consumo > 0) {
        displayResultado.textContent = 'POSSÍVEL VAZAMENTO (Consumo detectado)';
        displayResultado.className = 'calc-resultado grav-risco';
    } else {
        displayResultado.textContent = 'Consumo identificado';
        displayResultado.className = 'calc-resultado grav-media';
    }
}

// Cache do logo carregado dinamicamente
let LOGO_B64_CACHE = null;

/**
 * Carrega o logo ecowave.png, redimensiona via canvas, e retorna como data URL JPEG comprimido.
 * Faz cache para não recarregar toda vez.
 */
function carregarLogo() {
    return new Promise((resolve) => {
        if (LOGO_B64_CACHE) { resolve(LOGO_B64_CACHE); return; }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                const MAX_W = 400;
                let w = img.width, h = img.height;
                if (w > MAX_W) { h = Math.round(h * (MAX_W / w)); w = MAX_W; }
                c.width = w; c.height = h;
                const cctx = c.getContext('2d');
                // Fundo branco para evitar transparência problemática no JPEG
                cctx.fillStyle = '#ffffff';
                cctx.fillRect(0, 0, w, h);
                cctx.drawImage(img, 0, 0, w, h);
                LOGO_B64_CACHE = c.toDataURL('image/jpeg', 0.7);
                resolve(LOGO_B64_CACHE);
            } catch (e) {
                console.warn('Erro ao processar logo:', e);
                resolve(null);
            }
        };
        img.onerror = () => {
            console.warn('Não foi possível carregar ecowave.png');
            resolve(null);
        };
        // Timeout de 5s para o carregamento do logo
        setTimeout(() => { if (!LOGO_B64_CACHE) resolve(null); }, 5000);
        img.src = './ecowave.png';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const dataInput = document.getElementById('data-vistoria');
    if (dataInput) dataInput.valueAsDate = new Date();
    const horaInput = document.getElementById('hora-vistoria');
    if (horaInput) {
        const agora = new Date();
        horaInput.value = agora.getHours().toString().padStart(2, '0') + ':' + agora.getMinutes().toString().padStart(2, '0');
    }
    initSignaturePad();
    // Pré-carregar o logo no início para ter cache pronto
    carregarLogo();
});

function adicionarMedidor(tipo) {
    medidorCount++;
    const container = document.getElementById('medidores-container');
    let templateId = '';
    if(tipo === 'Hidrometro') templateId = 'tmpl-hidrometro';
    else if(tipo === 'Gasometro') templateId = 'tmpl-gasometro';
    else templateId = 'tmpl-ponto-consumo';
    
    const tmpl = document.getElementById(templateId);
    if(tmpl) {
        const clone = tmpl.content.cloneNode(true);
        clone.querySelector('.num-id').textContent = medidorCount;
        clone.querySelector('.medidor-card').dataset.id = medidorCount;
        container.appendChild(clone);
    }
}

// Converte virgula para ponto para o JS entender
function parseVal(v) {
    if(!v) return 0;
    return parseFloat(v.toString().replace(',', '.'));
}

function formatValue(v) {
    return parseFloat(v.toFixed(3)).toString().replace('.', ',');
}

function testLogic() {}

function recalcularTodosPontos() {
    document.querySelectorAll('.ponto-agua-antes').forEach(el => calcularPonto(el));
}

// Lógica Hidrômetro / Gasômetro (Diferença convertida para Litros)
function calcular(el) {
    const card = el.closest('.medidor-card');
    const antes = parseVal(card.querySelector('.val-antes').value);
    const apos = parseVal(card.querySelector('.val-apos').value);
    const resField = card.querySelector('.med-res');
    
    if (antes && apos) {
        // Multiplica por 1000 porque a leitura do medidor é m3 (ex: 0.026 m3 = 26 litros)
        const diff = (apos - antes) * 1000;
        resField.value = formatValue(diff);
    }
}

// Lógica Ponto de Consumo (Leitura em Litros e Razão Direta)
function calcularPonto(el) {
    const card = el.closest('.medidor-card');
    const tempoSeg = parseFloat(card.querySelector('.ponto-tempo').value) || 10;
    const tempTeste = card.querySelector('.ponto-temp').value || 38;

    const aguaA = parseVal(card.querySelector('.ponto-agua-antes').value);
    const aguaB = parseVal(card.querySelector('.ponto-agua-apos').value);
    const gasA = parseVal(card.querySelector('.ponto-gas-antes').value);
    const gasB = parseVal(card.querySelector('.ponto-gas-apos').value);

    const displayAgua = card.querySelector('.vaz-agua');
    const displayGas = card.querySelector('.vaz-gas');
    const displayFrase = card.querySelector('.frase-v2');

    let litrosAgua = (aguaB - aguaA) * 1000;
    let litrosGas = (gasB - gasA) * 1000;

    if (litrosAgua > 0) {
        const vazAgua = (litrosAgua / tempoSeg) * 60;
        displayAgua.textContent = formatValue(vazAgua);
    }
    if (litrosGas > 0) {
        const vazGas = (litrosGas / tempoSeg) * 60;
        displayGas.textContent = formatValue(vazGas);
    }

    if (litrosAgua > 0 && litrosGas > 0) {
        // Razão corrigida conforme seu exemplo: 26 L / 18 L = 1,44
        const proporcao = litrosGas / litrosAgua;
        const propStr = formatValue(proporcao);
        
        const estacao = document.getElementById('estacao-ano') ? document.getElementById('estacao-ano').value : 'primavera_outono';
        
        let msg = "";
        if (parseFloat(tempTeste) === 38) {
            let limitNormal, limitElevada;
            if (estacao === 'verao') {
                limitNormal = 1.5;
                limitElevada = 2.2;
            } else if (estacao === 'inverno') {
                limitNormal = 2.4;
                limitElevada = 3.5;
            } else { // primavera_outono
                limitNormal = 1.9;
                limitElevada = 2.9;
            }
            
            if(proporcao <= limitNormal) msg = "A proporção Gás/Água está dentro da normalidade.";
            else if(proporcao <= limitElevada) msg = "A proporção Gás/Água está elevada. Considere realizar a manutenção preventiva em seu aquecedor.";
            else msg = "A proporção Gás/Água está muito acima do normal. Caso seu medidor e/ou aquecedor seja antigo, considere a troca do(s) equipamento(s).";
        } else {
            msg = "A avaliação de proporção ideal requer a temperatura de teste em 38°C exatos.";
        }

        const vazAguaLpm = formatValue((litrosAgua / tempoSeg) * 60);
        const vazGasLpm = formatValue((litrosGas / tempoSeg) * 60);

        displayFrase.innerHTML = `Realizados os testes no ponto de consumo e identificado:<br>` +
                                 `1 - Leitura da Água: ${vazAguaLpm} litros/minuto<br>` +
                                 `2 - Leitura de Gás: ${vazGasLpm} litros/minuto<br>` +
                                 `3 - Proporção Gás/Água: ${propStr} litros de Gás para cada litro de água consumido<br>` +
                                 `<i>${msg}</i>`;
        // Armazenamos a informação para o PDF
        card.dataset.relatorioGerado = `Realizados os testes no ponto de consumo e identificado:\n` +
                                       `1 - Leitura da Água: ${vazAguaLpm} litros/minuto\n` +
                                       `2 - Leitura de Gás: ${vazGasLpm} litros/minuto\n` +
                                       `3 - Proporção Gás/Água: ${propStr} litros de Gás para cada litro de água consumido\n` +
                                       `${msg}`;
    }
}

function resizeAndRotateImage(file, labelText, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
             const canvas = document.createElement('canvas');
             // Dimensões padronizadas 4:3 para Premium layout
             const MAX_W = 600;
             const MAX_H = 450;
             const targetRatio = MAX_W / MAX_H;
             
             let sWidth = img.width;
             let sHeight = img.height;
             let sx = 0;
             let sy = 0;
             
             if (sWidth / sHeight > targetRatio) {
                 // Imagem mais larga, corta nas laterais
                 sWidth = sHeight * targetRatio;
                 sx = (img.width - sWidth) / 2;
             } else {
                 // Imagem mais alta, corta em cima e em baixo
                 sHeight = sWidth / targetRatio;
                 sy = (img.height - sHeight) / 2;
             }
             
             canvas.width = MAX_W;
             canvas.height = MAX_H;
             const ctx = canvas.getContext('2d');
             
             ctx.fillStyle = '#ffffff';
             ctx.fillRect(0, 0, MAX_W, MAX_H);
             ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, MAX_W, MAX_H);
             
             if (labelText) {
                 const now = new Date();
                 const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                 const dateStr = now.toLocaleDateString('pt-BR');
                 const fullText = `${labelText} | ${dateStr} ${timeStr}`;
                 
                 ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                 ctx.fillRect(0, MAX_H - 35, MAX_W, 35);
                 ctx.font = 'bold 16px sans-serif';
                 ctx.fillStyle = '#ffffff';
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 ctx.fillText(fullText, MAX_W / 2, MAX_H - 17);
             }
             
             callback(canvas.toDataURL('image/jpeg', 0.8)); // Qualidade 0.8 Premium
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function anexarFoto(el, cls) {
    const f = el.files[0]; if(!f) return;
    const card = el.closest('.medidor-card');
    let label = '';
    if (card) {
        const tipo = card.dataset.tipo;
        if(tipo === 'hidrometro') label = 'Teste Água #' + card.dataset.id;
        else if(tipo === 'gasometro') label = 'Teste Gás #' + card.dataset.id;
        else label = 'Ponto de Consumo #' + card.dataset.id;
    }
    
    if (cls.includes('antes')) label += ' - ANTES';
    else if (cls.includes('apos')) label += ' - APÓS';
    resizeAndRotateImage(f, label, (b64) => {
        const i = el.parentElement.querySelector('.' + cls);
        if(i) { i.src = b64; i.style.display = 'block'; el.dataset.b64 = b64; }
    });
}

function anexarFotoGeral(el, id) {
    const f = el.files[0]; if(!f) return;
    let label = 'Evidência Geral';
    if(id === 'img-geral-med') label = 'Estado Medidores';
    else if(id === 'img-geral-temp-aq') label = 'Temp. Aquecedor';
    else if(id === 'img-geral-manut') label = 'Última Manutenção Aquecedor';
    else if(id === 'img-geral-press') label = 'Pressão da Água';
    else if(id === 'img-geral-obs') label = 'Observações';

    resizeAndRotateImage(f, label, (b64) => {
        const i = document.getElementById(id);
        if(i) { i.src = b64; i.style.display = 'block'; el.dataset.b64 = b64; }
    });
}

function initSignaturePad() {
    canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    const setDim = () => { if(canvas.parentElement){ canvas.width = canvas.parentElement.offsetWidth; canvas.height = 180; ctx.lineWidth=3; ctx.lineCap='round'; } };
    setDim();
    const getPos = (e) => { const r = canvas.getBoundingClientRect(); const ev = e.touches ? e.touches[0] : e; return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
    canvas.addEventListener('mousedown', (e) => { isDrawing=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); });
    canvas.addEventListener('mousemove', (e) => { if(!isDrawing) return; const p=getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); });
    canvas.addEventListener('mouseup', () => isDrawing=false);
    canvas.addEventListener('touchstart', (e) => { if(e.cancelable) e.preventDefault(); isDrawing=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); }, {passive:false});
    canvas.addEventListener('touchmove', (e) => { if(e.cancelable) e.preventDefault(); if(!isDrawing) return; const p=getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); }, {passive:false});
    canvas.addEventListener('touchend', () => isDrawing=false);
}
function limparAssinatura() { if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); }

// GERAR PDF COM PROTEÇÕES ROBUSTAS E SUPORTE A VISTORIAS TÉCNICAS
async function gerarPDF() {
    const overlay = document.getElementById('loadingOverlay');
    const loadingMsg = document.getElementById('loadingMsg');
    try {
        // Validações Básicas
        const condo = document.getElementById('condominio').value;
        const apto = document.getElementById('apto').value;
        if (!condo || !apto) { alert("Por favor, preencha o Condomínio e a Unidade."); return; }

        overlay.style.display = 'flex';
        loadingMsg.textContent = 'Carregando logo...';

        const logoB64 = await carregarLogo();
        loadingMsg.textContent = 'Montando relatório...';

        const bloco = document.getElementById('bloco').value || "";
        const tecnico = document.getElementById('tecnico').value || "";
        const dataVist = document.getElementById('data-vistoria').value || "";
        
        let signB64 = "";
        if(canvas) {
            const sigData = ctx.getImageData(0,0,canvas.width,canvas.height).data;
            for(let i=3; i<sigData.length; i+=4) { if(sigData[i]>0){ signB64 = canvas.toDataURL('image/png'); break; } }
        }

        // Definição do Documento
        const docD = {
            pageSize: 'A4', 
            pageMargins: [40, 70, 40, 60],
            styles: {
                h1: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 5, 0, 20], color: '#1B263B' },
                lbl: { fontSize: 10, bold: true, fillColor: '#1B263B', color: '#ffffff', margin: [5, 5, 5, 5] },
                val: { fontSize: 10, margin: [5, 5, 5, 5], color: '#333333' },
                cap: { fontSize: 9, bold: true, alignment: 'center', margin: [0, 10, 0, 3] },
                sub: { fontSize: 11, bold: true, color: '#1B263B', margin: [0, 10, 0, 5] }
            },
            content: []
        };

        // Header e Logo
        if (logoB64) {
            docD.content.push({ image: logoB64, width: 220, alignment: 'center', margin: [0, 0, 0, 15] });
            docD.header = (currentPage) => {
                if (currentPage === 1) return null;
                return {
                    columns: [
                        { image: logoB64, width: 80, margin: [40, 25, 0, 0] },
                        { text: `Vistoria: ${condo} - Unid ${apto}`, alignment: 'right', margin: [0, 30, 40, 0], fontSize: 8, color: '#aaa' }
                    ]
                };
            };
        } else {
            docD.content.push({ text: 'ECOWAVE', fontSize: 24, bold: true, alignment: 'center', color: '#4CAF50', margin: [0, 0, 0, 15] });
        }

        let tituloRelatorio = 'RELATÓRIO DE VISTORIA TÉCNICA';
        if (tipoVistoriaAtual === 'alto-consumo') tituloRelatorio = 'RELATÓRIO DE VISTORIA - ALTO CONSUMO';
        else if (tipoVistoriaAtual === 'vazamento') tituloRelatorio = 'RELATÓRIO DE VISTORIA - VAZAMENTO';
        else if (tipoVistoriaAtual === 'troca') tituloRelatorio = 'RELATÓRIO DE VISTORIA - TROCA DE EQUIPAMENTO';
        
        let subtituloEscopo = '';
        if (escopoVistoriaAtual === 'agua') subtituloEscopo = 'Escopo: Somente Água';
        else if (escopoVistoriaAtual === 'gas') subtituloEscopo = 'Escopo: Somente Gás';
        else if (escopoVistoriaAtual === 'agua-gas') subtituloEscopo = 'Escopo: Água e Gás';

        docD.content.push(
            { text: tituloRelatorio, style: 'h1' },
            (subtituloEscopo ? { text: subtituloEscopo, alignment: 'center', margin: [0, -15, 0, 15], fontSize: 12, bold: true, color: '#ff4d4d' } : {}),
            {
                table: {
                    widths: ['*','*','*','*'],
                    body: [
                        [{text: 'DADOS DA INSPEÇÃO', colSpan: 4, style: 'lbl', alignment: 'center'},{},{},{}],
                        [{text: 'Condomínio:', bold: true}, {text: condo, colSpan: 3}, {}, {}],
                        [{text: 'Bloco:', bold: true}, bloco, {text: 'Unidade:', bold: true}, apto],
                        [{text: 'Técnico:', bold: true}, tecnico, {text: 'Data:', bold: true}, dataVist]
                    ]
                }, margin: [0, 0, 0, 15]
            }
        );

        const fotosAnexo = [];

        // --- CONTEÚDO ESPECÍFICO ---
        if (tipoVistoriaAtual === 'geral') {
            const cards = document.querySelectorAll('.medidor-card');
            cards.forEach(c => {
                const id = c.dataset.id;
                const t = c.dataset.tipo;
                if(t === 'hidrometro' || t === 'gasometro') {
                    const res = c.querySelector('.med-res').value || "0";
                    const label = t === 'hidrometro' ? 'ÁGUA' : 'GÁS';
                    docD.content.push({
                        table: {
                            widths: ['*'],
                            body: [[{text: `MEDIÇÃO ${label} #${id}`, style: 'lbl'}],[{text: `Volume apurado no teste: ${res} Litros`, style: 'val'}]]
                        }, margin: [0, 0, 0, 5]
                    });
                } else {
                    const loc = c.querySelector('.ponto-local') ? c.querySelector('.ponto-local').value : "Ponto";
                    const frs = c.dataset.relatorioGerado || "Teste realizado.";
                    docD.content.push({
                        table: {
                            widths: ['*'],
                            body: [[{text: `TESTE DE PONTO DE CONSUMO #${id} - ${loc}`, style: 'lbl'}],[{text: frs, style: 'val', fillColor:'#ffffdd'}]]
                        }, margin: [0, 0, 0, 5]
                    });
                }
                c.querySelectorAll('input[type="file"]').forEach(f => {
                    if(f.dataset.b64) fotosAnexo.push({ t: `Evidência - #${id}`, s: f.dataset.b64 });
                });
            });

            // Parecer Geral
            docD.content.push({
                table: {
                    widths: ['*','*'],
                    body: [
                        [{text: 'PARECER TÉCNICO', colSpan: 2, style: 'lbl', alignment: 'center'}, {}],
                        ['Pressão Água:', document.getElementById('pressao-agua').value || '-'],
                        ['Temp. Aquecedor:', document.getElementById('temp-aquecedor').value || '-'],
                        [{text: 'Diagnóstico e Observações:', bold: true, colSpan: 2},{}],
                        [{text: document.getElementById('observacoes').value || "Nenhuma observação adicional.", colSpan: 2, minHeight: 40}]
                    ]
                }, margin: [0, 10, 0, 15]
            });
            
            ['img-geral-med', 'img-geral-temp-aq', 'img-geral-manut', 'img-geral-press', 'img-geral-obs'].forEach(id => {
                const el = document.getElementById(id);
                if(el && el.src && el.src.startsWith('data')){ fotosAnexo.push({ t: 'Registro Geral', s: el.src }); }
            });

        } else {
            // --- VISTORIAS TÉCNICAS (Alto Consumo, Vazamento, Troca) ---
            
            // 1. Resumo de Medidores
            const techMedidores = document.querySelectorAll('#tech-medidores-resumo .tech-stage-card');
            if (techMedidores.length > 0) {
                const body = [[{text: 'DADOS DO MEDIDOR', style: 'lbl', colSpan: 3}, {}, {}]];
                techMedidores.forEach(m => {
                    const label = m.querySelector('.card-header').textContent;
                    const serie = m.querySelector('.med-n-serie').value || "-";
                    const leit = m.querySelector('.med-leitura').value || "-";
                    body.push([{text: label, bold: true}, `Série: ${serie}`, `Leitura: ${leit}`]);
                    
                    m.querySelectorAll('.lista-fotos .photo-meta-container').forEach(p => {
                        const img = p.querySelector('.preview-img');
                        if (img && img.src.startsWith('data')) {
                            fotosAnexo.push({
                                s: img.src,
                                t: label,
                                legenda: p.querySelector('.photo-legenda').value,
                                local: p.querySelector('.photo-local').value,
                                desc: p.querySelector('.photo-desc').value
                            });
                        }
                    });
                });
                docD.content.push({ table: { widths: ['*','*','*'], body: body }, margin: [0, 0, 0, 15] });
            }

            // 2. Etapas (Testes, Pontos ou Trocas)
            const etapas = document.querySelectorAll('#tech-etapas-container .tech-stage-card');
            etapas.forEach((et, index) => {
                const tipoEtapa = et.dataset.tipo;
                const num = index + 1;
                
                if (tipoEtapa === 'teste-alto-consumo') {
                    const tipoTeste = et.querySelector('.teste-tipo').options[et.querySelector('.teste-tipo').selectedIndex].text;
                    const ponto = et.querySelector('.teste-ponto').value || "-";
                    const cons = et.querySelector('.calc-consumo').textContent;
                    const vaz = et.querySelector('.calc-vazao').textContent;
                    const res = et.querySelector('.calc-resultado').textContent;
                    
                    docD.content.push({
                        table: {
                            widths: ['*'],
                            body: [
                                [{text: `TESTE DE CONSUMO #${num} - ${tipoTeste}`, style: 'lbl'}],
                                [{text: [
                                    {text: `Local: `, bold: true}, `${ponto}\n`,
                                    {text: `Consumo apurado: `, bold: true}, `${cons} Litros\n`,
                                    {text: `Vazão média: `, bold: true}, `${vaz} L/min\n`,
                                    {text: `Resultado: `, bold: true}, {text: res, color: '#e74c3c'}
                                ], margin: [5, 5, 5, 5]}]
                            ]
                        }, margin: [0, 0, 0, 10]
                    });
                } else if (tipoEtapa === 'ponto-vazamento') {
                    const ponto = et.querySelector('.vaz-ponto-nome').value || "Ponto";
                    const grav = et.querySelector('.vaz-gravidade').options[et.querySelector('.vaz-gravidade').selectedIndex].text;
                    const aparente = et.querySelector('.vaz-aparente').value.toUpperCase();
                    const desc = et.querySelector('.vaz-desc').value || "-";
                    
                    docD.content.push({
                        table: {
                            widths: ['*'],
                            body: [
                                [{text: `PONTO VISTORIADO #${num} - ${ponto}`, style: 'lbl'}],
                                [{text: [
                                    {text: `Vazamento aparente: `, bold: true}, `${aparente}\n`,
                                    {text: `Gravidade: `, bold: true}, `${grav}\n`,
                                    {text: `Descrição técnica: `, bold: true}, `${desc}`
                                ], margin: [5, 5, 5, 5]}]
                            ]
                        }, margin: [0, 0, 0, 10]
                    });
                } else if (tipoEtapa === 'troca-equipamento') {
                    const tipoEq = et.querySelector('.troca-tipo-eq').options[et.querySelector('.troca-tipo-eq').selectedIndex].text;
                    const sRem = et.querySelector('.removido-serie').value || "-";
                    const lRem = et.querySelector('.removido-leitura').value || "-";
                    const sIns = et.querySelector('.instalado-serie').value || "-";
                    const lIns = et.querySelector('.instalado-leitura').value || "-";
                    const mot = et.querySelector('.troca-motivo').options[et.querySelector('.troca-motivo').selectedIndex].text;
                    
                    docD.content.push({
                        table: {
                            widths: ['*'],
                            body: [
                                [{text: `TROCA DE EQUIPAMENTO #${num} - ${tipoEq}`, style: 'lbl'}],
                                [{columns: [
                                    {text: [{text: 'REMOVIDO\n', bold:true, color: '#e74c3c'}, `Série: ${sRem}\nLeitura: ${lRem}`]},
                                    {text: [{text: 'INSTALADO\n', bold:true, color: '#2ecc71'}, `Série: ${sIns}\nLeitura: ${lIns}`]}
                                ], margin: [5, 5, 5, 5]}],
                                [{text: [{text: 'Motivo: ', bold:true}, mot], margin: [5, 2, 5, 5]}]
                            ]
                        }, margin: [0, 0, 0, 10]
                    });
                }
                
                // Coleta fotos da etapa
                et.querySelectorAll('.lista-fotos .photo-meta-container').forEach(p => {
                    const img = p.querySelector('.preview-img');
                    if (img && img.src.startsWith('data')) {
                        fotosAnexo.push({
                            s: img.src,
                            t: `Etapa #${num}`,
                            legenda: p.querySelector('.photo-legenda').value,
                            local: p.querySelector('.photo-local').value,
                            desc: p.querySelector('.photo-desc').value
                        });
                    }
                });
            });

            // 3. Diagnóstico Final
            const diagRes = document.getElementById('diag-resultado').options[document.getElementById('diag-resultado').selectedIndex].text;
            const diagRec = document.getElementById('diag-recomendacao').value || "-";
            const diagResp = document.getElementById('diag-responsavel').value || "-";

            docD.content.push({
                table: {
                    widths: ['*'],
                    body: [
                        [{text: 'DIAGNÓSTICO E RECOMENDAÇÕES', style: 'lbl'}],
                        [{text: [
                            {text: 'Diagnóstico: ', bold: true}, `${diagRes}\n\n`,
                            {text: 'Recomendações técnicas: ', bold: true}, `${diagRec}\n\n`,
                            {text: 'Responsável orientado: ', bold: true}, `${diagResp}`
                        ], margin: [5, 5, 5, 5]}]
                    ]
                }, margin: [10, 10, 0, 15]
            });
            
            // Observações Gerais (do campo padrão)
            const obsGeral = document.getElementById('observacoes').value;
            if (obsGeral) {
                docD.content.push({ text: 'Observações Adicionais:', style: 'sub' }, { text: obsGeral, fontSize: 10 });
            }
        }

        // Assinatura
        if(signB64) {
            docD.content.push({ 
                stack: [
                    { image: signB64, width: 150, alignment: 'center' }, 
                    { text: '__________________________', alignment: 'center' }, 
                    { text: 'Assinatura do Responsável', alignment: 'center', fontSize: 8 }
                ], margin: [0, 30, 0, 0], unbreakable: true 
            });
        }

        // ANEXO FOTOGRÁFICO DETALHADO
        if(fotosAnexo.length > 0) {
            docD.content.push({ text: 'ANEXO FOTOGRÁFICO', style: 'h1', pageBreak: 'before' });
            
            fotosAnexo.forEach((f, i) => {
                const contentBlock = {
                    unbreakable: true,
                    margin: [0, 0, 0, 20],
                    stack: [
                        { image: f.s, width: 350, alignment: 'center' },
                        { 
                            table: {
                                widths: ['*'],
                                body: [[{
                                    text: [
                                        {text: `${f.t}${f.legenda ? ' - ' + f.legenda : ''}\n`, bold: true, fontSize: 10},
                                        f.local ? {text: `Local: ${f.local}\n`, fontSize: 9} : '',
                                        f.desc ? {text: `Descrição: ${f.desc}`, fontSize: 9, italics: true} : ''
                                    ],
                                    fillColor: '#f9f9f9',
                                    margin: [10, 5, 10, 5]
                                }]]
                            },
                            layout: 'noBorders',
                            margin: [70, 0, 70, 0]
                        }
                    ]
                };
                docD.content.push(contentBlock);
            });
        }

        loadingMsg.textContent = 'Gerando arquivo...';
        currentPdfFilename = `Vistoria_${tipoVistoriaAtual.toUpperCase()}_${condo}_${apto}.pdf`.replace(/\s/g, '_');

        currentPdfBlob = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Tempo limite excedido')), 40000);
            try {
                pdfMake.createPdf(docD).getBlob((blob) => {
                    clearTimeout(timeout);
                    if (blob) resolve(blob); else reject(new Error('Falha ao gerar blob'));
                });
            } catch (innerErr) { clearTimeout(timeout); reject(innerErr); }
        });

        overlay.style.display = 'none';
        document.getElementById('shareOverlay').style.display = 'flex';

    } catch (e) {
        console.error('Erro geração PDF:', e);
        alert("Erro na geração do PDF: " + e.message);
        overlay.style.display = 'none';
    }
}

function fecharShare() { window.location.reload(); }
document.getElementById('btnDownload').onclick = () => {
    if (!currentPdfBlob) { alert('Nenhum PDF gerado.'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(currentPdfBlob); a.download = currentPdfFilename; a.click();
};
document.getElementById('btnShare').onclick = async () => {
    if (!currentPdfBlob) { alert('Nenhum PDF gerado.'); return; }
    const f = new File([currentPdfBlob], currentPdfFilename, {type: 'application/pdf'});
    if(navigator.canShare && navigator.canShare({files: [f]})) await navigator.share({files: [f]});
    else alert("O compartilhamento nativo não está disponível. Use o botão Baixar.");
};
;
