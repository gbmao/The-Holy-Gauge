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

As consultas de abastecimento, manutenção e métricas usam o `VEHICLE_ID` do veículo ativo com `IS_SELECTED = 1`. Novos abastecimentos e manutenções recebem esse mesmo ID. Se nenhum veículo estiver selecionado, as listas retornam vazias e os indicadores numéricos retornam zero. Registros antigos sem `VEHICLE_ID` continuam armazenados, mas não aparecem no histórico de um veículo específico.

## Foto (SQLite Android)

| Campo | Tipo | Obrigatório | Observação |
|:--:|:--:|:--:|:--|
| PHOTO_ID | INTEGER | sim | chave primária com incremento automático |
| FILE_PATH | TEXT | sim | caminho do arquivo no aparelho; não pode estar vazio |
| VEHICLE_ID | INTEGER | sim | chave estrangeira para `VEHICLE.VEHICLE_ID`, com índice |
| PHOTO_TYPE | TEXT | sim | tipo da foto em texto livre; não pode estar vazio |

A migration 8 cria `PHOTO` sem `CD_STATUS`. O banco armazena o caminho relativo, e não o conteúdo da imagem. A exclusão de fotos remove o arquivo antes de apagar sua linha, permitindo uma nova tentativa em caso de falha.

O app cria a pasta `vehicle-photos/` no armazenamento privado (`Directory.Data`) do Android. Os arquivos seguem `vehicle_<VEHICLE_ID>_<timestamp>.jpg`, por exemplo `vehicle_12_1731085200000.jpg`. A câmera gera JPEG com qualidade 80 e dimensão máxima de 1600 pixels para limitar o espaço usado.

`PHOTO_TYPE = 'vehicle'` identifica a foto atual do veículo. Uma nova captura salva o arquivo e o registro antes de remover as fotos anteriores desse tipo. Se a limpeza falhar, a referência antiga permanece no banco para permitir nova tentativa; a foto mais recente é exibida. Cancelar a câmera mantém a foto anterior.

O serviço de exclusão de veículos apaga todas as suas fotos e arquivos antes de inativar os demais registros. A exclusão física de um veículo também remove as linhas de `PHOTO` por `ON DELETE CASCADE`, mas essa cascata sozinha não apaga os arquivos do aparelho.
