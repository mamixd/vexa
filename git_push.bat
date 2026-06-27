@echo off
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "fix(updater): run installer from temp directory to prevent file locking v1.1.3"
"C:\Program Files\Git\cmd\git.exe" tag v1.1.3
"C:\Program Files\Git\cmd\git.exe" push origin main
"C:\Program Files\Git\cmd\git.exe" push origin v1.1.3
