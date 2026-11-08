# The Holy Gauge — Controlador da Moto

Aplicativo Android para acompanhar veículos, abastecimentos, manutenções, gastos e consumo de combustível. Funciona offline, com os dados salvos no SQLite do aparelho.

**O foco atual é o app Android. O desenvolvimento da versão para navegador está pausado e ela pode não acompanhar as funcionalidades do aplicativo.**

## Funcionalidades

- Cadastro de vários veículos, com nome, marca, modelo e ano.
- Seleção do veículo em uso na página **Meus Veículos**.
- Foto por veículo, com captura pela câmera e exclusão do arquivo pelo app.
- Registro de abastecimentos e manutenções, com históricos completos.
- Consulta de gasto mensal e consumo médio por veículo.
- Exclusão de veículos mediante confirmação, inativando o histórico e removendo suas fotos.

Para começar, cadastre e selecione um veículo em **Meus Veículos**. Os históricos e indicadores exibem os dados dessa seleção; sem veículo selecionado, ficam vazios ou zerados.

Os dados permanecem no aparelho. Ainda não há backup ou sincronização entre dispositivos. Ao excluir um veículo, seu histórico fica inativo no banco e suas fotos são apagadas definitivamente.

## Compilar e instalar no Android

Requisitos: Node.js 18 ou superior, JDK 17 e Android SDK com a plataforma 34 e Build Tools 34.0.0. Configure `ANDROID_HOME` e adicione `platform-tools` ao `PATH`.

Na raiz do repositório:

```bash
npm install
npm run cap:sync
npm run android:build
```

O APK de depuração é gerado em `android/app/build/outputs/apk/debug/app-debug.apk`.

Para instalar em um celular conectado por USB, habilite a depuração USB, autorize o computador no aparelho e execute:

```bash
npm run android:install
```

O código da interface fica em `frontend/` e o projeto nativo em `android/`. Use `npm run cap:open` para abrir o projeto no Android Studio.

## Releases

A primeira release Android está em preparação. Os APKs e as notas de cada versão serão disponibilizados em [Releases](https://github.com/gbmao/The-Holy-Gauge/releases).

Os comandos acima geram um **APK de depuração**. Antes de publicar o APK de distribuição, é necessário configurar a assinatura de release e definir `versionCode` e `versionName` em `android/app/build.gradle`.
