document.addEventListener('DOMContentLoaded', async () => {
    let data;
    let currentSong = null;
    let currentBlockIndex = 0;

    const selector = document.getElementById('track-selector');
    const atomsContainer = document.getElementById('atoms-container');
    const progressBar = document.getElementById('progress-bar');
    const blockCounter = document.getElementById('block-counter');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const menuToggle = document.getElementById('menu-toggle');

    // Manejo de Sidebar en móvil
    const toggleSidebar = (state) => {
        const isOpen = state !== undefined ? state : !sidebar.classList.contains('open');
        sidebar.classList.toggle('open', isOpen);
        sidebarOverlay.classList.toggle('open', isOpen);
        sidebarOverlay.style.opacity = isOpen ? '1' : '0';
        sidebarOverlay.style.pointerEvents = isOpen ? 'auto' : 'none';
    };

    menuToggle.addEventListener('click', () => toggleSidebar());
    sidebarOverlay.addEventListener('click', () => toggleSidebar(false));

    // 1. Cargar la Base de Datos
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Error al cargar data.json');
        data = await response.json();
    } catch (error) {
        console.error(error);
        document.getElementById('song-title').innerText = "ERROR_LOADING_DATA";
        return;
    }

    // 2. Llenar el Dropdown
    data.songs.forEach(song => {
        const option = document.createElement('option');
        option.value = song.id;
        option.innerText = song.title.toUpperCase();
        selector.appendChild(option);
    });

    // 3. Eventos de Selección
    selector.addEventListener('change', (e) => {
        const songId = e.target.value;
        if (!songId) return;
        localStorage.setItem('lastSongId', songId);
        selectSong(songId);
    });

    function selectSong(songId, blockIdx = 0) {
        currentSong = data.songs.find(s => s.id === songId);
        if (!currentSong) return;

        loadSongStructure(currentSong, blockIdx);
    }

    // --- SISTEMA DE NAVEGACIÓN ---

    const nextBlock = () => {
        if (!currentSong) return;
        if (currentBlockIndex < currentSong.blocks.length - 1) {
            renderBlock(currentBlockIndex + 1);
        }
    };

    const prevBlock = () => {
        if (!currentSong) return;
        if (currentBlockIndex > 0) {
            renderBlock(currentBlockIndex - 1);
        }
    };

    const nextSongNav = () => {
        if (!currentSong) return;
        const currentSongIdx = data.songs.findIndex(s => s.id === currentSong.id);
        if (currentSongIdx < data.songs.length - 1) {
            const nextSong = data.songs[currentSongIdx + 1];
            selector.value = nextSong.id;
            localStorage.setItem('lastSongId', nextSong.id);
            localStorage.setItem('lastBlockIdx', 0);
            selectSong(nextSong.id, 0);
        }
    };

    const prevSongNav = () => {
        if (!currentSong) return;
        const currentSongIdx = data.songs.findIndex(s => s.id === currentSong.id);
        if (currentSongIdx > 0) {
            const prevSong = data.songs[currentSongIdx - 1];
            selector.value = prevSong.id;
            localStorage.setItem('lastSongId', prevSong.id);
            localStorage.setItem('lastBlockIdx', 0);
            selectSong(prevSong.id, 0);
        }
    };

    // Navegación por Teclado
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') nextBlock();
        else if (e.key === 'ArrowUp') prevBlock();
        else if (e.key === 'ArrowRight') nextSongNav();
        else if (e.key === 'ArrowLeft') prevSongNav();
    });

    // Navegación por Gesto (Touch)
    let touchStartX = 0;
    let touchStartY = 0;

    window.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        const threshold = 70; // Umbral de desplazamiento mínimo
        const restraint = 100; // Máximo desplazamiento en el eje opuesto
        const duration = 500; // Máximo tiempo permitido para el gesto (opcional)

        // Verificamos si el usuario está haciendo scroll en un elemento scrollable
        const scrollableTarget = e.target.closest('.overflow-y-auto');
        let isScrolledToLimit = true;

        if (scrollableTarget) {
            const { scrollTop, scrollHeight, clientHeight } = scrollableTarget;
            if (deltaY < 0) { // Swiping up -> Intenta ir abajo
                isScrolledToLimit = (scrollTop + clientHeight >= scrollHeight - 5);
            } else { // Swiping down -> Intenta ir arriba
                isScrolledToLimit = (scrollTop <= 5);
            }
        }

        if (Math.abs(deltaX) > threshold && Math.abs(deltaY) < restraint) {
            // Swipe Horizontal: Cambio de Canción
            if (deltaX > 0) prevSongNav();
            else nextSongNav();
        } else if (Math.abs(deltaY) > threshold && Math.abs(deltaX) < restraint) {
            // Swipe Vertical: Cambio de Bloque (Solo si no hay más scroll posible)
            if (isScrolledToLimit) {
                if (deltaY > 0) prevBlock();
                else nextBlock();
            }
        }
    }, { passive: true });

    function renderBlock(index) {
        const buttons = atomsContainer.querySelectorAll('.atom-btn');
        if (buttons[index]) {
            buttons[index].click();
            // Scroll suave hacia el botón activo
            buttons[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // --- OVERLAY LOGIC ---
    const overlay = document.getElementById('intro-overlay');
    const startBtn = document.getElementById('start-btn');
    const introTitle = document.getElementById('intro-title');
    const introText = document.getElementById('intro-text');
    let isMobile = window.innerWidth < 768;

    window.addEventListener('resize', () => {
        isMobile = window.innerWidth < 768;
        if (!isMobile) overlay.style.display = 'none';
    });

    startBtn.addEventListener('click', () => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    });

    function showOverlay(song) {
        if (!isMobile) return;

        introTitle.innerText = song.title;
        introText.innerText = song.interpretation || "No interpretation available.";
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
    }

    function loadSongStructure(song, startIdx = 0) {
        document.getElementById('song-title').innerText = song.title;
        document.getElementById('song-meta').innerText = song.interpretation || "READY";

        // Mobile Overlay Trigger (Only if changing songs or first load)
        // We check if startIdx is 0 (new song roughly) or just always show on selection?
        // User asked "antes de empezar a practicar". So when selecting a song.
        // If restoring session, maybe skipping is better? Let's show it to be safe as requested.
        // But avoid showing it on simple block navigation (startIdx > 0 logic in caller might differ).
        // Let's rely on explicit call or check if overlay needs update.

        // IMPORTANT: Only show overlay if this is a NEW song interaction, 
        // to avoid popping it up if we just reload the page on a specific block.
        // However, user said "antes de empezar". Let's show it.
        showOverlay(song);

        atomsContainer.innerHTML = '';

        song.blocks.forEach((block, index) => {
            const btn = document.createElement('button');
            btn.className = `atom-btn w-full text-left p-4 border border-zinc-800 bg-zinc-900/50 text-xs md:text-sm font-mono text-zinc-400 transition-all duration-200 hover:pl-6 break-words whitespace-normal leading-tight`;
            btn.innerText = `[${String(index + 1).padStart(2, '0')}] ${block.label}`;

            btn.onclick = () => {
                currentBlockIndex = index;
                localStorage.setItem('lastBlockIdx', index);

                // Cerrar sidebar en móvil al seleccionar
                if (window.innerWidth < 768) toggleSidebar(false);

                // Actualizar UI
                document.querySelectorAll('.atom-btn').forEach(b => {
                    b.classList.remove('active-atom');
                    b.classList.add('border-zinc-800');
                });
                btn.classList.add('active-atom');
                btn.classList.remove('border-zinc-800');

                // Progreso y Contador
                const progress = ((index + 1) / song.blocks.length) * 100;
                progressBar.style.width = `${progress}%`;
                blockCounter.innerText = `BLOCK: ${String(index + 1).padStart(2, '0')}/${String(song.blocks.length).padStart(2, '0')}`;

                // Lyrics
                const lyricEn = document.getElementById('lyric-en');
                const lyricEs = document.getElementById('lyric-es');
                const contextContainer = document.getElementById('context-container');

                lyricEn.classList.remove('fade-in');
                lyricEs.parentElement.classList.remove('fade-in'); // Target #lyric-es-container
                void lyricEn.offsetWidth;

                lyricEn.innerHTML = block.en.replace(/\n/g, '<br>');
                lyricEn.classList.add('fade-in');

                // Render Spanish Text with Premium Typography
                lyricEs.innerHTML = `"${block.es_text.replace(/\n/g, '<br>')}"`;

                // Render Context with clearly defined visual hierarchy
                contextContainer.innerHTML = `
                    <div class="relative bg-zinc-900/40 border border-zinc-800 p-4 rounded-lg mt-4">
                        <div class="absolute -top-3 left-4 bg-black px-2 text-[10px] text-red-500 font-bold uppercase tracking-widest border border-red-900/50 rounded">
                            CONTEXTO
                        </div>
                        <p class="text-sm md:text-base font-mono text-zinc-400 leading-relaxed">
                            ${block.context}
                        </p>
                    </div>
                `;

                // Re-trigger animation on the container
                document.getElementById('lyric-es-container').classList.add('fade-in');
            };

            atomsContainer.appendChild(btn);
        });

        // Restaurar estado o cargar primero
        renderBlock(startIdx);
    }

    // Auto-load Persistence
    const lastSong = localStorage.getItem('lastSongId');
    const lastBlock = parseInt(localStorage.getItem('lastBlockIdx')) || 0;

    if (lastSong) {
        selector.value = lastSong;
        selectSong(lastSong, lastBlock);

        // If we just loaded (and are on mobile), showing the overlay immediately 
        // forces the user to press start. This aligns with "Prep Mode".
    }
});