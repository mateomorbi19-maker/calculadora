# Calculadora ROI · IA en tu negocio

Calculadora web estática para estimar el retorno de inversión de implementar IA en un negocio.
Ingresás tus números (tiempo, errores, inversión), elegís moneda y ves ROI, payback y break-even en vivo.

## Cómo abrirla localmente

Hacé doble click en `index.html`. La calculadora abre directamente en tu navegador, sin instalar nada.

> El gráfico de break-even usa Chart.js cargado por CDN, así que la primera vez necesita conexión a internet. Los cálculos numéricos funcionan sin conexión.

## Estructura

```
calculadora/
├── index.html       Markup, header con selector de moneda, inputs y resultados
├── styles.css       Estilos: paleta blanco/negro, layout responsivo
├── calculator.js    Cálculos reactivos, formateo y gráfico
├── README.md        Este archivo
└── .gitignore       Exclusiones de git (SO, editores, logs, env)
```

## Fórmulas

```text
ahorroTiempoAnual       = max(0, horasAntes - horasDespues) * costoHora * 52
erroresEvitadosAnual    = volumenMensual * max(0, (tasaErrorAntes - tasaErrorDespues) / 100) * costoError * 12
beneficioBrutoAnual     = ahorroTiempoAnual + erroresEvitadosAnual
costosAño1              = costoUnico + (costoMensual * 12)
ahorroNetoAnual         = beneficioBrutoAnual - costosAño1
roi                     = (ahorroNetoAnual / costosAño1) * 100
beneficioMensualNeto    = (beneficioBrutoAnual / 12) - costoMensual
payback                 = costoUnico / beneficioMensualNeto   (en meses)
```

Casos borde:
- Si `costosAño1 = 0`, ROI muestra `—`.
- Si `beneficioMensualNeto ≤ 0`, payback muestra `Sin payback`.
- Si `payback > 60`, muestra `60+ meses`.
- Inputs negativos se redondean a 0; vacíos se interpretan como 0.

## Cómo deployar

Es un sitio 100% estático: tres archivos (`index.html`, `styles.css`, `calculator.js`) se sirven con cualquier servidor web o servicio de hosting estático. No hay build step ni dependencias del lado del servidor.
