!macro preInit
  DetailPrint "Closing running Vexa processes..."
  nsExec::ExecToLog 'taskkill /F /IM "Vexa Launcher.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "vexa-launcher.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "vexa-client.exe" /T'
  Sleep 1200
!macroend
