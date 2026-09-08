; Hooks NSIS para el instalador de GDR.
; Nota: los textos (keepDataQuestion) se definen en installer.nsi
; después de MUI_LANGUAGE, si van antes NSIS los asigna mal y quedan vacíos.

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
