const { execSync } = require('child_process');
const path = require('path');

async function testSign() {
    const rootDir = 'C:\\Vexa';
    const filePath = path.join(rootDir, 'dist', 'vexa-launcher-setup-1.0.0.exe');
    const signtoolPath = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.28000.0\\x64\\signtool.exe';
    const certPath = path.join(rootDir, 'Sertifika.pfx');
    const certPassword = '1234';

    console.log(`[TestSign] Signing file: ${filePath}`);

    const server = 'http://timestamp.digicert.com';
    try {
        const signCommand = `"${signtoolPath}" sign /f "${certPath}" /p "${certPassword}" /fd SHA256 /tr "${server}" /td SHA256 "${filePath}"`;
        console.log(`Running: ${signCommand}`);
        execSync(signCommand, { stdio: 'inherit' });
        console.log(`[TestSign] Success!`);
    } catch (e) {
        console.error(`[TestSign] Failed: ${e.message}`);
    }
}

testSign();
