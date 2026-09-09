#!/usr/bin/env bash
set -e

# Monocrom One-Click Installer for macOS and Linux
# https://monocrom.app

BOLD="\033[1m"
GREEN="\033[32m"
ORANGE="\033[33m"
CYAN="\033[36m"
RESET="\033[0m"

echo -e "${ORANGE}${BOLD}"
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║            Instalador Oficial Monocrom            ║"
echo "  ║     Tu Empresa de Uno con Agentes de IA           ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo -e "${RESET}"

INSTALL_DIR="${HOME}/Monocrom"

# 1. Comprobar / Instalar uv
if ! command -v uv &> /dev/null; then
  echo -e "${CYAN}⚡ Instalando el runtime ultrarrápido 'uv'...${RESET}"
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="${HOME}/.cargo/bin:${HOME}/.local/bin:${PATH}"
fi

# 2. Descargar o actualizar Monocrom
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${CYAN}🔄 Actualizando Monocrom en ${INSTALL_DIR}...${RESET}"
  cd "$INSTALL_DIR"
  git pull || true
else
  echo -e "${CYAN}📥 Descargando Monocrom en ${INSTALL_DIR}...${RESET}"
  git clone https://github.com/cfarias73/monocrom2.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# 3. Confiar en el espacio de trabajo
echo -e "${CYAN}🔒 Configurando espacio de trabajo local...${RESET}"
uv run opc trust add "$INSTALL_DIR"

# 4. Instalar motor de navegación web (Chromium)
echo -e "${CYAN}🌐 Verificando motor de navegación web autónomo (Playwright Chromium)...${RESET}"
uv run playwright install chromium || true

echo -e "\n${GREEN}${BOLD}✅ ¡Instalación completada con éxito!${RESET}"
echo -e "${CYAN}🚀 Iniciando Monocrom en http://localhost:8765...${RESET}\n"

# 5. Abrir navegador en segundo plano tras arrancar
(sleep 2 && (open http://localhost:8765 2>/dev/null || xdg-open http://localhost:8765 2>/dev/null || true)) &

# 6. Ejecutar Monocrom
uv run opc ui --port 8765
