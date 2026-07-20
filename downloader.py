import yt_dlp
import os
import threading
import uuid
import time
import queue
import glob
from history import add_history

# Menyimpan status dari setiap proses unduhan
# format: { 'task_id': {'status': 'Menunggu antrean', 'progress': 0, 'title': '', 'cancelled': False, 'completed_at': None, ...} }
download_tasks = {}

# Antrean untuk memproses unduhan satu per satu
download_queue = queue.Queue()

def cleanup_old_tasks():
    """Menghapus task yang sudah selesai atau gagal lebih dari 5 menit yang lalu untuk mencegah memory leak."""
    current_time = time.time()
    to_delete = []
    for tid, task in download_tasks.items():
        if task.get('completed_at'):
            if current_time - task['completed_at'] > 300: # 5 menit = 300 detik
                to_delete.append(tid)
    for tid in to_delete:
        del download_tasks[tid]

# Direktori proyek (tempat app.py berada)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def _find_ffmpeg():
    """
    Mencari lokasi FFmpeg secara otomatis.
    Pertama cek di folder ffmpeg_bin di dalam proyek,
    lalu cek di PATH sistem.
    Mengembalikan path ke folder yang berisi ffmpeg.exe, atau None.
    """
    # Cari di subfolder ffmpeg_bin di proyek (mendukung subfolder apapun)
    local_dir = os.path.join(BASE_DIR, 'ffmpeg_bin')
    if os.path.isdir(local_dir):
        # Cari ffmpeg.exe di dalam folder ini secara rekursif
        results = glob.glob(os.path.join(local_dir, '**', 'ffmpeg.exe'), recursive=True)
        if results:
            return os.path.dirname(results[0])
    
    # Cek apakah ffmpeg tersedia di PATH sistem
    import shutil
    if shutil.which('ffmpeg'):
        return None  # None artinya yt-dlp akan menggunakan PATH bawaan
    
    return None  # Tidak ditemukan sama sekali

# Temukan FFmpeg sekali saat aplikasi dimulai
FFMPEG_LOCATION = _find_ffmpeg()
if FFMPEG_LOCATION:
    print(f"[AudioSync] FFmpeg ditemukan di: {FFMPEG_LOCATION}")
else:
    print("[AudioSync] FFmpeg tidak ditemukan di folder lokal. Menggunakan PATH sistem.")

def get_video_info(url):
    """
    Mengekstrak informasi video atau playlist tanpa mengunduhnya.
    Jika URL adalah playlist, kembalikan daftar semua video di dalamnya.
    """
    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'ignoreerrors': True,  # Abaikan video yang error di dalam playlist
    }
    if FFMPEG_LOCATION:
        ydl_opts['ffmpeg_location'] = FFMPEG_LOCATION
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            # Jika hasil ekstraksi adalah PLAYLIST
            if info.get('_type') == 'playlist' or 'entries' in info:
                entries = info.get('entries', [])
                # Filter out None entries (video yang tidak bisa diakses)
                videos = []
                for entry in entries:
                    if entry is not None:
                        videos.append({
                            'url': entry.get('webpage_url') or entry.get('url', ''),
                            'title': entry.get('title', 'Unknown Title'),
                            'thumbnail': entry.get('thumbnail', ''),
                        })
                return {
                    'success': True,
                    'is_playlist': True,
                    'title': info.get('title', 'Unknown Playlist'),
                    'thumbnail': info.get('thumbnails', [{}])[-1].get('url', '') if info.get('thumbnails') else '',
                    'count': len(videos),
                    'videos': videos,
                    'url': url
                }
            else:
                # URL adalah VIDEO tunggal
                return {
                    'success': True,
                    'is_playlist': False,
                    'title': info.get('title', 'Unknown Title'),
                    'thumbnail': info.get('thumbnail', ''),
                    'duration': info.get('duration', 0),
                    'url': url
                }
    except Exception as e:
        return {'success': False, 'error': str(e), 'url': url}

