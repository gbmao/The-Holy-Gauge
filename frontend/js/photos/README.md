# Fotos dos veículos

Esta pasta contém a integração com a câmera e com os arquivos do Android. As fotos tiradas pelo usuário ficam no aparelho, em `Directory.Data/vehicle-photos/`, criada pelo `PhotoStorage` na primeira captura.

O APK contém os arquivos do projeto como recursos de leitura; as imagens capturadas são gravadas na pasta privada do app, fora do código empacotado.

Padrão: `vehicle_<id do veículo>_<timestamp em milissegundos>.jpg`. O SQLite guarda esse caminho relativo em `PHOTO.FILE_PATH` e o tipo `vehicle` em `PHOTO.PHOTO_TYPE`.
