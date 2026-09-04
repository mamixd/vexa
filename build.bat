@echo off
title Vexa Client Build Manager
chcp 65001 >nul
cls

echo ======================================================
echo            VEXA CLIENT BUILD YÖNETİCİSİ
echo ======================================================
echo.
echo  [1] Hem 64-bit hem 32-bit Setup Üret (x64 + ia32)
echo  [2] Sadece 64-bit Setup Üret (vexa-setup-x64.exe)
echo  [3] Sadece 32-bit Setup Üret (vexa-setup-ia32.exe)
echo  [4] Tam Paketleme (Setup + Client Dir + Zip)
echo  [5] Çıkış
echo.
echo ======================================================
set /p choice="Seçiminizi girin [1-5]: "

if "%choice%"=="1" goto build_all
if "%choice%"=="2" goto build_x64
if "%choice%"=="3" goto build_ia32
if "%choice%"=="4" goto build_full
if "%choice%"=="5" exit /b 0

:build_all
echo.
echo [BİLGİ] 64-bit ve 32-bit kurulum dosyaları derleniyor...
call npm run build
goto finish

:build_x64
echo.
echo [BİLGİ] Sadece 64-bit kurulum dosyası derleniyor...
call npm run build:x64
goto finish

:build_ia32
echo.
echo [BİLGİ] Sadece 32-bit kurulum dosyası derleniyor...
call npm run build:ia32
goto finish

:build_full
echo.
echo [BİLGİ] Tüm paketler derleniyor...
call npm run build:full
goto finish

:finish
echo.
echo ======================================================
echo  İşlem tamamlandı! Çıktılar "dist" klasöründedir.
echo ======================================================
pause
