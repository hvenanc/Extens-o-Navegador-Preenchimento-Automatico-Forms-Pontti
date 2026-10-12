(function () {
  // Evita injetar o painel mais de uma vez
  if (document.getElementById('preenchedor-fiscal-panel')) return;

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
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
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
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    logs.push(`✔ ${label} → "${source.value}"`);
  }

  // Perfis de tributação disponíveis
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

  // Revertido para síncrono (sem o delay)
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

  // --- FUNÇÃO DE MARGEM COM AUTO-SALVAR ---
  function aplicarMargem(fator) {
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

  // Painel flutuante
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

  // Botão NOVO: Código Específico
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
  
  // Botões de Margem
  const btnMargem30 = document.createElement('button');
  btnMargem30.className = 'preenchedor-fiscal-btn preenchedor-fiscal-btn-blue';
  btnMargem30.textContent = 'Margem 30% (/,70)';
  panel.appendChild(btnMargem30);

  const btnMargem35 = document.createElement('button');
  btnMargem35.className = 'preenchedor-fiscal-btn preenchedor-fiscal-btn-blue';
  btnMargem35.textContent = 'Margem 35% (/,65)';
  panel.appendChild(btnMargem35);

  document.body.appendChild(panel);

  const status = document.createElement('div');
  status.id = 'preenchedor-fiscal-status';
  document.body.appendChild(status);

  // Carrega preferência salva
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

  // Eventos de Clique
  btnCodigo.addEventListener('click', () => {
    const logs = [];
    setInputValue('input[name="Codigo"]', '790$90030020', 'Código', logs);
    mostrarStatus(logs);
  });
  
  btn5102.addEventListener('click', () => mostrarStatus(aplicarPerfil('5102', checkbox.checked)));
  btn5405.addEventListener('click', () => mostrarStatus(aplicarPerfil('5405', checkbox.checked)));
  btnMargem30.addEventListener('click', () => mostrarStatus(aplicarMargem(0.70)));
  btnMargem35.addEventListener('click', () => mostrarStatus(aplicarMargem(0.65)));
})();