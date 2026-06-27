@echo off
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: retry mechanism for API and updater fixes v1.1.1"
"C:\Program Files\Git\cmd\git.exe" tag v1.1.1
"C:\Program Files\Git\cmd\git.exe" push origin main
"C:\Program Files\Git\cmd\git.exe" push origin v1.1.1
