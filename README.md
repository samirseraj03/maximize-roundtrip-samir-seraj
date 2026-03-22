# Maximize Roundtrip (GNOME Shell Extension)

**Maximize Roundtrip** es una extensión para GNOME Shell diseñada para mejorar dramáticamente el flujo de trabajo de escritorio mediante el aislamiento automático de las tareas que requieren concentración total. 

A diferencia del comportamiento habitual de GNOME —donde las ventanas maximizadas cubren y tapan tu escritorio— esta extensión introduce el concepto del **"Viaje de Ida y Vuelta" (Roundtrip)**: mantener un escritorio principal limpio para ventanas flotantes, y enviar dinámicamente las ventanas maximizadas a sus propios espacios de trabajo dedicados.

## 🎯 Filosofía y Funcionamiento

El flujo de trabajo se basa en un **Workspace Origen inalterable** (usualmente el Workspace 0). Todos tus archivos, ventanas pequeñas, reproductores y terminales rápidas viven aquí. 

* **Maximizar (El viaje de ida):** Al maximizar o poner en pantalla completa cualquier ventana, la extensión intercepta este evento, solicita un Workspace nuevo y limpio a GNOME de forma instantánea, y mueve esa ventana directamente allí. 
* **Restaurar (El viaje de vuelta):** Cuando terminas tu tarea y decides des-maximizar, minimizar, o cerrar la aplicación, la extensión restaura la ventana *exactamente* a las coordenadas, dimensiones y monitor que tenía originalmente en tu Workspace Origen. El Workspace temporal que quedó vacío es destruido automáticamente.

## ✨ Características Integradas

### 1. Sistema Dinámico de Workspaces
Todo el enrutamiento de ventanas es automático y fluido. Se encarga de rastrear el estado histórico de cada ventana y limpiar los "workspaces basura" que quedan desocupados, manteniendo tu sesión ordenada y enfocada.

### 2. Alt+Tab Moderno (Selector MRU)
La extensión desactiva de forma segura el Alt+Tab clásico (que recorre aplicaciones indiscriminadamente) y lo reemplaza por un **Selector de Workspaces MRU (Most Recently Used)**:
- Un simple toque rápido a `Alt+Tab` te devuelve inmediatamente del Workspace donde realizas el trabajo al Workspace anterior, intercalando las dos últimas dimensiones de manera veloz.
- Si mantienes presionada la tecla `Alt`, aparecerá un HUD flotante en el centro de tu pantalla (compatible con Wayland y X11) que te mostrará una cuadrícula interactiva con los iconos de las herramientas que tienes en cada workspace, permitiéndote navegar rápidamente con la tecla `Tab` o las flechas de tu teclado.

### 3. Panel de Indicación Visual (Minimizados)
¿Qué sucede con las ventanas que minimizas para que no ocupen espacio? La extensión provee un panel lateral *Dock-like* opcional e inteligente en la costa izquierda del Workspace Origen. Este panel detecta continuamente qué aplicaciones se encuentran minimizadas temporalmente en el sistema y expone sus iconos de forma flotante para que puedas restaurarlas con un clic fácil e intuitivo.

---

## ⚙️ Requisitos y Configuración de GNOME

Para que el ecosistema de "Maximized = New Workspace" funcione a la perfección, **se requiere cederle el control de los Espacios de Trabajo a la extensión**. No te preocupes de configurarlo; al encender la extensión, ella inyectará silenciosamente las siguientes reglas en GNOME Shell a través de Dconf:

* `org.gnome.mutter dynamic-workspaces` 👉 `false` (Desactiva el creador estándar de GNOME).
* `org.gnome.desktop.wm.preferences num-workspaces` 👉 `1` (Fija tu Workspace Origen permanente).

> **Aviso:** Debido a que esta extensión monopoliza el mecanismo subyacente de GNOME, los atajos manuales para "Abrir nuevo espacio de trabajo vacío" por defecto podrían perder utilidad o entrar en conflicto, siendo todo el recorrido completamente automático mediante la acción de maximizar o las aplicaciones que tú dirijas a otros Workspaces.

## 📥 Instalación

Si has clonado este repositorio manualmente y deseas habilitar las opciones como el panel lateral de "minimizados":

1. Ve al directorio de instalación donde guardaste la extensión.
2. Compila el esquema de GSettings con el comando:
   ```bash
   glib-compile-schemas schemas/
   ```
3. Reinicia tu sesión de GNOME Shell.
   * Si usas **Wayland**: Cierra Sesión y vuelve a iniciarla.
   * Si usas **X11**: Presiona `Alt+F2`, escribe `r` y luego presiona `Enter`.
4. Abre tu app de "Extensiones" y enciende *Maximize Roundtrip*.

---

🚀 **Compatibilidad:** Probado de forma extensa y nativa sobre entornos Wayland y X11. Utiliza mecanismos ágiles no bloqueantes.