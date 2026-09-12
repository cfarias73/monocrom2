"""Office-UI Server — aiohttp server that bridges OPC Engine with the React+Phaser frontend.

Initializes OPCEngine, opens ui_state.db for agent/chat persistence,
sets up the event adapter pipeline, and serves static files + WebSocket.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any

from opc.core.windows_ssl import sanitize_windows_sslkeylogfile

sanitize_windows_sslkeylogfile()

import aiohttp.web
import aiosqlite
from loguru import logger

from opc.core.config import OPCConfig, get_opc_home
from opc.core.file_lock import lock_file_descriptor
from opc.core.workspace_trust import WorkspaceTrustRequired
from opc.engine import OPCEngine
from opc.plugins.office_ui.agent_store import AgentStore
from opc.plugins.office_ui.chat_store import ChatStore
from opc.plugins.office_ui.event_adapter import EventAdapter
from opc.plugins.office_ui.terminal import server_banner
from opc.plugins.office_ui.terminal import status as terminal_status
from opc.plugins.office_ui.ws_handler import WSHandler


# ── Static file paths ────────────────────────────────────────────────────

# Pre-built frontend lives alongside this file
_STATIC_DIR = Path(__file__).parent / "frontend_dist"
_FRONTEND_NO_STORE_HEADERS = {
    "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
}


def _is_under_path(path: Path, base: Path) -> bool:
    try:
        path.relative_to(base)
        return True
    except ValueError:
        return False


def _acquire_single_instance_lock(opc_home: Path) -> Any | None:
    """Prevent two office-UI servers from sharing one OPC home.

    Two server processes writing the same ui_state.db contend for the sqlite
    write lock and surface as 'database is locked' failures mid-run. The lock
    is advisory (flock on POSIX, LockFileEx on Windows), scoped to this OPC
    home, and released automatically when the process exits — including on a
    crash, so a stale lock file can never block a fresh start.
    """
    lock_path = opc_home / "office_ui.lock"
    lock_file = open(lock_path, "a+", encoding="utf-8")
    try:
        lock_file_descriptor(lock_file.fileno(), blocking=False)
    except OSError:
        holder_pid = "unknown"
        if os.name != "nt":
            # POSIX locks are advisory, so the holder metadata remains
            # readable. Windows byte-range locks are mandatory and reading
            # the locked range would replace the intended SystemExit with a
            # PermissionError.
            lock_file.seek(0)
            holder_pid = lock_file.read().strip() or holder_pid
        lock_file.close()
        raise SystemExit(
            f"Another office-UI server (pid {holder_pid}) is already running against "
            f"{opc_home}. Two instances sharing one ui_state.db cause 'database is "
            "locked' failures that can crash in-flight agent runs. Stop the other "
            "instance first, or point this one at a different OPC home."
        )
    lock_file.seek(0)
    lock_file.truncate()
    lock_file.write(str(os.getpid()))
    lock_file.flush()
    return lock_file


# ── Application factory ──────────────────────────────────────────────────

async def create_app(
    config: OPCConfig | None = None,
    project_id: str | None = None,
) -> aiohttp.web.Application:
    """Build and return a fully-wired aiohttp Application."""

    app = aiohttp.web.Application()

    # ── Load config from standard location if not provided ─────────
    if config is None:
        config_dir = get_opc_home() / "config"
        if config_dir.is_dir():
            try:
                config = OPCConfig.load(config_dir)
                logger.info(f"Loaded config from {config_dir}")
            except WorkspaceTrustRequired:
                raise
            except Exception as e:
                logger.warning(f"Failed to load config from {config_dir}: {e}")

    # ── OPC Engine ────────────────────────────────────────────────────
    engine = OPCEngine(config=config, project_id=project_id)

    # ── UI-state database (agents + chat) ─────────────────────────────
    opc_home = engine.opc_home
    instance_lock = _acquire_single_instance_lock(opc_home)
    db_path = opc_home / "ui_state.db"
    db = await aiosqlite.connect(str(db_path))
    # Wait for a concurrent writer (CLI, tooling) instead of failing after
    # sqlite's 5s default with 'database is locked'.
    await db.execute("PRAGMA busy_timeout=30000")

    agent_store = AgentStore(db)
    await agent_store.initialize()

    chat_store = ChatStore(db)
    await chat_store.initialize()

    event_adapter = EventAdapter()

    # ── Initialize engine (this starts all OPC layers) ────────────────
    await engine.initialize()

    # ── WSHandler ─────────────────────────────────────────────────────
    ws_handler = WSHandler(engine, agent_store, chat_store, event_adapter)

    # Wire engine callbacks through project-bound wrappers so project switches
    # do not retarget in-flight progress/runtime events to the active view.
    ws_handler._wire_engine_callbacks(engine)

    # Wire EventBus → ws_handler.on_opc_event (subscribe to ALL events),
    # preserving the root project context even when the active UI view changes.
    async def _root_engine_event(event: Any) -> None:
        await ws_handler.on_opc_event(
            event,
            runtime_engine=engine,
            project_id=engine.project_id or "default",
        )

    engine.event_bus.subscribe_all(_root_engine_event)

    # ── Restore persisted mode and load matching agents on startup ───
    await ws_handler.restore_persisted_mode()
    startup_preset = ws_handler._resolve_preset_name()
    agents = await agent_store.load_preset(startup_preset, engine.org_engine)
    logger.info(f"Loaded {len(agents)} preset agents (mode={ws_handler._exec_mode}, preset={startup_preset})")

    # ── Ensure activity + secretary channels (session channels are created on demand)
    await chat_store.ensure_activity_channel()
    await chat_store.ensure_secretary_channel()

    # ── Store references for cleanup ──────────────────────────────────
    app["engine"] = engine
    app["db"] = db
    app["ws_handler"] = ws_handler
    app["instance_lock"] = instance_lock

    # ── Routes ────────────────────────────────────────────────────────
    app.router.add_get("/ws", ws_handler.handle_ws)

    # LLM config endpoints
    app.router.add_get("/api/config/llm", _make_llm_config_get_handler(engine))
    app.router.add_post("/api/config/llm", _make_llm_config_post_handler(engine))

    # Attachment download (must be registered before the SPA catch-all)
    app.router.add_get(
        "/api/attachments/{attachment_id}/{filename}",
        _make_attachment_handler(engine),
    )

    # Mono — Help assistant widget
    app.router.add_post("/api/help", _make_help_handler(engine))

    # SPA: serve static files, fallback to index.html
    if _STATIC_DIR.is_dir():
        app.router.add_get("/", _serve_index)
        app.router.add_get("/assets/{path:.*}", _serve_asset)
        # Catch-all for SPA client-side routing
        app.router.add_get("/{path:.*}", _serve_spa_fallback)
    else:
        app.router.add_get("/", _serve_no_build)
        logger.warning(f"Frontend not built: {_STATIC_DIR} does not exist")

    # ── Cleanup on shutdown ───────────────────────────────────────────
    app.on_shutdown.append(_on_shutdown)

    return app


# ── Route handlers ────────────────────────────────────────────────────

_HELP_SYSTEM_PROMPT = """\
Eres **Mono**, el asistente experto oficial de MonoCrom. Respondes SOLO preguntas sobre MonoCrom.
Si el usuario pregunta algo fuera de MonoCrom, redirige amablemente a temas de la plataforma.

