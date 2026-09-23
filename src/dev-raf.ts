if (import.meta.env.DEV && new URLSearchParams(location.search).get('raf') === 'timer') {
  window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(performance.now()), 16);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
}

export {};
