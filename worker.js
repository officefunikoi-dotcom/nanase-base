export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const getData = async () => {
      const data = await env.DATA_BOX.get("CONFIG", { type: "json" });
      return data || {
        password: "607",
        message: "NANASE BASEへようこそ",
        eventInfo: "イベント準備中",
        links: [{ label: "Twitter", url: "#" }],
        stamps: [{ name: "リスナーA", count: 0 }],
        displaySettings: { message: true, event: true, links: true, stamps: true },
        order: ["message", "event", "links", "stamps"]
      };
    };

    const cookie = request.headers.get("Cookie") || "";
    const isAuth = cookie.includes("auth=true");

    if (path === "/admin") {
      if (!isAuth) return new Response(adminLoginHtml(), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
      return new Response(await adminDashboardHtml(await getData()), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    if (path === "/api/login" && request.method === "POST") {
      const { pass } = await request.json();
      const config = await getData();
      if (pass === config.password) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Set-Cookie": "auth=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600", "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ success: false }), { status: 401 });
    }

    if (path === "/api/update" && request.method === "POST" && isAuth) {
      const newConfig = await request.json();
      await env.DATA_BOX.put("CONFIG", JSON.stringify(newConfig));
      return new Response(JSON.stringify({ success: true }));
    }

    return new Response(await mainPortalHtml(await getData()), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
};

const baseStyle = `
  :root { --main: #4a7c6d; --sub: #f0f7f4; --white: #ffffff; --text: #2c3e50; --border: #e0e0e0; --red: #e74c3c; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; }
  body { background: #fdfdfd; color: var(--text); padding-bottom: 50px; }
  .container { max-width: 480px; margin: 0 auto; padding: 15px; }
  h1 { color: var(--main); text-align: center; margin: 25px 0; font-size: 1.4rem; letter-spacing: 0.1em; }
  .card { background: var(--white); border-radius: 12px; padding: 15px; margin-bottom: 15px; border: 1px solid var(--border); box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
  h3 { font-size: 0.85rem; color: var(--main); margin-bottom: 10px; border-bottom: 1px solid var(--sub); }
  .btn { display: block; width: 100%; padding: 12px; background: var(--main); color: var(--white); text-align: center; text-decoration: none; border-radius: 8px; margin: 5px 0; font-weight: bold; border: none; font-size: 0.9rem; cursor: pointer; }
  .btn-outline { background: transparent; border: 1px solid var(--main); color: var(--main); }
  .btn-sm { width: auto; padding: 5px 8px; font-size: 0.7rem; display: inline-block; }
  .btn-red { background: var(--red); color: white; }
  input, textarea { width: 100%; padding: 10px; margin: 5px 0; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem; }
  .item-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; background: #fafafa; padding: 8px; border-radius: 6px; }
  .stamp-user { border-bottom: 1px solid var(--sub); padding: 12px 0; }
  .stamp-user:last-child { border-bottom: none; }
  .stamp-count-val { color: var(--main); font-weight: bold; font-size: 1.1rem; }
  .flex-between { display: flex; justify-content: space-between; align-items: center; }
  .ctrl-btns { display: flex; gap: 4px; }
`;

async function mainPortalHtml(data) {
  const sections = {
    message: `<div class="card"><h3>Message</h3><p style="white-space:pre-wrap;">${data.message}</p></div>`,
    event: `<div class="card"><h3>Event Info</h3><p style="white-space:pre-wrap;">${data.eventInfo}</p></div>`,
    links: `<div class="card"><h3>Links</h3>${data.links.map(l => `<a href="${l.url}" target="_blank" class="btn">${l.label}</a>`).join('')}</div>`,
    stamps: `<div class="card"><h3>Stamp Card</h3>${data.stamps.map(s => `
      <div class="stamp-user flex-between">
        <span style="font-weight:500;">${s.name}</span>
        <span>スタンプ数：<span class="stamp-count-val">${s.count}</span></span>
      </div>`).join('')}</div>`
  };
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseStyle}</style><title>NANASE BASE</title></head>
    <body><div class="container"><h1>NANASE BASE</h1>
    ${data.order.map(key => data.displaySettings[key] ? sections[key] : '').join('')}
    </div></body></html>`;
}

function adminLoginHtml() {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseStyle}</style></head>
    <body><div class="container"><h1>Admin Login</h1><div class="card"><input type="password" id="pass" placeholder="パスワード"><button class="btn" onclick="login()">ログイン</button></div></div>
    <script>async function login(){ const res = await fetch('/api/login',{method:'POST',body:JSON.stringify({pass:document.getElementById('pass').value})}); if(res.ok) location.reload(); else alert('Error'); }</script></body></html>`;
}

