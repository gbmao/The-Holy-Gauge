# Maintenance

## Objetivo

Permitir que o usuário registre e acompanhe
manutenções realizadas na moto.

## MVP

- Registrar manutenção
- Consultar histórico
- Registrar próxima manutenção
- Identificar manutenção próxima ou vencida

## Dados

Maintenance
- Id
- Description
- Date
- Mileage
- Cost
- NextMileage
- NextDate
- Notes
- Status

## Regras

- Description é obrigatório
- Mileage é opcional
- Cost é opcional
- NextMileage é opcional
- NextDate é opcional

## Fluxo

Nova manutenção
    ↓
Preencher dados
    ↓
Validar
    ↓
Salvar
    ↓
Atualizar histórico

## Arquitetura

Web:
UI → API JS → ASP.NET → Service → Repository → SQL Server

Mobile:
UI → API JS → Native Components → Repository → SQLite
