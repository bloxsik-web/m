// Конфигурация
const THEME_COLOR = 'rgb(16, 3, 33)';
// Установите длительность вашей GIF (в миллисекундах), если нужно точное совпадение
const SPLASH_DURATION_MS = 2000; // Измените под длительность pipiska/anim_logo.gif

document.addEventListener('DOMContentLoaded', () => {
  // Splash logic
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  const splashGif = document.getElementById('splashGif');

  // После загрузки изображения ждём SPLASH_DURATION_MS и показываем приложение
  const showApp = () => {
    splash.classList.add('hidden');
    app.classList.remove('hidden');
  };

  if (splashGif.complete) {
    setTimeout(showApp, SPLASH_DURATION_MS);
  } else {
    splashGif.addEventListener('load', () => setTimeout(showApp, SPLASH_DURATION_MS), { once: true });
  }

  // Player
  const audio = document.getElementById('audio');
  // режима бандла: без импорта пользователем
  const playPauseBtn = document.getElementById('playPauseBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const seekBar = document.getElementById('seekBar');
  const volumeBar = document.getElementById('volumeBar');
  const currentTimeEl = document.getElementById('currentTime');
  const durationEl = document.getElementById('duration');
  const trackTitle = document.getElementById('trackTitle');
  const trackArtist = document.getElementById('trackArtist');
  const coverImg = document.getElementById('coverImg');
  const playlistEl = document.getElementById('playlist');
  const chartList = document.getElementById('chartList');
  const chartSection = document.getElementById('chartSection');
  const chartToggleBtn = document.getElementById('chartToggleBtn');
  const hero = document.getElementById('hero');
  const logoImg = document.getElementById('logoImg');
  const account = document.getElementById('account');
  const accountMenu = document.getElementById('accountMenu');
  const accountName = document.getElementById('accountName');
  const accountAvatar = document.getElementById('accountAvatar');
  const nameInput = document.getElementById('nameInput');
  const avatarInput = document.getElementById('avatarInput');
  const saveAccountBtn = document.getElementById('saveAccountBtn');
  const resetAccountBtn = document.getElementById('resetAccountBtn');
  const versionBadge = document.getElementById('versionBadge');
  const versionModal = document.getElementById('versionModal');
  const versionModalClose = document.getElementById('versionModalClose');

  let playlist = []; // { name, url, objectUrl?: true }
  let currentIndex = -1;

  const STORAGE_KEY = 'firefy_playlist_v1';
  const STORAGE_INDEX_KEY = 'firefy_current_index_v1';
  const ACCOUNT_KEY = 'firefy_account_v1';

  // Helpers
  const formatTime = (sec) => {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const setNowPlaying = (name, artist, cover) => {
    trackTitle.textContent = name || 'Ничего не играет';
    trackArtist.textContent = artist || '';
    if (cover) coverImg.src = cover; else coverImg.removeAttribute('src');
  };

  const renderPlaylist = () => {
    if (!playlistEl) { persistState(); return; }
    playlistEl.innerHTML = '';
    playlist.forEach((item, index) => {
      const li = document.createElement('li');
      li.textContent = item.name;
      if (index === currentIndex) li.classList.add('active');
      li.addEventListener('click', () => playAt(index));
      playlistEl.appendChild(li);
    });
    persistState();
  };

  const renderChart = () => {
    if (!chartList) return;
    chartList.innerHTML = '';
    playlist.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = 'chart-row';
      li.innerHTML = `
        <div class="row-num">${i + 1}</div>
        <img class="row-cover" src="${item.cover || ''}" alt=""/>
        <div class="row-main">
          <div class="row-title">${item.name}</div>
          <div class="row-artist">${item.artist || ''}</div>
        </div>
        <div class="row-duration" data-i="${i}">--:--</div>
      `;
      li.addEventListener('click', () => playAt(i));
      chartList.appendChild(li);
    });
  };

  const cleanupObjectUrls = () => {
    playlist.forEach(p => { if (p.objectUrl) URL.revokeObjectURL(p.url); });
  };

  // Функция для перемешивания массива (алгоритм Fisher-Yates)
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Загрузка из локального манифеста tracks/playlist.json
  const loadBundledPlaylist = async () => {
    try {
      const res = await fetch(`tracks/playlist.json?ts=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      const tracks = Array.isArray(data) ? data : Array.isArray(data.tracks) ? data.tracks : [];
      const processedTracks = tracks
        .map(t => ({
          name: t.name || 'Трек',
          artist: t.artist || '',
          url: t.src || t.url,
          cover: t.cover || '',
        }))
        .filter(t => t.url);
      
      // Перемешиваем треки при каждой загрузке
      playlist = shuffleArray(processedTracks);
      console.log('Загружен плейлист:', playlist);
      
      renderPlaylist();
      renderChart();
      if (playlist.length > 0) playAt(0);
    } catch (e) {
      console.error('Не удалось загрузить tracks/playlist.json', e);
    }
  };

  const playAt = (index) => {
    console.log('playAt вызвана с индексом:', index);
    console.log('Длина плейлиста:', playlist.length);
    if (index < 0 || index >= playlist.length) {
      console.log('Индекс вне диапазона');
      return;
    }
    
    // Выходим из режима альбома при выборе трека из основного чарта
    window.isPlayingAlbum = false;
    window.albumTracks = null;
    window.currentAlbumIndex = 0;
    
    currentIndex = index;
    const item = playlist[currentIndex];
    console.log('Воспроизводим трек:', item);
    audio.src = item.url;
    audio.play().catch((error) => {
      console.log('Ошибка воспроизведения:', error);
    });
    setNowPlaying(item.name, item.artist, item.cover);
    updatePlayPauseIcon();
    renderPlaylist();
    localStorage.setItem(STORAGE_INDEX_KEY, String(currentIndex));
  };

  const playNext = () => {
    if (window.isPlayingAlbum && window.albumTracks) {
      // Если играет альбом, переключаем треки альбома
      window.currentAlbumIndex = (window.currentAlbumIndex + 1) % window.albumTracks.length;
      const track = window.albumTracks[window.currentAlbumIndex];
      audio.src = track.src;
      audio.play();
      setNowPlaying(track.name, track.artist, track.cover);
      return;
    }
    
    if (playlist.length === 0) return;
    playAt((currentIndex + 1) % playlist.length);
  };

  const playPrev = () => {
    if (window.isPlayingAlbum && window.albumTracks) {
      // Если играет альбом, переключаем треки альбома
      window.currentAlbumIndex = (window.currentAlbumIndex - 1 + window.albumTracks.length) % window.albumTracks.length;
      const track = window.albumTracks[window.currentAlbumIndex];
      audio.src = track.src;
      audio.play();
      setNowPlaying(track.name, track.artist, track.cover);
      return;
    }
    
    if (playlist.length === 0) return;
    playAt((currentIndex - 1 + playlist.length) % playlist.length);
  };

  const updatePlayPauseIcon = () => {
    const isPaused = audio.paused;
    playPauseBtn.textContent = isPaused ? '▶️' : '⏸️';
    if (chartToggleBtn) chartToggleBtn.textContent = isPaused ? '▶️' : '⏸️';
    if (chartSection) chartSection.classList.toggle('animate', !isPaused);
    
    // Обновляем кнопки в блоке новых релизов
    const releasePlayPauseButtons = document.querySelectorAll('.play-pause-btn');
    releasePlayPauseButtons.forEach(btn => {
      btn.textContent = isPaused ? '▶' : '⏸';
    });
  };

  // Убраны функции импорта/URL/drag&drop для бандл-режима

  // Events: controls
  playPauseBtn.addEventListener('click', () => {
    if (!audio.src && playlist.length > 0) {
      playAt(0);
      return;
    }
    if (audio.paused) audio.play(); else audio.pause();
  });
  prevBtn.addEventListener('click', playPrev);
  nextBtn.addEventListener('click', playNext);

  // Hero: «Моя волна» — запустить воспроизведение всех треков по порядку
  if (hero) {
    hero.addEventListener('click', () => {
      if (playlist.length === 0) return;
      if (!audio.src) {
        playAt(0);
        return;
      }
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    });
  }

  // Chart header play/pause
  if (chartToggleBtn) {
    chartToggleBtn.addEventListener('click', () => {
      if (playlist.length === 0) return;
      if (!audio.src) { playAt(0); return; }
      if (audio.paused) audio.play(); else audio.pause();
    });
  }

  audio.addEventListener('play', updatePlayPauseIcon);
  audio.addEventListener('pause', updatePlayPauseIcon);
  audio.addEventListener('ended', () => {
    if (window.isPlayingAlbum && window.albumTracks) {
      // Если играет альбом, переключаем на следующий трек альбома
      window.currentAlbumIndex = (window.currentAlbumIndex + 1) % window.albumTracks.length;
      const track = window.albumTracks[window.currentAlbumIndex];
      audio.src = track.src;
      audio.play();
      setNowPlaying(track.name, track.artist, track.cover);
    } else {
      // Обычная логика для основного плейлиста
      playNext();
    }
  });

  // Progress and time
  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
    // Поставим длительность в чарт для текущего
    try {
      const durCell = document.querySelector(`.row-duration[data-i="${currentIndex}"]`);
      if (durCell) durCell.textContent = formatTime(audio.duration);
    } catch {}
  });
  audio.addEventListener('timeupdate', () => {
    currentTimeEl.textContent = formatTime(audio.currentTime);
    if (isFinite(audio.duration) && audio.duration > 0) {
      seekBar.value = String((audio.currentTime / audio.duration) * 100);
    }
  });
  seekBar.addEventListener('input', () => {
    if (isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(seekBar.value) / 100) * audio.duration;
    }
  });

  // Volume
  volumeBar.addEventListener('input', () => {
    audio.volume = Number(volumeBar.value);
  });

  // Cleanup on unload
  window.addEventListener('beforeunload', cleanupObjectUrls);

  // Persistence
  const persistState = () => {
    try {
      const toStore = playlist.map(p => ({ name: p.name, artist: p.artist, url: p.url, cover: p.cover }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
      // ignore
    }
  };

  const restoreState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (Array.isArray(stored)) {
          playlist = stored.filter(x => x && x.url && x.name);
        }
      }
      const idxRaw = localStorage.getItem(STORAGE_INDEX_KEY);
      if (idxRaw != null) {
        const idx = Number(idxRaw);
        if (Number.isInteger(idx)) currentIndex = idx;
      }
      renderPlaylist();
    } catch (e) {
      // ignore
    }
  };

  const restoreAccount = () => {
    try {
      const raw = localStorage.getItem(ACCOUNT_KEY);
      if (raw) {
        const acc = JSON.parse(raw);
        if (acc?.name) accountName.textContent = acc.name;
        if (acc?.avatarDataUrl) accountAvatar.src = acc.avatarDataUrl;
      }
    } catch {}
  };

  restoreState();
  // Всегда перечитываем манифест, чтобы правки в JSON применялись сразу
  loadBundledPlaylist();

  // Account UI
  if (account) {
    account.addEventListener('click', (e) => {
      // Не закрывать при кликах внутри выпадашки
      if (accountMenu && accountMenu.contains(e.target)) return;
      e.stopPropagation();
      accountMenu?.classList.toggle('hidden');
      if (!accountMenu?.classList.contains('hidden') && nameInput) {
        nameInput.value = accountName?.textContent || 'user';
        try { nameInput.focus(); } catch {}
      }
    });
    document.addEventListener('click', (e) => {
      if (!account.contains(e.target)) accountMenu?.classList.add('hidden');
    });
  }

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  if (saveAccountBtn) {
    saveAccountBtn.addEventListener('click', async () => {
      const name = nameInput?.value?.trim() || 'user';
      let avatarDataUrl = null;
      const file = avatarInput?.files?.[0];
      if (file) {
        try { avatarDataUrl = await fileToDataUrl(file); } catch {}
      }
      if (avatarDataUrl) accountAvatar.src = avatarDataUrl; else accountAvatar.src = accountAvatar.src || 'pipiska/place.jpg';
      accountName.textContent = name;
      try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ name, avatarDataUrl: avatarDataUrl || accountAvatar.src })); } catch {}
      accountMenu?.classList.add('hidden');
    });
  }

  if (resetAccountBtn) {
    resetAccountBtn.addEventListener('click', () => {
      accountName.textContent = 'user';
      accountAvatar.src = 'pipiska/place.jpg';
      try { localStorage.removeItem(ACCOUNT_KEY); } catch {}
      accountMenu?.classList.add('hidden');
    });
  }

  restoreAccount();

  // Logo cycle: 5s static -> 2s gif -> repeat
  const startLogoCycle = () => {
    if (!logoImg) return;
    const STATIC_SRC = 'pipiska/static_logo.png';
    const GIF_SRC = 'pipiska/anim_logo.gif';
    let state = 'static';
    const apply = () => {
      if (state === 'static') {
        logoImg.src = STATIC_SRC;
        setTimeout(() => { state = 'gif'; apply(); }, 5000);
      } else {
        // перезапуск GIF: меняем src с cache-bust
        logoImg.src = `${GIF_SRC}?t=${Date.now()}`;
        setTimeout(() => { state = 'static'; apply(); }, 2000);
      }
    };
    apply();
  };
  startLogoCycle();

  // Version Modal functionality
  if (versionBadge && versionModal) {
    versionBadge.addEventListener('click', () => {
      versionModal.classList.remove('hidden');
    });
  }

  if (versionModalClose && versionModal) {
    versionModalClose.addEventListener('click', () => {
      versionModal.classList.add('hidden');
    });
  }

  // Close modal when clicking outside
  if (versionModal) {
    versionModal.addEventListener('click', (e) => {
      if (e.target === versionModal) {
        versionModal.classList.add('hidden');
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && versionModal && !versionModal.classList.contains('hidden')) {
      versionModal.classList.add('hidden');
    }
  });

  // New Releases buttons functionality
  const setupReleaseButtons = () => {
    const playPauseButtons = document.querySelectorAll('.play-pause-btn');
    console.log('Найдено кнопок:', playPauseButtons.length);
    
    playPauseButtons.forEach((btn, index) => {
      console.log(`Настраиваю кнопку ${index + 1}`);
      btn.addEventListener('click', (e) => {
        console.log('Кнопка нажата!');
        e.stopPropagation();
        const releaseCard = btn.closest('.release-card');
        const releaseTitle = releaseCard.querySelector('.release-title').textContent;
        console.log('Название релиза:', releaseTitle);
        console.log('Плейлист:', playlist);
        
        // Если сейчас играет музыка, то ставим на паузу
        if (!audio.paused && audio.src) {
          console.log('Ставим на паузу');
          audio.pause();
          return;
        }
        
        // Специальная логика для альбома PHANTASMAGORIA
        if (releaseTitle === 'PHANTASMAGORIA') {
          console.log('Обрабатываем альбом PHANTASMAGORIA');
          // Найти первый трек альбома PHANTASMAGORIA (мало-помалу)
          const albumTrackIndex = playlist.findIndex(track => 
            track.name === 'мало-помалу' && track.artist === 'mzlff'
          );
          console.log('Индекс трека мало-помалу:', albumTrackIndex);
          
          if (albumTrackIndex !== -1) {
            console.log('Запускаем трек мало-помалу');
            playAt(albumTrackIndex);
          } else {
            // Если не найден, воспроизвести первый доступный трек mzlff
            const mzlffTrackIndex = playlist.findIndex(track => track.artist === 'mzlff');
            console.log('Индекс любого трека mzlff:', mzlffTrackIndex);
            if (mzlffTrackIndex !== -1) {
              console.log('Запускаем любой трек mzlff');
              playAt(mzlffTrackIndex);
            } else {
              console.log('Треки mzlff не найдены');
            }
          }
        } else {
          console.log('Обычная логика для других треков');
          // Обычная логика для других треков
          const trackIndex = playlist.findIndex(track => 
            track.name.toLowerCase().includes(releaseTitle.toLowerCase()) ||
            releaseTitle.toLowerCase().includes(track.name.toLowerCase())
          );
          
          if (trackIndex !== -1) {
            playAt(trackIndex);
          } else {
            // Если трек не найден, воспроизвести первый доступный
            if (playlist.length > 0) {
              playAt(0);
            }
          }
        }
      });
    });
  };

  // Вызываем настройку кнопок после загрузки плейлиста
  const originalLoadBundledPlaylist = loadBundledPlaylist;
  loadBundledPlaylist = async () => {
    await originalLoadBundledPlaylist();
    setTimeout(setupReleaseButtons, 500); // Увеличил задержку
  };

  // Прямая настройка кнопки альбома
  setTimeout(() => {
    const albumBtn = document.querySelector('.play-pause-btn');
    if (albumBtn) {
      albumBtn.onclick = function() {
        audio.src = 'smogoria/malo.mp3';
        audio.play();
        trackTitle.textContent = 'мало-помалу';
        trackArtist.textContent = 'mzlff';
        coverImg.src = 'smogoria/mz.jpg';
      };
    }
  }, 1000);
});

// Глобальная функция для кнопки альбома
function playAlbum() {
  const audio = document.getElementById('audio');
  const trackTitle = document.getElementById('trackTitle');
  const trackArtist = document.getElementById('trackArtist');
  const coverImg = document.getElementById('coverImg');
  
  // Устанавливаем флаг, что играет альбом PHANTASMAGORIA
  window.isPlayingAlbum = true;
  window.albumTracks = [
    { name: 'мало-помалу', artist: 'mzlff', src: 'smogoria/malo.mp3', cover: 'smogoria/mz.jpg' },
    { name: 'медленный танец', artist: 'mzlff', src: 'smogoria/dan.mp3', cover: 'smogoria/mz.jpg' },
    { name: 'карусель', artist: 'mzlff', src: 'smogoria/kar.mp3', cover: 'smogoria/mz.jpg' },
    { name: 'автодром', artist: 'mzlff', src: 'smogoria/drom.mp3', cover: 'smogoria/mz.jpg' },
    { name: 'свободное падение', artist: 'mzlff', src: 'smogoria/pad.mp3', cover: 'smogoria/mz.jpg' },
    { name: 'комната смеха', artist: 'mzlff', src: 'smogoria/smex.mp3', cover: 'smogoria/mz.jpg' },
    { name: 'эпилог', artist: 'mzlff', src: 'smogoria/ep.mp3', cover: 'smogoria/mz.jpg' }
  ];
  window.currentAlbumIndex = 0;
  
  audio.src = 'smogoria/malo.mp3';
  audio.play();
  trackTitle.textContent = 'мало-помалу';
  trackArtist.textContent = 'mzlff';
  coverImg.src = 'smogoria/mz.jpg';
}
