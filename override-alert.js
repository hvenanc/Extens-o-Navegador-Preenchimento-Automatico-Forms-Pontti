(function () {
  // Este arquivo roda no MAIN world (mesmo contexto do JS da própria página),
  // por isso consegue sobrescrever window.alert de fato.
  // Não tem acesso às APIs da extensão (chrome.storage), então a preferência
  // é lida do localStorage da própria página, sincronizado pelo content.js.

  const STORAGE_KEY = 'preenchedorFiscal_bloquearAlertas';
  const originalAlert = window.alert;

  function bloqueioAtivo() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  function mostrarAviso(mensagem) {
    let toast = document.getElementById('preenchedor-fiscal-alerta-bloqueado');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'preenchedor-fiscal-alerta-bloqueado';
      toast.style.cssText =
        'position:fixed;top:10px;left:50%;transform:translateX(-50%);' +
        'z-index:2147483647;background:#333;color:#fff;padding:8px 14px;' +
        'border-radius:6px;font-family:Arial,sans-serif;font-size:12px;' +
        'box-shadow:0 2px 8px rgba(0,0,0,0.3);max-width:80%;text-align:center;';
      (document.body || document.documentElement).appendChild(toast);
    }
    toast.textContent = '🔕 Alerta bloqueado: ' + mensagem;
    toast.style.display = 'block';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.display = 'none'; }, 4000);
  }

  window.alert = function (mensagem) {
    if (bloqueioAtivo()) {
      console.log('[Preenchedor Fiscal] alert() bloqueado:', mensagem);
      mostrarAviso(String(mensagem));
      return undefined;
    }
    return originalAlert.call(window, mensagem);
  };
})();
