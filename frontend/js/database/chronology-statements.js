// Both event types share an odometer. Maintenance has no time of day, so
// comparisons involving it use different local calendar days only.
const eventsView = `CREATE VIEW VEHICLE_MILEAGE_EVENTS AS
  SELECT 'fueling' AS kind, Refuelling_id AS id, VEHICLE_ID AS vehicle,
    Mileage AS mileage, julianday(Dh_refuelling) AS time,
    date(Dh_refuelling, 'localtime') AS day
  FROM REFUELLING WHERE Cd_status = 1 AND Mileage IS NOT NULL
  UNION ALL
  SELECT 'maintenance', Maintenance_ID, VEHICLE_ID, KILOMETERS,
    julianday(MAINTENANCEDATE), date(MAINTENANCEDATE, 'localtime')
  FROM MAINTENANCE WHERE CD_STATUS = 1 AND KILOMETERS IS NOT NULL;`;

function validationTrigger(kind, table, id, mileage, date, name, operation) {
  const time = `julianday(COALESCE(NEW.${date}, datetime('now')))`;
  const day = `date(COALESCE(NEW.${date}, datetime('now')), 'localtime')`;
  const position = operation === 'INSERT' ? `CASE WHEN NEW.${id} < 0 THEN 9223372036854775807 ELSE NEW.${id} END` : `NEW.${id}`;
  const conflicts = ['<', '>'].map((order, index) => {
    const mileageOrder = index === 0 ? '>' : '<';
    const strictOrder = index === 0 ? '>=' : '<=';
    return `SELECT RAISE(ABORT, 'A quilometragem conflita com um evento ${index === 0 ? 'anterior' : 'posterior'} do veículo.')
      WHERE NEW.${mileage} IS NOT NULL AND EXISTS (
        SELECT 1 FROM VEHICLE_MILEAGE_EVENTS e
        WHERE e.vehicle IS NEW.VEHICLE_ID AND NOT (e.kind = '${kind}' AND e.id = NEW.${id})
          AND (('${kind}' = 'fueling' AND e.kind = 'fueling'
            AND (e.time ${order} ${time} OR (e.time = ${time} AND e.id ${order} ${position}))
            AND e.mileage ${strictOrder} NEW.${mileage})
          OR (('${kind}' = 'maintenance' OR e.kind = 'maintenance')
            AND e.day ${order} ${day} AND e.mileage ${mileageOrder} NEW.${mileage}))
      );`;
  }).join('\n');
  return `CREATE TRIGGER ${name} BEFORE ${operation} ON ${table}
    WHEN NEW.CD_STATUS = 1
    BEGIN ${conflicts}
    ${kind === 'maintenance' ? `SELECT RAISE(ABORT, 'A próxima revisão não pode ser anterior à própria manutenção.')
      WHERE NEW.NEXTKILOMETERS < NEW.KILOMETERS OR julianday(NEW.NEXTDATE) < ${time};` : ''}
    END;`;
}

export const CHRONOLOGY_STATEMENTS = [eventsView];
for (const [kind, table, id, mileage, date, insertName, updateName] of [
  ['fueling', 'REFUELLING', 'Refuelling_id', 'Mileage', 'Dh_refuelling', 'TR_REFUELLING_MILEAGE_INCREASES', 'TR_REFUELLING_UPDATE_MILEAGE'],
  ['maintenance', 'MAINTENANCE', 'Maintenance_ID', 'KILOMETERS', 'MAINTENANCEDATE', 'TR_MAINTENANCE_VALIDATE', 'TR_MAINTENANCE_UPDATE_MILEAGE'],
]) {
  for (const [name, operation] of [[insertName, 'INSERT'], [updateName, 'UPDATE']]) {
    CHRONOLOGY_STATEMENTS.push(`DROP TRIGGER IF EXISTS ${name};`, validationTrigger(kind, table, id, mileage, date, name, operation));
  }
}
CHRONOLOGY_STATEMENTS.push(
  'DROP TRIGGER IF EXISTS TR_MAINTENANCE_DEFAULTS;',
  `CREATE TRIGGER TR_MAINTENANCE_DEFAULTS AFTER INSERT ON MAINTENANCE
    WHEN NEW.MAINTENANCEDATE IS NULL BEGIN
      UPDATE MAINTENANCE SET MAINTENANCEDATE = datetime('now') WHERE Maintenance_ID = NEW.Maintenance_ID;
    END;`,
);
