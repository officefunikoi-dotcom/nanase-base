export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- データ管理 (env.DATA_BOXを使用) ---
    const getData = async () => {
      const data = await env.DATA_BOX.get("CONFIG", { type: "json" });
      return data || {
        password: "607",
        message: "NANASE BASEへようこそ",
        eventInfo: "イベント準備中",
        links: [{ id: 1, label: "Twitter", url: "#" }],
        displaySettings: { message: true, event: true, links: true, stamps: true },
        order: ["message", "event", "links", "stamps"]
      };
    };

    // --- 認証チェック ---
    const cookie = request.headers.get("Cookie") || "";
    const isAuth = cookie.includes("auth=true");

    // --- ルーティング ---
    if (path === "/admin") {
      if (!isAuth) return new Response(adminLoginHtml(), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
      return new Response(await adminDashboardHtml(await getData()), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    if (path === "/api/login" && request.method === "POST") {
      const { pass } = await request.json();
      const config = await getData();
      if (pass === config.password) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { 
            "Set-Cookie": "auth=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600", 
            "Content-Type": "application/json" 
          }
        });
      }
      return new Response(JSON.stringify({ success: false }), { status: 401 });
    }

    if (path === "/api/update" && request.method === "POST" && isAuth) {
      const newConfig = await request.json();
      await env.DATA_BOX.put("CONFIG", JSON.stringify(newConfig));
      return new Response(JSON.stringify({ success: true }));
    }

    // --- メイン画面 ---
    return new Response(await mainPortalHtml(await getData()), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
};

// --- デザイン（CSS） ---
const baseStyle = `
  :root { --bg: #fdfdfd; --main: #4a7c6d; --sub: #f0f7f4; --white: #ffffff; --text: #2c3e50; --border: #e0e0e0; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; }
  body { background: var(--bg); color: var(--text); padding-bottom: 50px; -webkit-tap-highlight-color: transparent; }
  .container { max-width: 480px; margin: 0 auto; padding: 20px; }
  h1 { color: var(--main); text-align: center; margin: 30px 0; font-size: 1.5rem; letter-spacing: 0.1em; }
  .card { background: var(--white); border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid var(--border); box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
  h3 { font-size: 0.9rem; color: var(--main); margin-bottom: 10px; border-bottom: 1px solid var(--sub); padding-bottom: 5px; }
  .btn { display: block; width: 100%; padding: 14px; background: var(--main); color: var(--white); text-align: center; text-decoration: none; border-radius: 10px; margin-bottom: 12px; font-weight: bold; border: none; font-size: 0.95rem; }
  .btn-outline { background: transparent; border: 1.5px solid var(--main); color: var(--main); }
  input, textarea { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid var(--border); border-radius: 8px; font-size: 1rem; }
  .stamp-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 10px; }
  .stamp { aspect-ratio: 1; background: var(--sub); border-radius: 8px; border: 1px dashed var(--main); }
  .item-row { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; background: #fafafa; padding: 10px; border-radius: 8px; }
`;

async function mainPortalHtml(data) {
  const sections = {
    message: `<div class="card"><h3>Message</h3><p style="white-space:pre-wrap;">${data.message}</p></div>`,
    event: `<div class="card"><h3>Event Info</h3><p style="white-space:pre-wrap;">${data.eventInfo}</p></div>`,
    links: `<div class="card"><h3>Links</h3>${data.links.map(l => `<a href="${l.url}" target="_blank" class="btn">${l.label}</a>`).join('')}</div>`,
    stamps: `<div class="card"><h3>Stamp Card</h3><div class="stamp-grid">${Array(10).fill('<div class="stamp"></div>').join('')}</div></div>`
  };
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseStyle}</style><title>NANASE BASE</title></head>
    <body><div class="container"><h1>NANASE BASE</h1>
    ${data.order.map(key => data.displaySettings[key] ? sections[key] : '').join('')}
    <div style="text-align:center; margin-top:40px;"><a href="/admin" style="color:#ddd; text-decoration:none; font-size:10px;">Admin Portal</a></div>
    </div></body></html>`;
}

function adminLoginHtml() {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseStyle}</style></head>
    <body><div class="container"><h1>Admin Login</h1><div class="card">
    <input type="password" id="pass" placeholder="パスワードを入力">
    <button class="btn" onclick="login()">ログイン</button>
    </div></div><script>
    async function login(){
      const res = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pass:document.getElementById('pass').value})});
      if(res.ok) location.href='/admin'; else alert('パスワードが違います');
    }</script></body></html>`;
}

async function adminDashboardHtml(data) {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseStyle}</style></head>
    <body><div class="container"><h1>Admin Dashboard</h1>
    <div class="card">
      <h3>基本設定</h3>
      <label>管理パスワード</label><input type="text" id="password" value="${data.password}">
      <label>メッセージ</label><textarea id="message" rows="3">${data.message}</textarea>
      <label>イベント情報</label><textarea id="eventInfo" rows="3">${data.eventInfo}</textarea>
    </div>
    <div class="card">
      <h3>表示・順序設定 (上から順)</h3>
      <div id="sort-area">
        ${data.order.map(key => `
          <div class="item-row" data-id="${key}">
            <input type="checkbox" id="check-${key}" ${data.displaySettings[key] ? 'checked' : ''}>
            <span style="flex-grow:1; font-weight:bold;">${key.toUpperCase()}</span>
            <button onclick="moveUp(this.parentElement)">↑</button>
            <button onclick="moveDown(this.parentElement)">↓</button>
          </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <h3>リンクボタン管理</h3>
      <div id="link-list">${data.links.map(l => `<div class="item-row"><input value="${l.label}" class="l-label" placeholder="名前"><input value="${l.url}" class="l-url" placeholder="URL"></div>`).join('')}</div>
      <button class="btn btn-outline" onclick="addLink()">+ リンク追加</button>
    </div>
    <button class="btn" onclick="save()">設定を保存して反映</button>
    <a href="/" class="btn btn-outline">サイトを確認する</a>
    </div>
    <script>
      function moveUp(el){ if(el.previousElementSibling) el.parentNode.insertBefore(el, el.previousElementSibling); }
      function moveDown(el){ if(el.nextElementSibling) el.parentNode.insertBefore(el.nextElementSibling, el); }
      function addLink(){
        const d = document.createElement('div'); d.className='item-row';
        d.innerHTML = '<input class="l-label" placeholder="名前"><input class="l-url" placeholder="URL">';
        document.getElementById('link-list').appendChild(d);
      }
      async function save(){
        const order = [...document.querySelectorAll('#sort-area .item-row')].map(el => el.dataset.id);
        const displaySettings = {};
        order.forEach(id => { displaySettings[id] = document.getElementById('check-'+id).checked; });
        const links = [...document.querySelectorAll('#link-list .item-row')].map(el => ({
          label: el.querySelector('.l-label').value,
          url: el.querySelector('.l-url').value
        })).filter(l => l.label);
        const payload = {
          password: document.getElementById('password').value,
          message: document.getElementById('message').value,
          eventInfo: document.getElementById('eventInfo').value,
          links, displaySettings, order
        };
        const res = await fetch('/api/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        if(res.ok) alert('保存されました！');
      }
    </script></body></html>`;
}
