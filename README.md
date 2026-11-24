# The Holy Gauge — Controlador da Moto

Aplicativo Android para acompanhar veículos, abastecimentos, manutenções, gastos e consumo de combustível. Funciona offline, com os dados salvos no SQLite do aparelho.

**O foco atual é o app Android. O desenvolvimento da versão para navegador está pausado e ela pode não acompanhar as funcionalidades do aplicativo.**

## Funcionalidades

- Cadastro e edição de vários veículos, com nome, marca, modelo e ano.
- Seleção do veículo em uso na página **Meus Veículos**.
- Foto por veículo, com captura pela câmera e exclusão do arquivo pelo app.
- Registro de abastecimentos e manutenções, com históricos completos.
- Edição de manutenções e exclusão com confirmação, com recuperação pela lista de excluídas.
- Consulta de gasto mensal e consumo médio por veículo.
- Exclusão de veículos mediante confirmação, inativando o histórico e removendo suas fotos.

Para começar, cadastre e selecione um veículo em **Meus Veículos**. Os históricos e indicadores exibem os dados dessa seleção; sem veículo selecionado, os históricos ficam vazios, o consumo mostra **—** e os demais indicadores ficam zerados.

Para corrigir os dados de um veículo, toque em **Editar veículo** no cartão em Meus Veículos. O formulário abre preenchido; após salvar, confira a confirmação e toque em **OK** para voltar à lista. A edição mantém o mesmo veículo, sua seleção, históricos e fotos.

Em **Manutenção geral**, use **Editar** para corrigir descrição, data, custo, quilometragem, próxima revisão e observações. A edição de registros antigos aceita quilometragem menor que a do último abastecimento; a próxima quilometragem e a próxima data não podem ser anteriores às da própria manutenção. Os campos opcionais podem ser apagados.

Use **Excluir** e confirme para retirar uma manutenção do histórico ativo e do gasto mensal. Para recuperá-la, abra **Excluídas** e toque em **Recuperar**; o registro volta ao histórico ativo, incluindo seu custo no mês da manutenção e suas informações de próxima revisão. Essas alterações ficam salvas no aparelho e respeitam o veículo selecionado.

Ao tentar salvar um abastecimento ou uma manutenção sem veículo selecionado, o app mostra um aviso com as opções **Cancelar** e **Meus Veículos**. O lançamento só pode ser salvo depois de selecionar um veículo ativo.

No Android, o consumo usa os dois últimos abastecimentos ativos do veículo, desde que sejam consecutivos e ambos de tanque cheio: a diferença de quilometragem dividida pelos litros do abastecimento atual. Se houver um parcial no par, faltarem quilometragens ou os valores não permitirem o cálculo, o indicador mostra **—**, sem reutilizar consumo anterior. Durante o carregamento ou em caso de falha de leitura, também mostra **—**.

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
