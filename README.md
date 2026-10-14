# The-Holy-Gauge


# The Holy Gauge - Roadmap

## 1. Objetivo do projeto
Criar uma aplicação de controle da minha moto, onde eu possa registrar:

- abastecimento
- manutenções

E que possa calcular média de gastos e de consumo de gasolina.

## 2. MVP

- ~~registrar um abastecimento~~
- ~~ver o consumo médio~~
- ~~ver o gasto mensal~~

## 3. Próximas funcionalidades

A base mobile está pronta: o app Android usa SQLite local para abastecimentos, enquanto o navegador continua usando a API HTTP. As próximas entregas são:

- substituir os dados simulados de manutenção por registros persistidos;
- permitir cadastrar e configurar a moto, incluindo a capacidade do tanque;
- adicionar edição e exclusão de abastecimentos e manutenções pela interface;
- definir uma estratégia de backup e sincronização dos dados locais com a API, caso seja necessário acessá-los em mais de um aparelho.


## Como rodar o projeto

### 1. Pré-requisitos

Antes de iniciar, tenha instalado:

- .NET SDK
- Docker
- Docker Compose

---

### 2. Configurar a senha do banco (opcional)

Para iniciar rapidamente em ambiente local, não é necessário criar um `.env`: o Compose usa a senha pública de desenvolvimento `HolyGaugeDev_2026!`. Ela serve exclusivamente para desenvolvimento local e não deve ser reutilizada em produção nem em ambientes acessíveis pela rede. Para trocar a senha local, copie `.env.example` para `.env` e defina `MSSQL_SA_PASSWORD`.

> O arquivo `.env` não deve ser versionado. A senha padrão acima é pública e exclusiva para desenvolvimento local.

---

### 3. Subir o banco com Docker

Na raiz do projeto, execute:

```bash
docker compose up -d
```

O Compose aguarda o SQL Server ficar pronto e então cria o banco `HolyGauge`, as tabelas e as procedures.

Para verificar se o container está rodando:

```bash
docker ps
```

Para encerrar os containers:

```bash
docker compose down
```

---

### 4. Configurar o User Secrets

Entre na pasta do projeto ASP.NET:

```bash
cd <pasta-do-backend>
```

Inicialize o User Secrets, caso ainda não tenha sido configurado:

```bash
dotnet user-secrets init
```

Adicione a connection string:

```bash
dotnet user-secrets set "ConnectionStrings:HolyGaugeDatabase" "Server=localhost,1434;Database=HolyGauge;User Id=sa;Password=SUA_SENHA;TrustServerCertificate=True"
```

Use a senha definida em `.env` ou, se estiver usando o padrão local, `HolyGaugeDev_2026!`.

Para conferir os secrets configurados:

```bash
dotnet user-secrets list
```

> Não coloque no repositório senhas privadas nem connection strings com credenciais próprias. A senha pública de desenvolvimento documentada acima é exclusiva para uso local.

---

### 5. Restaurar dependências

```bash
dotnet restore
```

---

### 6. Rodar a API

```bash
dotnet run
```

A API será iniciada no endereço exibido pelo terminal, por exemplo:

```text
http://localhost:5199
```

### Endpoints da API

Os exemplos usam `http://localhost:5199` como endereço base. As respostas JSON usam nomes de propriedades em camelCase.

| Método | Endpoint | Descrição | Resposta de sucesso |
| --- | --- | --- | --- |
| `GET` | `/api/refuelling` | Lista os cinco abastecimentos ativos mais recentes, ordenados por data e identificador. | `200 OK` com uma lista |
| `POST` | `/api/refuelling` | Registra um abastecimento. | `201 Created` sem corpo |
| `GET` | `/api/monthly-expense?month=10&year=2026` | Retorna o gasto total do mês informado. | `200 OK` com um número decimal |
| `GET` | `/api/average-consumption` | Retorna o consumo médio calculado pelo último par elegível de abastecimentos de tanque cheio. | `200 OK` com um número decimal |
| `GET` | `/api/maintenance` | Lista as manutenções registradas. | `200 OK` com uma lista |
| `POST` | `/api/maintenance` | Registra uma manutenção. | `201 Created` sem corpo |

Exemplo de criação de abastecimento:

