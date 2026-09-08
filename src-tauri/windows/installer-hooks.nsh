; Hooks NSIS para el instalador de GDR.
; Nota: el texto del MessageBox es UI localizable (los idiomas del
; instalador se configuran en bundle > windows > nsis > languages).

!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
  ; Pregunta si el usuario desea conservar sus datos (%APPDATA%\com.edakzin.gdr),
  ; en el idioma activo del desinstalador.
  ${If} $LANGUAGE == ${LANG_SPANISH}
    MessageBox MB_YESNO|MB_ICONQUESTION "¿Deseas conservar tus datos? Se mantendrán para una futura reinstalación." IDYES skip_data_cleanup
  ${Else}
    MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to keep your data? It will be kept for a future reinstall." IDYES skip_data_cleanup
  ${EndIf}

  ; El usuario eligió "No": eliminar la carpeta completa de datos.
  RMDir /r "$APPDATA\com.edakzin.gdr"

  skip_data_cleanup:
  ${EndIf}
!macroend
