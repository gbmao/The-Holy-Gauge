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

- ~~retirar o mock do historico de abastecimento e preencher com dados do banco~~

- entender migração para mobile

- decidir por qual tipo de banco no mobile


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

---

### 7. Rodar o frontend

Abra a pasta do frontend com um servidor local, como o Live Server.

Exemplo:

```text
http://127.0.0.1:5500/index.html
```

Com o frontend e a API em execução, o Holy Gauge estará pronto para uso.

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

No app Capacitor, o histórico, os novos abastecimentos, as despesas mensais e o consumo médio usam o SQLite local do aparelho; essas operações não dependem da API nem de `VITE_API_BASE_URL`. No navegador, elas continuam usando a API HTTP, configurada por `VITE_API_BASE_URL` no `.env`. Os registros de manutenção continuam simulados. O projeto nativo Android fica em `android/` e pode ser aberto com `npm run cap:open`.

O projeto está configurado para Android. A geração de um app iOS exige macOS e Xcode.
