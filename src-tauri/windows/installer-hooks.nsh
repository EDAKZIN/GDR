; Hooks NSIS para el instalador de GDR.
; Nota: el texto del MessageBox es UI localizable (los idiomas del
; instalador se configuran en bundle > windows > nsis > languages).

LangString keepDataQuestion ${LANG_SPANISH} "¿Deseas conservar tus datos? Se mantendrán para una futura reinstalación."
LangString keepDataQuestion ${LANG_ENGLISH} "Do you want to keep your data? It will be kept for a future reinstall."

!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
  ; Pregunta si el usuario desea conservar sus datos (%APPDATA%\com.edakzin.gdr).
  ; LangString: NSIS resuelve el idioma con su propio mecanismo, igual que el resto de la UI.
  MessageBox MB_YESNO|MB_ICONQUESTION "$(keepDataQuestion)" IDYES skip_data_cleanup

  ; El usuario eligió "No": eliminar la carpeta completa de datos.
  RMDir /r "$APPDATA\com.edakzin.gdr"

  skip_data_cleanup:
  ${EndIf}
!macroend