## ¿Qué es MonoCrom?
MonoCrom es un sistema de orquestación multi-agente local (100% en tu computadora). Permite que
una persona (el Director) dirija un equipo de agentes de IA especializados que colaboran en proyectos.

## Interfaz — 3 áreas principales
- **Workspace (Espacio de Trabajo):** Chat compositor + flujo de ejecución en vivo + tablero Kanban.
- **Office (Oficina Virtual):** Vista 2D animada de los agentes trabajando en sus escritorios.
- **Org (Organización):** Organigrama, crear/editar roles, gestión de agentes.

## Modos de operación
- **Modo Tarea (Single Agent):** Un solo agente experto ejecuta la tarea. Ideal para consultas rápidas.
- **Modo Empresa (Multi-Agente):** El Director coordina múltiples agentes especializados en paralelo.

## Configuración de API / Modelos
1. Clic en ⚙️ Ajustes (esquina superior derecha).
2. Pegar la API Key del proveedor elegido.
3. Seleccionar el modelo: `openai/gpt-4o`, `anthropic/claude-3-7-sonnet-latest`,
   `deepseek/deepseek-chat`, `ollama/llama3.3`, `gemini/gemini-2.5-pro`, etc.
4. Ajustar temperatura y guardar.

## Adjuntar archivos
- Soporta: imágenes, PDFs, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), CSV, texto, código.
- Límite: 50 MB por archivo, 100 MB total por mensaje.
- Arrastra el archivo al chat o usa el botón 📎.
- El agente lee el contenido automáticamente (no el archivo crudo, sino su texto extraído).

