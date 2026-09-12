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

# 2. Descargar o actualizar Monocrom (compatible con o sin Git)
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${CYAN}🔄 Actualizando Monocrom en ${INSTALL_DIR}...${RESET}"
  cd "$INSTALL_DIR"
  if command -v git &> /dev/null; then git pull || true; fi
else
  echo -e "${CYAN}📥 Descargando Monocrom en ${INSTALL_DIR}...${RESET}"
  if command -v git &> /dev/null; then
    git clone https://github.com/cfarias73/monocrom2.git "$INSTALL_DIR"
  else
    echo -e "${CYAN}📦 Descargando paquete oficial (sin requerir Git)...${RESET}"
    mkdir -p /tmp/monocrom_extracted
    curl -fsSL https://github.com/cfarias73/monocrom2/archive/refs/heads/main.tar.gz | tar -xz -C /tmp/monocrom_extracted
    mv /tmp/monocrom_extracted/monocrom2-main "$INSTALL_DIR"
    rm -rf /tmp/monocrom_extracted
  fi
  cd "$INSTALL_DIR"
fi

# 3. Confiar en el espacio de trabajo
echo -e "${CYAN}🔒 Configurando espacio de trabajo local...${RESET}"
uv run opc trust add "$INSTALL_DIR"

# 4. Instalar motor de navegación web (Chromium) — OPCIONAL
echo -e "${CYAN}🌐 Verificando motor de navegación web autónomo (Playwright Chromium)...${RESET}"
if uv run playwright install chromium 2>/dev/null; then
  echo -e "${GREEN}✅ Playwright Chromium instalado correctamente.${RESET}"
else
  echo -e ""
  echo -e "${ORANGE}⚠️  Playwright (navegación web autónoma) no pudo instalarse.${RESET}"
  echo -e "${RESET}   MonoCrom funcionará normalmente. Solo la herramienta 'navegar web'${RESET}"
  echo -e "${RESET}   quedará desactivada en este equipo.${RESET}"
  echo -e ""
fi

echo -e "\n${GREEN}${BOLD}✅ ¡Instalación completada con éxito!${RESET}"
echo -e "${CYAN}🚀 Iniciando Monocrom en http://localhost:8765...${RESET}\n"

# 5. Crear lanzador en el Escritorio
if [ -d "${HOME}/Desktop" ]; then
  LAUNCHER="${HOME}/Desktop/MonoCrom.command"
  cat << 'EOF' > "$LAUNCHER"
#!/usr/bin/env bash
cd "${HOME}/Monocrom"
(sleep 2 && (open http://localhost:8765 2>/dev/null || xdg-open http://localhost:8765 2>/dev/null || true)) &
uv run opc ui --port 8765
EOF
  chmod +x "$LAUNCHER"
  echo -e "${GREEN}📌 Lanzador 'MonoCrom.command' creado en tu Escritorio.${RESET}"
fi

# 6. Abrir navegador en segundo plano tras arrancar (con cache-bust para ver la versión nueva)
CACHE_BUST=$(date +%Y%m%d%H%M)
(sleep 2 && (open "http://localhost:8765?v=${CACHE_BUST}" 2>/dev/null || xdg-open "http://localhost:8765?v=${CACHE_BUST}" 2>/dev/null || true)) &

# 7. Ejecutar Monocrom
uv run opc ui --port 8765
