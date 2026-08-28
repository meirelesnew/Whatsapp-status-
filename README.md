# 🎬 CortaStatus - Divisor de Vídeo para WhatsApp & Stories

O **CortaStatus** é uma aplicação web leve e ultra-rápida criada para dividir vídeos longos em partes ideais para o **WhatsApp Status** (30s ou 60s) e **Instagram Stories** (15s ou 60s).

Todo o processamento é executado **100% no navegador do usuário (Client-Side)** usando WebAssembly, garantindo **privacidade total** (o vídeo nunca é enviado para nenhum servidor externo).

---

## 🚀 Funcionalidades

- 🔒 **100% Privado e Seguro:** Processamento local via FFmpeg.wasm.
- ⚡ **Corte Instantâneo:** Utiliza a flag `-c copy` para fatiar vídeos em segundos sem perda de qualidade.
- ⏱️ **Seletor Flexível de Duração:** Opções pré-configuradas para 15s (Stories), 30s (WhatsApp padrão) e 60s (Status longo).
- 📲 **Compartilhamento Direto:** Integração com a Web Share API para enviar direto ao WhatsApp.
- 📦 **Download em Lote (.ZIP):** Baixe todas as partes numeradas em um único arquivo `.zip`.
- 📱 **PWA (Progressive Web App):** Instalável na tela inicial do Android e iOS como um app nativo.
- 🖱️ **Drag & Drop:** Suporte para arrastar e soltar arquivos na versão desktop.

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 & JavaScript (ES6+)**
- **Tailwind CSS v4** (Interface responsiva)
- **FFmpeg.wasm v0.12** (Motor de vídeo WebAssembly Single-Threaded)
- **JSZip** (Compactação de arquivos em lote)
- **Service Worker & Manifest** (Suporte PWA)

---

## 📁 Estrutura do Repositório

```text
├── index.html       # Interface visual da aplicação
├── app.js           # Lógica do FFmpeg, manipulação do DOM e PWA
├── manifest.json    # Configuração de instalação no celular
├── sw.js            # Service Worker para suporte a cache
└── README.md        # Documentação do projeto
