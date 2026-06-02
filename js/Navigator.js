/**
 * Navigator.js
 * Controla la navegación entre canciones, temas visuales y estado del carrusel.
 */

class Navigator {
  /**
   * @param {object[]} songs    — array con metadata de cada canción
   * @param {AudioEngine} engine
   */
  constructor(songs, engine) {
    this.songs   = songs;
    this.engine  = engine;
    this.current = 0;     // índice activo
    this.onChangeCallback = null;

    // Referencias DOM
    this.cards     = Array.from(document.querySelectorAll('.card'));
    this.dots      = Array.from(document.querySelectorAll('.dot'));
    this.btnPlay   = document.getElementById('btn-play');
    this.btnPrev   = document.getElementById('btn-prev');
    this.btnNext   = document.getElementById('btn-next');
    this.npThumb   = document.getElementById('np-thumb');
    this.npTitle   = document.getElementById('np-title');
    this.npArtist  = document.getElementById('np-artist');
    this.volSlider = document.getElementById('volume-slider');

    this._bindEvents();
    this._applyTheme(0);
    this._updatePlayerBar(0);
  }

  /* ── Registrar callback cuando cambia de canción ── */
  onChange(fn) { this.onChangeCallback = fn; }

  /* ── Navegar a un índice específico ── */
  async goTo(index) {
    if (index === this.current) return;
    if (index < 0 || index >= this.songs.length) return;

    // Detener la canción actual si está reproduciendo
    const wasPlaying = this.engine.isPlaying;
    this.engine.stop();
    this.cards[this.current].classList.remove('active', 'playing');

    this.current = index;

    // Cargar nueva canción
    await this.engine.load(this.songs[index].audio);

    // Actualizar UI
    this._applyTheme(index);
    this._updatePlayerBar(index);
    this._updateCards();

    // Si estaba reproduciendo, continuar
    if (wasPlaying) this.engine.play();

    if (this.onChangeCallback) this.onChangeCallback(index);
  }

  /* ── Siguiente / Anterior ── */
  next() { this.goTo((this.current + 1) % this.songs.length); }
  prev() { this.goTo((this.current - 1 + this.songs.length) % this.songs.length); }

  /* ── Aplicar tema de color al body según canción ── */
  _applyTheme(index) {
    document.body.className = '';
    document.body.classList.add(`theme-${this.songs[index].theme}`);
  }

  /* ── Actualizar barra inferior ── */
  _updatePlayerBar(index) {
    const song = this.songs[index];
    this.npThumb.src    = song.img;
    this.npThumb.alt    = song.title;
    this.npTitle.textContent  = song.title;
    this.npArtist.textContent = song.artist;

    this.dots.forEach((d, i) => d.classList.toggle('active', i === index));
  }

  /* ── Actualizar estado visual de tarjetas ── */
  _updateCards() {
    this.cards.forEach((card, i) => {
      card.classList.toggle('active', i === this.current);
    });
  }

  /* ── Actualizar botón play/pause ── */
  _updatePlayBtn() {
    this.btnPlay.innerHTML = this.engine.isPlaying ? '&#9646;&#9646;' : '&#9654;';
  }

  /* ── Bind de todos los eventos ── */
  _bindEvents() {
    /* Botones de la barra */
    this.btnPlay.addEventListener('click', () => {
      this.engine.toggle();
      this._updatePlayBtn();
      // Sincronizar estado .playing en la tarjeta activa
      this.cards[this.current].classList.toggle('playing', this.engine.isPlaying);
    });

    this.btnNext.addEventListener('click', () => this.next());
    this.btnPrev.addEventListener('click', () => this.prev());

    /* Dots */
    this.dots.forEach((dot, i) => {
      dot.addEventListener('click', () => this.goTo(i));
    });

    /* Volumen */
    this.volSlider.addEventListener('input', (e) => {
      this.engine.setVolume(parseFloat(e.target.value));
    });

    /* Tarjetas: clic para activar */
    this.cards.forEach((card, i) => {
      card.addEventListener('click', () => {
        if (i !== this.current) {
          this.goTo(i);
        }
      });
    });

    /* Hold (mouse / touch) en la tarjeta activa → reproducir */
    this.cards.forEach((card, i) => {
      let holdTimer = null;
      const HOLD_MS = 250;   // ms para considerar "hold"

      const startHold = (e) => {
        if (i !== this.current) return;
        e.preventDefault();
        card.classList.add('touch-hold');
        holdTimer = setTimeout(() => {
          if (!this.engine.isLoaded) return;
          this.engine.play();
          card.classList.add('playing');
          this._updatePlayBtn();
        }, HOLD_MS);
      };

      const endHold = () => {
        card.classList.remove('touch-hold');
        clearTimeout(holdTimer);
        // En móvil: soltar pausa
        if (window.matchMedia('(pointer:coarse)').matches) {
          this.engine.pause();
          card.classList.remove('playing');
          this._updatePlayBtn();
        }
      };

      // Mouse
      card.addEventListener('mousedown', startHold);
      card.addEventListener('mouseup',   endHold);
      card.addEventListener('mouseleave', endHold);

      // Touch
      card.addEventListener('touchstart', startHold, { passive: false });
      card.addEventListener('touchend',   endHold);
      card.addEventListener('touchcancel', endHold);
    });

    /* Callbacks del engine */
    this.engine.onEnd = () => {
      this.cards[this.current].classList.remove('playing');
      this._updatePlayBtn();
      // Auto-avanzar a la siguiente canción
      setTimeout(() => this.next(), 800);
    };

    /* Teclado: ← → para navegar, espacio para play/pause */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight')      this.next();
      else if (e.key === 'ArrowLeft')  this.prev();
      else if (e.key === ' ') {
        e.preventDefault();
        this.engine.toggle();
        this.cards[this.current].classList.toggle('playing', this.engine.isPlaying);
        this._updatePlayBtn();
      }
    });
  }
}