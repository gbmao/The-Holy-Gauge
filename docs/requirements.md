# Requisitos

---

## Requisitos Funcionais

---

### Abastecimento


Id | Requisitos
--:|:--:
FR-01| Perguntar se encheu o tanque todo e receber os dados de abastecimento (litros, preço do litro e kilometragem)
FR-02| Calcular o valor gasto e armazenar todos os dados do abastecimento
FR-03| Exibir os três abastecimentos mais recentes no histórico rápido do Android
FR-04| Exibir média de consumo do último abastecimento
FR-05| O sistema deve permitir registrar uma manutenção.
FR-06| Exibir as três manutenções mais recentes no histórico rápido do Android e todas na página Manutenção geral.
FR-07| O sistema deve permitir informar a próxima manutenção por quilometragem ou data.
FR-08| Permitir editar data/hora, litros, preço, quilometragem e informações de tanque/combustível de abastecimentos no Android.
FR-09| Excluir abastecimentos com confirmação e permitir recuperação pela lista de excluídos, atualizando histórico e indicadores.






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

### Edição e recuperação de abastecimentos no Android

- A edição preserva o ID, o veículo e o vínculo com o posto, alterando somente os campos do lançamento.
- Edição, exclusão e recuperação se restringem ao veículo ativo selecionado.
- Na edição e na recuperação, a quilometragem informada deve ficar estritamente entre as dos registros ativos vizinhos com odômetro, na ordem de data/hora e ID.
- Quilometragem ausente continua permitida. Registros sem odômetro são ignorados somente para localizar os limites da validação; não são pulados ao escolher o par consecutivo do cálculo de consumo.
- A exclusão inativa o registro (`Cd_status = 0`) sem apagar seus dados; a recuperação é recusada se houver conflito de quilometragem após outras edições.
- As alterações persistem ao reabrir o banco. Gasto mensal, consumo e quilometragem usam os registros ativos restantes; o gasto continua atribuído ao período do lançamento.
- A edição preserva os segundos/milissegundos originais quando a data/hora apresentada não for alterada.
- O cadastro de abastecimentos aceita data/hora local; se omitida, usa o momento atual. Manutenções preservam a data informada.
- Cadastro, edição e recuperação cruzam os dois tipos de evento entre dias locais diferentes, permitindo odômetros iguais entre tipos. Eventos envolvendo manutenção no mesmo dia não impõem ordem, pois ela não informa hora. Entre abastecimentos, a ordem continua por instante e ID, com aumento estrito do odômetro.
- Manutenção sem quilometragem permanece vazia, sem copiar o odômetro de outro evento. A próxima revisão é validada contra os dados informados na própria manutenção.

