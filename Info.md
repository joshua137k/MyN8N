# 📦 JFlows - Plataforma Modular de Automação

O **JFlows** é um sistema de automação inspirado no [n8n](https://n8n.io), com foco em simplicidade, controle e extensibilidade pessoal. Ele permite a criação de fluxos de trabalho com blocos visuais para automatizar tarefas, processar dados e integrar serviços.

---

## 🎯 Objetivo do Projeto

Recriar uma plataforma de automação pessoal com os seguintes blocos básicos:

- 📁 **Leitura/Escrita de Arquivos**: TXT, CSV, XLSX, JSON etc.
- 🌐 **HTTP**: requisições `GET`, `POST`, `PUT`, `DELETE`.
- ⏰ **Agendador (Schedule Flows)**: execução única ou recorrente.
- 🔀 **Fluxos Lógicos**: `if`, `and`, `or`, `not`, `switch`.
- 🔤 **Operações de Texto**: concatenação, regex, limpeza.
- 🧮 **Operações Matemáticas**: soma, média, mínimo, máximo, fórmulas.
- 🕷️ **Scraping de Sites**: HTML básico, APIs e dados estruturados.


### 🔄 Controle de Fluxo
- `Switch / Case`: seleções condicionais com múltiplas opções.
- `Loop / ForEach`: iteração sobre listas ou arrays.
- `Try / Catch`: tratamento de exceções dentro do fluxo.
- `Break / Continue`: controle fino de execução.

---

### 📡 Integrações & APIs
- `Email (SMTP/IMAP)`: envio e leitura de emails.
- `Telegram / Discord Webhook`: envio de mensagens automatizadas.
- `Google Sheets`: integração com planilhas online.
- `OpenAI / ChatGPT`: uso de IA para processar dados.
- `Webhook Listener`: inicia fluxo ao receber dados externos.

---

### 📊 Manipulação de Dados
- `Filtrar`: remover ou manter registros com base em critérios.
- `Agrupar / Somar / Contar`: operações tipo SQL `GROUP BY`.
- `Regex Match / Replace`: buscas e substituições.
- `Conversão de Tipos`: texto ↔ número, data ↔ string etc.


### 🕵️ Scraping e Navegação
- `Headless Browser (Puppeteer / Playwright)`: scraping de páginas com JS.
- `Extrair PDF / DOCX`: parse de documentos.
- `Screenshot`: capturas automáticas de páginas.


---

### 🛠️ Utilitários
- `Cronômetro`: medir tempo de execução de partes do fluxo.
- `Logger Avançado`: com níveis (info, warning, error).
- `Gerador de UUID / GUID`: identificadores únicos.
- `Get Data\Hora`: Pegar data e hora atuais
- `Hashing`: MD5, SHA256, etc.
- `Env Vars / Secrets`: variáveis sensíveis.

---

### 🎨 Interface
- `Prompt Manual`: espera por input do usuário.
- `Dashboard Builder`: mostrar gráficos simples (linha, barra, contadores).

---

### 🔁 Execução e Agendamento
- `Watch Folder`: monitoramento de diretórios por novos arquivos.
- `Repetição em Intervalo`: por segundo, minuto, hora.
- `Delay`: atraso intencional no fluxo.

---

