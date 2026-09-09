# 📖 Manual de Uso Oficial — MonoCrom (Beta Privada)
> **Versión 2.0 • Tu Empresa de Uno con Agentes de Inteligencia Artificial**

---

## 1. Introducción y Filosofía de MonoCrom

**MonoCrom** no es un chatbot tradicional de preguntas y respuestas; es un **sistema de orquestación multi-agente local** diseñado para que una sola persona (el Director) pueda dirigir y coordinar un equipo autónomo de agentes de inteligencia artificial especializados.

### Principios Fundamentales:
* **100% Local-First:** Todo el código, memoria, archivos de trabajo y navegaciones se ejecutan en tu propia computadora.
* **Jerarquía Organizacional:** Cada agente tiene un rol asignado (Director, Desarrollador, Diseñador, Revisor QA, Copywriter, etc.) con herramientas específicas.
* **Colaboración Real:** Los agentes se dividen proyectos complejos en subtareas, se transfieren resultados y realizan revisiones entre pares antes de marcar una tarea como finalizada.

---

## 2. Recorrido por la Interfaz

La aplicación se divide en tres áreas principales accesibles desde la barra superior:

### 💼 A. Espacio de Trabajo (Workspace)
Es el centro de control operativo del día a día:
1. **Compositor de Chat:** Donde escribes tus directivas u objetivos al equipo.
2. **Flujo de Ejecución en Vivo:** Muestra las reflexiones de los agentes, llamadas a herramientas y resultados intermedios.
3. **Tablero Kanban:** Visualiza en tiempo real las columnas *Por Hacer*, *En Progreso*, *En Revisión* y *Completadas*.
4. **Panel de Detalle:** Haz clic en cualquier tarjeta del tablero para ver los archivos modificados, comandos ejecutados y mensajes internos del agente asignado.

### 🏢 B. Oficina Virtual (Office)
Una vista interactiva 2D con estética de oficina:
* Observa a cada agente sentado en su escritorio trabajando o desplazándose en tiempo real mientras ejecutan tareas.
* Haz clic en cualquier agente para ver su estado actual, memoria reciente y asignación activa.

### 👥 C. Organización (Org)
El organigrama y gestión de talento de tu empresa:
* Visualiza la jerarquía de mando y dependencias entre departamentos.
* Crea y contrata nuevos roles con prompts especializados, herramientas personalizadas y habilidades específicas.

---

## 3. Modos de Operación

Al escribir un requerimiento en el compositor inferior, puedes elegir entre dos modos de trabajo:

| Modo | ¿Cuándo usarlo? | ¿Cómo opera? |
| :--- | :--- | :--- |
| **👤 Modo Tarea (Single Agent)** | Consultas rápidas, edición de un archivo puntual, redacción directa o scripts simples. | Un único agente especialista recibe tu orden y la ejecuta de principio a fin sin consultar a otros roles. |
| **🏢 Modo Empresa (Multi-Agente)** | Proyectos completos (ej. *"Crear API con base de datos, tests y documentación"*). | El **Director** analiza el objetivo, desglosa el plan en subtareas en el Kanban y delega a los especialistas (Dev, QA, Copy). |

---

## 4. Herramientas Autónomas de los Agentes

Tus agentes cuentan con un conjunto de herramientas locales integradas:

1. **Terminal del Sistema:** Ejecutan comandos de consola (ej. `npm test`, `python script.py`, `git status`).
2. **Manipulación de Archivos:** Crean, editan y leen archivos de tu proyecto local dentro de la carpeta de trabajo `_workplace/`.
3. **Navegación Web con Playwright:** Navegan sitios web reales, extraen información, completan formularios y capturan pantallas.
4. **Memoria Continua:** Recuerdan decisiones previas, convenciones de tu proyecto y acuerdos pasados entre sesiones.

---

## 5. Configuración de Modelos e IA (BYOK)

Puedes cambiar o ajustar tus modelos de IA en cualquier momento:

1. Haz clic en el botón **`⚙️ Ajustes`** en la esquina superior derecha.
2. Selecciona o escribe el modelo que prefieras:
   * **OpenAI:** `gpt-4o`, `o3-mini`, `gpt-4.5`
   * **Anthropic:** `claude-3-7-sonnet-latest`, `claude-3-5-sonnet-latest`
   * **OpenRouter / DeepSeek:** `deepseek/deepseek-chat`, `deepseek/deepseek-r1`
   * **Ollama Local (Sin costo de API):** `ollama/llama3.3`, `ollama/qwen2.5-coder`
3. Ajusta la temperatura (creatividad vs precisión) y haz clic en **Guardar Configuración**.

---

## 6. Buenas Prácticas para Beta Testers

* **Sé específico en los objetivos:** Define el resultado esperado con claridad (ej. *"Crea un script en Python que lea este CSV y genere un gráfico en HTML"*).
* **Supervisa el Kanban:** Si una tarea está en revisión o requiere aprobación humana, verás una solicitud interactiva en el chat.
* **Usa proyectos separados:** Puedes crear diferentes proyectos desde el menú desplegable en la barra superior para mantener el código y la memoria aislados.

---

## 7. Soporte y Canales Oficiales

* **Landing y Recursos:** [https://monocrom.carlosfarias73.workers.dev](https://monocrom.carlosfarias73.workers.dev)
* **Código y Releases:** [https://github.com/cfarias73/monocrom2](https://github.com/cfarias73/monocrom2)
* **Contacto de Feedback:** Escribe tus sugerencias y reportes para iterar juntos en las próximas versiones.
