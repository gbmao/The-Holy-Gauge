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

### 2. Configurar variáveis de ambiente

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Preencha as variáveis necessárias:

```env
MSSQL_SA_PASSWORD=
MSSQL_SA_USER=

DB_HOST=
DB_NAME=
```

> O arquivo `.env` não deve ser versionado.

---

### 3. Subir o banco com Docker

Na raiz do projeto, execute:

```bash
docker compose up -d
```

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
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=HolyGauge;User Id=sa;Password=SUA_SENHA;TrustServerCertificate=True"
```

Para conferir os secrets configurados:

```bash
dotnet user-secrets list
```

> Não coloque senhas ou connection strings reais no repositório.

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

---

## Resumo

```text
git clone
   ↓
cp .env.example .env
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