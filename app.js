let medidorCount = 0;
let canvas, ctx, isDrawing = false;
let currentPdfBlob, currentPdfFilename;

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
    
    // Ocultar/Exibir campos específicos da Avaliação Geral
    const camposGeral = document.getElementById('campos-vistoria-geral');
    if (camposGeral) {
        camposGeral.style.display = (tipo === 'geral') ? 'block' : 'none';
    }
    
    // Ocultar botões baseado no Escopo
    const btnAgua = document.getElementById('btn-add-agua');
    const btnGas = document.getElementById('btn-add-gas');
    const btnPonto = document.getElementById('btn-add-ponto');
    
    if (btnAgua) btnAgua.style.display = (escopo === 'gas') ? 'none' : 'flex';
    if (btnGas) btnGas.style.display = (escopo === 'agua') ? 'none' : 'flex';
    if (btnPonto) btnPonto.style.display = (escopo === 'gas') ? 'none' : 'flex';
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

// GERAR PDF COM PROTEÇÕES ROBUSTAS
async function gerarPDF() {
    const overlay = document.getElementById('loadingOverlay');
    const loadingMsg = document.getElementById('loadingMsg');
    try {
        overlay.style.display = 'flex';
        loadingMsg.textContent = 'Carregando logo...';

        // 1) Carregar logo de forma segura
        const logoB64 = await carregarLogo();
        
        loadingMsg.textContent = 'Montando relatório...';

        const condo = document.getElementById('condominio').value || "Não informado";
        const bloco = document.getElementById('bloco').value || "";
        const apto = document.getElementById('apto').value || "";
        
        let signB64 = "";
        if(canvas) {
            const sigData = ctx.getImageData(0,0,canvas.width,canvas.height).data;
            for(let i=3; i<sigData.length; i+=4) { if(sigData[i]>0){ signB64 = canvas.toDataURL('image/png'); break; } }
        }

        // 2) Construir documento PDF — SEM imagens que possam falhar
        const docD = {
            pageSize: 'A4', 
            pageMargins: [40, 70, 40, 60],
            styles: {
                h1: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 5, 0, 20], color: '#1B263B' },
                lbl: { fontSize: 10, bold: true, fillColor: '#1B263B', color: '#ffffff', margin: [5, 5, 5, 5] },
                val: { fontSize: 10, margin: [5, 5, 5, 5], color: '#333333' },
                cap: { fontSize: 9, bold: true, alignment: 'center', margin: [0, 10, 0, 3] }
            },
            defaultStyle: {
                columnGap: 12
            },
            content: []
        };

        // 3) Adicionar logo na primeira página (se disponível)
        if (logoB64) {
            docD.content.push({ image: logoB64, width: 220, alignment: 'center', margin: [0, 0, 0, 15] });
            // Header nas páginas seguintes
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
            // Fallback sem logo
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
                        [{text: 'Técnico:', bold: true}, document.getElementById('tecnico').value || '', {text: 'Data:', bold: true}, document.getElementById('data-vistoria').value || '']
                    ]
                }, margin: [0, 0, 0, 15]
            }
        );

        // 4) Medidores
        const cards = document.querySelectorAll('.medidor-card');
        const fotos = [];

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
                if(f.dataset.b64) fotos.push({ t: `Evidência - #${id}`, s: f.dataset.b64 });
            });
        });

        // 5) Avaliação Geral
        const avaliacaoBody = [
            [{text: 'PARECER TÉCNICO', colSpan: 2, style: 'lbl', alignment: 'center'}, {}]
        ];
        
        if (tipoVistoriaAtual === 'geral') {
            avaliacaoBody.push(['Pressão Água:', document.getElementById('pressao-agua').value || '-']);
            avaliacaoBody.push(['Temp. Aquecedor:', document.getElementById('temp-aquecedor').value || '-']);
        }
        
        avaliacaoBody.push([{text: 'Diagnóstico e Observações:', bold: true, colSpan: 2},{}]);
        avaliacaoBody.push([{text: document.getElementById('observacoes').value || "Nenhuma observação adicional.", colSpan: 2, minHeight: 40}]);

        docD.content.push({
            table: {
                widths: ['*','*'],
                body: avaliacaoBody
            }, margin: [0, 10, 0, 15]
        });

        // 6) Fotos gerais
        const imgGeralIds = ['img-geral-med', 'img-geral-temp-aq', 'img-geral-manut', 'img-geral-press', 'img-geral-obs'];
        imgGeralIds.forEach(id => {
            const el = document.getElementById(id);
            if(el && el.src && el.src.startsWith('data')){ fotos.push({ t: 'Registro Geral', s: el.src }); }
        });

        // 7) Assinatura
        if(signB64) {
            docD.content.push({ 
                stack: [
                    { image: signB64, width: 150, alignment: 'center' }, 
                    { text: '__________________________', alignment: 'center' }, 
                    { text: 'Assinatura do Cliente', alignment: 'center', fontSize: 8 }
                ], margin: [0, 15, 0, 0], unbreakable: true 
            });
        }

        // 8) Anexo fotográfico
        if(fotos.length > 0) {
            docD.content.push({ text: 'ANEXO FOTOGRÁFICO', style: 'h1', pageBreak: 'before' });
            const grid = [];
            for(let i=0; i<fotos.length; i+=2) {
                const r = [];
                r.push({ image: fotos[i].s, width: 240, alignment: 'center', margin: [0, 0, 0, 15] });
                if(fotos[i+1]) r.push({ image: fotos[i+1].s, width: 240, alignment: 'center', margin: [0, 0, 0, 15] });
                else r.push({});
                grid.push(r);
            }
            docD.content.push({ layout: 'noBorders', table: { widths: ['50%','50%'], body: grid } });
        }

        // 9) GERAR PDF com Promise + timeout
        loadingMsg.textContent = 'Gerando PDF...';
        currentPdfFilename = `Relatorio_${condo}_Unid_${apto}.pdf`.replace(/\s/g, '_');

        currentPdfBlob = await new Promise((resolve, reject) => {
            // Timeout de 30 segundos
            const timeout = setTimeout(() => {
                reject(new Error('Tempo limite excedido (30s). Tente novamente com menos fotos.'));
            }, 30000);

            try {
                pdfMake.createPdf(docD).getBlob((blob) => {
                    clearTimeout(timeout);
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('O blob retornado está vazio.'));
                    }
                });
            } catch (innerErr) {
                clearTimeout(timeout);
                reject(innerErr);
            }
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
