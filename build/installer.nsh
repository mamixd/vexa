!macro preInit
  DetailPrint "Closing running Vexa processes..."
  nsExec::ExecToLog 'taskkill /F /IM "Vexa Client.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "vexa-client.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "Vexa Launcher.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "vexa-launcher.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "Vexa.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "vexa.exe" /T'
  Sleep 1500
!macroend
