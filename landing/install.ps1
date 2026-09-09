# Monocrom One-Click Installer for Windows (PowerShell)
# https://monocrom.app

Write-Host ""
Write-Host "  ===================================================" -ForegroundColor DarkYellow
Write-Host "            Instalador Oficial Monocrom (Windows)    " -ForegroundColor Yellow
Write-Host "     Tu Empresa de Uno con Agentes de IA             " -ForegroundColor Yellow
Write-Host "  ===================================================" -ForegroundColor DarkYellow
Write-Host ""

$InstallDir = "$HOME\Monocrom"

# 1. Comprobar o Instalar uv
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "⚡ Instalando runtime 'uv' para Windows..." -ForegroundColor Cyan
    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    $env:Path = "$HOME\.cargo\bin;$HOME\.local\bin;$env:Path"
}

# 2. Descargar o actualizar repositorio
if (Test-Path $InstallDir) {
    Write-Host "🔄 Actualizando Monocrom en $InstallDir..." -ForegroundColor Cyan
    Set-Location $InstallDir
    git pull
} else {
    Write-Host "📥 Descargando Monocrom en $InstallDir..." -ForegroundColor Cyan
    git clone https://github.com/cfarias73/monocrom2.git $InstallDir
    Set-Location $InstallDir
}

# 3. Confiar en el espacio de trabajo
Write-Host "🔒 Configurando espacio de trabajo local..." -ForegroundColor Cyan
uv run opc trust add $InstallDir

# 4. Instalar motor de navegación web Playwright (Chromium)
Write-Host "🌐 Verificando motor de navegación web (Playwright Chromium)..." -ForegroundColor Cyan
try {
    uv run playwright install chromium
} catch {
    Write-Host "Aviso: la instalación de Chromium continuará en segundo plano." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ ¡Instalación completada con éxito!" -ForegroundColor Green
Write-Host "🚀 Iniciando Monocrom en http://localhost:8765..." -ForegroundColor Cyan
Write-Host ""

# 5. Abrir navegador
Start-Process "http://localhost:8765"

# 6. Ejecutar Monocrom
uv run opc ui --port 8765
