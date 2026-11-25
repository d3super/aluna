'use strict';
/* VoiceUp PWA siswa. Semua teks dari server dirender lewat textContent (anti-XSS). */
const LS = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const state = { meta: LS.get('aluna_meta', null), route: 'beranda', last: 'beranda', installEvt: null };
if (state.meta && !(state.meta.kategori || []).length) { state.meta = null; LS.del('aluna_meta'); }

function h(tag, a, ...kids) {
  const e = document.createElement(tag);
  for (const k in a || {}) {
    const v = a[k];
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(2).forEach(c => { if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return e;
}
const ICONS = {
  home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  chart: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
};
function ic(n) { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ic'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICONS[n]; return s; }
const fmt = iso => iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const mon = ym => { const p = ym.split('-'); return new Date(p[0], p[1] - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }); };

async function api(action, data) {
  if (!window.CONFIG || CONFIG.API_URL.indexOf('GANTI') === 0) throw new Error('Alamat server belum diatur di config.js');
  let r;
  try { r = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action }, data || {})) }); }
  catch (e) { throw new Error('Tidak ada koneksi internet. Coba lagi saat tersambung.'); }
  let j; try { j = await r.json(); } catch (e) { throw new Error('Server tidak merespons dengan benar.'); }
  if (!j.ok) { const er = new Error(j.error || 'Terjadi kesalahan'); er.code = j.code; throw er; }
  return j;
}
function device() { let d = LS.get('aluna_dev', null); if (!d) { d = Math.random().toString(36).slice(2) + Date.now().toString(36); LS.set('aluna_dev', d); } return d; }

/* ---------- modal ---------- */
function modal(o) {
  const ov = h('div', { class: 'modal-ov', role: 'dialog', 'aria-modal': 'true' });
  const close = () => { ov.remove(); if (o.onClose) o.onClose(); };
  const box = h('div', { class: 'modal ' + (o.tone || '') },
    h('button', { class: 'x', 'aria-label': 'Tutup', onclick: close }, ic('x')),
    h('h3', {}, o.title), h('div', { class: 'stack' }, o.body),
    h('div', { class: 'macts' }, (o.actions || []).map(a => h('button', { class: 'btn ' + (a.kind || 'ghost'), onclick: () => { if (!a.keep) close(); if (a.fn) a.fn(); } }, a.label))));
  ov.append(box); ov.addEventListener('click', e => { if (e.target === ov) close(); });
  document.body.append(ov); return close;
}
const notice = (ok, title, msg, fn) => modal({ tone: ok ? 'ok' : 'bad', title, body: h('p', {}, msg), actions: [{ label: 'Mengerti', kind: 'teal', fn }] });

/* ---------- shell ---------- */
function drawTop() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const top = $('#top'); top.replaceChildren(
    h('img', { src: LOGO, alt: '' }),
    h('div', { class: 't' }, h('b', {}, 'VoiceUp'), h('small', {}, 'Ruang Aman Untuk Setiap Suara')),
    h('button', { class: 'icon-btn', 'aria-label': dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap', onclick: toggleTheme }, ic(dark ? 'sun' : 'moon')),
    h('a', { class: 'icon-btn', href: '#/tentang', 'aria-label': 'Tentang VoiceUp' }, ic('info')));
}
function $(s) { return document.querySelector(s); }
function toggleTheme() {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t); LS.set('aluna_theme', t);
  document.querySelector('meta[name=theme-color]').setAttribute('content', t === 'dark' ? '#0c2a35' : '#123B4A'); drawTop();
}
function drawNav() {
  const it = (r, l, i) => h('a', { href: '#/' + r, 'aria-current': state.last === r ? 'page' : null }, ic(i), l);
  $('#nav').replaceChildren(it('beranda', 'Beranda', 'home'), it('dashboard', 'Dashboard', 'chart'),
    h('a', { class: 'fab', href: '#/kirim', 'aria-label': 'Kirim Aspirasi' }, ic('plus')),
    it('lacak', 'Lacak', 'search'), it('respons', 'Respons', 'chat'));
}
function skeleton() { return h('div', { class: 'stack' }, h('div', { class: 'skel' }), h('div', { class: 'skel' }), h('div', { class: 'skel' })); }
function retry(msg, fn) { return h('div', { class: 'card empty' }, h('p', {}, msg), h('button', { class: 'btn ghost', onclick: fn }, 'Coba lagi')); }
// Stale-while-revalidate: tampilkan data tersimpan seketika, lalu segarkan dari server
function swrInto(box, key, fn, build) {
  const cached = LS.get('aluna_c_' + key, null);
  if (cached) { try { box.replaceChildren(build(cached)); } catch (e) { box.replaceChildren(skeleton()); } } else box.replaceChildren(skeleton());
  return fn().then(r => { LS.set('aluna_c_' + key, r); if (document.body.contains(box)) box.replaceChildren(build(r)); })
    .catch(e => { if (!cached && document.body.contains(box)) box.replaceChildren(retry(e.message, () => swrInto(box, key, fn, build))); });
}
async function loadInto(box, fn, build) {
  box.replaceChildren(skeleton());
  try { box.replaceChildren(build(await fn())); } catch (e) { box.replaceChildren(retry(e.message, () => loadInto(box, fn, build))); }
}

