/**
 * Navigator.js v2
 * - Sin conflicto con main.js en el botón play
 * - goTo() llama onChangeCallback ANTES de re-play para que
 *   main.js pueda detener/arrancar visualizadores correctamente
 */

class Navigator {
  constructor(songs, engine) {
    this.songs            = songs;
    this.engine           = engine;
    this.current          = 0;
    this.onChangeCallback = null;

    this.cards     = Array.from(document.querySelectorAll('.card'));
    this.dots      = Array.from(document.querySelectorAll('.dot'));
    this.btnPrev   = document.getElementById('btn-prev');
    this.btnNext   = document.getElementById('btn-next');
    this.npThumb   = document.getElementById('np-thumb');
    this.npTitle   = document.getElementById('np-title');
    this.npArtist  = document.getElementById('np-artist');
    this.volSlider = document.getElementById('volume-slider');

    // ⚠️  El botón play NO se toca aquí — lo maneja main.js exclusivamente
    this._bindEvents();
    this._applyTheme(0);
    this._updatePlayerBar(0);
  }

  onChange(fn) { this.onChangeCallback = fn; }

  async goTo(index) {
    if (index === this.current) return;
    if (index < 0 || index >= this.songs.length) return;

    const wasPlaying = this.engine.isPlaying;

    // 1. Parar engine y limpiar clase .playing de la tarjeta anterior
    this.engine.stop();
    this.cards[this.current].classList.remove('active', 'playing');

    this.current = index;

    // 2. Notificar PRIMERO para que main.js detenga visualizadores
    if (this.onChangeCallback) this.onChangeCallback(index);

    // 3. Cargar nueva canción
    await this.engine.load(this.songs[index].audio);

    // 4. Actualizar UI
    this._applyTheme(index);
    this._updatePlayerBar(index);
    this._updateCards();

    // 5. Si estaba reproduciendo, arrancar de nuevo
    //    (engine.onPlay en main.js lanzará los visualizadores)
    if (wasPlaying) this.engine.play();
  }

  next() { this.goTo((this.current + 1) % this.songs.length); }
  prev() { this.goTo((this.current - 1 + this.songs.length) % this.songs.length); }

  _applyTheme(index) {
    document.body.className = '';
    document.body.classList.add(`theme-${this.songs[index].theme}`);
  }

  _updatePlayerBar(index) {
    const song = this.songs[index];
    this.npThumb.src              = song.img;
    this.npThumb.alt              = song.title;
    this.npTitle.textContent      = song.title;
    this.npArtist.textContent     = song.artist;
    this.dots.forEach((d, i) => d.classList.toggle('active', i === index));
  }

  _updateCards() {
    this.cards.forEach((card, i) =>
      card.classList.toggle('active', i === this.current)
    );
  }

  _bindEvents() {
    // Botones skip — solo navegación, sin tocar play/pause
    this.btnNext.addEventListener('click', () => this.next());
    this.btnPrev.addEventListener('click', () => this.prev());

    // Dots
    this.dots.forEach((dot, i) =>
      dot.addEventListener('click', () => this.goTo(i))
    );

    // Volumen
    this.volSlider.addEventListener('input', (e) =>
      this.engine.setVolume(parseFloat(e.target.value))
    );

    // Teclado ← → espacio
    document.addEventListener('keydown', (e) => {
      if      (e.key === 'ArrowRight') this.next();
      else if (e.key === 'ArrowLeft')  this.prev();
      // espacio lo maneja main.js
    });
  }
}