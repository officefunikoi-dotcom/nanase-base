export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- Data Management ---
    const getData = async () => {
      const data = await env.DATA_BOX.get("CONFIG", { type: "json" });
      return data || {
        password: "607",
        message: "Welcome to NANASE BASE",
        eventInfo: "Next Event: Coming Soon",
        links: [{ id: 1, label: "Twitter", url: "#" }],
        displaySettings: { message: true, event: true, links: true, stamps: true },
        order: ["message", "event", "links", "stamps"]
      };
    };

    // --- Auth Check ---
    const cookie = request.headers.get("Cookie") || "";
    const isAuth = cookie.includes("auth=true");

    // --- Routing ---
    if (path === "/admin") {
      if (!isAuth) return new Response(adminLoginHtml(), { headers: { "Content-Type": "text/html" } });
      return new Response(await adminDashboardHtml(await getData()), { headers: { "Content-Type": "text/html" } });
    }

    if (path === "/api/login" && request.method === "POST") {
      const { pass } = await request.json();
      const config = await getData();
      if (pass === config.password) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Set-Cookie": "auth=true; Path=/; HttpOnly; SameSite=Strict", "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ success: false }), { status: 401 });
    }

    if (path === "/api/update" && request.method === "POST" && isAuth) {
      const newConfig = await request.json();
      await env.DATA_BOX.put("CONFIG", JSON.stringify(newConfig));
      return new Response(JSON.stringify({ success: true }));
    }

    // --- Main Portal (Default) ---
    return new Response(await mainPortalHtml(await getData()), { headers: { "Content-Type": "text/html" } });
  }
};

// --- HTML Templates ---
const baseStyle = `
  :root { --bg: #f8faf9; --main: #2d5a4c; --sub: #e8f5e9; --white: #ffffff; --text: #333; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; }
  body { background: var(--bg); color: var(--text); line-height: 1.6; padding-bottom: 40px; }
  .container { max-width: 500px; margin: 0 auto; padding: 20px; }
  h1 { color: var(--main); text-align: center; margin: 20px 0; letter-spacing: 2px; font-weight: 300; }
  .card { background: var(--white); border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 4px solid var(--main); }
  .btn { display: block; width: 100%; padding: 12px; background: var(--main); color: var(--white); text-align: center; text-decoration: none; border-radius: 8px; margin-bottom: 10px; transition: opacity 0.2s; border: none; cursor: pointer; }
  .btn-outline { background: var(--white); border: 1px solid var(--main); color: var(--main); }
  input, textarea { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
  .stamp-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .stamp { aspect-ratio: 1; background: var(--sub); border-radius: 4px; border: 1px dashed var(--main); }
`;

async function mainPortalHtml(data) {
  const sections = {
    message: `<div class="card"><h3>Message</h3><p>${data.message}</p></div>`,
    event: `<div class="card"><h3>Event</h3><p>${data.eventInfo}</p></div>`,
    links: `<div class="card"><h3>Links</h3>${data.links.map(l => `<a href="${l.url}" class="btn">${l.label}</a>`).join('')}</div>`,
    stamps: `<div class="card"><h3>Stamp Card</h3><div class="stamp-grid">${Array(10).fill('<div class="stamp"></div>').join('')}</div></div>`
  };

  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${baseStyle}</style></head>
    <body><div class="container"><h1>NANASE BASE</h1>
    ${data.order.map(key => data.displaySettings[key] ? sections[key] : '').join('')}
    <div style="text-align:center; margin-top:40px;"><a href="/admin" style="color:#ccc; font-size:12px; text-decoration:none;">Admin</a></div>
    </div></body></html>`;
}

function adminLoginHtml() {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${baseStyle}</style></head>
    <body><div class="container"><h1>ADMIN LOGIN</h1><div class="card">
    <input type="password" id="pass" placeholder="Password">
    <button class="btn" onclick="login()">Login</button>
    </div></div><script>
    async function login(){
      const res = await fetch('/api/login',{method:'POST', body:JSON.stringify({pass:document.getElementById('pass').value})});
      if(res.ok) location.reload(); else alert('Failed');
    }</script></body></html>`;
}

async function adminDashboardHtml(data) {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${baseStyle}
    .item-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .handle { cursor: move; color: var(--main); font-weight: bold; }
  </style></head><body><div class="container"><h1>ADMIN</h1>
    <div class="card">
      <h3>Global Settings</h3>
      <input type="text" id="password" value="${data.password}" placeholder="Admin Password">
      <textarea id="message" rows="3">${data.message}</textarea>
      <textarea id="eventInfo" rows="3">${data.eventInfo}</textarea>
    </div>
    <div class="card">
      <h3>Visibility & Order</h3>
      <div id="sortable-list">
        ${data.order.map(key => `
          <div class="item-row" data-id="${key}">
            <span class="handle">⠿</span>
            <input type="checkbox" id="check-${key}" ${data.displaySettings[key] ? 'checked' : ''}>
            <span>${key.toUpperCase()}</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <h3>Links</h3>
      <div id="link-list">${data.links.map((l, i) => `<div class="item-row"><input value="${l.label}" class="link-label"><input value="${l.url}" class="link-url"></div>`).join('')}</div>
      <button class="btn btn-outline" onclick="addLink()">+ Add Link</button>
    </div>
    <button class="btn" onclick="save()">SAVE ALL</button>
    <button class="btn btn-outline" onclick="location.href='/'">BACK</button>
  </div>
  <script>
    function addLink() {
      const div = document.createElement('div'); div.className='item-row';
      div.innerHTML = '<input placeholder="Label" class="link-label"><input placeholder="URL" class="link-url">';
      document.getElementById('link-list').appendChild(div);
    }
    async function save() {
      const order = [...document.querySelectorAll('#sortable-list .item-row')].map(el => el.dataset.id);
      const displaySettings = {};
      order.forEach(id => { displaySettings[id] = document.getElementById('check-'+id).checked; });
      const links = [...document.querySelectorAll('#link-list .item-row')].map(el => ({
        label: el.querySelector('.link-label').value,
        url: el.querySelector('.link-url').value
      })).filter(l => l.label);
      
      const payload = {
        password: document.getElementById('password').value,
        message: document.getElementById('message').value,
        eventInfo: document.getElementById('eventInfo').value,
        links, displaySettings, order
      };
      await fetch('/api/update', { method:'POST', body: JSON.stringify(payload) });
      alert('Saved!');
    }
  </script></body></html>`;
}
