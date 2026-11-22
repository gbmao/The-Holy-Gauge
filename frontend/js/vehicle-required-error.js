export class VehicleRequiredError extends Error {
  constructor() {
    super('Cadastre e selecione um veículo em Meus Veículos antes de registrar um abastecimento ou uma manutenção.');
    this.name = 'VehicleRequiredError';
  }
}
