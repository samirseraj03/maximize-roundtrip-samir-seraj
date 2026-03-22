# Maximize Roundtrip (GNOME Shell Extension)

[![GNOME Version](https://img.shields.io/badge/GNOME-45%2B-blue)](https://gnome.org)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Languages](https://img.shields.io/badge/Languages-ES%20%7C%20EN-orange)](#) 

> 🇬🇧 **Speak English?** Read the English version at [README.md](README.md).

**Maximize Roundtrip** es una extensión de productividad para GNOME Shell que rediseña por completo la forma en que interactúas con las ventanas de aplicaciones maximizadas y los espacios de trabajo virtuales. Mueve automáticamente las tareas a pantalla completa a sus propios espacios de trabajo dedicados, manteniendo tu escritorio principal limpio e intacto.

![Muestra de funcionamiento principal](docs/images/placeholder_showcase.gif)  
*(Inserta tu GIF de muestra aquí)*

---

## ⚡ Instalación Rápida Inicial

Para instalar la extensión fácilmente desde su código fuente, simplemente clona el repositorio y compila los esquemas de configuración.

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/samirseraj03/maximize-roundtrip ~/.local/share/gnome-shell/extensions/maximize-roundtrip@samir-seraj
   cd ~/.local/share/gnome-shell/extensions/maximize-roundtrip@samir-seraj
   ```
2. **Compila los recursos del esquema:**
   ```bash
   glib-compile-schemas schemas/
   ```
3. **Reinicia GNOME Shell:**
   * **Wayland:** Cierra tu sesión de usuario y vuelve a entrar.
   * **X11:** Presiona `Alt+F2`, escribe `r`, y presiona `Enter`.
4. **Habilita la extensión:**
   Usa la aplicación de GNOME Extensions o ejecuta por terminal:
   ```bash
   gnome-extensions enable maximize-roundtrip@samir-seraj
   ```

---

## 🧠 Filosofía: El Concepto "Roundtrip" (De Ida y Vuelta)

Los entornos de escritorio tradicionales apilan las ventanas unas sobre otras. Cuando maximizas una aplicación, esta cubre tu terminal, tus chats sin leer, y todas tus ventanas flotantes por detrás. 

**Maximize Roundtrip cambia este paradigma forzando la existencia sistemática de un único Workspace Origen (Workspace 0).**

Todas tus ventanas flotantes, apiladas y pequeñas vivirán permanentemente en el Workspace Origen. 
* **El viaje de ida:** Cuando maximizas una aplicación para concentrarte profundamente en ella, la extensión intercepta este evento de maximización, pregunta a GNOME en tiempo real por un Workspace completamente nuevo y vacío, y translocaliza tu ventana directamente allí.
* **El viaje de vuelta:** Cuando terminas tu lectura profunda y decides restaurar, desmaximizar o cerrar dicha aplicación, la extensión *teletransporta* mágicamente la ventana de vuelta a su posición exacta `(X, Y)` en el Workspace Origen, y destruye la otra caja temporal.

Esto crea naturalmente un **Ciclo de Ida y Vuelta**, garantizando que el escritorio primario jamás sea sobre-saturado y dándole una caja aislada al trabajo en pantalla completa.

---

## 🎮 Uso y Características

### 1. Selector de Workspaces MRU (Most Recently Used)
La extensión inteligentemente deshabilita el `Alt+Tab` nativo e indiscriminado de GNOME (switch-applications) y lo reemplaza incrustando un **Selector asíncrono MRU propio**.

![Alt Tab Workspace Selector](docs/images/placeholder_alttab.gif)  
*(Inserta tu GIF de Alt+Tab aquí)*

- **Intercambio Rápido:** Un toque rápido de `Alt+Tab` instantáneamente alterna tu vista central entre tu workspace en pantalla completa actúal y tu último workspace visitado (usualmente tu escritorio principal).
- **HUD Visual Visual:** Si mantienes presionada la tecla `Alt` (o tu mod), aparecerá en el centro de tu pantalla (compatible con Wayland local) una grilla interactiva exponiendo iconos reales de las aplicaciones que viven virtualmente dentro de cada Workspace. 
- Puedes recorrer el historial cronológico de los espacios de trabajo tocando repetidas veces el `Tab` o las flechas de ciclo de tu teclado.
- *Nota: Emplea una arquitectura de diseño Híbrida en Clutter, proveyendo inmunidad absoluta contra los congelamientos modales en sesiones Wayland.*

### 2. Dock Izquierdo de Apps Minimizadas
¿Estás cansado de minimizar las ventanas flotantes y perder el hilo de qué ocurre en Workspace 0? 

![Minimizados Indicator Dock](docs/images/placeholder_minimized.gif)  
*(Inserta tu GIF del panel aquí)*

Si la opción está habilitada, un delicado panel lateral alineado verticalmente ocupará el borde izquierdo de tu Workspace 0. Este recuadro escucha permanentemente las aplicaciones del sistema que han sido minimizadas (ocultas) y crea pequeñas representaciones clickeables para ellas de forma dinámica flotante para su pronta recuperación ágil.

---

## ⚙️ Configuración & Explicación "Debajo del Capó"

Para hacer que todo este ecosistema inteligente fluya óptimamente, **la extensión toma estricto dominio absoluto sobre el rastreador de tus Workspaces.** 

Al ejecutarse, la extensión va a sobreinyectar a la fuerza los siguientes registros en la base de datos DConf de Mutter:
* `org.gnome.mutter dynamic-workspaces` 👉 `false` (Inhabilita la creación dinámica de GNOME subyacente).
* `org.gnome.desktop.wm.preferences num-workspaces` 👉 `1` (Fija permanentemente tu Origen inicial).

> **Aviso:** Debido a esto, atajos manuales de sistema para tratar de generar Workspaces extra no surtirán ningún efecto. Todo ruteo tridimensional visual de GNOME ahora será automáticamente gobernado bajo el estricto mandato asíncrono de las ventanas maximizadas por esta herramienta.

---

## 📚 Documentación Técnica

¿Eres un programador de Extensiones Javascript u Open Source deseoso de colaborar? Repasa intensamente la carpeta local `/docs` para entender con diagramas estructurales nuestra arquitectura pesada y componentes de API base:

* [Visión de Arquitectura](docs/architecture.md)
* [Gestión de Estado (Lifecycle Roundtrip)](docs/state_management.md)
* [Rutas de Entrada y Anomalías en Wayland](docs/input_handling.md)
* [Referencia API (Código Interno)](docs/api-reference.md)
* [Changelog / Registro de Versiones](docs/changelog.md)

---

## 🛠️ Tecnologías Involucradas
- **JavaScript (ES6+)** implementado mediante GJS (GNOME JS engine bindings).
- **St & Clutter Toolkit** para inyecciones en el Stage rendering de DOM nativo de Linux.
- **Meta / Mutter Window Manager** para el secuestro asincrono estructural del OS window behavior por debajo del puente X11 y Wayland.
- **GLib / Gio** como backend sincrónico IO para eventos de timeouts. 

---
**Licencia:** GPL-3.0
