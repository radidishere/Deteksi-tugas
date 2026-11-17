/* =====================================================
   app.js : otak aplikasi TugasKu
   ===================================================== */
"use strict"; // mode ketat: membantu menangkap salah ketik

/* ---------- 1. Data & variabel utama ---------- */

// Nama "laci" di localStorage tempat tugas disimpan
const KUNCI_PENYIMPANAN = "tugasku-data";

// Semua tugas disimpan dalam satu array (daftar)
let daftarTugas = [];

// Jika bukan null, berarti kita sedang mengedit tugas dengan id tersebut
let idSedangDiedit = null;

// Mencatat kartu mana yang catatannya sedang dibuka penuh
const idCatatanTerbuka = new Set();

// Dipakai untuk mengecek apakah daftar guru berubah
let daftarGuruTerakhir = "";

/* ---------- 2. Mengambil elemen dari HTML ---------- */

const formTugas = document.getElementById("form-tugas");
const judulForm = document.getElementById("judul-form");
const inputJudul = document.getElementById("input-judul");
const inputMapel = document.getElementById("input-mapel");
const inputGuru = document.getElementById("input-guru");
const inputTenggat = document.getElementById("input-tenggat");
const inputCatatan = document.getElementById("input-catatan");
const tombolSimpan = document.getElementById("tombol-simpan");
const tombolBatal = document.getElementById("tombol-batal");
const datalistGuru = document.getElementById("daftar-guru");
const filterStatus = document.getElementById("filter-status");
const filterGuru = document.getElementById("filter-guru");
const daftarElemen = document.getElementById("daftar-tugas");
const pesanKosong = document.getElementById("kosong");

/* ---------- 3. Menyimpan & memuat data ---------- */

function muatData() {
  try {
    const teks = localStorage.getItem(KUNCI_PENYIMPANAN);
    daftarTugas = teks ? JSON.parse(teks) : [];
  } catch (error) {
    // Kalau data rusak, mulai dari daftar kosong supaya aplikasi tidak mati
    daftarTugas = [];
  }
}

function simpanData() {
  try {
    localStorage.setItem(KUNCI_PENYIMPANAN, JSON.stringify(daftarTugas));
  } catch (error) {
    alert("Data gagal disimpan. Penyimpanan HP mungkin penuh.");
  }
}

// id unik: gabungan waktu sekarang + angka acak
function buatId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---------- 4. Menghitung sisa waktu ---------- */

// Mengubah milidetik menjadi teks: "3 hari", "5 jam", atau "20 menit"
function formatDurasi(milidetik) {
  const menit = Math.floor(milidetik / 60000);
  const jam = Math.floor(menit / 60);
  const hari = Math.floor(jam / 24);

  if (hari >= 1) return hari + " hari";
  if (jam >= 1) return jam + " jam";
  return Math.max(menit, 1) + " menit";
}

// Menentukan teks dan warna status sebuah tugas
function hitungStatus(tugas) {
  if (tugas.selesai) {
    return { teks: "Selesai ✔", kelas: "selesai" };
  }

  const satuHari = 24 * 60 * 60 * 1000;
  const selisih = new Date(tugas.tenggat).getTime() - Date.now();

  if (selisih < 0) {
    return { teks: "Terlambat " + formatDurasi(-selisih), kelas: "merah" };
  }
  if (selisih < satuHari) {
    return { teks: formatDurasi(selisih) + " lagi", kelas: "merah" };
  }
  if (selisih <= 3 * satuHari) {
    return { teks: formatDurasi(selisih) + " lagi", kelas: "kuning" };
  }
  return { teks: formatDurasi(selisih) + " lagi", kelas: "hijau" };
}

// Aturan pengurutan: yang belum selesai di atas, lalu tenggat terdekat dulu
function urutkanTugas(a, b) {
  if (a.selesai !== b.selesai) {
    return a.selesai ? 1 : -1;
  }
  return new Date(a.tenggat) - new Date(b.tenggat);
}

