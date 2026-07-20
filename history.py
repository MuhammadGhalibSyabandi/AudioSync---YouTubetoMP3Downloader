import json
import os
import uuid
from datetime import datetime

HISTORY_FILE = "history.json"

def init_history():
    """Inisialisasi file history.json jika belum ada."""
    if not os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)

def get_history():
    """Membaca semua riwayat unduhan."""
    init_history()
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def add_history(title, url, quality, file_path, status="Berhasil"):
    """Menambahkan riwayat unduhan baru."""
    history = get_history()
    new_entry = {
        "id": str(uuid.uuid4()),
        "title": title,
        "url": url,
        "quality": quality,
        "file_path": file_path,
        "status": status,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    history.insert(0, new_entry) # Tambahkan di urutan paling atas
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=4, ensure_ascii=False)
    return new_entry

def delete_history_entry(entry_id):
    """Menghapus entri riwayat berdasarkan ID."""
    history = get_history()
    history = [entry for entry in history if entry.get("id") != entry_id]
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=4, ensure_ascii=False)

def clear_history():
    """Menghapus seluruh riwayat."""
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)