/* ---------- router ---------- */
const VIEWS = { beranda: vHome, dashboard: vDash, lacak: vTrack, respons: vResp, tentang: vAbout };
function route() {
  const r = (location.hash.replace('#/', '') || 'beranda').split('?')[0];
  state.route = r;
  if (r === 'kirim') { if (!$('.sheet')) openSend(); return; }
  closeSheet();
  if (!VIEWS[r]) { location.hash = '#/beranda'; return; }
  state.last = r; drawNav();
  const v = $('#view'); v.replaceChildren(); VIEWS[r](v); window.scrollTo(0, 0);
}
function closeSheet() { const s = $('.sheet'); if (s) s.remove(); }
function leaveSheet() { closeSheet(); location.hash = '#/' + state.last; }

/* ---------- beranda ---------- */
function vHome(v) {
  const statBox = h('div', { class: 'stats' }), kegBox = h('div');
  v.append(h('div', { class: 'stack' },
    h('section', { class: 'hero' }, h('h2', {}, 'Suaramu penting. Identitasmu tetap aman.'),
      h('p', {}, 'Sampaikan saran, kritik, atau pengaduan tanpa nama, tanpa akun.'),
      h('div', { class: 'row' }, h('a', { class: 'btn gold', href: '#/kirim' }, ic('plus'), 'Kirim Aspirasi'), h('a', { class: 'btn line', href: '#/lacak' }, 'Lacak laporan'))),
    statBox,
    h('section', {}, h('h2', {}, 'Kegiatan terkini'), kegBox),
    h('section', { class: 'card stack' }, h('h2', {}, 'Cara kerja'),
      h('ol', { class: 'steps' },
        h('li', {}, h('div', {}, h('b', {}, 'Tulis aspirasi'), h('p', { class: 'muted' }, 'Pilih jenis dan kategori, lalu ceritakan tanpa menyebut identitas.'))),
        h('li', {}, h('div', {}, h('b', {}, 'Simpan kode rahasia'), h('p', { class: 'muted' }, 'Kamu mendapat nomor referensi dan kode. Kode hanya muncul sekali.'))),
        h('li', {}, h('div', {}, h('b', {}, 'Pantau tindak lanjut'), h('p', { class: 'muted' }, 'Lihat status dan respons sekolah kapan saja lewat menu Lacak.'))))),
    installCard()));
  const b = state.boot;
  if (!b) { statBox.replaceChildren(skeleton()); kegBox.replaceChildren(skeleton()); return; }
  const s = b.stats, c = (n, l) => h('div', { class: 'card stat' }, h('b', {}, n), h('span', {}, l));
  statBox.replaceWith(h('div', { class: 'stats' }, c(s.total, 'Aspirasi'), c(s.persenRespons + '%', 'Direspon'), c(s.selesai, 'Selesai')));
  const kg = upcoming(b.kegiatan);
  kegBox.replaceChildren(!kg.length ? h('div', { class: 'card muted' }, 'Tidak ada kegiatan dalam 3 hari ke depan.') :
    h('div', { class: 'car' }, kg.map(g => h('article', { class: 'card' }, h('span', { class: 'tag gold' }, dayLabel(g.tanggal) + ' - ' + fmt(g.tanggal)), h('h3', {}, g.judul), h('p', { class: 'muted' }, g.ringkasan),
      /^https?:\/\//i.test(g.tautan) ? h('a', { href: g.tautan, target: '_blank', rel: 'noopener noreferrer', class: 'tag' }, 'Buka tautan') : null))));
}
/* Kegiatan: hanya tampil dari H-3 sampai hari-H; hilang setelah tanggalnya lewat (memakai tanggal di perangkat) */
function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function upcoming(list) {
  const t0 = new Date(), today = ymd(t0), end = ymd(new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + 3));
  return (list || []).filter(g => /^\d{4}-\d{2}-\d{2}$/.test(g.tanggal || '') && g.tanggal >= today && g.tanggal <= end).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}
function dayLabel(t) {
  const n = new Date(), d = t.split('-'), diff = Math.round((new Date(d[0], d[1] - 1, d[2]) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 86400000);
  return diff === 0 ? 'Hari ini' : diff === 1 ? 'Besok' : diff === 2 ? '2 hari lagi' : fmt(t);
}
function activeTa() { const t = state.meta && state.meta.tahunAjaran.filter(x => x.aktif)[0]; return t ? t.id : 'all'; }
function installCard() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) return null;
  const c = h('section', { class: 'card row' }, ic('plus'), h('div', { style: null }, h('b', {}, 'Pasang VoiceUp di layar utama'),
    h('p', { class: 'muted' }, ios ? 'Di Safari: ketuk Bagikan, lalu "Tambah ke Layar Utama".' : 'Buka lebih cepat seperti aplikasi biasa.')));
  if (!ios) c.append(h('button', { class: 'btn teal', onclick: async () => { if (state.installEvt) { state.installEvt.prompt(); state.installEvt = null; } else notice(true, 'Pasang manual', 'Buka menu browser (titik tiga), lalu pilih "Install aplikasi" atau "Tambahkan ke layar utama".'); } }, 'Pasang'));
  return c;
}

/* ---------- kirim aspirasi ---------- */
function openSend() {
  const m = state.meta;
  if (!m || !m.kategori.length) {
    const back = () => { location.hash = '#/' + state.last; };
    api('meta').then(x => {
      state.meta = x;
      if (x.kategori.length) { LS.set('aluna_meta', x); openSend(); } else notice(false, 'Kategori belum tersedia', 'Daftar kategori di server masih kosong. Minta admin menjalankan setup ulang di Apps Script.', back);
    }).catch(e => notice(false, 'Belum bisa dimuat', e.message, back));
    return;
  }
  const dr = LS.get('aluna_draft', {}); let jenis = dr.jenis || 'Saran';
  const segs = m.jenis.map(j => h('button', { type: 'button', 'aria-pressed': String(j === jenis), onclick: () => { jenis = j; segs.forEach(b => b.setAttribute('aria-pressed', String(b.textContent === j))); save(); } }, j));
  const kat = h('select', { class: 'in', id: 'kat', onchange: save }, h('option', { value: '' }, 'Pilih kategori'), m.kategori.map(k => h('option', { value: k.id }, k.nama)));
  const lok = h('select', { class: 'in', id: 'lok', onchange: save }, h('option', { value: '' }, 'Lokasi (opsional)'), m.lokasi.map(l => h('option', { value: l }, l)));
  const jd = h('input', { class: 'in', id: 'jd', maxlength: 100, placeholder: 'Contoh: Keran toilet lantai 2 rusak', oninput: save, autocomplete: 'off' });
  const ur = h('textarea', { class: 'in', id: 'ur', maxlength: 2000, placeholder: 'Ceritakan apa yang terjadi, kapan, dan apa harapanmu. Jangan tulis nama atau nomor telepon.', oninput: () => { cnt.textContent = ur.value.length + '/2000'; save(); } });
  const cnt = h('small', { class: 'muted' }, '0/2000'); const err = h('div', { class: 'err', role: 'alert' });
  kat.value = dr.kat || ''; lok.value = dr.lok || ''; jd.value = dr.jd || ''; ur.value = dr.ur || ''; cnt.textContent = ur.value.length + '/2000';
  function save() { LS.set('aluna_draft', { jenis, kat: kat.value, lok: lok.value, jd: jd.value, ur: ur.value }); }
  const send = async pii => {
    const btn = $('#sendbtn'); btn.disabled = true; btn.textContent = 'Mengirim...';
    try {
      const r = await api('submit', { jenis, kategoriId: kat.value, lokasi: lok.value, judul: jd.value, uraian: ur.value, device: device(), confirmPII: !!pii });
      LS.del('aluna_draft'); successModal(r, jd.value);
    } catch (e) {
      if (e.code === 'PII_WARN') modal({ tone: 'bad', title: 'Ada data pribadi?', body: h('p', {}, e.message), actions: [{ label: 'Perbaiki tulisan', kind: 'teal' }, { label: 'Kirim tetap', fn: () => send(true) }] });
      else notice(false, 'Gagal mengirim', e.message);
    } finally { btn.disabled = false; btn.textContent = 'Kirim aspirasi'; }
  };
  const submit = () => {
    err.textContent = '';
    if (!kat.value) return err.textContent = 'Pilih kategori terlebih dahulu.';
    if (jd.value.trim().length < 5) return err.textContent = 'Judul minimal 5 karakter.';
    if (ur.value.trim().length < 20) return err.textContent = 'Uraian minimal 20 karakter.';
    modal({ title: 'Kirim aspirasi ini?', body: [h('p', {}, 'Setelah terkirim, isi tidak bisa diubah. Pastikan tidak ada nama atau identitas pribadi di dalamnya.'), h('p', { class: 'muted' }, jenis + ' - ' + jd.value.trim())], actions: [{ label: 'Periksa lagi' }, { label: 'Ya, kirim', kind: 'teal', fn: () => send(false) }] });
  };
  closeSheet();
  document.body.append(h('div', { class: 'sheet' }, h('div', { class: 'in-wrap' },
    h('header', {}, h('h2', {}, 'Kirim Aspirasi'), h('button', { class: 'icon-btn', 'aria-label': 'Tutup formulir', onclick: leaveSheet }, ic('x'))),
    h('div', { class: 'stack' },
      h('div', { class: 'notice' }, ic('shield'), h('span', {}, 'Jangan tulis nama, kelas, NIS, atau nomor telepon. Kamu tidak perlu login.')),
      h('div', {}, h('p', { class: 'muted', style: null }, 'Jenis'), h('div', { class: 'seg' }, segs)),
      h('label', { class: 'f' }, 'Kategori', kat), h('label', { class: 'f' }, 'Lokasi kejadian', lok),
      h('label', { class: 'f' }, 'Judul', jd), h('label', { class: 'f' }, h('span', { class: 'row between' }, 'Uraian', cnt), ur),
      h('details', { class: 'tips' }, h('summary', {}, 'Panduan menulis yang baik'), h('ul', {}, h('li', {}, 'Tulis fakta: apa, di mana, kapan.'), h('li', {}, 'Hindari menyebut nama orang; cukup jelaskan peran atau situasinya.'), h('li', {}, 'Tulis harapanmu agar sekolah tahu tindak lanjut yang dibutuhkan.'), h('li', {}, 'Jika kamu dalam bahaya sekarang, segera temui guru atau orang dewasa tepercaya.'))),
      err,
      h('button', { class: 'btn teal block', id: 'sendbtn', onclick: submit }, 'Kirim aspirasi'),
      h('button', { class: 'btn ghost block', onclick: leaveSheet }, 'Batal')))));
}
function successModal(r, judul) {
  let keep = true; const chk = h('input', { type: 'checkbox', checked: true, onchange: e => { keep = e.target.checked; } });
  const box = (t, v) => h('div', {}, h('small', { class: 'muted' }, t), h('div', { class: 'code' }, v), h('button', { class: 'btn ghost block', style: null, onclick: () => navigator.clipboard && navigator.clipboard.writeText(v).then(() => notice(true, 'Tersalin', t + ' sudah disalin.')) }, ic('copy'), 'Salin'));
  const done = () => {
    if (keep) { const l = LS.get('aluna_saved', []); l.unshift({ ref: r.ref, kode: r.kode, judul: judul.trim().slice(0, 60), waktu: new Date().toISOString() }); LS.set('aluna_saved', l.slice(0, 10)); }
    leaveSheet();
  };
  modal({ tone: 'ok', title: 'Aspirasi terkirim', onClose: done, body: [h('p', {}, 'Catat atau foto dua kode ini. Kode rahasia hanya tampil sekali dan tidak bisa dipulihkan.'), box('Nomor referensi', r.ref), box('Kode rahasia', r.kode),
    h('label', { class: 'row', style: null }, chk, h('span', { class: 'muted' }, 'Simpan di HP ini agar mudah dilacak. Matikan jika HP dipakai bersama.'))], actions: [{ label: 'Selesai', kind: 'teal' }] });
}

/* ---------- lacak ---------- */
function vTrack(v) {
  const ref = h('input', { class: 'in', placeholder: 'VUP-2611-XXXXX', autocapitalize: 'characters', autocomplete: 'off' });
  const kode = h('input', { class: 'in', placeholder: 'Kode rahasia 8 karakter', autocapitalize: 'characters', autocomplete: 'off', type: 'password' });
  const out = h('div'), saved = h('div');
  const cek = async (r, k) => {
    out.replaceChildren(skeleton());
    try { out.replaceChildren(trackResult(await api('track', { ref: r, kode: k }), r, k)); }
    catch (e) { out.replaceChildren(h('div', { class: 'card err' }, e.message)); }
  };
  const drawSaved = () => {
    const l = LS.get('aluna_saved', []); if (!l.length) { saved.replaceChildren(); return; }
    saved.replaceChildren(h('div', { class: 'card stack' }, h('b', {}, 'Tersimpan di HP ini'), h('div', { class: 'chips' }, l.map((s, i) => h('span', { class: 'chip' },
      h('button', { onclick: () => { ref.value = s.ref; kode.value = s.kode; cek(s.ref, s.kode); } }, s.judul || s.ref),
      h('button', { 'aria-label': 'Hapus dari HP', onclick: () => { l.splice(i, 1); LS.set('aluna_saved', l); drawSaved(); } }, 'x'))))));
  };
  v.append(h('div', { class: 'stack' }, h('h2', {}, 'Lacak aspirasi'), saved,
    h('div', { class: 'card stack' }, h('label', { class: 'f' }, 'Nomor referensi', ref), h('label', { class: 'f' }, 'Kode rahasia', kode),
      h('button', { class: 'btn teal block', onclick: () => { if (!ref.value.trim() || !kode.value.trim()) return notice(false, 'Data belum lengkap', 'Isi nomor referensi dan kode rahasia.'); cek(ref.value.trim().toUpperCase(), kode.value.trim().toUpperCase()); } }, ic('search'), 'Cek status')), out));
  drawSaved();
}
function trackResult(t, ref, kode) {
  return h('div', { class: 'stack' }, h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('span', { class: 'tag' }, t.jenis + ' - ' + t.kategori), h('span', { class: 'badge ' + t.status }, t.status)), h('h3', {}, t.judul), h('small', { class: 'muted' }, 'Dikirim ' + fmt(t.waktu))),
    h('div', { class: 'card stack' }, h('h3', {}, 'Riwayat status'), h('ul', { class: 'tl' }, t.riwayat.slice().reverse().map(r => h('li', {}, h('b', {}, r.status), h('small', { class: 'muted' }, ' ' + fmt(r.waktu)), h('p', {}, r.catatan))))),
    h('div', { class: 'card stack' }, h('h3', {}, 'Respons sekolah'), t.respons.length ? t.respons.map(r => h('div', { class: 'notice' }, h('div', {}, h('small', { class: 'muted' }, fmt(r.waktu)), h('p', {}, r.isi)))) : h('p', { class: 'muted' }, 'Belum ada respons. Cek lagi nanti.')),
    t.bisaSurvei ? surveyCard(ref, kode) : null);
}
function surveyCard(ref, kode) {
  let rating = 0; const com = h('textarea', { class: 'in', maxlength: 300, placeholder: 'Komentar (opsional)' });
  const stars = [1, 2, 3, 4, 5].map(n => h('button', { type: 'button', 'aria-label': n + ' bintang', onclick: () => { rating = n; stars.forEach((s, i) => s.classList.toggle('on', i < n)); } }, '★'));
  const card = h('div', { class: 'card stack' }, h('h3', {}, 'Seberapa puas dengan tindak lanjutnya?'), h('p', { class: 'muted' }, 'Jawabanmu anonim dan tidak terhubung ke laporanmu.'), h('div', { class: 'stars' }, stars), com,
    h('button', { class: 'btn teal block', onclick: async () => {
      if (!rating) return notice(false, 'Belum memilih', 'Pilih jumlah bintang dulu.');
      try { await api('survey', { ref, kode, rating, komentar: com.value }); card.replaceChildren(h('p', {}, 'Terima kasih, penilaianmu sudah tersimpan.')); notice(true, 'Berhasil', 'Penilaian terkirim secara anonim.'); }
      catch (e) { notice(false, 'Gagal menyimpan', e.message); } } }, 'Kirim penilaian'));
  return card;
}

