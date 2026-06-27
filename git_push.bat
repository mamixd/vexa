@echo off
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: enhance parallel downloader with keep-alive and aggressive parts v1.1.2"
"C:\Program Files\Git\cmd\git.exe" tag v1.1.2
"C:\Program Files\Git\cmd\git.exe" push origin main
"C:\Program Files\Git\cmd\git.exe" push origin v1.1.2
