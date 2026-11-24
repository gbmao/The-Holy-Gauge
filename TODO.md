# TODO

Análise do código em 22/11/2026. Foco definido: funcionalidades que faltam para usar o app Android.

As tarefas abaixo refletem decisões confirmadas pelo responsável pelo projeto. A numeração identifica os itens; a prioridade ainda será definida. As caixas marcadas indicam tarefas implementadas.

## Tarefas confirmadas

- [x] **T01 — Impedir lançamentos sem veículo selecionado.**
  - Orientar o usuário a cadastrar ou selecionar um veículo antes de registrar abastecimento ou manutenção.
  - Impedir também a gravação sem seleção na camada responsável por salvar o lançamento.
  - Critério de aceite: sem veículo selecionado, nenhuma linha nova de abastecimento ou manutenção é criada; após selecionar um veículo ativo, o lançamento aparece somente no histórico dele.
  - Diagnóstico original: `frontend/js/bottom-sheet.js`, `frontend/js/repositories/sqlite-refuelling-repository.js:create()` e `frontend/js/repositories/sqlite-maintenance-repository.js:create()` permitiam o fluxo com seleção nula. O schema aceita `VEHICLE_ID = NULL`.
  - Implementação: ao tentar salvar sem seleção, a interface abre uma janela no estilo do app com “Cancelar” e “Meus Veículos”. Os dois repositórios conferem a seleção ativa e só inserem se ela continuar válida no momento da gravação. O schema e os registros antigos foram preservados.
  - Verificação: `npm run test:vehicle-selection` cobre ausência de cadastro/seleção, veículo inativo, mudança de estado antes do INSERT, vínculo correto, preservação de registros antigos e o bloqueio no envio dos formulários. Testes de banco usam SQLite em memória; falta validação manual no Android.

- [x] **T02 — Calcular consumo somente entre dois abastecimentos consecutivos de tanque cheio.**
  - Consultar os abastecimentos consecutivos do veículo antes de verificar se ambos são de tanque cheio. A consulta atual filtra os tanques cheios antes de escolher o par e pode pular abastecimentos parciais.
  - Usar a diferença entre as quilometragens dividida pelos litros do abastecimento atual, quando houver dados válidos.
  - Critério de aceite: um parcial entre dois tanques cheios impede calcular consumo usando esses dois tanques como par; dois registros consecutivos de tanque cheio e com dados válidos permitem o cálculo.
  - Diagnóstico original: `frontend/js/repositories/sqlite-refuelling-repository.js:getAverageConsumption()` filtrava tanques cheios antes de escolher o par e diferia da verificação feita em `frontend/js/services/refuelling-service.js:create()`.
  - Implementação: a consulta escolhe os dois últimos abastecimentos ativos do veículo, ordenados por data e ID, sem pular parciais ou registros incompletos. O cálculo exige ambos com tanque cheio, quilometragens válidas, distância positiva e litros atuais maiores que zero. Sem par válido, retorna `null` e o indicador mostra “—”, sem reutilizar consumo anterior. Carregamento e falha de leitura também mostram “—”.
  - Escopo aprovado: app Android/SQLite, na mesma branch do T01. A API/SQL Server mantém o comportamento anterior.
  - Verificação: `node --test frontend/tests/refuelling-consumption.test.mjs` cobre pares consecutivos, interrupção por parcial/dados ausentes, seleção, isolamento por veículo, status, desempate por ID, arredondamento, consistência com o serviço e formatação. Testes de banco usam SQLite em memória; falta validação manual no Android desta alteração.

- [x] **T03 — Permitir editar veículos.**
  - Disponibilizar edição de nome, marca, modelo e ano dos veículos cadastrados.
  - Critério de aceite: os dados editados persistem ao reabrir o app, mantendo o mesmo veículo e seus históricos e fotos associados.
  - Diagnóstico original: `frontend/pages/meus-veiculos-page.js`, `frontend/js/services/vehicle-service.js` e `frontend/js/repositories/sqlite-vehicle-repository.js` ofereciam cadastro, seleção e exclusão, mas não edição.
  - Implementação: “Editar veículo” no cartão abre a página de cadastro com os dados preenchidos. Salvar atualiza somente nome, marca, modelo e ano do mesmo registro ativo, mantendo ID, seleção, históricos e fotos. Uma confirmação mostra os dados salvos e retorna a Meus Veículos ao tocar em “OK”. Mantidas as regras atuais de cadastro e a branch do T01/T02, conforme as escolhas do responsável.
  - Verificação: `node --test frontend/tests/vehicle-edit.test.mjs` cobre persistência após reabrir o banco, preservação de vínculos e seleção, limpeza de campos opcionais, validação, carregamento, falhas, confirmação e cadastro sem ID. Testes usam SQLite em memória e elementos simulados; falta validação manual no Android desta alteração.