/* ---------- dashboard ---------- */
function vDash(v) {
  const m = state.meta, box = h('div'); let ta = activeTa(), bulan = '';
  const sel = h('select', { class: 'in', 'aria-label': 'Tahun ajaran', onchange: e => { ta = e.target.value; load(); } }, h('option', { value: 'all' }, 'Semua tahun ajaran'), (m ? m.tahunAjaran : []).map(t => h('option', { value: t.id }, 'TA ' + t.nama)));
  sel.value = ta;
  const mi = h('input', { class: 'in', type: 'month', 'aria-label': 'Filter bulan', onchange: e => { bulan = e.target.value; load(); } });
  v.append(h('div', { class: 'stack' }, h('h2', {}, 'Dashboard aspirasi'), h('div', { class: 'grid2' }, sel, mi), box));
  const load = () => swrInto(box, 'stats_' + ta + '_' + bulan, () => api('stats', { ta, bulan }), s => {
    const c = (n, l) => h('div', { class: 'card stat' }, h('b', {}, n), h('span', {}, l));
    const ring = h('div', { class: 'ring' }, h('span', {}, s.persenRespons + '%')); ring.style.setProperty('--p', s.persenRespons);
    return h('div', { class: 'stack' }, h('div', { class: 'card row' }, ring, h('div', {}, h('h3', {}, 'Persentase respons'), h('p', { class: 'muted' }, s.sudahDirespon + ' dari ' + s.total + ' aspirasi sudah mendapat respons publik.'))),
      h('div', { class: 'grid2' }, c(s.total, 'Total aspirasi'), c(s.selesai, 'Selesai'), c(s.sudahDirespon, 'Sudah direspon'), c(s.belumDirespon, 'Belum direspon')),
      s.total ? [barCard('Distribusi kategori', s.kategori), colCard('Tren bulanan', s.bulanan, mon), colCard('Tren mingguan (8 minggu)', s.mingguan, k => k.slice(5))] : h('div', { class: 'card empty muted' }, 'Belum ada data untuk filter ini.'));
  });
  load();
}
function barCard(t, o) {
  const ks = Object.keys(o).sort((a, b) => o[b] - o[a]), mx = o[ks[0]] || 1;
  return h('div', { class: 'card stack' }, h('h3', {}, t), h('div', { class: 'bars' }, ks.map(k => { const i = h('i'); i.style.width = Math.max(4, o[k] * 100 / mx) + '%'; return h('div', { class: 'bar' }, h('div', { class: 'lab' }, h('span', {}, k), h('b', {}, o[k])), h('div', { class: 'tr' }, i)); })));
}
function colCard(t, o, lf) {
  const ks = Object.keys(o).sort(), mx = Math.max.apply(null, ks.map(k => o[k])) || 1;
  return h('div', { class: 'card stack' }, h('h3', {}, t), h('div', { class: 'cols' }, ks.map(k => { const i = h('i'); i.style.height = Math.max(3, o[k] * 100 / mx * 0.8) + '%'; return h('div', {}, h('b', {}, o[k]), i, h('span', {}, lf(k))); })));
}

