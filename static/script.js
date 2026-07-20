document.addEventListener('DOMContentLoaded', () => {
    // --- Memulihkan status antrean saat halaman dimuat ---
    recoverActiveTasks();
    // --- Elemen Navigasi ---
    const navHome = document.getElementById('nav-home');
    const navHistory = document.getElementById('nav-history');
    const navHomeMobile = document.getElementById('nav-home-mobile');
    const navHistoryMobile = document.getElementById('nav-history-mobile');
    const sectionDownload = document.getElementById('section-download');
    const sectionHistory = document.getElementById('section-history');

    // --- Elemen Download ---
    const urlInput = document.getElementById('url-input');
    const clearBtn = document.getElementById('clear-btn');
    const pasteBtn = document.getElementById('paste-btn');
    const downloadBtn = document.getElementById('download-btn');
    const qualitySelect = document.getElementById('quality-select');
    const folderInput = document.getElementById('folder-input');
    const openFolderBtn = document.getElementById('open-folder-btn');
    
    // --- Elemen Preview ---
    const previewEmpty = document.getElementById('preview-empty');
    const previewLoaded = document.getElementById('preview-loaded');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');

    // --- Elemen Queue ---
    const queueContainer = document.getElementById('queue-container');
    const queueList = document.getElementById('queue-list');

    // --- Elemen History ---
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // --- Toast Container ---
    const toastContainer = document.getElementById('toast-container');

    let activeTaskIds = [];
    let pollInterval = null;
    let debounceTimer = null;

    // --- Toast Notification System ---
    window.showToast = function(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast-enter pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl text-sm font-semibold max-w-sm border';
        
        let iconHtml = '';
        if (type === 'success') {
            toast.classList.add('bg-[#1DB954]', 'text-black', 'border-[#1ed760]');
            iconHtml = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
        } else if (type === 'error') {
            toast.classList.add('bg-red-500', 'text-white', 'border-red-400');
            iconHtml = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
        } else {
            toast.classList.add('bg-spHighlight', 'text-spTextWhite', 'border-gray-600');
            iconHtml = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
        }

        toast.innerHTML = `
            ${iconHtml}
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 3s
        setTimeout(() => {
            toast.classList.replace('toast-enter', 'toast-exit');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    };

    // --- Tab Navigation ---
    function switchToHome() {
        sectionDownload.classList.remove('hidden');
        sectionHistory.classList.add('hidden');
        
        // Desktop nav
        navHome.classList.add('text-spTextWhite', 'bg-spHighlight');
        navHistory.classList.remove('text-spTextWhite', 'bg-spHighlight');
        navHistory.classList.add('text-spText');
        
        // Mobile nav
        navHomeMobile.classList.add('text-spTextWhite');
        navHomeMobile.classList.remove('text-spText');
        navHistoryMobile.classList.add('text-spText');
        navHistoryMobile.classList.remove('text-spTextWhite');
    }

    function switchToHistory() {
        sectionDownload.classList.add('hidden');
        sectionHistory.classList.remove('hidden');
        
        // Desktop nav
        navHistory.classList.add('text-spTextWhite', 'bg-spHighlight');
        navHome.classList.remove('text-spTextWhite', 'bg-spHighlight');
        navHome.classList.add('text-spText');
        
        // Mobile nav
        navHistoryMobile.classList.add('text-spTextWhite');
        navHistoryMobile.classList.remove('text-spText');
        navHomeMobile.classList.add('text-spText');
        navHomeMobile.classList.remove('text-spTextWhite');
        
        loadHistory();
    }

    navHome.addEventListener('click', switchToHome);
    navHistory.addEventListener('click', switchToHistory);
    navHomeMobile.addEventListener('click', switchToHome);
    navHistoryMobile.addEventListener('click', switchToHistory);

    // --- Update yt-dlp Button ---
    const updateYtdlpBtn = document.getElementById('update-ytdlp-btn');
    if (updateYtdlpBtn) {
        updateYtdlpBtn.addEventListener('click', async () => {
            const originalHtml = updateYtdlpBtn.innerHTML;
            updateYtdlpBtn.disabled = true;
            updateYtdlpBtn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Updating...';
            
            try {
                const res = await fetch('/api/update_ytdlp', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showToast('yt-dlp berhasil diperbarui!', 'success');
                } else {
                    showToast('Gagal update: ' + data.error, 'error');
                }
            } catch (error) {
                showToast('Kesalahan jaringan saat update.', 'error');
            } finally {
                updateYtdlpBtn.disabled = false;
                updateYtdlpBtn.innerHTML = originalHtml;
            }
        });
    }

    // --- Fungsi Memulihkan Antrean ---
    async function recoverActiveTasks() {
        try {
            const res = await fetch('/api/active_tasks');
            const json = await res.json();
            if (json.success && json.data.length > 0) {
                const tasks = json.data;
                const taskIds = tasks.map(t => t.task_id);
                activeTaskIds = taskIds;
                
                queueContainer.classList.remove('hidden');
                queueContainer.classList.add('flex');
                
                tasks.forEach(task => {
                    renderInitialQueue([task.task_id], task.title);
                    updateQueueItem(task);
                });
                
                if (!pollInterval) {
                    pollInterval = setInterval(checkBatchStatus, 1000);
                }
                showToast(`Memulihkan ${taskIds.length} unduhan aktif...`, 'info');
            }
        } catch (e) {
            console.error("Gagal memulihkan antrean:", e);
        }
    }

    // --- Helper: Get URLs from Textarea ---
    function getUrls() {
        const text = urlInput.value;
        return text.split(/\r?\n/).map(u => u.trim()).filter(u => u.length > 0);
    }

    // --- Fitur Paste ---
    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (urlInput.value.trim() !== '') {
                urlInput.value += '\n' + text;
            } else {
                urlInput.value = text;
            }
            clearBtn.classList.remove('hidden');
            const urls = getUrls();
            if (urls.length > 0) fetchVideoInfo(urls[0]); 
            showToast('Teks berhasil ditempel', 'success');
        } catch (err) {
            showToast('Gagal membaca clipboard. Silakan paste manual.', 'error');
        }
    });

    // --- Tombol Clear ---
    clearBtn.addEventListener('click', () => {
        urlInput.value = '';
        clearBtn.classList.add('hidden');
        resetPreview();
        urlInput.focus();
    });

    // --- Drag and Drop ---
    urlInput.addEventListener('dragover', (e) => {
        e.preventDefault();
        urlInput.classList.add('ring-2', 'ring-spGreen');
    });

    urlInput.addEventListener('dragleave', () => {
        urlInput.classList.remove('ring-2', 'ring-spGreen');
    });

    urlInput.addEventListener('drop', (e) => {
        e.preventDefault();
        urlInput.classList.remove('ring-2', 'ring-spGreen');
        
        const text = e.dataTransfer.getData('text');
        if (text) {
            if (urlInput.value.trim() !== '') {
                urlInput.value += '\n' + text;
            } else {
                urlInput.value = text;
            }
            clearBtn.classList.remove('hidden');
            const urls = getUrls();
            if (urls.length > 0) fetchVideoInfo(urls[0]);
        }
    });

    // --- Deteksi Input URL untuk Preview ---
    urlInput.addEventListener('input', () => {
        const urls = getUrls();
        clearTimeout(debounceTimer);
        
        if (urlInput.value.trim().length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
        
        if (urls.length > 0) {
            debounceTimer = setTimeout(() => {
                if (urls.length > 1) {
                    previewEmpty.classList.add('hidden');
                    previewLoaded.classList.remove('hidden');
                    videoThumbnail.src = 'https://via.placeholder.com/320x180/1a1a1a/1DB954?text=Batch+Download';
                    videoTitle.innerHTML = `${urls.length} URL terdeteksi untuk diunduh.`;
                } else {
                    fetchVideoInfo(urls[0]);
                }
            }, 800);
        } else {
            resetPreview();
        }
    });

    // --- Menyimpan data playlist terakhir untuk digunakan saat download ---
    let lastPlaylistData = null;

    // --- Fetch Video Info ---
    async function fetchVideoInfo(url) {
        if (!url.includes('youtube.com') && !url.includes('youtu.be')) return;
        
        lastPlaylistData = null; // Reset
        previewEmpty.classList.add('hidden');
        previewLoaded.classList.remove('hidden');
        videoThumbnail.src = '';
        videoTitle.innerHTML = '<svg class="w-4 h-4 animate-spin inline mr-2 text-spGreen" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Mengambil info...';
        
        try {
            const res = await fetch('/api/info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            
            if (data.success) {
                if (data.is_playlist) {
                    // Ini adalah PLAYLIST
                    lastPlaylistData = data;
                    videoThumbnail.src = data.thumbnail || 'https://via.placeholder.com/320x180/1a1a1a/1DB954?text=Playlist';
                    videoTitle.innerHTML = `<span class="text-spGreen font-bold">Playlist</span> • ${data.title} <br/><span class="text-xs text-spText">${data.count} lagu terdeteksi</span>`;
                } else {
                    // Ini adalah VIDEO tunggal
                    videoThumbnail.src = data.thumbnail;
                    videoTitle.textContent = data.title;
                }
            } else {
                videoTitle.textContent = 'Gagal memuat info video';
                videoThumbnail.src = 'https://via.placeholder.com/320x180/1a1a1a/ff4444?text=Error';
            }
        } catch (error) {
            videoTitle.textContent = 'Terjadi kesalahan jaringan';
        }
    }

    function resetPreview() {
        previewEmpty.classList.remove('hidden');
        previewLoaded.classList.add('hidden');
        videoThumbnail.src = '';
        videoTitle.textContent = '...';
    }

    // --- Proses Download Batch ---
    downloadBtn.addEventListener('click', async () => {
        let urls = getUrls();
        if (urls.length === 0) {
            showToast('Silakan masukkan setidaknya satu URL video terlebih dahulu!', 'error');
            return;
        }

        const quality = qualitySelect.value;
        const folder = folderInput.value.trim();

        // UI Updates
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Memproses...';
        queueContainer.classList.remove('hidden');
        queueContainer.classList.add('flex');
        
        // Cek jika user mem-paste satu URL yang kebetulan playlist (sudah ada cache lastPlaylistData)
        if (lastPlaylistData && urls.length === 1 && lastPlaylistData.videos) {
            urls = lastPlaylistData.videos.map(v => v.url).filter(u => u);
            lastPlaylistData = null;
        }

        try {
            const res = await fetch('/api/download_batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls, quality, folder })
            });
            const data = await res.json();

            if (data.success) {
                if (!folder) folderInput.value = data.folder;
                
                activeTaskIds = activeTaskIds.concat(data.task_ids);
                
                if (!pollInterval) {
                    pollInterval = setInterval(checkBatchStatus, 1000);
                }
                
                urlInput.value = '';
                clearBtn.classList.add('hidden');
                resetPreview();
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Tambah ke Antrean';
                
                renderInitialQueue(data.task_ids);
                showToast(`Berhasil menambahkan ${data.task_ids.length} lagu ke antrean!`, 'success');
                
            } else {
                showToast('Gagal: ' + data.error, 'error');
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Mulai Unduh';
            }
        } catch (error) {
            showToast('Terjadi kesalahan jaringan.', 'error');
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Mulai Unduh';
        }
    });

    function renderInitialQueue(taskIds, initialTitle = "Menyiapkan...") {
        taskIds.forEach(id => {
            if (!document.getElementById(`queue-item-${id}`)) {
                const div = document.createElement('div');
                div.id = `queue-item-${id}`;
                div.className = 'bg-spHighlight rounded-lg p-4 border border-spHighlight/50 hover:bg-spHighlight/80 transition-colors group';
                div.innerHTML = `
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-bold text-spTextWhite truncate text-sm flex-grow pr-4">${initialTitle}</h4>
                        <div class="flex items-center gap-2">
                            <span class="status-badge px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black text-spText shrink-0 border border-spText/20">Menunggu</span>
                            <button onclick="cancelTask('${id}')" class="text-spText hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100" title="Batal">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div class="w-full bg-black rounded-full h-1.5 mb-2 overflow-hidden">
                        <div class="progress-bar bg-spText h-1.5 rounded-full transition-all duration-300" style="width: 0%"></div>
                    </div>
                    <div class="flex justify-between text-xs text-spText font-medium">
                        <span class="speed-eta">--</span>
                        <span class="progress-text">0%</span>
                    </div>
                `;
                queueList.prepend(div);
            }
        });
    }

    // --- Fungsi Batal (Cancel Task) ---
    window.cancelTask = async (taskId) => {
        try {
            const res = await fetch(`/api/cancel/${taskId}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('Task dibatalkan', 'info');
                // Polling akan mengambil status "Dibatalkan" dan merender UI secara otomatis.
            } else {
                showToast(data.error || 'Gagal membatalkan task', 'error');
            }
        } catch(e) {
            showToast('Kesalahan jaringan saat membatalkan.', 'error');
        }
    };

    // --- Cek Status Batch (Polling) ---
    async function checkBatchStatus() {
        if (activeTaskIds.length === 0) {
            clearInterval(pollInterval);
            pollInterval = null;
            return;
        }

        try {
            const res = await fetch(`/api/status_batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_ids: activeTaskIds })
            });
            const json = await res.json();

            if (json.success) {
                const tasks = json.data;
                let allDone = true;

                tasks.forEach(data => {
                    if (data) {
                        updateQueueItem(data);
                        if (data.status !== 'Selesai' && data.status !== 'Gagal' && data.status !== 'Dibatalkan') {
                            allDone = false;
                        }
                    }
                });

                if (allDone) {
                    clearInterval(pollInterval);
                    pollInterval = null;
                    const idsToRemove = activeTaskIds;
                    activeTaskIds = [];
                    
                    // Show a toast that all downloads are complete
                    if (idsToRemove.length > 0) {
                        showToast('Semua unduhan dalam antrean telah selesai!', 'success');
                    }
                }
            }
        } catch (error) {
            console.error('Error polling batch status:', error);
        }
    }

    function updateQueueItem(data) {
        const item = document.getElementById(`queue-item-${data.task_id}`);
        if (!item) return;

        const titleEl = item.querySelector('h4');
        const badgeEl = item.querySelector('.status-badge');
        const progressEl = item.querySelector('.progress-bar');
        const speedEtaEl = item.querySelector('.speed-eta');
        const textEl = item.querySelector('.progress-text');

        titleEl.textContent = data.title;
        badgeEl.textContent = data.status;
        
        let badgeClass = 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ';
        let progressClass = 'progress-bar h-1.5 rounded-full transition-all duration-300 ';
        
        progressEl.classList.remove('progress-active');

        if (data.status === 'Menunggu antrean') {
            badgeClass += 'bg-black text-spText border-spText/20';
            progressClass += 'bg-spText';
        } else if (data.status === 'Mengambil informasi') {
            badgeClass += 'bg-[#29b6f6]/10 text-[#29b6f6] border-[#29b6f6]/30';
            progressClass += 'bg-[#29b6f6]';
        } else if (data.status === 'Downloading') {
            badgeClass += 'bg-spGreen/10 text-spGreen border-spGreen/30';
            progressClass += 'bg-spGreen progress-active'; // Tambah efek glow
        } else if (data.status === 'Converting') {
            badgeClass += 'bg-[#ffb74d]/10 text-[#ffb74d] border-[#ffb74d]/30';
            progressClass += 'bg-[#ffb74d] progress-active';
        } else if (data.status === 'Selesai') {
            badgeClass += 'bg-spGreen/10 text-spGreen border-spGreen/30';
            progressClass += 'bg-spGreen';
        } else if (data.status === 'Dibatalkan') {
            badgeClass += 'bg-spText/10 text-spText border-spText/30';
            progressClass += 'bg-spText';
            titleEl.textContent = data.title + ' (Dibatalkan)';
        } else if (data.status === 'Gagal') {
            badgeClass += 'bg-red-500/10 text-red-500 border-red-500/30';
            progressClass += 'bg-red-500';
            titleEl.textContent = data.title + ' (Gagal)';
        }

        badgeEl.className = 'status-badge ' + badgeClass;
        progressEl.className = progressClass;

        const pct = data.progress || 0;
        progressEl.style.width = `${pct}%`;
        textEl.textContent = `${pct.toFixed(1)}%`;
        
        let speedText = '';
        if (data.speed && data.status === 'Downloading') speedText += data.speed;
        if (data.eta && data.status === 'Downloading') speedText += ` • ETA: ${data.eta}`;
        speedEtaEl.textContent = speedText || '--';
    }

    // --- Open Folder ---
    openFolderBtn.addEventListener('click', async () => {
        const folder = folderInput.value.trim();
        try {
            const res = await fetch('/api/open_folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder })
            });
            const data = await res.json();
            if (!data.success) {
                showToast('Gagal membuka folder: ' + (data.error || 'Terjadi kesalahan'), 'error');
            }
        } catch (error) {
            console.error('Error opening folder:', error);
        }
    });

    // --- Load History ---
    async function loadHistory() {
        historyList.innerHTML = `
            <div class="text-center py-16 text-spText">
                <svg class="w-8 h-8 animate-spin mx-auto mb-4 text-spGreen" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p class="font-medium">Memuat riwayat...</p>
            </div>
        `;

        try {
            const res = await fetch('/api/history');
            const data = await res.json();

            if (data.success) {
                renderHistory(data.data);
            }
        } catch (error) {
            historyList.innerHTML = `<div class="text-center py-16 text-red-500 font-medium">Gagal memuat riwayat.</div>`;
        }
    }

    function renderHistory(items) {
        if (items.length === 0) {
            historyList.innerHTML = `
                <div class="text-center py-20 text-spText bg-spElevated rounded-xl border border-spHighlight/50">
                    <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                    <p class="font-medium">Belum ada riwayat unduhan.</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = items.map(item => `
            <div class="bg-spElevated rounded-xl p-4 md:p-5 border border-spHighlight/50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between group hover:bg-spHighlight/40 transition-colors">
                <div class="flex-grow min-w-0">
                    <h4 class="font-bold text-spTextWhite truncate mb-1.5 text-sm md:text-base" title="${item.title}">${item.title}</h4>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-spText">
                        <span class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg> ${item.quality}</span>
                        <span class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> ${item.date}</span>
                        <span class="flex items-center gap-1.5 ${item.status === 'Berhasil' ? 'text-spGreen' : 'text-red-500'}">
                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg> ${item.status}
                        </span>
                    </div>
                    <a href="${item.url}" target="_blank" class="text-xs text-spText hover:text-spTextWhite underline mt-3 inline-flex items-center gap-1 truncate max-w-full transition-colors"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg> Buka di YouTube</a>
                </div>
                <div class="flex gap-2 w-full md:w-auto mt-3 md:mt-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="downloadAgain('${item.url}')" class="flex-1 md:flex-none bg-spHighlight hover:bg-spTextWhite hover:text-black text-spTextWhite px-4 py-2 rounded-full transition-all flex items-center justify-center gap-2 text-sm font-bold" title="Download Lagi">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        <span class="md:hidden">Unduh Ulang</span>
                    </button>
                    <button onclick="deleteHistory('${item.id}')" class="bg-spHighlight hover:bg-red-500 text-spTextWhite px-4 py-2 rounded-full transition-all flex items-center justify-center text-sm font-bold" title="Hapus dari Riwayat">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // --- Delete & Clear History ---
    window.deleteHistory = async (id) => {
        if (!confirm('Hapus entri riwayat ini?')) return;
        try {
            await fetch(`/api/history/${id}`, { method: 'DELETE' });
            loadHistory();
            showToast('Riwayat dihapus', 'info');
        } catch (error) {
            showToast('Gagal menghapus riwayat', 'error');
        }
    };

    clearHistoryBtn.addEventListener('click', async () => {
        if (!confirm('Anda yakin ingin menghapus SELURUH riwayat?')) return;
        try {
            await fetch('/api/history/clear', { method: 'POST' });
            loadHistory();
            showToast('Seluruh riwayat dibersihkan', 'success');
        } catch (error) {
            showToast('Gagal membersihkan riwayat', 'error');
        }
    });

    // --- Download Again (From History) ---
    window.downloadAgain = (url) => {
        switchToHome();
        if (urlInput.value.trim() !== '') {
            urlInput.value += '\n' + url;
        } else {
            urlInput.value = url;
        }
        clearBtn.classList.remove('hidden');
        urlInput.dispatchEvent(new Event('input')); 
        
        // Scroll to top of main area
        document.getElementById('main-scroll-area').scrollTo({ top: 0, behavior: 'smooth' });
        showToast('URL ditambahkan', 'success');
    };
});
