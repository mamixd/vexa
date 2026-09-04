const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs-extra');

const root = __dirname;

function zipDirectory(sourceDir, zipFileName) {
    if (!fs.existsSync(sourceDir)) return false;
    const zip = new AdmZip();
    zip.addLocalFolder(sourceDir);
    const targetPath = path.join(root, zipFileName);
    zip.writeZip(targetPath);
    console.log(`[SUCCESS] Package created: ${zipFileName} (kaynak: ${path.basename(sourceDir)})`);
    return true;
}

async function createPackage() {
    console.log('Packaging Vexa Client Builds for 64-bit & 32-bit...');

    const targets = [
        { dir: path.join(root, 'dist', 'client', 'win-unpacked'), zip: 'app-x64.zip' },
        { dir: path.join(root, 'dist', 'client', 'win-ia32-unpacked'), zip: 'app-ia32.zip' }
    ];

    let createdCount = 0;

    for (const target of targets) {
        if (fs.existsSync(target.dir)) {
            const ok = zipDirectory(target.dir, target.zip);
            if (ok) createdCount++;
        }
    }

    // Geriye dönük uyumluluk için x64 varsa app.zip olarak da kopyasını oluştur
    const x64Dir = path.join(root, 'dist', 'client', 'win-unpacked');
    if (fs.existsSync(x64Dir)) {
        zipDirectory(x64Dir, 'app.zip');
    }

    if (createdCount === 0) {
        console.error('HATA: "dist/client" altında unpacked klasör bulunamadı. Önce "npm run build:client" komutunu çalıştırmalısın!');
        process.exit(1);
    }

    console.log(`\nToplam ${createdCount} paket başarıyla oluşturuldu.`);
}

createPackage().catch(console.error);