- [x] **T04 — Permitir editar e excluir abastecimentos.**
  - Disponibilizar as ações no histórico e atualizar os indicadores afetados após a alteração.
  - Critério de aceite: corrigir um lançamento atualiza seu histórico, gasto e consumo conforme as regras aprovadas; excluir um lançamento retira sua contribuição dos indicadores.
  - Diagnóstico original: `frontend/pages/abastecimentos-page.js` apenas listava registros. O repositório SQLite oferecia `softDelete()`, sem ação na interface nem edição.
  - Decisões aprovadas: permitir corrigir data/hora e quilometragem validando os vizinhos com odômetro na ordem cronológica, sem valores iguais; registros sem odômetro são permitidos e empates de data/hora usam o ID. Excluir mediante confirmação e recuperar pela lista de excluídos; recusar recuperação que conflite com as quilometragens após outras edições.
  - Implementação: ações “Editar” e “Excluir” no histórico ativo e filtro “Excluídos” com ação “Recuperar”. Formulário preenchido com dados persistidos; atualização mantém ID, veículo e vínculo com o posto. Serviço valida os vizinhos e a migration 9 protege alterações/restaurações também no SQLite, preservando os dados existentes. Históricos e indicadores são relidos após alterações e ao retornar à tela inicial pelo cache de navegação. Escopo Android/SQLite; cadastro de eventos passados continua no T06.
  - Verificação: `node --test frontend/tests/refuelling-edit.test.mjs` cobre persistência após reabrir SQLite, custo/mês, consumo, quilometragem, cronologia, empates por ID, registros sem odômetro, recuperação com conflito, isolamento por veículo, migration, falhas, cancelamento e envios duplicados. Fluxos verificados no Chrome com largura de celular, usando a versão compilada e uma ponte de teste para o serviço/repositório reais com SQLite em memória. Falta validação manual em aparelho Android.

- [x] **T05 — Permitir editar e excluir manutenções.**
  - Disponibilizar as ações no histórico e atualizar os valores e informações de próxima revisão afetados.
  - Critério de aceite: alterações persistem ao reabrir o app; registros excluídos deixam de compor o histórico ativo e o gasto mensal.
  - Diagnóstico original: `frontend/pages/manutencao-geral-page.js`, `frontend/js/services/maintenance-service.js` e `frontend/js/repositories/sqlite-maintenance-repository.js` não ofereciam essas operações.
  - Decisões aprovadas: confirmar a exclusão e permitir recuperação em uma lista de excluídas. Na edição, aceitar quilometragem inferior à do último abastecimento, validando a próxima revisão em relação à própria manutenção. O cadastro mantém sua regra atual; as demais regras de cronologia continuam no T06.
  - Implementação: ações “Editar” e “Excluir” nos registros ativos de Manutenção geral, formulário preenchido com os dados persistidos, confirmação antes de inativar e filtro “Excluídas” com ação “Recuperar”. As operações mantêm ID e veículo e são restritas ao veículo ativo selecionado. Custos e próxima revisão são relidos após as alterações; ao voltar à tela inicial pelo cache de navegação, gasto mensal e histórico também são atualizados. Escopo Android/SQLite.
  - Verificação: `node --test frontend/tests/maintenance-edit.test.mjs` cobre edição, exclusão, recuperação, persistência após reabrir SQLite, gasto por mês, próxima revisão, isolamento por veículo, validações, cancelamento, falhas e envios duplicados. Fluxos da interface verificados no Chrome com largura de celular e API simulada, usando a versão compilada; falta validação manual no Android.

- [x] **T06 — Permitir lançamentos de eventos passados e validar pela ordem cronológica.**
  - Permitir informar a data do abastecimento; manter a data informada na manutenção.
  - Validar a quilometragem considerando a posição do evento no histórico do veículo, inclusive ao editar um registro antigo, em vez de comparar sempre com o abastecimento mais recente.
  - Atualizar históricos, consumo e gastos do período afetado após incluir ou editar um lançamento passado.
  - Critério de aceite: uma manutenção anterior ao último abastecimento não é recusada apenas por ter quilometragem menor que ele; um abastecimento antigo pode ser registrado na data correta; alterações não introduzem inconsistências de quilometragem na sequência cronológica.
  - Diagnóstico original: o formulário de abastecimento não enviava data e a validação de novos registros consultava o abastecimento mais recente.
  - Decisões aprovadas: cruzar os dois tipos entre dias locais diferentes, permitindo igualdade; abastecimentos mantêm ordem por instante/ID e aumento estrito. Manutenção mantém apenas data, sem ordem imposta no mesmo dia. Odômetro ausente permanece vazio e não limita outros registros.
  - Implementação: formulário aceita data/hora passada; serviço reaproveita a validação da T04 e usa o antecessor cronológico no consumo. Migration 10 valida cadastro, edição e recuperação dos dois tipos sem preencher odômetros ausentes. O critério mensal de fuso permanece pendente no achado específico abaixo.
  - Verificação: 181 testes passaram, incluindo posição histórica, validação cruzada, preservação de dados e campos opcionais. Formulário verificado no Chrome ligado ao serviço/SQLite de teste; falta validação manual em aparelho Android.

