/* ════════════════════════════════
   ガス番長 — app.js
════════════════════════════════ */

let myLat = null, myLng = null;
let memos = JSON.parse(localStorage.getItem('gb_memos') || '[]');

/* ── INIT ── */
window.addEventListener('DOMContentLoaded', () => {
  // スプラッシュ表示後にアプリを表示
  setTimeout(() => {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  }, 1200);

  getLocation();
  renderMemos();

  // 目的地入力のクリアボタン制御
  const destInput = document.getElementById('dest-input');
  destInput.addEventListener('input', () => {
    document.getElementById('dest-clear').style.display =
      destInput.value ? 'block' : 'none';
  });

  // Enterキーでそのままgogo.gs起動
  destInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') openGogoGS();
  });
  document.getElementById('station-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') openMapsNav();
  });
});

/* ── 位置情報取得 ── */
function getLocation() {
  const text = document.getElementById('loc-text');
  const dot  = document.querySelector('.loc-dot');

  if (!navigator.geolocation) {
    text.textContent = '位置情報が使えません';
    dot.classList.add('error');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      myLat = pos.coords.latitude;
      myLng = pos.coords.longitude;
      // 逆ジオコーディング（nominatim 無料API）
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${myLat}&lon=${myLng}&format=json&accept-language=ja`)
        .then(r => r.json())
        .then(d => {
          const addr = d.address;
          const label = addr.city || addr.town || addr.village || addr.county || '現在地';
          const detail = addr.suburb || addr.neighbourhood || '';
          text.textContent = detail ? `${label} ${detail}` : label;
        })
        .catch(() => {
          text.textContent = `${myLat.toFixed(3)}, ${myLng.toFixed(3)}`;
        });
    },
    err => {
      dot.classList.add('error');
      switch(err.code) {
        case 1: text.textContent = '位置情報の許可が必要です'; break;
        case 2: text.textContent = '位置情報を取得できません'; break;
        case 3: text.textContent = 'タイムアウト — 手動で検索'; break;
        default: text.textContent = '位置情報エラー';
      }
    },
    { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
  );
}

/* ── gogo.gs を開く（ルート検索） ── */
function openGogoGS() {
  const dest = document.getElementById('dest-input').value.trim();

  // gogo.gs の検索URL
  // 目的地がある場合：目的地周辺を検索
  // 目的地がない場合：現在地周辺
  let url;
  if (dest) {
    // gogo.gs はクエリパラメータで地名検索できる
    url = `https://gogo.gs/search/?q=${encodeURIComponent(dest)}&fuel=1`;
  } else if (myLat && myLng) {
    url = `https://gogo.gs/map/?lat=${myLat}&lng=${myLng}&fuel=1&zoom=12`;
  } else {
    url = 'https://gogo.gs/';
  }

  window.open(url, '_blank');
  showToast('gogo.gsを開きました');
}

/* ── gogo.gs 現在地周辺 ── */
function openGogoGSNearby() {
  let url;
  if (myLat && myLng) {
    url = `https://gogo.gs/map/?lat=${myLat}&lng=${myLng}&fuel=1&zoom=13`;
  } else {
    url = 'https://gogo.gs/';
    showToast('位置情報を取得中です…', 'yellow');
  }
  window.open(url, '_blank');
}

/* ── 目的地クリア ── */
function clearDest() {
  document.getElementById('dest-input').value = '';
  document.getElementById('dest-clear').style.display = 'none';
  document.getElementById('dest-input').focus();
}

/* ── Googleマップでナビ起動 ── */
function openMapsNav() {
  const station = document.getElementById('station-input').value.trim();
  if (!station) {
    showToast('スタンド名か住所を入力してください', 'red');
    document.getElementById('station-input').focus();
    return;
  }

  // スマホの場合 Google Maps アプリを直接起動
  let url;
  if (myLat && myLng) {
    // 現在地からのルート
    url = `https://www.google.com/maps/dir/?api=1`
        + `&origin=${myLat},${myLng}`
        + `&destination=${encodeURIComponent(station)}`
        + `&travelmode=driving`;
  } else {
    // 現在地不明の場合はマップで検索
    url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(station + ' ガソリンスタンド')}`;
  }

  window.open(url, '_blank');
  showToast('Googleマップを起動しました');
}

/* ════════════════════════════════
   給油メモ機能
════════════════════════════════ */
function openMemoModal() {
  document.getElementById('m-name').value  = '';
  document.getElementById('m-price').value = '';
  document.getElementById('m-liter').value = '';
  document.getElementById('m-note').value  = '';
  document.getElementById('overlay').classList.add('open');
  setTimeout(() => document.getElementById('m-name').focus(), 250);
}

function closeOverlay(e) {
  if (e.target === document.getElementById('overlay')) closeOverlayDirect();
}
function closeOverlayDirect() {
  document.getElementById('overlay').classList.remove('open');
}

function saveMemo() {
  const name  = document.getElementById('m-name').value.trim();
  const price = parseInt(document.getElementById('m-price').value);
  const liter = parseFloat(document.getElementById('m-liter').value);
  const note  = document.getElementById('m-note').value.trim();

  if (!name || !price) {
    showToast('スタンド名と価格は必須です', 'red');
    return;
  }

  const now = new Date();
  const dateStr = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  memos.unshift({ id: Date.now(), name, price, liter: liter||null, note, date: dateStr });
  // 最大50件保持
  if (memos.length > 50) memos = memos.slice(0, 50);
  localStorage.setItem('gb_memos', JSON.stringify(memos));

  closeOverlayDirect();
  renderMemos();
  showToast('📝 メモを保存しました');
}

function deleteMemo(id) {
  memos = memos.filter(m => m.id !== id);
  localStorage.setItem('gb_memos', JSON.stringify(memos));
  renderMemos();
}

function renderMemos() {
  const list = document.getElementById('memo-list');
  if (memos.length === 0) {
    list.innerHTML = '<div style="font-size:.75rem;color:#444;text-align:center;padding:8px 0">まだ記録がありません</div>';
    return;
  }
  list.innerHTML = memos.slice(0, 5).map(m => {
    const total = m.liter ? `${m.liter}L · ¥${Math.round(m.price * m.liter).toLocaleString()}` : '';
    const detail = [m.date, total, m.note].filter(Boolean).join(' · ');
    return `<div class="memo-item">
      <div class="memo-left">
        <div class="memo-name">${escHtml(m.name)}</div>
        <div class="memo-detail">${escHtml(detail)}</div>
      </div>
      <div class="memo-price">${m.price}<span> 円/L</span></div>
      <button class="btn-memo-del" onclick="deleteMemo(${m.id})">🗑</button>
    </div>`;
  }).join('');
}

/* ── TOAST ── */
let toastTimer = null;
function showToast(msg, type = 'green') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast${type === 'red' ? ' red' : ''}`;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ── UTILS ── */
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
