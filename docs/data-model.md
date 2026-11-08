# Modelo de Dados


## Abastecimento

| Campo | Tipo | Obrigatório | observação
|:--:|:--:|:--:| --:|
|id_gas|int|sim| identificador
|liters|DECIMAL|sim| litros abastecidos
|bl_additive|boolean| nao| é aditivada?
|mileage|int|sim| kilometragem no momento do abastecimento
|bl_full_tank|boolean|sim| completou o tanque?
|dh_refuelling|date|sim| data do abastecimento
|cd_status|boolean| sim| soft delete
|gas_price|DECIMAL|nao| valor da gasolina

## Veículo (SQLite Android)

| Campo | Tipo | Obrigatório | Observação |
|:--:|:--:|:--:|:--|
| VEHICLE_ID | INTEGER | sim | chave primária |
| NAME | TEXT | sim | nome do veículo |
| BRAND | TEXT | não | marca |
| MODEL | TEXT | não | modelo |
| YEAR | INTEGER | não | ano |
| CD_STATUS | INTEGER | sim | 1 ativo; 0 excluído logicamente |
| IS_SELECTED | INTEGER | sim | 1 selecionado; 0 não selecionado |

As tabelas `GAS_STATION`, `REFUELLING` e `MAINTENANCE` têm `VEHICLE_ID` como chave estrangeira para `VEHICLE`. A coluna permite `NULL` para preservar registros criados antes da migração.

Ao excluir um veículo, `CD_STATUS` também passa a `0` nos registros associados. `REFUELLING` já possuía essa coluna; as migrations adicionam o mesmo campo a `VEHICLE`, `GAS_STATION` e `MAINTENANCE`. Os dados permanecem no SQLite, mas deixam de aparecer nas consultas ativas.

`IS_SELECTED` representa um booleano: SQLite armazena `true` como `1` e `false` como `0`. Veículos existentes e novos começam com `0` até serem selecionados.

