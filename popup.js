const checkboxImportarCodigo = document.getElementById('importarCodigo');

chrome.storage.local.get(['importarCodigo'], (res) => {
  if (typeof res.importarCodigo === 'boolean') {
    checkboxImportarCodigo.checked = res.importarCodigo;
  }
});
checkboxImportarCodigo.addEventListener('change', () => {
  chrome.storage.local.set({ importarCodigo: checkboxImportarCodigo.checked });
});

document.getElementById('btn5102').addEventListener('click', () => aplicarNaAba('5102'));
document.getElementById('btn5405').addEventListener('click', () => aplicarNaAba('5405'));

document.getElementById('btnMargem30').addEventListener('click', () => aplicarMargemNaAba(0.70));
document.getElementById('btnMargem35').addEventListener('click', () => aplicarMargemNaAba(0.65));

// Listener para o novo botão de código
document.getElementById('btnCodigoEsp').addEventListener('click', async () => {
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Preenchendo...';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injetarCodigoEspecifico,
      args: ['790$90030020']
    });
    statusEl.textContent = result.join('\n');
  } catch (err) {
    statusEl.textContent = 'Erro: ' + err.message;
  }
});

async function aplicarNaAba(perfilChave) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Preenchendo...';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const importarCodigo = checkboxImportarCodigo.checked;
    
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: preencherCamposFiscais,
      args: [perfilChave, importarCodigo]
    });
    statusEl.textContent = result.join('\n');
  } catch (err) {
    statusEl.textContent = 'Erro: ' + err.message;
  }
}

async function aplicarMargemNaAba(fator) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Calculando...';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: calcularEPreencherMargem,
      args: [fator]
    });
    statusEl.textContent = result.join('\n');
  } catch (err) {
    statusEl.textContent = 'Erro: ' + err.message;
  }
}

// Injetada na página para preencher o código
function injetarCodigoEspecifico(codigoStr) {
  const logs = [];
  const el = document.querySelector('input[name="Codigo"]');
  if (!el) {
    logs.push(`⚠ Campo Código não encontrado.`);
    return logs;
  }
  el.value = codigoStr;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  logs.push(`✔ Código preenchido → ${codigoStr}`);
  return logs;
}

// Injetada na página para calcular margem e salvar automaticamente
function calcularEPreencherMargem(fator) {
  const logs = [];
  const custoInput = document.querySelector('input[name="Custo"]');
  if (!custoInput || !custoInput.value) {
    logs.push('⚠ Campo "Custo" não encontrado ou vazio.');
    return logs;
  }

  let custoStr = custoInput.value.replace(/\./g, '').replace(',', '.');
  let custo = parseFloat(custoStr);
  if (isNaN(custo)) {
    logs.push('⚠ Valor de custo inválido.');
    return logs;
  }

  let precoCalculado = custo / fator;
  let precoArredondado = Math.floor(precoCalculado) + 0.90;
  let precoFinal = precoArredondado.toFixed(2).replace('.', ',');

  ['Preco1', 'Preco2', 'Preco3'].forEach(id => {
    const precoInput = document.getElementById(id);
    if (precoInput) {
      precoInput.value = precoFinal;
      precoInput.dispatchEvent(new Event('input', { bubbles: true }));
      precoInput.dispatchEvent(new Event('change', { bubbles: true }));
      precoInput.dispatchEvent(new Event('blur', { bubbles: true }));
    }
  });

  let margemNome = fator === 0.70 ? '30%' : '35%';
  logs.push(`✔ Margem ${margemNome} aplicada!\nCusto: R$ ${custo.toFixed(2).replace('.', ',')} → Venda: R$ ${precoFinal}`);
  logs.push('⏳ O produto será salvo automaticamente em 5 segundos...');

  setTimeout(() => {
    const btnSalvar = document.querySelector('button[name="Alterar"][value="Salvar"]') || document.querySelector('button.bt_cadastro[type="submit"]');
    if (btnSalvar) {
      btnSalvar.click();
    }
  }, 5000);

  return logs;
}

