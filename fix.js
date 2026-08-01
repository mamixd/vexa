const fs = require('fs');
const html = fs.readFileSync('vexalauncher.html', 'utf8');

const startStyle = html.indexOf('<style>');
const endStyle = html.indexOf('</style>') + 8;
const startScript = html.indexOf('<script>');
const endScript = html.indexOf('</script>') + 9;

// Replace style and script
let newHtml = html.substring(0, startStyle) + 
              '<link rel="stylesheet" href="style.css">\n' + 
              html.substring(endStyle, startScript) + 
              '<script src="renderer.js"></script>\n' + 
              html.substring(endScript);

// Inject window controls
const target = `<div class="topbar">
      <div class="topbar-left">`;

const replacement = `<div class="topbar">
      <div class="topbar-drag-area"></div>
      <div class="topbar-left">`;

newHtml = newHtml.replace(target, replacement);

const target2 = `<input type="text" id="searchInput" placeholder="Search friends...">
      </div>
    </div>`;

const replacement2 = `<input type="text" id="searchInput" placeholder="Search friends...">
      </div>
      <div class="window-controls">
        <button id="minBtn" class="win-btn">
          <svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>
        </button>
        <button id="closeBtn" class="win-btn close">
          <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>`;

newHtml = newHtml.replace(target2, replacement2);

fs.writeFileSync('launcher/ui/index.html', newHtml);
console.log('Fixed index.html, new length:', newHtml.length);
