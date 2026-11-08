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

As tabelas `GAS_STATION`, `REFUELLING` e `MAINTENANCE` têm `VEHICLE_ID` como chave estrangeira para `VEHICLE`. A coluna permite `NULL` para preservar registros criados antes da migração.

