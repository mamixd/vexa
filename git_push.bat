@echo off
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "feat(updater): separate launcher and client versions via versions.json and fix cmd window closing v1.1.4"
"C:\Program Files\Git\cmd\git.exe" tag v1.1.4
"C:\Program Files\Git\cmd\git.exe" push origin main
"C:\Program Files\Git\cmd\git.exe" push origin v1.1.4
