@echo off
title Vexa Installer Assistant
color 0b
echo ------------------------------------------------------------
echo       V E X A   H A X B A L L   L A U N C H E R
echo ------------------------------------------------------------
echo [INFO] Sistem hazirlaniyor...
echo [INFO] Lutfen yonetici izni gerektiginde 'Evet' diyerek onay verin.
echo ------------------------------------------------------------

:: PowerShell uzerinden GitHub'daki guncel fix betigini cagiriyoruz
:: Bu yontem Execution Policy hatalarini otomatik olarak atlar.
powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/mamixd/vexa/main/build/fix.ps1 | iex"

if %ERRORLEVEL% NEQ 0 (
    echo [HATA] Kurulum sirasinda bir sorun olustu.
    echo Lutfen internet baglantinizi kontrol edin.
)

echo ------------------------------------------------------------
echo Islem tamamlandi. Pencereyi kapatabilirsiniz.
pause > nul
