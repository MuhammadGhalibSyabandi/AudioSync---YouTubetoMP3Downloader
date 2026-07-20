from flask import Flask, render_template, request, jsonify
import os
import subprocess
from downloader import get_video_info, queue_download, get_task_status, get_multiple_task_status, get_active_tasks, cancel_task
from history import get_history, delete_history_entry, clear_history

app = Flask(__name__)

# Folder default untuk menyimpan MP3
DEFAULT_SAVE_FOLDER = os.path.join(os.path.expanduser("~"), "Downloads", "YouTube_MP3")

@app.route("/")
def index():
    """Halaman utama aplikasi."""
    return render_template("index.html")

@app.route("/api/info", methods=["POST"])
def api_info():
    """Endpoint untuk mendapatkan info video dari URL."""
    data = request.json
    url = data.get("url")
    if not url:
        return jsonify({"success": False, "error": "URL tidak boleh kosong."})
    
    info = get_video_info(url)
    return jsonify(info)

@app.route("/api/download", methods=["POST"])
def api_download():
    """Endpoint untuk memulai proses unduhan (single). Tetap ada untuk backward compatibility."""
    data = request.json
    url = data.get("url")
    quality = data.get("quality", "128")
    save_folder = data.get("folder", DEFAULT_SAVE_FOLDER)
    
    if not save_folder.strip():
        save_folder = DEFAULT_SAVE_FOLDER
        
    if not url:
        return jsonify({"success": False, "error": "URL tidak boleh kosong."})
        
    task_id = queue_download(url, quality, save_folder)
    return jsonify({"success": True, "task_id": task_id, "folder": save_folder})

@app.route("/api/download_batch", methods=["POST"])
def api_download_batch():
    """Endpoint untuk memulai proses unduhan banyak URL (queue)."""
    data = request.json
    urls = data.get("urls", [])
    quality = data.get("quality", "128")
    save_folder = data.get("folder", DEFAULT_SAVE_FOLDER)
    
    if not save_folder.strip():
        save_folder = DEFAULT_SAVE_FOLDER
        
    if not urls or not isinstance(urls, list) or len(urls) == 0:
        return jsonify({"success": False, "error": "Daftar URL tidak boleh kosong."})
        
    task_ids = []
    for url in urls:
        if 'list=' in url:
            # Selesaikan playlist di backend
            info = get_video_info(url)
            if info.get('success') and info.get('is_playlist') and 'videos' in info:
                for vid in info['videos']:
                    if vid.get('url'):
                        task_id = queue_download(vid['url'], quality, save_folder)
                        task_ids.append(task_id)
            else:
                task_id = queue_download(url, quality, save_folder)
                task_ids.append(task_id)
        else:
            task_id = queue_download(url, quality, save_folder)
            task_ids.append(task_id)
        
    return jsonify({"success": True, "task_ids": task_ids, "folder": save_folder})

@app.route("/api/status/<task_id>")
def api_status(task_id):
    """Endpoint untuk mengecek status dari proses unduhan tunggal."""
    status = get_task_status(task_id)
    if status:
        return jsonify({"success": True, "data": status})
    else:
        return jsonify({"success": False, "error": "Task tidak ditemukan."})

@app.route("/api/status_batch", methods=["POST"])
def api_status_batch():
    """Endpoint untuk mengecek status dari beberapa proses unduhan sekaligus."""
    data = request.json
    task_ids = data.get("task_ids", [])
    
    if not task_ids:
        return jsonify({"success": False, "error": "Tidak ada task ID yang diberikan."})
        
    statuses = get_multiple_task_status(task_ids)
    return jsonify({"success": True, "data": statuses})

@app.route("/api/active_tasks", methods=["GET"])
def api_active_tasks():
    """Mengambil semua task yang masih aktif (untuk memulihkan UI saat refresh)."""
    active = get_active_tasks()
    return jsonify({"success": True, "data": active})

@app.route("/api/cancel/<task_id>", methods=["POST"])
def api_cancel_task(task_id):
    """Membatalkan sebuah task jika masih dalam antrean."""
    success = cancel_task(task_id)
    if success:
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Tidak dapat membatalkan task (mungkin sudah berjalan atau selesai)."})

@app.route("/api/update_ytdlp", methods=["POST"])
def api_update_ytdlp():
    """Memperbarui yt-dlp ke versi terbaru melalui pip."""
    try:
        # Menjalankan perintah pip install -U yt-dlp
        result = subprocess.run(["pip", "install", "-U", "yt-dlp"], capture_output=True, text=True)
        if result.returncode == 0:
            return jsonify({"success": True, "message": "yt-dlp berhasil diperbarui."})
        else:
            return jsonify({"success": False, "error": result.stderr})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/history", methods=["GET"])
def api_get_history():
    """Endpoint untuk mengambil riwayat unduhan."""
    history_data = get_history()
    return jsonify({"success": True, "data": history_data})

@app.route("/api/history/<entry_id>", methods=["DELETE"])
def api_delete_history(entry_id):
    """Endpoint untuk menghapus satu entri riwayat."""
    delete_history_entry(entry_id)
    return jsonify({"success": True})

@app.route("/api/history/clear", methods=["POST"])
def api_clear_history():
    """Endpoint untuk menghapus semua riwayat."""
    clear_history()
    return jsonify({"success": True})

@app.route("/api/open_folder", methods=["POST"])
def api_open_folder():
    """Endpoint untuk membuka folder penyimpanan di Windows Explorer."""
    data = request.json
    folder_path = data.get("folder", DEFAULT_SAVE_FOLDER)
    
    try:
        # Hanya berlaku untuk Windows
        if os.name == 'nt':
            os.startfile(folder_path)
            return jsonify({"success": True})
        else:
            return jsonify({"success": False, "error": "Fitur ini hanya didukung di Windows."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

if __name__ == "__main__":
    # Menjalankan aplikasi Flask pada port 5000
    app.run(debug=True, host="127.0.0.1", port=5000)