/* ---------- respons sekolah ---------- */
function vResp(v) {
  const box = h('div'); v.append(h('div', { class: 'stack' }, h('h2', {}, 'Respons sekolah'), h('p', { class: 'muted' }, 'Respons resmi yang sudah disetujui. Isi laporan pribadi tidak ditampilkan.'), box));
  swrInto(box, 'responses', () => api('responses'), r => !r.daftar.length ? h('div', { class: 'card empty muted' }, 'Belum ada respons publik. Kirim aspirasi pertamamu.') :
    h('div', { class: 'stack' }, r.daftar.map(x => h('article', { class: 'card stack' }, h('div', { class: 'row between' }, h('span', { class: 'tag' }, x.jenis + ' - ' + x.kategori), h('span', { class: 'badge ' + x.status }, x.status)), h('p', {}, x.isi), h('small', { class: 'muted' }, fmt(x.waktu))))));
}

/* ---------- tentang ---------- */
function vAbout(v) {
  const s = (t, ...c) => h('section', { class: 'card stack' }, h('h3', {}, t), c);
  v.append(h('div', { class: 'stack' }, h('div', { class: 'card row' }, h('img', { src: LOGO, alt: '', width: 64, height: 64 }), h('div', {}, h('h2', {}, 'VoiceUp'), h('p', { class: 'muted' }, 'Ruang Aman Untuk Setiap Suara'), h('small', { class: 'muted' }, 'SMP Negeri 1 Kota Bandar Lampung'))),
    s('Untuk apa VoiceUp?', h('p', {}, 'Tempat aman bagi siswa menyampaikan saran, kritik, dan pengaduan, lalu melihat apa tindak lanjut sekolah.')),
    s('Anonim, tapi jujur soal batasnya', h('p', {}, 'VoiceUp tidak meminta nama, kelas, NIS, nomor telepon, atau email, dan tidak membuat akun siswa. Namun anonimitas ini berlaku di tingkat aplikasi; ia bukan jaminan mutlak terhadap penyedia hosting atau operator jaringan. Jangan menulis identitasmu di dalam laporan.')),
    s('Laporan sensitif', h('p', {}, 'Laporan tentang perundungan, kekerasan, pelecehan, atau ancaman hanya dibaca petugas berwenang (misalnya Guru BK atau Pembina) yang ditugaskan.')),
    s('Kode rahasia', h('p', {}, 'Kode hanya disimpan dalam bentuk terenkripsi di server, sehingga tidak bisa dipulihkan jika hilang. Simpan baik-baik.')),
    s('Tampilan', h('button', { class: 'btn ghost', onclick: toggleTheme }, ic('moon'), 'Ganti mode gelap / terang')),
    h('p', { class: 'muted' }, 'Copyright@2026 VoiceUp - Versi 10')));
}

/* ---------- start ---------- */
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); state.installEvt = e; });
window.addEventListener('hashchange', route);
async function refreshBoot() {
  try {
    const b = await api('bootstrap', {}), changed = JSON.stringify(b) !== JSON.stringify(state.boot);
    state.boot = b; state.meta = b.meta;
    if (b.meta.kategori.length) { LS.set('aluna_boot', b); LS.set('aluna_meta', b.meta); }
    if (changed && state.route === 'beranda' && !$('.sheet') && !document.querySelector('.modal-ov')) route();
  } catch (e) { /* tetap memakai data tersimpan */ }
}
async function boot() {
  drawTop(); drawNav();
  const cached = LS.get('aluna_boot', null);
  if (cached && cached.meta && cached.meta.kategori && cached.meta.kategori.length) { state.boot = cached; state.meta = cached.meta; }
  const t0 = Date.now(), fresh = refreshBoot();
  if (!state.boot) await Promise.race([fresh, new Promise(r => setTimeout(r, 4500))]);   // kunjungan pertama: tunggu data, maksimal 4,5 detik
  setTimeout(() => { $('#splash').classList.add('out'); route(); }, Math.max(0, (state.boot ? 650 : 900) - (Date.now() - t0)));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
