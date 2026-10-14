USE [HolyGauge];
GO

IF OBJECT_ID(N'dbo.GAS_STATION', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.GAS_STATION
    (
        GAS_STATION_ID INT IDENTITY(1,1) NOT NULL,
        NAME VARCHAR(255) NULL,
        ADDRESS VARCHAR(255) NULL,
        CITY VARCHAR(255) NULL,
        CONSTRAINT PK_GAS_STATION PRIMARY KEY (GAS_STATION_ID)
    );
END;
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.GAS_STATION', N'ADRESS') IS NOT NULL
       AND COL_LENGTH(N'dbo.GAS_STATION', N'ADDRESS') IS NULL
    BEGIN
        EXEC sys.sp_rename N'dbo.GAS_STATION.ADRESS', N'ADDRESS', N'COLUMN';
    END
    ELSE IF COL_LENGTH(N'dbo.GAS_STATION', N'ADRESS') IS NOT NULL
        AND COL_LENGTH(N'dbo.GAS_STATION', N'ADDRESS') IS NOT NULL
    BEGIN
        EXEC sys.sp_executesql N'
            UPDATE dbo.GAS_STATION
            SET ADDRESS = COALESCE(ADDRESS, ADRESS);
            ALTER TABLE dbo.GAS_STATION DROP COLUMN ADRESS;';
    END;

    IF COLUMNPROPERTY(OBJECT_ID(N'dbo.GAS_STATION'), N'GAS_STATION_ID', N'IsIdentity') = 0
    BEGIN
        -- Preserve existing primary and foreign keys while generating future IDs.
        IF OBJECT_ID(N'dbo.SEQ_GAS_STATION_ID', N'SO') IS NULL
        BEGIN
            DECLARE @NextGasStationId INT = ISNULL(
                (SELECT MAX(GAS_STATION_ID) FROM dbo.GAS_STATION),
                0
            ) + 1;
            DECLARE @CreateSequenceSql NVARCHAR(256) =
                N'CREATE SEQUENCE dbo.SEQ_GAS_STATION_ID AS INT START WITH '
                + CONVERT(NVARCHAR(20), @NextGasStationId)
                + N' INCREMENT BY 1;';

            EXEC sys.sp_executesql @CreateSequenceSql;
        END;

        IF NOT EXISTS
        (
            SELECT 1
            FROM sys.default_constraints AS dc
            INNER JOIN sys.columns AS c
                ON c.object_id = dc.parent_object_id
               AND c.column_id = dc.parent_column_id
            WHERE dc.parent_object_id = OBJECT_ID(N'dbo.GAS_STATION')
              AND c.name = N'GAS_STATION_ID'
        )
        BEGIN
            ALTER TABLE dbo.GAS_STATION
                ADD CONSTRAINT DF_GAS_STATION_ID
                DEFAULT (NEXT VALUE FOR dbo.SEQ_GAS_STATION_ID)
                FOR GAS_STATION_ID;
        END;
    END;
END;
GO

IF OBJECT_ID(N'dbo.REFUELLING', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.REFUELLING
    (
        Refuelling_id INT IDENTITY(1,1) NOT NULL,
        Liters DECIMAL(5,2) NOT NULL,
        Bl_additive BIT NULL,
        Mileage INT NULL,
        Bl_full_tank BIT NULL,
        Dh_refuelling DATETIME NOT NULL
            CONSTRAINT DF_REFUELLING_Dh_refuelling DEFAULT (GETDATE()),
        Cd_status BIT NOT NULL
            CONSTRAINT DF_REFUELLING_Cd_status DEFAULT (1),
        Gas_price DECIMAL(6,3) NULL,
        GAS_STATION_ID INT NULL,
        CONSTRAINT PK_REFUELLING PRIMARY KEY (Refuelling_id),
        CONSTRAINT CK_REFUELLING_Liters_NonNegative CHECK (Liters >= 0),
        CONSTRAINT CK_REFUELLING_Mileage_NonNegative CHECK (Mileage IS NULL OR Mileage >= 0),
        CONSTRAINT CK_REFUELLING_Gas_price_NonNegative CHECK (Gas_price IS NULL OR Gas_price >= 0),
        CONSTRAINT FK_REFUELLING_GAS_STATION FOREIGN KEY (GAS_STATION_ID)
            REFERENCES dbo.GAS_STATION (GAS_STATION_ID)
    );
END;
GO

IF OBJECT_ID(N'dbo.MAINTENANCE', N'U') IS NULL
BEGIN
        CREATE TABLE dbo.MAINTENANCE
        (       
                Maintenance_ID INT IDENTITY(1,1) NOT NULL,
                Description NVARCHAR(225) NOT NULL,
                MAINTENANCEDATE DATETIME NULL,
                COST DECIMAL(10,2) NULL,
                KILOMETERS INT NULL,
                NEXTKILOMETERS INT NULL,
                NEXTDATE DATETIME NULL,
                NOTES NVARCHAR(255) NULL,
                CONSTRAINT PK_MAINTENANCE PRIMARY KEY (Maintenance_ID),
                CONSTRAINT CK_MAINTENANCE_Cost_NonNegative CHECK (COST IS NULL OR COST >= 0),
                CONSTRAINT CK_MAINTENANCE_Kilometers_NonNegative CHECK (KILOMETERS IS NULL OR KILOMETERS >= 0),
                CONSTRAINT CK_MAINTENANCE_NextKilometers_NonNegative CHECK (NEXTKILOMETERS IS NULL OR NEXTKILOMETERS >= 0)
        );
END;
GO