// Injetada na página para preencher os perfis fiscais (Revertida para síncrona sem delay)
function preencherCamposFiscais(perfilChave, importarCodigo) {
  const logs = [];

  function setSelectByValue(selector, value, label) {
    const el = document.querySelector(selector);
    if (!el) {
      logs.push(`⚠ Campo não encontrado: ${selector}`);
      return;
    }
    const optionExists = Array.from(el.options).some(opt => opt.value === value);
    if (!optionExists) {
      logs.push(`⚠ Valor "${value}" não encontrado em ${selector}`);
      return;
    }
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    logs.push(`✔ ${label} → ${value === '' ? '(padrão)' : value}`);
  }

  function setInputValue(selector, value, label) {
    const el = document.querySelector(selector);
    if (!el) {
      logs.push(`⚠ Campo não encontrado: ${selector}`);
      return;
    }
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    logs.push(`✔ ${label} → ${value}`);
  }

  function copyValue(sourceSelector, targetSelector, label) {
    const source = document.querySelector(sourceSelector);
    const target = document.querySelector(targetSelector);
    if (!source) {
      logs.push(`⚠ Campo de origem não encontrado: ${sourceSelector}`);
      return;
    }
    if (!target) {
      logs.push(`⚠ Campo de destino não encontrado: ${targetSelector}`);
      return;
    }
    target.value = source.value;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    logs.push(`✔ ${label} → "${source.value}"`);
  }

  const PERFIS = {
    '5102': { cfop: '289', st1: '102', st2: '102' },
    '5405': { cfop: '355', st1: '500', st2: '500' }
  };

  const perfil = PERFIS[perfilChave];
  if (!perfil) {
    logs.push(`⚠ Perfil desconhecido: ${perfilChave}`);
    return logs;
  }

  if (importarCodigo) {
    copyValue('input[name="Gtin"]', 'input[name="Codigo"]', 'Código ← Código Barras/Gtin');
  } else {
    logs.push('↷ Importar Código desmarcado — Código não foi alterado');
  }

  setSelectByValue('select[name="Cfop_Venda"]', perfil.cfop, `CFOP Venda Dentro (${perfilChave})`);
  setSelectByValue('select[name="Codigo_ST_Simples"]', perfil.st1, `ICMS Simples - Dentro do Estado (${perfil.st1})`);
  setSelectByValue('select[name="Codigo_ST_Simples2"]', perfil.st2, `ICMS Simples - Fora do Estado (${perfil.st2})`);

  setSelectByValue('select[name="CST_Ipi"]', '99', 'CST IPI (99)');
  setSelectByValue('select[name="CST_Pis"]', '06', 'CST PIS (06)');
  setSelectByValue('select[name="CST_Cofins"]', '06', 'CST COFINS (06)');
  setSelectByValue('select[name="Modalidade_BC_ICMS"]', '3', 'Modalidade BC ICMS (3 - Valor da Operação)');
  setSelectByValue('select[name="Tabela_Icms"]', '2', 'Tabela ICMS (Aliquota 2)');
  setSelectByValue('select[name="Origem_ST"]', '0', 'Origem (0 - Nacional)');
  setSelectByValue('select[name="Modalidade_BC_ICMS_ST"]', '4', 'Modalidade BC ICMS ST (4 - Margem Valor Agregado)');
  setInputValue('input[name="Valor_Pauta"]', '0,00', 'Valor em Pauta');
  setSelectByValue('select[name="motDesICMS"]', '', 'Motivo DesICMS');

  copyValue('input[name="Titulo"]', 'input[name="Descricao"]', 'Descrição ← Nome');
  copyValue('input[name="Titulo"]', 'input[name="Descricao_Etiqueta"]', 'Descrição Etiqueta ← Nome');

  return logs;
}