@echo off
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "feat(ui): exact mockup match for launcher UI and patch notes v1.2.0"
"C:\Program Files\Git\cmd\git.exe" tag v1.2.0
"C:\Program Files\Git\cmd\git.exe" push origin main
"C:\Program Files\Git\cmd\git.exe" push origin v1.2.0
