# The-Holy-Gauge


# The Holy Gauge - Roadmap

## 1. Objetivo do projeto

Criar uma aplicação para controle pessoal da motocicleta, permitindo registrar:

- abastecimentos
- manutenções
- quilometragem
- consumo médio
- histórico de gastos

---

## 2. MVP

A primeira versão precisa permitir:

- visualizar dados principais da moto
- registrar abastecimento
- consultar histórico de abastecimento
- registrar manutenção
- consultar histórico de manutenção

---

## 3. Frontend

### Dashboard
- [x] Criar página principal
- [x] Criar menu lateral
- [x] Criar painel inferior
- [x] Organizar JavaScript em módulos
- [ ] Remover dados mockados
- [ ] Criar chamadas para API
- [ ] Criar tratamento de erro
- [ ] Criar loading states

### Abastecimento
- [ ] Criar formulário
- [ ] Validar campos
- [ ] Enviar dados para API
- [ ] Atualizar histórico

### Manutenção
- [ ] Criar formulário
- [ ] Criar tipos de manutenção
- [ ] Salvar manutenção
- [ ] Exibir histórico

---

## 4. Backend

### Estrutura inicial
- [ ] Criar projeto ASP.NET Core Web API
- [ ] Configurar estrutura de pastas
- [ ] Configurar Swagger
- [ ] Configurar banco de dados

### Entidades
- [ ] Motorcycle
- [ ] Fueling
- [ ] Maintenance

### API
- [ ] POST /fuelings
- [ ] GET /fuelings
- [ ] POST /maintenances
- [ ] GET /maintenances
- [ ] GET /motorcycle/stats

---

## 5. Banco de dados

- [ ] Definir modelo de dados
- [ ] Criar diagrama
- [ ] Criar tabelas
- [ ] Criar relacionamentos
- [ ] Criar migrations
- [ ] Criar dados de teste

---

## 6. Regras de negócio

### Abastecimento
- [ ] calcular km/l
- [ ] calcular custo por km
- [ ] calcular gasto total

### Manutenção
- [ ] controlar quilometragem
- [ ] registrar custo
- [ ] permitir observações
- [ ] futuramente criar alertas

---

## 7. Integração

- [ ] Frontend consumir API
- [ ] API consultar banco
- [ ] Remover mock API
- [ ] Testar fluxo completo

Frontend → API → Banco

---

## 8. Testes

- [ ] testar cadastro de abastecimento
- [ ] testar cálculo de consumo
- [ ] testar manutenção
- [ ] testar erros da API
- [ ] criar testes unitários básicos

---

## 9. Deploy

- [ ] Dockerizar backend
- [ ] configurar banco
- [ ] publicar API
- [ ] publicar frontend
- [ ] configurar variáveis de ambiente

---

## 10. Melhorias futuras

- [ ] autenticação
- [ ] múltiplas motos
- [ ] gráficos
- [ ] relatório mensal
- [ ] exportação CSV
- [ ] alertas de manutenção