def _download_process(task_id, url, quality, save_folder):
    """Fungsi yang melakukan unduhan aktual (berjalan di worker thread)."""
    
    def my_hook(d):
        if d['status'] == 'downloading':
            try:
                percent_str = d.get('_percent_str', '0%').strip('\x1b[0;94m').strip('\x1b[0m').replace('%', '')
                download_tasks[task_id]['progress'] = float(percent_str)
                download_tasks[task_id]['status'] = 'Downloading'
                download_tasks[task_id]['speed'] = d.get('_speed_str', 'N/A').strip('\x1b[0;94m').strip('\x1b[0m')
                download_tasks[task_id]['eta'] = d.get('_eta_str', 'N/A').strip('\x1b[0;94m').strip('\x1b[0m')
            except:
                pass
        elif d['status'] == 'finished':
            download_tasks[task_id]['status'] = 'Converting'
            download_tasks[task_id]['progress'] = 100

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(save_folder, '%(title)s.%(ext)s'),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': quality,
        }],
        'progress_hooks': [my_hook],
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,  # Pastikan hanya unduh satu video per task
    }
    if FFMPEG_LOCATION:
        ydl_opts['ffmpeg_location'] = FFMPEG_LOCATION

    try:
        download_tasks[task_id]['status'] = 'Mengambil informasi'
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            title = info_dict.get('title', 'Unknown Title')
            final_filename = ydl.prepare_filename(info_dict)
            final_filename = os.path.splitext(final_filename)[0] + '.mp3'
            
            download_tasks[task_id]['status'] = 'Selesai'
            download_tasks[task_id]['file_path'] = final_filename
            download_tasks[task_id]['title'] = title
            
            add_history(title, url, f"{quality} kbps", final_filename, "Berhasil")
            
    except Exception as e:
        download_tasks[task_id]['status'] = 'Gagal'
        download_tasks[task_id]['error'] = str(e)
        add_history(download_tasks[task_id].get('title', url), url, f"{quality} kbps", "", "Gagal")

def _worker():
    """Worker thread yang memproses antrean satu per satu."""
    while True:
        task = download_queue.get()
        if task is None:
            break # Berhenti jika mendapat sinyal stop (optional)
        
        task_id = task['task_id']
        
        # Bersihkan task lama di setiap siklus worker
        cleanup_old_tasks()
        
        # Cek apakah task dibatalkan sebelum diproses
        if download_tasks.get(task_id, {}).get('cancelled'):
            download_tasks[task_id]['status'] = 'Dibatalkan'
            download_tasks[task_id]['completed_at'] = time.time()
            download_queue.task_done()
            continue

        # Mulai memproses
        _download_process(task_id, task['url'], task['quality'], task['save_folder'])
        
        # Tandai waktu selesai (berhasil atau gagal)
        if task_id in download_tasks:
            download_tasks[task_id]['completed_at'] = time.time()
            
        # Tandai tugas selesai dari queue (walaupun berhasil atau gagal)
        download_queue.task_done()

# Jalankan worker thread secara terus-menerus
worker_thread = threading.Thread(target=_worker, daemon=True)
worker_thread.start()

def queue_download(url, quality, save_folder):
    """Menambahkan URL ke dalam antrean dan mengembalikan task_id."""
    if not os.path.exists(save_folder):
        os.makedirs(save_folder)

    task_id = str(uuid.uuid4())
    download_tasks[task_id] = {
        'task_id': task_id,
        'url': url,
        'status': 'Menunggu antrean',
        'progress': 0,
        'speed': '',
        'eta': '',
        'title': url, # Judul sementara
        'file_path': '',
        'error': '',
        'cancelled': False,
        'completed_at': None
    }

    # Masukkan ke dalam queue
    download_queue.put({
        'task_id': task_id,
        'url': url,
        'quality': quality,
        'save_folder': save_folder
    })

    return task_id

def get_task_status(task_id):
    """Mendapatkan status terkini dari sebuah task."""
    return download_tasks.get(task_id, None)

def get_multiple_task_status(task_ids):
    """Mendapatkan status dari beberapa task sekaligus."""
    return [download_tasks.get(tid, None) for tid in task_ids if tid in download_tasks]

def get_active_tasks():
    """Mendapatkan semua task yang saat ini masih aktif (Menunggu, Mengambil, Downloading, Converting)."""
    cleanup_old_tasks() # Bersihkan dulu jika ada
    active = []
    for tid, task in download_tasks.items():
        if task['status'] not in ['Selesai', 'Gagal', 'Dibatalkan']:
            active.append(task)
    return active

def cancel_task(task_id):
    """Membatalkan task jika masih menunggu antrean."""
    task = download_tasks.get(task_id)
    if task:
        if task['status'] == 'Menunggu antrean':
            task['cancelled'] = True
            task['status'] = 'Dibatalkan'
            task['completed_at'] = time.time()
            return True
        # Jika sudah berjalan, yt-dlp sulit dihentikan secara thread-safe dari luar
        return False
    return False
