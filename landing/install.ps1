# Monocrom One-Click Installer for Windows (PowerShell)
# https://monocrom.app

Write-Host ""
Write-Host "  ===================================================" -ForegroundColor DarkYellow
Write-Host "            Instalador Oficial Monocrom (Windows)    " -ForegroundColor Yellow
Write-Host "     Tu Empresa de Uno con Agentes de IA             " -ForegroundColor Yellow
Write-Host "  ===================================================" -ForegroundColor DarkYellow
Write-Host ""

$InstallDir = "$HOME\Monocrom"

# Helper: refrescar PATH desde el registro de Windows (captura instalaciones recientes)
function Refresh-EnvPath {
    $MachinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $UserPath    = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path    = "$MachinePath;$UserPath;$HOME\.cargo\bin;$HOME\.local\bin"
}

# 1. Comprobar o Instalar uv
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "⚡ Instalando runtime 'uv' para Windows..." -ForegroundColor Cyan
    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    Refresh-EnvPath
}

# 2. Comprobar o Instalar Node.js (requerido para compilar la interfaz de MonoCrom)
Refresh-EnvPath
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Node.js no encontrado. Instalando Node.js LTS..." -ForegroundColor Cyan
    $NodeInstaller = "$env:TEMP\node_installer.msi"
    # URL del instalador LTS de Node.js para Windows 64-bit
    $NodeUrl = "https://nodejs.org/dist/v20.19.0/node-v20.19.0-x64.msi"
    Write-Host "   Descargando Node.js desde nodejs.org (~30 MB)..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $NodeUrl -OutFile $NodeInstaller -UseBasicParsing
    Write-Host "   Instalando Node.js (puede tardar un momento)..." -ForegroundColor Gray
    Start-Process msiexec.exe -ArgumentList "/i `"$NodeInstaller`" /quiet /norestart ADDLOCAL=ALL" -Wait
    Remove-Item $NodeInstaller -Force -ErrorAction SilentlyContinue
    # Refrescar PATH para incluir Node recién instalado
    Refresh-EnvPath
    Write-Host "✅ Node.js instalado correctamente." -ForegroundColor Green
} else {
    $NodeVer = (node --version 2>$null)
    Write-Host "✅ Node.js detectado: $NodeVer" -ForegroundColor Green
}

# Verificar que npm esté disponible antes de continuar
Refresh-EnvPath
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "⚠️  npm no se pudo activar en esta sesión." -ForegroundColor Yellow
    Write-Host "   Cierra y vuelve a abrir PowerShell como Administrador y ejecuta:" -ForegroundColor Yellow
    Write-Host "   irm https://monocrom.carlosfarias73.workers.dev/install.ps1 | iex" -ForegroundColor White
    exit 1
}

# 3. Descargar o actualizar repositorio (compatible con o sin Git)
if (Test-Path $InstallDir) {
    Write-Host "🔄 Actualizando Monocrom en $InstallDir..." -ForegroundColor Cyan
    Set-Location $InstallDir
    if (Get-Command git -ErrorAction SilentlyContinue) {
        git pull
    }
} else {
    Write-Host "📥 Descargando Monocrom en $InstallDir..." -ForegroundColor Cyan
    if (Get-Command git -ErrorAction SilentlyContinue) {
        git clone https://github.com/cfarias73/monocrom2.git $InstallDir
    } else {
        Write-Host "📦 Descargando paquete oficial (sin requerir Git)..." -ForegroundColor Cyan
        $ZipUrl = "https://github.com/cfarias73/monocrom2/archive/refs/heads/main.zip"
        $TempZip = "$env:TEMP\monocrom_installer.zip"
        $TempExtract = "$env:TEMP\monocrom_extracted"

        if (Test-Path $TempExtract) { Remove-Item $TempExtract -Recurse -Force -ErrorAction SilentlyContinue }

        Invoke-WebRequest -Uri $ZipUrl -OutFile $TempZip -UseBasicParsing
        Expand-Archive -Path $TempZip -DestinationPath $TempExtract -Force

        $ExtractedFolder = Get-ChildItem -Path $TempExtract | Select-Object -First 1
        if ($ExtractedFolder) {
            Move-Item -Path $ExtractedFolder.FullName -Destination $InstallDir -Force
        }

        Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
    }
    Set-Location $InstallDir
}

# 4. Confiar en el espacio de trabajo
Write-Host "🔒 Configurando espacio de trabajo local..." -ForegroundColor Cyan
uv run opc trust add $InstallDir

# 5. Instalar motor de navegación web Playwright (Chromium) — OPCIONAL
Write-Host "🌐 Verificando motor de navegación web (Playwright Chromium)..." -ForegroundColor Cyan
try {
    $playwrightResult = & uv run playwright install chromium 2>&1
    Write-Host "✅ Playwright Chromium instalado correctamente." -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "⚠️  Playwright (navegación web autónoma) no pudo instalarse." -ForegroundColor Yellow
    Write-Host "   Causa posible: política de seguridad corporativa (AppLocker/WDAC)." -ForegroundColor DarkGray
    Write-Host "   MonoCrom funcionará normalmente. Solo la herramienta 'navegar web'" -ForegroundColor DarkGray
    Write-Host "   quedará desactivada hasta que un administrador lo permita." -ForegroundColor DarkGray
    Write-Host ""
}

# 6. Crear acceso directo en el Escritorio
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)

    $BatPath = "$InstallDir\Iniciar_MonoCrom.bat"
    Set-Content -Path $BatPath -Value "@echo off`ntitle MonoCrom Console`ncd /d `"%USERPROFILE%\Monocrom`"`nstart http://localhost:8765`nuv run opc ui --port 8765`npause"

    $ShortcutPath = "$DesktopPath\MonoCrom.lnk"
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = "$InstallDir\Iniciar_MonoCrom.bat"
    $Shortcut.WorkingDirectory = $InstallDir
    $Shortcut.Description = "Iniciar MonoCrom - Tu Empresa de Uno"
    $Shortcut.Save()
    Write-Host "📌 Acceso directo 'MonoCrom' creado en tu Escritorio." -ForegroundColor Green
} catch {
    # Continuar si hay restricción de permisos
}

Write-Host ""
Write-Host "✅ ¡Instalación completada con éxito!" -ForegroundColor Green
Write-Host "🚀 Iniciando Monocrom en http://localhost:8765..." -ForegroundColor Cyan
Write-Host ""

# 7. Abrir navegador en segundo plano tras inicializar el servidor
#    Usamos ?v= para forzar recarga limpia de la interfaz tras actualizaciones
$CacheBust = Get-Date -Format "yyyyMMddHHmm"
Start-Job -ScriptBlock {
    param($cb)
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:8765?v=$cb"
} -ArgumentList $CacheBust | Out-Null

# 8. Ejecutar Monocrom
uv run opc ui --port 8765