function formatTanggal(teksTenggat) {
  return new Date(teksTenggat).toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* ---------- 5. Membuat tampilan ---------- */

// Fungsi bantu: membuat elemen HTML dengan aman.
// textContent dipakai (bukan innerHTML) supaya teks yang diketik pengguna
// tidak bisa disisipi kode berbahaya.
function buatElemen(tag, kelas, teks) {
  const elemen = document.createElement(tag);
  if (kelas) elemen.className = kelas;
  if (teks !== undefined) elemen.textContent = teks;
  return elemen;
}

// Membuat satu kartu tugas
function buatKartu(tugas) {
  const status = hitungStatus(tugas);

  const kartu = buatElemen("li", "kartu " + status.kelas);

  // Baris atas: judul + lencana sisa waktu
  const barisAtas = buatElemen("div", "baris-atas");
  barisAtas.appendChild(buatElemen("h3", "judul", tugas.judul));
  barisAtas.appendChild(buatElemen("span", "lencana", status.teks));
  kartu.appendChild(barisAtas);

  // Mapel dan guru
  kartu.appendChild(buatElemen("p", "info", tugas.mapel + " · " + tugas.guru));

  // Tenggat
  kartu.appendChild(buatElemen("p", "tenggat", "⏰ " + formatTanggal(tugas.tenggat)));

  // Catatan (hanya jika diisi)
  if (tugas.catatan) {
    const catatan = buatElemen("p", "catatan", "📝 " + tugas.catatan);
    if (idCatatanTerbuka.has(tugas.id)) {
      catatan.classList.add("terbuka");
    }
    // Ketuk catatan untuk membuka/menutup teks penuh
    catatan.addEventListener("click", function () {
      if (idCatatanTerbuka.has(tugas.id)) {
        idCatatanTerbuka.delete(tugas.id);
      } else {
        idCatatanTerbuka.add(tugas.id);
      }
      catatan.classList.toggle("terbuka");
    });
    kartu.appendChild(catatan);
  }

  // Tombol aksi
  const aksi = buatElemen("div", "aksi");

  const tombolSelesai = buatElemen(
    "button", "", tugas.selesai ? "↩ Batal selesai" : "✔ Selesai"
  );
  tombolSelesai.addEventListener("click", function () {
    tandaiSelesai(tugas.id);
  });

  const tombolEdit = buatElemen("button", "", "✏ Edit");
  tombolEdit.addEventListener("click", function () {
    mulaiEdit(tugas.id);
  });

  const tombolHapus = buatElemen("button", "", "🗑 Hapus");
  tombolHapus.addEventListener("click", function () {
    hapusTugas(tugas.id);
  });

  aksi.appendChild(tombolSelesai);
  aksi.appendChild(tombolEdit);
  aksi.appendChild(tombolHapus);
  kartu.appendChild(aksi);

  return kartu;
}

// Mengisi saran nama guru (datalist) dan pilihan filter guru
function perbaruiDaftarGuru() {
  // Ambil nama guru tanpa duplikat, lalu urutkan A-Z
  const namaGuru = Array.from(new Set(daftarTugas.map(function (t) {
    return t.guru;
  }))).sort();

  // Jika tidak ada perubahan, tidak perlu membangun ulang
  const penanda = namaGuru.join("|");
  if (penanda === daftarGuruTerakhir) return;
  daftarGuruTerakhir = penanda;

  datalistGuru.innerHTML = "";
  const pilihanSekarang = filterGuru.value;
  filterGuru.innerHTML = "";

  const semua = buatElemen("option", "", "Semua guru");
  semua.value = "semua";
  filterGuru.appendChild(semua);

  namaGuru.forEach(function (nama) {
    const saran = buatElemen("option");
    saran.value = nama;
    datalistGuru.appendChild(saran);

    const pilihan = buatElemen("option", "", nama);
    pilihan.value = nama;
    filterGuru.appendChild(pilihan);
  });

  // Kembalikan pilihan filter jika gurunya masih ada
  filterGuru.value = namaGuru.includes(pilihanSekarang) ? pilihanSekarang : "semua";
}

// Memperbarui tiga kotak ringkasan
function perbaruiRingkasan() {
  const sekarang = Date.now();
  let aktif = 0;
  let terlambat = 0;
  let selesai = 0;

  daftarTugas.forEach(function (tugas) {
    if (tugas.selesai) {
      selesai++;
    } else {
      aktif++;
      if (new Date(tugas.tenggat).getTime() < sekarang) terlambat++;
    }
  });

  document.getElementById("jml-aktif").textContent = aktif;
  document.getElementById("jml-terlambat").textContent = terlambat;
  document.getElementById("jml-selesai").textContent = selesai;
}

// Fungsi utama: menggambar ulang seluruh daftar tugas di layar
function tampilkan() {
  perbaruiDaftarGuru();

  const statusDipilih = filterStatus.value;
  const guruDipilih = filterGuru.value;

  // Saring tugas sesuai filter, lalu urutkan
  const terpilih = daftarTugas
    .filter(function (tugas) {
      const cocokStatus =
        statusDipilih === "semua" ||
        (statusDipilih === "belum" && !tugas.selesai) ||
        (statusDipilih === "selesai" && tugas.selesai);
      const cocokGuru = guruDipilih === "semua" || tugas.guru === guruDipilih;
      return cocokStatus && cocokGuru;
    })
    .sort(urutkanTugas);

  daftarElemen.innerHTML = "";
  terpilih.forEach(function (tugas) {
    daftarElemen.appendChild(buatKartu(tugas));
  });

  pesanKosong.hidden = terpilih.length > 0;
  perbaruiRingkasan();
}

/* ---------- 6. Aksi pada tugas ---------- */

function tandaiSelesai(id) {
  const tugas = daftarTugas.find(function (t) { return t.id === id; });
  if (!tugas) return;
  tugas.selesai = !tugas.selesai; // true jadi false, false jadi true
  simpanData();
  tampilkan();
}

function hapusTugas(id) {
  if (!confirm("Hapus tugas ini?")) return;
  daftarTugas = daftarTugas.filter(function (t) { return t.id !== id; });
  idCatatanTerbuka.delete(id);
  if (idSedangDiedit === id) resetForm();
  simpanData();
  tampilkan();
}

function mulaiEdit(id) {
  const tugas = daftarTugas.find(function (t) { return t.id === id; });
  if (!tugas) return;

  // Isi formulir dengan data tugas yang dipilih
  inputJudul.value = tugas.judul;
  inputMapel.value = tugas.mapel;
  inputGuru.value = tugas.guru;
  inputTenggat.value = tugas.tenggat;
  inputCatatan.value = tugas.catatan;

  idSedangDiedit = id;
  judulForm.textContent = "Edit Tugas";
  tombolSimpan.textContent = "Simpan Perubahan";
  tombolBatal.hidden = false;

  // Gulir ke formulir
  document.getElementById("panel-form").scrollIntoView({ behavior: "smooth" });
  inputJudul.focus();
}

function resetForm() {
  formTugas.reset();
  idSedangDiedit = null;
  judulForm.textContent = "Tambah Tugas";
  tombolSimpan.textContent = "Simpan";
  tombolBatal.hidden = true;
}

/* ---------- 7. Menangani formulir ---------- */

formTugas.addEventListener("submit", function (event) {
  event.preventDefault(); // cegah halaman dimuat ulang

  const dataBaru = {
    judul: inputJudul.value.trim(),
    mapel: inputMapel.value.trim(),
    guru: inputGuru.value.trim(),
    tenggat: inputTenggat.value,
    catatan: inputCatatan.value.trim()
  };

  // Pastikan kolom wajib tidak berisi spasi saja
  if (!dataBaru.judul || !dataBaru.mapel || !dataBaru.guru || !dataBaru.tenggat) {
    alert("Nama tugas, mapel, guru, dan tenggat wajib diisi.");
    return;
  }

  if (idSedangDiedit) {
    // Mode edit: perbarui tugas yang ada
    const tugas = daftarTugas.find(function (t) { return t.id === idSedangDiedit; });
    if (tugas) Object.assign(tugas, dataBaru);
  } else {
    // Mode tambah: buat tugas baru
    daftarTugas.push({
      id: buatId(),
      judul: dataBaru.judul,
      mapel: dataBaru.mapel,
      guru: dataBaru.guru,
      tenggat: dataBaru.tenggat,
      catatan: dataBaru.catatan,
      selesai: false
    });
  }

  simpanData();
  resetForm();
  tampilkan();
});

tombolBatal.addEventListener("click", resetForm);
filterStatus.addEventListener("change", tampilkan);
filterGuru.addEventListener("change", tampilkan);

/* ---------- 8. Memulai aplikasi ---------- */

function tampilkanTanggalHariIni() {
  document.getElementById("tanggal-hari-ini").textContent =
    new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
}

muatData();
tampilkanTanggalHariIni();
tampilkan();

// Perbarui sisa waktu setiap 1 menit selama aplikasi terbuka
setInterval(tampilkan, 60000);

// Perbarui juga saat aplikasi dibuka kembali dari latar belakang
document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    tampilkanTanggalHariIni();
    tampilkan();
  }
});

// Minta browser agar data tidak dihapus otomatis saat penyimpanan HP menipis
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist();
}

/* ---------- 9. Mendaftarkan Service Worker (mode offline) ---------- */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function (error) {
      console.log("Service Worker gagal didaftarkan:", error);
    });
  });
}
