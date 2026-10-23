!include "nsDialogs.nsh"
!include "FileFunc.nsh"
!include "MUI2.nsh"
!ifndef BUILD_UNINSTALLER
Var HmgModelDir
Var HmgModelInput
Var HmgDownloadCheck
Var HmgDownload

!macro customInit
  StrCpy $HmgModelDir "$LOCALAPPDATA\Hellrasher Music Generator\Models"
  StrCpy $HmgDownload "1"
!macroend

!macro customPageAfterChangeDir
  Page custom HmgModelsPage HmgModelsLeave
!macroend

Function HmgBrowseModels
  nsDialogs::SelectFolderDialog "Vyberte složku pro modely MiniMax-Music3" "$HmgModelDir"
  Pop $0
  ${If} $0 != error
    StrCpy $HmgModelDir $0
    ${NSD_SetText} $HmgModelInput $HmgModelDir
  ${EndIf}
FunctionEnd

Function HmgModelsPage
  !insertmacro MUI_HEADER_TEXT "Lokální AI modely" "MiniMax-Music3 · umístění modelových souborů"
  nsDialogs::Create 1018
  Pop $0
  ${NSD_CreateLabel} 0 0 100% 42u "Modelová sada Q8_0 potřebuje přibližně 12,8 GB na disku. Modely jsou oddělené od programu a mohou být uloženy na jiném disku. Pro lokální generování potřebujete NVIDIA GPU a aktuální ovladač. CUDA knihovny jsou součástí programu."
  Pop $0
  ${NSD_CreateDirRequest} 0 52u 78% 13u "$HmgModelDir"
  Pop $HmgModelInput
  ${NSD_CreateBrowseButton} 80% 51u 20% 15u "Procházet…"
  Pop $0
  ${NSD_OnClick} $0 HmgBrowseModels
  ${NSD_CreateCheckbox} 0 83u 100% 15u "Nabídnout automatické stažení při prvním spuštění"
  Pop $HmgDownloadCheck
  ${NSD_Check} $HmgDownloadCheck
  ${NSD_CreateLabel} 0 109u 100% 35u "Stažení začne až po přečtení licence MiniMax-Music3 v úvodním průvodci. Je možné je pozastavit a obnovit. Již stažené modely můžete použít bez připojení k internetu."
  Pop $0
  nsDialogs::Show
FunctionEnd

Function HmgModelsLeave
  ${NSD_GetText} $HmgModelInput $HmgModelDir
  ${NSD_GetState} $HmgDownloadCheck $HmgDownload
  ${If} $HmgModelDir == ""
    MessageBox MB_ICONEXCLAMATION "Vyberte složku pro modely."
    Abort
  ${EndIf}
  ${GetRoot} "$HmgModelDir" $0
  ${DriveSpace} "$0" "/D=F /S=M" $1
  ${If} $1 < 14000
    MessageBox MB_ICONEXCLAMATION "Na vybraném disku není alespoň 14 GB volného místa pro výchozí sadu a rezervu. Modely lze nastavit později v aplikaci." IDOK +1
  ${EndIf}
FunctionEnd

!macro customInstall
  ${If} ${FileExists} "$newDesktopLink"
    CreateShortCut "$newDesktopLink" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\resources\brand.ico" 0
  ${EndIf}
  ${If} ${FileExists} "$newStartMenuLink"
    CreateShortCut "$newStartMenuLink" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\resources\brand.ico" 0
  ${EndIf}
  CreateDirectory "$APPDATA\Hellrasher Music Generator"
  FileOpen $0 "$APPDATA\Hellrasher Music Generator\first-install.ini" w
  FileWriteWord $0 65279
  FileClose $0
  WriteINIStr "$APPDATA\Hellrasher Music Generator\first-install.ini" "models" "path" "$HmgModelDir"
  WriteINIStr "$APPDATA\Hellrasher Music Generator\first-install.ini" "models" "download" "$HmgDownload"
!macroend
!endif