```http
POST /api/refuelling HTTP/1.1
Content-Type: application/json

{
  "liters": 12.5,
  "blAdditive": false,
  "mileage": 15400,
  "blFullTank": true,
  "gasPrice": 5.89
}
```

Exemplo de resposta de `GET /api/refuelling` (a lista contém no máximo cinco itens):

```json
[
  {
    "id": 42,
    "occurredAt": "2026-10-14T12:30:00",
    "liters": 12.5,
    "total": 73.63,
    "odometer": 15400
  }
]
```

`GET /api/monthly-expense?month=10&year=2026` e `GET /api/average-consumption` retornam um número JSON, por exemplo `184.50` e `12.4`, respectivamente.

Exemplo de criação de manutenção:

```http
POST /api/maintenance HTTP/1.1
Content-Type: application/json

{
  "description": "Troca de óleo",
  "date": "2026-10-14T00:00:00",
  "kilometers": 15400,
  "cost": 120.00,
  "nextKilometers": 18400,
  "nextDate": "2027-04-14T00:00:00",
  "notes": "Óleo 10W-30"
}
```

`GET /api/maintenance` retorna uma lista com as propriedades `id`, `description`, `date`, `kilometers`, `cost`, `nextKilometers`, `nextDate` e `notes`; valores opcionais podem ser `null`. Erros de validação e de servidor são retornados como `Problem Details`.

Exemplo de resposta de `GET /api/maintenance`:

```json
[
  {
    "id": 7,
    "description": "Troca de óleo",
    "date": "2026-10-14T00:00:00",
    "kilometers": 15400,
    "cost": 120.0,
    "nextKilometers": 18400,
    "nextDate": "2027-04-14T00:00:00",
    "notes": "Óleo 10W-30"
  }
]
```

---

### 7. Rodar o frontend

Os arquivos do frontend ficam em `frontend/`. Os comandos abaixo podem ser executados na raiz do repositório.

Instale as dependências e inicie o Vite:

```bash
npm install
npm run dev
```

Abra a URL mostrada pelo Vite, normalmente `http://localhost:5173`.

Com o frontend e a API em execução, o Holy Gauge estará pronto para uso.

Em desenvolvimento, o CORS permite `http://localhost:5173` e `http://127.0.0.1:5173`, configurados em `appsettings.Development.json`. Em outros ambientes, defina as origens permitidas por `Cors:AllowedOrigins`, por exemplo com `Cors__AllowedOrigins__0=https://seu-frontend.example.com`.

Para aplicar as atualizações idempotentes do schema SQL Server a um banco local já existente, execute:

```bash
docker compose run --rm database-init
```

### Executar os testes

O projeto xUnit fica em `backend/HolyGauge.Api.Tests`. Para executar os testes, use na raiz do repositório:

```bash
dotnet test backend/HolyGauge.Api.Tests/HolyGauge.Api.Tests.csproj
```

---

## Resumo

```text
git clone
   ↓
docker compose up -d
   ↓
configurar dotnet user-secrets
   ↓
dotnet restore
   ↓
dotnet run
   ↓
abrir frontend
```

Copiar `.env.example` para `.env` é opcional e serve para trocar a senha local do banco.

## Gerar o app Android com Capacitor

O projeto gera um APK de depuração instalável em dispositivos Android. São necessários Node.js 18 ou superior, JDK 17 e Android SDK com a plataforma Android 34 e Build Tools 34.0.0. Configure `ANDROID_HOME` para a pasta do SDK e adicione `platform-tools` ao `PATH` para usar os comandos abaixo.

Instale as dependências e gere o APK:

```bash
npm install
npm run android:build
```

O arquivo será criado em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Para instalar com um celular conectado por USB e depuração USB habilitada:

```bash
npm run android:install
```

Também é possível copiar o APK para o celular e abri-lo para instalar. O Android pode solicitar autorização para instalar apps dessa origem.

No app Capacitor, os históricos de abastecimentos e manutenções, os novos registros, as despesas mensais e o consumo médio usam o SQLite local do aparelho; essas operações não dependem da API nem de `VITE_API_BASE_URL`. No navegador, abastecimentos e manutenções usam a API HTTP, configurada por `VITE_API_BASE_URL` no `.env`. O projeto nativo Android fica em `android/` e pode ser aberto com `npm run cap:open`.

O projeto está configurado para Android. A geração de um app iOS exige macOS e Xcode.
