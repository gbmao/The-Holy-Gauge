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