## Actualizar MonoCrom
- **Windows:** Abrir PowerShell como Admin → `irm https://monocrom.carlosfarias73.workers.dev/install.ps1 | iex`
- **Mac:** `cd ~/Monocrom && git pull && uv run opc ui --port 8765`
- Los datos personales (.opc/) nunca se borran en las actualizaciones.

## Carpetas importantes
- `~/Monocrom/` — Código de la aplicación (se actualiza con git pull).
- `~/Monocrom/.opc/` — Tus datos: conversaciones, agentes, configs. Nunca se toca.
- `~/Monocrom/.opc/config/` — Configuración de API keys y modelos.

## Solución de problemas comunes
- **"npm not found"**: Node.js no está instalado o no está en PATH. Reinstala con el comando del instalador.
- **"ERR_CONNECTION_REFUSED"**: El servidor no está corriendo. Haz doble clic en el ícono MonoCrom del escritorio.
- **Archivo "muy grande"**: Límite es 50 MB. Si es mayor, considera dividirlo.
- **El agente no lee el archivo**: Escríbele explícitamente: "Tienes el contenido del archivo en tu contexto, úsalo".
- **Quiero cambiar de modelo**: ⚙️ Ajustes → cambiar modelo → Guardar.
- **Mac Intel (x86_64)**: Ya está soportado. Si hay problemas con onnxruntime, el instalador lo resuelve solo.

## Buenas prácticas
- Sé específico en las instrucciones ("Crea un script Python que..." en vez de "ayúdame con Python").
- Usa **Modo Empresa** para proyectos complejos con múltiples archivos.
- Crea proyectos separados para cada cliente o área de trabajo.
- Supervisa el Kanban — si una tarea pide aprobación, aparece en el chat.

