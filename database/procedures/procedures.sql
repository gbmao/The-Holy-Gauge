USE [HolyGauge];
GO

CREATE OR ALTER PROCEDURE dbo.SP_CONSUMO_MEDIO
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH AbastecimentosTanqueCheio AS
    (
        SELECT
            Mileage,
            Liters,
            ROW_NUMBER() OVER
            (
                ORDER BY Dh_refuelling DESC, Refuelling_id DESC
            ) AS Ordem
        FROM dbo.REFUELLING
        WHERE Cd_status = 1
          AND Bl_full_tank = 1
          AND Mileage IS NOT NULL
          AND Liters > 0
    )
    SELECT
        CAST(Atual.Mileage - Anterior.Mileage AS DECIMAL(10,2))
            / NULLIF(Atual.Liters, 0) AS CONSUMO_MEDIO
    FROM AbastecimentosTanqueCheio AS Atual
    INNER JOIN AbastecimentosTanqueCheio AS Anterior
        ON Anterior.Ordem = 2
    WHERE Atual.Ordem = 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_CREATE_REFUELLING
    @Liters DECIMAL(5,2),
    @Bl_Additive BIT = NULL,
    @Mileage INT = NULL,
    @Bl_Full_Tank BIT = NULL,
    @Gas_Price DECIMAL(6,3) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @Liters <= 0
        THROW 50001, 'Liters must be greater than zero.', 1;

    IF @Mileage < 0
        THROW 50002, 'Mileage cannot be negative.', 1;

    DECLARE @MileageAnterior INT;
    SELECT TOP (1) @MileageAnterior = Mileage
    FROM dbo.REFUELLING
    WHERE Cd_status = 1
      AND Mileage IS NOT NULL
    ORDER BY Dh_refuelling DESC, Refuelling_id DESC;

    IF @Mileage IS NOT NULL
       AND @MileageAnterior IS NOT NULL
       AND @Mileage <= @MileageAnterior
        THROW 50005, 'Mileage must be greater than the previous refuelling.', 1;

    IF @Gas_Price < 0
        THROW 50003, 'Gas price cannot be negative.', 1;

    INSERT INTO dbo.REFUELLING
    (
        Liters,
        Bl_additive,
        Mileage,
        Bl_full_tank,
        Dh_refuelling,
        Cd_status,
        Gas_price
    )
    VALUES
    (
        @Liters,
        @Bl_Additive,
        @Mileage,
        @Bl_Full_Tank,
        GETDATE(),
        1,
        @Gas_Price
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_GASTO_MENSAL
    @MES INT,
    @ANO INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @MES NOT BETWEEN 1 AND 12
        THROW 50004, 'Month must be between 1 and 12.', 1;

    DECLARE @InicioMes DATE = DATEFROMPARTS(@ANO, @MES, 1);
    DECLARE @InicioProximoMes DATE = DATEADD(MONTH, 1, @InicioMes);

    SELECT COALESCE(SUM(Liters * Gas_price), 0) AS GASTO_MENSAL
    FROM dbo.REFUELLING
    WHERE Cd_status = 1
      AND Dh_refuelling >= @InicioMes
      AND Dh_refuelling < @InicioProximoMes;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_GET_ALL_REFUELLINGS
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        r.Refuelling_id AS Id,
        r.Dh_refuelling AS OccurredAt,
        r.Liters AS Liters,
        CAST(r.Liters * COALESCE(r.Gas_price, 0) AS DECIMAL(12,2)) AS Total,
        COALESCE(r.Mileage, 0) AS Mileage
    FROM dbo.REFUELLING AS r
    WHERE r.Cd_status = 1
    ORDER BY r.Dh_refuelling DESC, r.Refuelling_id DESC;
END;
GO


    CREATE OR ALTER PROCEDURE dbo.SP_CREATE_MAINTENANCE
    @Description NVARCHAR(255),
    @DATE DATETIME = NULL,
    @KILOMETERS INT = NULL,
    @COST DECIMAL(10, 2) = NULL,
    @NEXTKILOMETERS INT = NULL,
    @NEXTDATE DATETIME = NULL,
    @NOTES NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @DATE IS NULL
        SET @DATE = GETDATE();
    IF @KILOMETERS IS NULL
        SET @KILOMETERS = (SELECT TOP 1 Mileage FROM dbo.REFUELLING WHERE Cd_status = 1 AND Mileage IS NOT NULL ORDER BY Dh_refuelling DESC, Refuelling_id DESC);
    IF @KILOMETERS < (SELECT TOP 1 Mileage FROM dbo.REFUELLING WHERE Cd_status = 1 AND Mileage IS NOT NULL ORDER BY Dh_refuelling DESC, Refuelling_id DESC)
        THROW 50006, 'Kilometers cannot be less than the last recorded kilometers.', 1;
    IF @NEXTKILOMETERS IS NOT NULL AND @NEXTKILOMETERS < @KILOMETERS
        THROW 50007, 'Next kilometers cannot be less than current kilometers.', 1;
    IF @COST < 0
        THROW 50008, 'Cost cannot be negative.', 1;
    IF @NEXTDATE IS NOT NULL AND @NEXTDATE < @DATE
        THROW 50009, 'Next date cannot be earlier than current date.', 1;
    IF @Description IS NULL OR LTRIM(RTRIM(@Description)) = ''
        THROW 50010, 'Description cannot be empty.', 1;

    INSERT INTO dbo.MAINTENANCE
    (
        Description,
        MAINTENANCEDATE,
        COST,
        KILOMETERS,
        NEXTKILOMETERS,
        NEXTDATE,
        NOTES
    )
    VALUES
    (
        @Description,
        @DATE,
        @COST,
        @KILOMETERS,
        @NEXTKILOMETERS,
        @NEXTDATE,
        @NOTES
    );
END;
GO
