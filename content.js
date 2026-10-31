(function () {
  if (window.innerWidth < 300 && window.innerHeight < 300) return;
  if (document.getElementById('preenchedor-fiscal-panel')) return;

  function dispatchAllEvents(el) {
    el.dispatchEvent(new Event('focus', { bubbles: true }));
    el.dispatchEvent(new Event('keydown', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('keyup', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function setSelectByValue(selector, value, label, logs) {
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

  function setInputValue(selector, value, label, logs) {
    const el = document.querySelector(selector);
    if (!el) {
      logs.push(`⚠ Campo não encontrado: ${selector}`);
      return;
    }
    el.value = value;
    dispatchAllEvents(el);
    logs.push(`✔ ${label} → ${value}`);
  }

  function copyValue(sourceSelector, targetSelector, label, logs) {
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
    dispatchAllEvents(target);
    logs.push(`✔ ${label} → "${source.value}"`);
  }

  const PERFIS = {
    '5102': { cfop: '289', st1: '102', st2: '102' },
    '5405': { cfop: '355', st1: '500', st2: '500' }
  };

  function aplicarPadroesComuns(logs) {
    setSelectByValue('select[name="CST_Ipi"]', '99', 'CST IPI (99)', logs);
    setSelectByValue('select[name="CST_Pis"]', '06', 'CST PIS (06)', logs);
    setSelectByValue('select[name="CST_Cofins"]', '06', 'CST COFINS (06)', logs);
    setSelectByValue('select[name="Modalidade_BC_ICMS"]', '3', 'Modalidade BC ICMS (3 - Valor da Operação)', logs);
    setSelectByValue('select[name="Tabela_Icms"]', '2', 'Tabela ICMS (Aliquota 2)', logs);
    setSelectByValue('select[name="Origem_ST"]', '0', 'Origem (0 - Nacional)', logs);
    setSelectByValue('select[name="Modalidade_BC_ICMS_ST"]', '4', 'Modalidade BC ICMS ST (4 - Margem Valor Agregado)', logs);
    setInputValue('input[name="Valor_Pauta"]', '0,00', 'Valor em Pauta', logs);
    setSelectByValue('select[name="motDesICMS"]', '', 'Motivo DesICMS', logs);

    copyValue('input[name="Titulo"]', 'input[name="Descricao"]', 'Descrição ← Nome', logs);
    copyValue('input[name="Titulo"]', 'input[name="Descricao_Etiqueta"]', 'Descrição Etiqueta ← Nome', logs);
  }

  function aplicarPerfil(chave, importarCodigo) {
    const perfil = PERFIS[chave];
    const logs = [];
    if (!perfil) {
      logs.push(`⚠ Perfil desconhecido: ${chave}`);
      return logs;
    }

    if (importarCodigo) {
      copyValue('input[name="Gtin"]', 'input[name="Codigo"]', 'Código ← Código Barras/Gtin', logs);
    } else {
      logs.push('↷ Importar Código desmarcado — Código não foi alterado');
    }

    setSelectByValue('select[name="Cfop_Venda"]', perfil.cfop, `CFOP Venda Dentro (${chave})`, logs);
    setSelectByValue('select[name="Codigo_ST_Simples"]', perfil.st1, `ICMS Simples - Dentro do Estado (${perfil.st1})`, logs);
    setSelectByValue('select[name="Codigo_ST_Simples2"]', perfil.st2, `ICMS Simples - Fora do Estado (${perfil.st2})`, logs);
    aplicarPadroesComuns(logs);
    
    return logs;
  }

  // --- FUNÇÃO DE MARGEM COM SUPORTE AOS DOIS TIPOS DE ARREDONDAMENTO ---
  function aplicarMargem(fator, tipoArredondamento) {
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
    let precoFinal = '';

    if (tipoArredondamento === 'meio') {
      // Arredonda para o próximo 0,50 ou inteiro (ex: 6,48 -> 6,50 | 6,93 -> 7,00)
      let precoArredondado = Math.ceil(precoCalculado * 2) / 2;
      precoFinal = precoArredondado.toFixed(2).replace('.', ',');
    } else {
      // Lógica antiga (final ,90)
      let precoArredondado = Math.floor(precoCalculado) + 0.90;
      precoFinal = precoArredondado.toFixed(2).replace('.', ',');
    }

    ['Preco1', 'Preco2', 'Preco3'].forEach(id => {
      const precoInput = document.getElementById(id);
      if (precoInput) {
        precoInput.value = precoFinal;
        dispatchAllEvents(precoInput);
      }
    });

    let margemNome = fator === 0.70 ? '30%' : '35%';
    let regraNome = tipoArredondamento === 'meio' ? 'inteiro/0,50' : ',90';
    logs.push(`✔ Margem ${margemNome} (${regraNome}) aplicada!\nCusto: R$ ${custo.toFixed(2).replace('.', ',')} → Venda: R$ ${precoFinal}`);
    logs.push('⏳ O produto será salvo automaticamente em 5 segundos...');

    setTimeout(() => {
      const btnSalvar = document.querySelector('button[name="Cadastrar"][value="Salvar"]') ||
                        document.querySelector('button[name="Alterar"][value="Salvar"]') ||
                        document.querySelector('button.bt_cadastro[type="submit"]');
      if (btnSalvar) {
        btnSalvar.click();
      }
    }, 5000);

    return logs;
  }

  // Montagem do painel flutuante
  const panel = document.createElement('div');
  panel.id = 'preenchedor-fiscal-panel';

  const title = document.createElement('div');
  title.id = 'preenchedor-fiscal-title';
  title.textContent = 'Preenchedor Fiscal';
  panel.appendChild(title);

  const checkboxWrapper = document.createElement('label');
  checkboxWrapper.className = 'preenchedor-fiscal-checkbox-wrapper';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'preenchedor-fiscal-importar-codigo';
  checkbox.checked = true;
  checkboxWrapper.appendChild(checkbox);
  checkboxWrapper.appendChild(document.createTextNode(' Importar Gtin → Código'));
  panel.appendChild(checkboxWrapper);

  const alertCheckboxWrapper = document.createElement('label');
  alertCheckboxWrapper.className = 'preenchedor-fiscal-checkbox-wrapper';
  const alertCheckbox = document.createElement('input');
  alertCheckbox.type = 'checkbox';
  alertCheckbox.id = 'preenchedor-fiscal-bloquear-alertas';
  alertCheckbox.checked = true;
  alertCheckboxWrapper.appendChild(alertCheckbox);
  alertCheckboxWrapper.appendChild(document.createTextNode(' Bloquear Alertas'));
  panel.appendChild(alertCheckboxWrapper);

  const btnCodigo = document.createElement('button');
  btnCodigo.className = 'preenchedor-fiscal-btn preenchedor-fiscal-btn-blue';
  btnCodigo.textContent = 'Código: 790$90030020';
  btnCodigo.style.marginBottom = '6px';
  panel.appendChild(btnCodigo);

  const btn5102 = document.createElement('button');
  btn5102.className = 'preenchedor-fiscal-btn';
  btn5102.textContent = '5102 / 102';
  panel.appendChild(btn5102);

  const btn5405 = document.createElement('button');
  btn5405.className = 'preenchedor-fiscal-btn';
  btn5405.textContent = '5405 / 500';
  panel.appendChild(btn5405);
  
  // 1. Margens Novas (,00 / ,50)
  const btnMargem30Meio = document.createElement('button');
  btnMargem30Meio.className = 'preenchedor-fiscal-btn preenchedor-fiscal-btn-blue';
  btnMargem30Meio.textContent = '30% (Inteiro / ,50)';
  panel.appendChild(btnMargem30Meio);

  const btnMargem35Meio = document.createElement('button');
  btnMargem35Meio.className = 'preenchedor-fiscal-btn preenchedor-fiscal-btn-blue';
  btnMargem35Meio.textContent = '35% (Inteiro / ,50)';
  panel.appendChild(btnMargem35Meio);

  // 2. Margens Antigas (,90)
  const btnMargem30Antiga = document.createElement('button');
  btnMargem30Antiga.className = 'preenchedor-fiscal-btn preenchedor-fiscal-btn-blue';
  btnMargem30Antiga.textContent = '30% Antiga (,90)';
  panel.appendChild(btnMargem30Antiga);

  const btnMargem35Antiga = document.createElement('button');
  btnMargem35Antiga.className = 'preenchedor-fiscal-btn preenchedor-fiscal-btn-blue';
  btnMargem35Antiga.textContent = '35% Antiga (,90)';
  panel.appendChild(btnMargem35Antiga);

  document.body.appendChild(panel);

  const status = document.createElement('div');
  status.id = 'preenchedor-fiscal-status';
  document.body.appendChild(status);

  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['importarCodigo', 'bloquearAlertas'], (res) => {
      if (typeof res.importarCodigo === 'boolean') {
        checkbox.checked = res.importarCodigo;
      }
      const bloquear = typeof res.bloquearAlertas === 'boolean' ? res.bloquearAlertas : true;
      alertCheckbox.checked = bloquear;
      try { localStorage.setItem('preenchedorFiscal_bloquearAlertas', String(bloquear)); } catch (e) {}
    });

    checkbox.addEventListener('change', () => chrome.storage.local.set({ importarCodigo: checkbox.checked }));
    alertCheckbox.addEventListener('change', () => {
      chrome.storage.local.set({ bloquearAlertas: alertCheckbox.checked });
      try { localStorage.setItem('preenchedorFiscal_bloquearAlertas', String(alertCheckbox.checked)); } catch (e) {}
    });
  }

  function mostrarStatus(logs) {
    status.textContent = logs.join('\n');
    status.style.display = 'block';
    clearTimeout(status._timeout);
    status._timeout = setTimeout(() => { status.style.display = 'none'; }, 7000);
  }

  btnCodigo.addEventListener('click', () => {
    const logs = [];
    setInputValue('input[name="Codigo"]', '790$90030020', 'Código', logs);
    mostrarStatus(logs);
  });
  
  btn5102.addEventListener('click', () => mostrarStatus(aplicarPerfil('5102', checkbox.checked)));
  btn5405.addEventListener('click', () => mostrarStatus(aplicarPerfil('5405', checkbox.checked)));

  // Listeners dos 4 botões de margem
  btnMargem30Meio.addEventListener('click', () => mostrarStatus(aplicarMargem(0.70, 'meio')));
  btnMargem35Meio.addEventListener('click', () => mostrarStatus(aplicarMargem(0.65, 'meio')));
  btnMargem30Antiga.addEventListener('click', () => mostrarStatus(aplicarMargem(0.70, '90')));
  btnMargem35Antiga.addEventListener('click', () => mostrarStatus(aplicarMargem(0.65, '90')));
})();