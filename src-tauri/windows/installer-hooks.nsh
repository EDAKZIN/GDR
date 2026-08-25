; Hooks NSIS para el instalador de GDR.
; Nota: el texto del MessageBox es UI localizable (los idiomas del
; instalador se configuran en bundle > windows > nsis > languages).

!macro NSIS_HOOK_POSTUNINSTALL
  ; Pregunta si el usuario desea conservar sus datos (%APPDATA%\com.edakzin.gdr).
  MessageBox MB_YESNO|MB_ICONQUESTION "¿Deseas conservar tus datos? Se mantendrán para una futura reinstalación." IDYES skip_data_cleanup

  ; El usuario eligió "No": eliminar la carpeta completa de datos.
  RMDir /r "$APPDATA\com.edakzin.gdr"

  skip_data_cleanup:
!macroend
