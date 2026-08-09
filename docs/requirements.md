# Requisitos

---

## Requisitos Funcionais

---

### Abastecimento


Id | Requisitos
--:|:--:
FR-01| Perguntar se encheu o tanque todo e receber os dados de abastecimento (litros, preço do litro e kilometragem)
FR-02| Calcular o valor gasto e armazenar todos os dados do abastecimento
FR-03| Exibir os cinco abastecimentos mais recentes 
FR-04| Exibir média de consumo do último abastecimento







## Dados de um abastecimento

- litros abastecido
- tipo de gasolina
- quilometragem atual
- tanque cheio
- valor do litro de gasolina
- data do abastecimento

---

## Regras de negócio

- litro abastecido não pode ser menor que 0
- litro abastecido não pode exceder o tamanho do tanque da moto
- quilometragem atual tem que ser maior que a anterior
- tanque cheio s ou n
- tipo da gasolina aditivada ou comum
- preço da gasolina não pode ser negativo
- perguntar se registrou o último abastecimento
- caso último abastecimento registrado, checar se foi tanque cheio
- se o último abastecimento e o atual foram tanque cheio, calcular consumo
- ( km atual - quilometragem do abastecimento anterior) / litros do abastecimento atual

