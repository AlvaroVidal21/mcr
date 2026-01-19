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

    // Navegación por Teclado
    window.addEventListener('keydown', (e) => {
        if (!currentSong) return;
        
        // Navegación de BLOQUES (Arriba/Abajo)
        if (e.key === 'ArrowDown') {
            if (currentBlockIndex < currentSong.blocks.length - 1) {
                renderBlock(currentBlockIndex + 1);
            }
        } else if (e.key === 'ArrowUp') {
            if (currentBlockIndex > 0) {
                renderBlock(currentBlockIndex - 1);
            }
        } 
        // Navegación de CANCIONES (Derecha/Izquierda)
        else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            const currentSongIdx = data.songs.findIndex(s => s.id === currentSong.id);
            let nextSongIdx = currentSongIdx;

            if (e.key === 'ArrowRight' && currentSongIdx < data.songs.length - 1) {
                nextSongIdx = currentSongIdx + 1;
            } else if (e.key === 'ArrowLeft' && currentSongIdx > 0) {
                nextSongIdx = currentSongIdx - 1;
            }

            if (nextSongIdx !== currentSongIdx) {
                const nextSong = data.songs[nextSongIdx];
                selector.value = nextSong.id; // Sincroniza el dropdown visualmente
                localStorage.setItem('lastSongId', nextSong.id);
                localStorage.setItem('lastBlockIdx', 0);
                selectSong(nextSong.id, 0);
            }
        }
    });

    function renderBlock(index) {
        const buttons = atomsContainer.querySelectorAll('.atom-btn');
        if (buttons[index]) {
            buttons[index].click();
            // Scroll suave hacia el botón activo
            buttons[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function loadSongStructure(song, startIdx = 0) {
        document.getElementById('song-title').innerText = song.title;
        document.getElementById('song-meta').innerText = song.interpretation || "READY";
        atomsContainer.innerHTML = ''; 

        song.blocks.forEach((block, index) => {
            const btn = document.createElement('button');
            btn.className = `atom-btn w-full text-left p-4 border border-zinc-800 bg-zinc-900/50 text-sm font-mono text-zinc-400 transition-all duration-200 hover:pl-6`;
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

                lyricEn.classList.remove('fade-in');
                lyricEs.parentElement.classList.remove('fade-in');
                void lyricEn.offsetWidth; 
                
                lyricEn.innerHTML = block.en.replace(/\n/g, '<br>');
                lyricEn.classList.add('fade-in');

                lyricEs.innerHTML = `
                    <span class="block text-zinc-300 font-serif italic mb-4 border-l-2 border-zinc-600 pl-3">
                        "${block.es_text.replace(/\n/g, '<br>')}"
                    </span>
                    <div class="mt-4 text-sm font-mono text-red-400">
                        <strong class="text-red-600 uppercase text-xs tracking-widest block mb-1">[ DEEP DIVE ]</strong>
                        ${block.context}
                    </div>
                `;
                lyricEs.parentElement.classList.add('fade-in');
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
    }
});