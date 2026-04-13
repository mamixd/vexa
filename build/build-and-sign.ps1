param(
    [string]$pfxPath = "Sertifika.pfx",
    [string]$pfxKey = "1234",
    [string]$timestampUrl = "http://timestamp.digicert.com",
    [string]$arch = "x64"
)

# Build with electron-builder
Write-Host "[build-and-sign] Running electron-builder..."
npm run build --silent

# Find output installer
$distDir = Join-Path -Path (Get-Location) -ChildPath "dist"
$installer = Get-ChildItem -Path $distDir -Filter "*setup*.exe" -Recurse | Where-Object { $_.Extension -eq ".exe" } | Select-Object -First 1

if (-not $installer) {
    Write-Error "İnstall dosyası (exe) 'dist' klasöründe bulunamadı!"
    exit 1
}

if (-not (Test-Path $pfxPath)) {
    Write-Warning "Sertifika dosyası ($pfxPath) bulunamadı. İmzalama atlanıyor."
    exit 0
}

# Locate signtool (x64 mimarisini zorunlu kıldım)
$signtool = Get-ChildItem -Path "C:\Program Files (x86)\Windows Kits\10\bin\*\x64" -Filter "signtool.exe" -Recurse | Select-Object -ExpandProperty FullName -First 1

if (-not $signtool) {
    # Alternatif bir arama yap (Eğer x64 klasörü garip bir yerdeyse)
    $signtool = Get-ChildItem -Path "C:\Program Files (x86)\Windows Kits\10\bin\*" -Filter "signtool.exe" -Recurse | Where-Object { $_.FullName -like "*\x64\*" } | Select-Object -ExpandProperty FullName -First 1
}

if (-not $signtool) {
    Write-Error "signtool.exe (x64) bulunamadı. Lütfen Windows 10/11 SDK kurulu olduğundan emin olun."
    exit 1
}

Write-Host "[build-and-sign] Signtool bulundu: $signtool"

# Sign the installer
Write-Host "[build-and-sign] Signing with PFX: $pfxPath"
& $signtool sign /fd SHA256 /f $pfxPath /p $pfxKey /tr $timestampUrl /td SHA256 $installer.FullName
if ($LASTEXITCODE -ne 0) {
    Write-Error "signtool failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "[build-and-sign] Signing complete"

# Optionally sign the inner exe files (app.exe)
$innerExes = Get-ChildItem -Path $distDir -Filter "*.exe" -Recurse | Where-Object { $_.FullName -ne $installer.FullName }
foreach ($exe in $innerExes) {
    Write-Host "[build-and-sign] Signing inner exe: $($exe.FullName)"
    & $signtool sign /fd SHA256 /f $pfxPath /p $pfxKey /tr $timestampUrl /td SHA256 $exe.FullName
}

Write-Host "[build-and-sign] All done"
