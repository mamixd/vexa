!macro customInit
  ExecWait 'taskkill /F /IM "Vexa Client.exe"'
  ExecWait 'taskkill /F /IM "vexa-client.exe"'
  ExecWait 'taskkill /F /IM "Vexa Launcher.exe"'
  ExecWait 'taskkill /F /IM "vexa-launcher.exe"'
  ExecWait 'taskkill /F /IM "Vexa.exe"'
  ExecWait 'taskkill /F /IM "vexa.exe"'
!macroend
