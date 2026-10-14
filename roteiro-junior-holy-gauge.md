# Roteiro para o nível júnior: The Holy Gauge

Este roteiro lista o que falta no projeto para ele ser considerado nível júnior. Os itens da Fase 1 são os que mais pesam. As estimativas de tempo são aproximadas e consideram estudo em meio período.

---

## Regras do jogo

- **Pode usar IA**, mas em cada item é preciso explicar o que foi feito e por quê. Ao fim de cada fase haverá uma revisão ao vivo de cerca de 15 minutos.
- Um item só conta como concluído quando o critério **"Pronto quando"** for demonstrado, e não quando o código for entregue.
- Trabalhar com uma branch por tarefa e um Pull Request, mesmo sozinho.

---

## Fase 1: bloqueadores (cerca de 1 semana)

- [ ] **Versionar o banco de dados**
  - ~~Criar a pasta `database/` com o schema, as stored procedures e alguns dados de exemplo.~~
  - ~~Criar um `.env.example`.~~
  - Escrever no README o passo a passo: Docker, user-secrets e como rodar.
  - **Pronto quando:** outra pessoa clona o projeto e o coloca para rodar em 15 minutos.

- [x] **Corrigir o async**
  - ~~Em `GetMonthlyExpenseAsync` e `GetAverageConsumptionAsync`, trocar `Open()` por `OpenAsync()` e `ExecuteScalar()` por `ExecuteScalarAsync()`, com `await`.~~
  - ~~Saber explicar por que o método antigo era `async` mas continuava bloqueando a thread.~~
  - ~~**Pronto quando:** o build sai sem o warning CS1998.~~

- [ ] **Validar no backend (não só no front)**
  - ~~Litros maiores que 0.~~
  - ~~Preço da gasolina não negativo.~~
  - ~~Quilometragem maior que a do abastecimento anterior.~~
  - Devolver `400` com mensagem clara, usando `Results.ValidationProblem` ou `ProblemDetails`.
  - **Pronto quando:** enviar litros `-5` direto para a API não grava nada.

- [ ] **Ajustar o desenho da API**
  - `POST /api/refuelling` deve devolver `201` (Created).
  - `GET /api` deve virar `GET /api/refuelling`.
  - Criar um `CreateRefuellingRequest` separado do model `Refuelling`.
  - Remover o `Hello World` e o `/db-check`, ou trocar por `AddHealthChecks`.

- [ ] **Tratar erros e registrar logs**
  - Usar `UseExceptionHandler` com `ProblemDetails`.
  - Usar `ILogger` no repositório.
  - **Pronto quando:** com o banco fora do ar, a API responde `500` limpo e registra o erro no log.

---

## Fase 2: qualidade (cerca de 1 a 2 semanas)

- [ ] **Criar a camada de serviço**
  - Criar o `RefuellingService` com as regras de negócio.
  - Os endpoints apenas chamam o serviço, e o `Program.cs` fica enxuto (pode usar `MapGroup`).

- [ ] **Escrever testes com xUnit**
  - De 3 a 5 testes unitários no serviço: litros inválidos, km menor que a anterior, cálculo de consumo (com tanque cheio e sem).
  - Opcional: 1 teste de integração com `WebApplicationFactory`.
  - **Pronto quando:** `dotnet test` passa e ele explica por que escolheu esses casos.

- [ ] **Fazer a limpeza do projeto**
  - Remover o `MySqlConnector` do `csproj` (não é usado).
  - Atualizar o `.http` com os endpoints reais (hoje aponta para `/weatherforecast`).
  - Renomear `FuellingHistoryDto.cs` para bater com a classe `RefuellingHistoryDto`.
  - Padronizar nomes (`Dh_refuelling` vira PascalCase) e o idioma (português ou inglês, não os dois).
  - Tirar a origem do CORS do código e colocar na configuração.
  - Mover os arquivos do front para uma pasta `frontend/`.
  - Criar um arquivo `.sln`.

- [ ] **Usar o Git de forma profissional**
  - Uma branch por tarefa, com Pull Request, mesmo trabalhando sozinho.
  - Commits pequenos e focados.
  - Criar um GitHub Actions simples que rode `dotnet build` e `dotnet test`.

---

## Fase 3: diferencial (opcional)

- [x] **Atender o FR-03**: API e SQLite limitam o histórico aos cinco abastecimentos ativos mais recentes.
- [ ] **Alinhar `data-model.md` ao model**: o documento cita `id_gas` e `cd_status` (soft delete), que não existem no model.

- [x] **Trocar `AddWithValue`** por `Parameters.Add` com tipo explícito (por exemplo, `SqlDbType.Decimal`) e explicar o motivo.

- [x] **Documentar os endpoints no README**, com exemplos de requisição e resposta.

---

## Quando considerar que ele chegou ao nível júnior

1. Alguém que não conhece o projeto consegue rodá-lo só com o README.
2. Os testes passam no CI.
3. Nenhuma regra de negócio existe só no front.
4. Ele explica sem ajuda a diferença entre o `async` errado e o certo, e por que colocou cada regra onde colocou.

---

## Perguntas para a revisão ao vivo

- Qual a diferença entre `CreateAsync` e `GetMonthlyExpenseAsync`? Um deles tem um problema. Qual?
- Onde deveria ficar a regra de que a km precisa ser maior que a anterior? Por quê?
- O que acontece se dois abastecimentos forem gravados ao mesmo tempo?
- Por que stored procedures em vez de Entity Framework?
- Explique o caminho completo de um abastecimento, do clique no front até o banco.
