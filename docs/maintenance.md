# Maintenance

## Objetivo

Permitir que o usuário registre e acompanhe
manutenções realizadas na moto.

## MVP

- Registrar manutenção
- Consultar histórico
- Editar manutenção
- Excluir com confirmação e recuperar pela lista de excluídas
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
- A edição preserva o ID e o veículo do registro e permite limpar os campos opcionais.
- No cadastro, edição e recuperação, Mileage é validado na posição cronológica, cruzando os dois tipos de evento entre dias diferentes e permitindo igualdade. Eventos do mesmo dia não impõem ordem à manutenção, que informa só a data.
- Mileage ausente permanece vazio; não é copiado de outro evento e não participa dos limites do odômetro.
- NextMileage não pode ser menor que Mileage quando ambos forem informados.
- NextDate não pode ser anterior a Date.
- A exclusão inativa o registro (`CD_STATUS = 0`), preservando os dados para recuperação.
- Registros inativos não compõem o histórico ativo, as próximas revisões exibidas nele ou o gasto mensal.
- A recuperação reativa o registro e inclui o custo no mês da manutenção, mantendo as informações de próxima revisão.
- Edição, exclusão e recuperação se restringem às manutenções do veículo ativo selecionado.

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
