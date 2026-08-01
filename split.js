const fs = require('fs');

const html = fs.readFileSync('c:/Vexa/vexalauncher.html', 'utf8');

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
const css = styleMatch ? styleMatch[1] : '';

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const js = scriptMatch ? scriptMatch[1] : '';

// Extract body but remove the script tag
const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
let body = bodyMatch ? bodyMatch[1] : '';
body = body.replace(/<script>[\s\S]*?<\/script>/, '');

const newHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>VEXA LAUNCHER</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body>
<!-- Window Controls -->
<div class="titlebar">
  <div class="titlebar-drag"></div>
  <div class="window-controls">
    <div class="win-btn minimize" id="win-minimize"><svg viewBox="0 0 12 12"><rect width="10" height="1" x="1" y="6" fill="currentColor"/></svg></div>
    <div class="win-btn close" id="win-close"><svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3L3 9" stroke="currentColor" stroke-width="1.5"/></svg></div>
  </div>
</div>
${body}

<!-- Chat Modal -->
<div class="chat-modal" id="chatModal">
  <div class="chat-header">
    <div class="chat-title" id="chatTitle">Chat</div>
    <div class="chat-close" id="chatClose">
      <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" fill="none" stroke-width="2"/></svg>
    </div>
  </div>
  <div class="chat-messages" id="chatMessages"></div>
  <div class="chat-input-area">
    <input type="text" id="chatInput" placeholder="Mesaj yaz...">
    <button id="chatSendBtn"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" stroke="currentColor" fill="none" stroke-width="2"/></svg></button>
  </div>
</div>

<script src="renderer.js"></script>
</body>
</html>`;

fs.writeFileSync('c:/Vexa/launcher/ui/index.html', newHtml);
fs.writeFileSync('c:/Vexa/launcher/ui/style.css', css);
fs.writeFileSync('c:/Vexa/launcher/ui/renderer.js', js);

console.log('Split complete!');