Responde siempre en el mismo idioma que el usuario (español o inglés). Sé conciso, amigable y práctico.
Usa markdown básico: **negrita**, `código`, listas con -.
"""


def _make_help_handler(engine: OPCEngine):
    """Factory: returns the POST /api/help handler for Mono, the MonoCrom assistant."""

    async def _handle_help(request: aiohttp.web.Request) -> aiohttp.web.Response:
        try:
            body = await request.json()
        except Exception:
            return aiohttp.web.Response(status=400, text="Invalid JSON")

        history: list[dict] = body.get("history", [])
        if not isinstance(history, list) or not history:
            return aiohttp.web.Response(status=400, text="history required")

        # Build messages for the LLM
        messages = [{"role": "system", "content": _HELP_SYSTEM_PROMPT}]
        for turn in history[-20:]:  # keep last 20 turns to stay within context
            role = str(turn.get("role", ""))
            content = str(turn.get("content", "")).strip()
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

        if not any(m["role"] == "user" for m in messages):
            return aiohttp.web.Response(status=400, text="No user message")

        try:
            import litellm  # type: ignore
            from opc.core.config import get_opc_home
            from opc.llm.config import load_llm_config

            opc_home = getattr(engine, "opc_home", None) or get_opc_home()
            llm_cfg = load_llm_config(opc_home)
            model = llm_cfg.default_model or "openai/gpt-4o"
            api_key = llm_cfg.api_key or None
            api_base = llm_cfg.api_base or None

            kwargs: dict[str, Any] = dict(
                model=model,
                messages=messages,
                max_tokens=800,
                temperature=0.5,
            )
            if api_key:
                kwargs["api_key"] = api_key
            if api_base:
                kwargs["api_base"] = api_base

            response = await litellm.acompletion(**kwargs)
            reply = response.choices[0].message.content or ""
        except Exception as exc:
            logger.warning(f"Help endpoint LLM error: {exc}")
            reply = (
                "⚠️ No pude generar una respuesta en este momento. "
                "Verifica que tengas configurada una API key válida en ⚙️ Ajustes."
            )

        return aiohttp.web.json_response({"reply": reply})

    return _handle_help


async def _serve_index(request: aiohttp.web.Request) -> aiohttp.web.FileResponse:
    return aiohttp.web.FileResponse(_STATIC_DIR / "index.html", headers=_FRONTEND_NO_STORE_HEADERS)


async def _serve_asset(request: aiohttp.web.Request) -> aiohttp.web.Response:
    """Serve built frontend assets without allowing stale UI protocol bundles."""
    path = request.match_info.get("path", "")
    file_path = (_STATIC_DIR / "assets" / path).resolve()
    assets_dir = (_STATIC_DIR / "assets").resolve()
    if not _is_under_path(file_path, assets_dir):
        return aiohttp.web.Response(status=403, text="Forbidden")
    if not file_path.is_file():
        return aiohttp.web.Response(status=404, text="Not found")
    return aiohttp.web.FileResponse(file_path, headers=_FRONTEND_NO_STORE_HEADERS)


async def _serve_spa_fallback(request: aiohttp.web.Request) -> aiohttp.web.Response:
    """Serve static file if exists, otherwise fall back to index.html for SPA routing."""
    path = request.match_info.get("path", "")
    file_path = (_STATIC_DIR / path).resolve()
    if not _is_under_path(file_path, _STATIC_DIR.resolve()):
        return aiohttp.web.Response(status=403, text="Forbidden")
    if file_path.is_file():
        return aiohttp.web.FileResponse(file_path, headers=_FRONTEND_NO_STORE_HEADERS)
    # SPA fallback
    return aiohttp.web.FileResponse(_STATIC_DIR / "index.html", headers=_FRONTEND_NO_STORE_HEADERS)


def _make_attachment_handler(engine: OPCEngine):
    """Factory that returns an HTTP handler for serving stored attachments."""
    import mimetypes as _mt

    async def _handle(request: aiohttp.web.Request) -> aiohttp.web.Response:
        attachment_id = request.match_info["attachment_id"]
        filename = request.match_info["filename"]
        att_store = getattr(engine, "attachment_store", None)
        if not att_store:
            return aiohttp.web.Response(status=503, text="Attachment store not available")
        file_path = att_store.base_dir / attachment_id / filename
        if not file_path.is_file():
            return aiohttp.web.Response(status=404, text="Not found")
        # Path-traversal guard
        if not _is_under_path(file_path.resolve(), att_store.base_dir.resolve()):
            return aiohttp.web.Response(status=403, text="Forbidden")
        ct, _ = _mt.guess_type(filename)
        headers = {"Cache-Control": "public, max-age=86400"}
        return aiohttp.web.FileResponse(file_path, headers=headers)

    return _handle


def _make_llm_config_get_handler(engine: OPCEngine):
    async def _handle(request: aiohttp.web.Request) -> aiohttp.web.Response:
        import yaml
        opc_home = engine.opc_home
        cfg_path = opc_home / "config" / "llm_config.yaml"
        data = {}
        if cfg_path.is_file():
            try:
                with open(cfg_path, "r", encoding="utf-8") as f:
                    loaded = yaml.safe_load(f) or {}
                    data = loaded.get("llm", {}) or {}
            except Exception:
                data = {}

        llm_cfg = getattr(engine.config, "llm", None)
        default_model = data.get("default_model") or (getattr(llm_cfg, "default_model", None) if llm_cfg else "openai/gpt-4o")
        api_key = data.get("api_key") or (getattr(llm_cfg, "api_key", "") if llm_cfg else "") or os.environ.get("OPENAI_API_KEY", "") or os.environ.get("OPENROUTER_API_KEY", "") or os.environ.get("ANTHROPIC_API_KEY", "") or os.environ.get("GEMINI_API_KEY", "") or os.environ.get("DEEPSEEK_API_KEY", "")
        api_base = data.get("api_base") or (getattr(llm_cfg, "api_base", "") if llm_cfg else "") or ""
        temperature = data.get("temperature", 0.7)

        masked_key = ""
        if api_key:
            if len(api_key) > 8:
                masked_key = f"{api_key[:4]}...{api_key[-4:]}"
            else:
                masked_key = "********"

        return aiohttp.web.json_response({
            "default_model": default_model,
            "has_api_key": bool(api_key),
            "api_key_masked": masked_key,
            "api_base": api_base,
            "temperature": temperature,
        })
    return _handle


def _make_llm_config_post_handler(engine: OPCEngine):
    async def _handle(request: aiohttp.web.Request) -> aiohttp.web.Response:
        import yaml
        from opc.core.config import _atomic_write_yaml
        try:
            body = await request.json()
        except Exception:
            return aiohttp.web.json_response({"error": "Invalid JSON body"}, status=400)

        opc_home = engine.opc_home
        cfg_path = opc_home / "config" / "llm_config.yaml"
        cfg_path.parent.mkdir(parents=True, exist_ok=True)

        existing = {}
        if cfg_path.is_file():
            try:
                with open(cfg_path, "r", encoding="utf-8") as f:
                    existing = yaml.safe_load(f) or {}
            except Exception:
                existing = {}

        llm_dict = existing.get("llm", {}) or {}
        if "default_model" in body and body["default_model"]:
            llm_dict["default_model"] = str(body["default_model"]).strip()
        if "api_key" in body and body["api_key"]:
            llm_dict["api_key"] = str(body["api_key"]).strip()
        if "api_base" in body:
            base = str(body["api_base"]).strip()
            if base:
                llm_dict["api_base"] = base
            elif "api_base" in llm_dict:
                del llm_dict["api_base"]
        if "temperature" in body:
            try:
                llm_dict["temperature"] = float(body["temperature"])
            except (ValueError, TypeError):
                pass

        existing["llm"] = llm_dict
        _atomic_write_yaml(cfg_path, existing)

        try:
            if hasattr(engine.config, "llm") and engine.config.llm:
                if "default_model" in llm_dict:
                    engine.config.llm.default_model = llm_dict["default_model"]
                if "api_key" in llm_dict:
                    engine.config.llm.api_key = llm_dict["api_key"]
                if "api_base" in llm_dict:
                    engine.config.llm.api_base = llm_dict["api_base"]
                if "temperature" in llm_dict:
                    engine.config.llm.temperature = llm_dict["temperature"]
        except Exception as ex:
            logger.warning(f"Could not hot-reload LLM engine config: {ex}")

        return aiohttp.web.json_response({"success": True, "message": "LLM config saved"})
    return _handle


async def _serve_no_build(request: aiohttp.web.Request) -> aiohttp.web.Response:
    return aiohttp.web.Response(
        text=(
            "<h1>OpenOPC Office UI</h1>"
            "<p>Frontend not built. Run <code>cd opc/plugins/office_ui/frontend_src && npm install && npm run build</code></p>"
        ),
        content_type="text/html",
    )


async def _on_shutdown(app: aiohttp.web.Application) -> None:
    """Graceful cleanup."""
    ws_handler = app.get("ws_handler")
    if ws_handler:
        await ws_handler.shutdown()
        await ws_handler.flush_all_progress()
    engine = app.get("engine")
    db = app.get("db")
    if engine:
        await engine.shutdown()
    if db:
        await db.close()
    instance_lock = app.get("instance_lock")
    if instance_lock is not None:
        try:
            instance_lock.close()
        except Exception:
            pass
    logger.info("Office-UI server shut down")


# ── Entry point ───────────────────────────────────────────────────────

def run_server(
    host: str = "0.0.0.0",
    port: int = 8765,
    config: OPCConfig | None = None,
    project_id: str | None = None,
) -> None:
    """Create and run the office-UI server (blocking)."""

    async def _start() -> None:
        app = await create_app(config=config, project_id=project_id)
        runner = aiohttp.web.AppRunner(app)
        await runner.setup()
        site = aiohttp.web.TCPSite(runner, host, port)
        await site.start()
        logger.info(f"Office-UI running at http://{host}:{port}")
        server_banner(host=host, port=port, project_id=project_id)
        # Keep running until interrupted
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            pass
        finally:
            await runner.cleanup()

    try:
        asyncio.run(_start())
    except KeyboardInterrupt:
        terminal_status("Shutting down Office UI", kind="warning")
    except SystemExit as exc:
        if exc.code and not isinstance(exc.code, int):
            terminal_status(str(exc.code), kind="error")
            raise SystemExit(1) from None
        raise
