const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs-extra');

const root = __dirname;
const zip = new AdmZip();

const filesToInclude = [
    'dist/client/win-unpacked'
];

async function createPackage() {
    console.log('Packaging Vexa Client Build for GitHub...');
    
    const buildPath = path.join(root, 'dist', 'client', 'win-unpacked');
    
    if (!fs.existsSync(buildPath)) {
        console.error('HATA: Önce "npm run build:client" komutunu çalıştırmalısın!');
        process.exit(1);
    }

    zip.addLocalFolder(buildPath);

    const zipName = 'VexaClient-v1.0.0.zip';
    zip.writeZip(path.join(root, zipName));
    console.log(`\nSUCCESS! Package created: ${zipName}`);
    console.log('Bu ZIP dosyasını GitHub Release kısmına yükleyebilirsin.');
}

createPackage().catch(console.error);
