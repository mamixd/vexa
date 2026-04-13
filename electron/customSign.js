'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Custom signing function for electron-builder
 * This script bypasses electron-builder's internal signing tools
 * and uses the system's native signtool.exe directly.
 */
exports.default = async function(configuration) {
    const filePath = configuration.path;
    const signtoolPath = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.28000.0\\x64\\signtool.exe';
    
    // Use absolute path for certificate
    const certPath = path.resolve(__dirname, '..', 'Sertifika.pfx');
    const certPassword = '1234';

    if (!fs.existsSync(signtoolPath)) {
        console.error(`[CustomSign] ERROR: signtool.exe NOT FOUND at ${signtoolPath}`);
        return; // Fail gracefully or electron-builder might hang
    }

    console.log(`[CustomSign] Signing file: ${filePath}`);

    // Timestamp servers
    const timestampServers = [
        'http://timestamp.digicert.com',
        'http://timestamp.sectigo.com',
        'http://timestamp.comodoca.com',
        'http://timestamp.globalsign.com/tsa/r6ca'
    ];

    let signed = false;
    for (const server of timestampServers) {
        try {
            console.log(`[CustomSign] Attempting to sign with: ${server}`);
            // Use /pa for Default Authenticode Verification Policy
            // Use /v for verbose
            const signCommand = `"${signtoolPath}" sign /f "${certPath}" /p "${certPassword}" /fd SHA256 /tr "${server}" /td SHA256 "${filePath}"`;
            execSync(signCommand, { stdio: 'inherit' });
            signed = true;
            console.log(`[CustomSign] Successfully signed: ${path.basename(filePath)}`);
            break; 
        } catch (e) {
            console.warn(`[CustomSign] Warning: Failed with ${server}. trying next...`);
        }
    }

    if (!signed) {
        console.error(`[CustomSign] ERROR: All timestamp servers failed for ${filePath}`);
        // We don't throw here to avoid stopping the whole build, 
        // but we log a clear error.
    }
};