## Funcionalidades adiadas por decisão do responsável

- **Backup e restauração — deixar para depois.** Não há fluxo de exportação/importação de dados e fotos. O README documenta essa ausência. A opção `allowBackup` do Android está habilitada, mas não constitui uma funcionalidade de backup manual do app.
- **Alertas e status de revisões — deixar para depois.** O app grava a próxima data/quilometragem, mas apenas exibe os valores; não calcula a situação da revisão nem envia notificações. Referências: `frontend/js/api.js:mapMaintenanceRecord()`, `frontend/pages/manutencao-geral-page.js:formatNextReview()` e `docs/maintenance.md`.

## Outros achados para avaliar antes de definir tarefas

- **Gasto mensal e fuso horário:** a consulta compara timestamps UTC com limites de mês sem fuso. Em reprodução com as migrations e a consulta atuais, um abastecimento de R$ 60 às 22h de 30/11/2026 em São Paulo ficou fora do gasto de novembro. Referência: `frontend/js/repositories/sqlite-refuelling-repository.js:getMonthlyExpense()`. Definir qual fuso deve determinar o mês dos gastos.
- **Significado de “Total km”:** o indicador consulta apenas a quilometragem do último abastecimento. Uma manutenção posterior com quilometragem maior não altera o valor. Definir se o indicador representa odômetro atual ou distância percorrida. Referências: `frontend/js/repositories/sqlite-refuelling-repository.js:getTotalKm()` e `frontend/pages/index.html`.
- **Mensagens de validação do abastecimento:** erros específicos lançados pelo serviço, como quilometragem não crescente, viram uma mensagem genérica na interface. O tratamento detalhado existe apenas para manutenção. Referência: `frontend/js/bottom-sheet.js:handleAdd()`.
- **Falhas de leitura dos indicadores:** o consumo mostra “—” em caso de falha, conforme a decisão do T02; quilometragem e gasto mensal ainda aparecem como zero quando a leitura falha. A apresentação desses dois últimos indicadores continua pendente. Referências: `frontend/js/index.js` e `frontend/js/sidebar.js:loadMonthlyExpense()`.
- **Registros antigos sem veículo:** a migration 4 preserva esses dados, mas as consultas atuais não os exibem no histórico de um veículo. Definir se haverá associação manual desses registros. Referências: `frontend/js/database/migrations.js` e filtros dos repositórios SQLite.
- **Capacidade do tanque:** o serviço aceita esse limite, mas não há campo no veículo nem configuração passada ao serviço. A regra documentada não é aplicada no fluxo atual. Definir se permanece no escopo. Referências: `docs/requirements.md`, `frontend/js/models/vehicle.js`, `frontend/js/api.js` e `frontend/js/services/refuelling-service.js`.
- **Consulta de gastos e históricos:** o gasto mensal mostra somente o mês atual; os históricos não oferecem filtros ou busca. Definir se consulta por período deve entrar no TODO. Referências: `frontend/js/sidebar.js` e páginas de históricos.
- **Validação do uso Android:** há testes JavaScript de fotos, bloqueio sem veículo selecionado e consumo, incluindo consultas SQLite em memória. Ainda não há testes automatizados dos fluxos completos no SQLite nativo. Definir a cobertura junto às tarefas aprovadas; o build web não valida o comportamento no aparelho.

## Item anterior preservado

- [ ] Revisar e limpar o código considerando a abordagem **mobile-first**, deixando a API apenas como backend para receber e processar requisições.

O alcance desse item ainda depende de decisão. O README prioriza Android offline e pausa a versão de navegador; o app Android acessa SQLite local, enquanto o navegador usa a API. Não foi decidido remover, ampliar ou integrar o backend ao fluxo Android.

## Verificação realizada

- `npm run build`: passou.
- `npm run test:photos`: 13 testes passaram.
- `dotnet test HolyGauge.sln --no-restore --verbosity minimal`: 20 testes passaram e 1 teste de integração não foi executado por falta de SQL Server de teste configurado.
- O comando .NET emitiu avisos NU1902 e NU1903 para `System.Security.Cryptography.Pkcs` 9.0.13. A versão de correção e o impacto no backend precisam ser avaliados antes de definir a atualização.
- Reproduções em SQLite temporário, usando as migrations do projeto: inserção de abastecimento/manutenção sem veículo; consumo com parcial intermediário; diferença entre a quilometragem de manutenção e o indicador; gasto na virada de mês com timestamp UTC.
- Não foi realizada validação em aparelho ou emulador Android.
