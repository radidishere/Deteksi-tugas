/* =====================================================
   sw.js : Service Worker, penjaga mode offline
   ===================================================== */

// PENTING: setiap kali kamu mengubah file aplikasi, naikkan angka versi ini
// (v1 -> v2 -> v3) supaya HP mengambil file terbaru.
const NAMA_CACHE = "tugasku-v1";

// Daftar file yang disimpan di HP agar bisa dibuka tanpa internet
const FILE_UNTUK_DISIMPAN = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// 1. INSTALL: dijalankan sekali saat Service Worker pertama dipasang.
//    Di sini semua file disimpan ke cache.
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(NAMA_CACHE).then(function (cache) {
      return cache.addAll(FILE_UNTUK_DISIMPAN);
    })
  );
  self.skipWaiting(); // langsung aktif tanpa menunggu
});

// 2. ACTIVATE: membersihkan cache versi lama
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (daftarNama) {
      return Promise.all(
        daftarNama
          .filter(function (nama) { return nama !== NAMA_CACHE; })
          .map(function (nama) { return caches.delete(nama); })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH: setiap kali halaman meminta file, cek dulu di cache.
//    Kalau ada, pakai itu (cepat dan tanpa internet).
//    Kalau tidak ada, ambil dari internet.
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function (hasilCache) {
      if (hasilCache) return hasilCache;

      return fetch(event.request).catch(function () {
        // Tidak ada internet dan file tidak ada di cache
        if (event.request.mode === "navigate") {
          return caches.match("index.html");
        }
        return new Response("", { status: 503, statusText: "Offline" });
      });
    })
  );
});