async function adminDashboardHtml(data) {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseStyle}</style></head>
    <body><div class="container"><h1>Admin Dashboard</h1>
    <div class="card">
      <h3>基本設定</h3>
      <label style="font-size:0.7rem;">管理パスワード</label><input type="text" id="password" value="${data.password}">
      <label style="font-size:0.7rem;">メッセージ</label><textarea id="message" rows="2">${data.message}</textarea>
      <label style="font-size:0.7rem;">イベント情報</label><textarea id="eventInfo" rows="2">${data.eventInfo}</textarea>
    </div>

    <div class="card">
      <h3>表示・順序設定</h3>
      <div id="sort-area">${data.order.map(key => `
        <div class="item-row" data-id="${key}">
          <input type="checkbox" id="check-${key}" ${data.displaySettings[key] ? 'checked' : ''} style="width:auto;">
          <span style="flex-grow:1; font-weight:bold; font-size:0.8rem;">${key.toUpperCase()}</span>
          <button class="btn btn-sm btn-outline" onclick="moveUp(this.parentElement)">↑</button>
          <button class="btn btn-sm btn-outline" onclick="moveDown(this.parentElement)">↓</button>
        </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <h3>リンクボタン管理</h3>
      <div id="link-list">${data.links.map(l => `
        <div class="item-row">
          <input value="${l.label}" class="l-label" style="width:35%" placeholder="名前">
          <input value="${l.url}" class="l-url" style="width:35%" placeholder="URL">
          <div class="ctrl-btns">
            <button class="btn btn-sm btn-outline" onclick="moveUp(this.parentElement.parentElement)">↑</button>
            <button class="btn btn-sm btn-outline" onclick="moveDown(this.parentElement.parentElement)">↓</button>
            <button class="btn btn-sm btn-red" onclick="this.parentElement.parentElement.remove()">×</button>
          </div>
        </div>`).join('')}</div>
      <button class="btn btn-outline" onclick="addLink()">+ リンク追加</button>
    </div>

    <div class="card">
      <h3>スタンプ管理</h3>
      <div id="stamp-list">${data.stamps.map(s => `
        <div class="item-row">
          <input value="${s.name}" class="s-name" style="width:30%" placeholder="名前">
          <div style="flex-grow:1; display:flex; align-items:center; gap:3px;">
            <button class="btn btn-sm btn-outline" onclick="this.nextElementSibling.value--">-</button>
            <input type="number" value="${s.count}" class="s-count" style="width:35px; text-align:center; padding:5px 0;">
            <button class="btn btn-sm btn-outline" onclick="this.previousElementSibling.value++">+</button>
          </div>
          <div class="ctrl-btns">
            <button class="btn btn-sm btn-outline" onclick="moveUp(this.parentElement.parentElement)">↑</button>
            <button class="btn btn-sm btn-outline" onclick="moveDown(this.parentElement.parentElement)">↓</button>
            <button class="btn btn-sm btn-red" onclick="this.parentElement.parentElement.remove()">×</button>
          </div>
        </div>`).join('')}</div>
      <button class="btn btn-outline" onclick="addStamp()">+ リスナー追加</button>
      <button class="btn btn-sm btn-red" onclick="resetStamps()" style="width:100%; margin-top:10px;">全スタンプを0にリセット</button>
    </div>

    <button class="btn" onclick="save()">設定を保存して反映</button>
    <a href="/" class="btn btn-outline">公開ページを確認</a>
  </div>
  <script>
    function moveUp(el){ if(el.previousElementSibling) el.parentNode.insertBefore(el, el.previousElementSibling); }
    function moveDown(el){ if(el.nextElementSibling) el.parentNode.insertBefore(el.nextElementSibling, el); }
    function addLink(){
      const d = document.createElement('div'); d.className='item-row';
      d.innerHTML = '<input class="l-label" style="width:35%"><input class="l-url" style="width:35%"><div class="ctrl-btns"><button class="btn btn-sm btn-outline" onclick="moveUp(this.parentElement.parentElement)">↑</button><button class="btn btn-sm btn-outline" onclick="moveDown(this.parentElement.parentElement)">↓</button><button class="btn btn-sm btn-red" onclick="this.parentElement.parentElement.remove()">×</button></div>';
      document.getElementById('link-list').appendChild(d);
    }
    function addStamp(){
      const d = document.createElement('div'); d.className='item-row';
      d.innerHTML = '<input class="s-name" style="width:30%"><div style="flex-grow:1;display:flex;align-items:center;gap:3px;"><button class="btn btn-sm btn-outline" onclick="this.nextElementSibling.value--">-</button><input type="number" value="0" class="s-count" style="width:35px;text-align:center;"><button class="btn btn-sm btn-outline" onclick="this.previousElementSibling.value++">+</button></div><div class="ctrl-btns"><button class="btn btn-sm btn-outline" onclick="moveUp(this.parentElement.parentElement)">↑</button><button class="btn btn-sm btn-outline" onclick="moveDown(this.parentElement.parentElement)">↓</button><button class="btn btn-sm btn-red" onclick="this.parentElement.parentElement.remove()">×</button></div>';
      document.getElementById('stamp-list').appendChild(d);
    }
    function resetStamps(){ if(confirm('本当に全員のスタンプを0にしますか？')){ document.querySelectorAll('.s-count').forEach(i => i.value=0); } }
    async function save(){
      const order = [...document.querySelectorAll('#sort-area .item-row')].map(el => el.dataset.id);
      const displaySettings = {}; order.forEach(id => { displaySettings[id] = document.getElementById('check-'+id).checked; });
      const links = [...document.querySelectorAll('#link-list .item-row')].map(el => ({ label: el.querySelector('.l-label').value, url: el.querySelector('.l-url').value })).filter(l => l.label);
      const stamps = [...document.querySelectorAll('#stamp-list .item-row')].map(el => ({ name: el.querySelector('.s-name').value, count: parseInt(el.querySelector('.s-count').value) })).filter(s => s.name);
      
      const res = await fetch('/api/update',{method:'POST',body:JSON.stringify({password:document.getElementById('password').value,message:document.getElementById('message').value,eventInfo:document.getElementById('eventInfo').value,links,stamps,displaySettings,order})});
      if(res.ok) alert('保存されました！');
    }
  </script></body></html>`;
}
