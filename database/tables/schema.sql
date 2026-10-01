-- DROP SCHEMA dbo;

CREATE SCHEMA dbo;
-- HolyGauge.dbo.GAS_STATION definition

-- Drop table

-- DROP TABLE HolyGauge.dbo.GAS_STATION;

CREATE TABLE HolyGauge.dbo.GAS_STATION (
	GAS_STATION_ID int NOT NULL,
	NAME varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	ADRESS varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CITY varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CONSTRAINT PK__GAS_STAT__06CE9EB7CAEE45F2 PRIMARY KEY (GAS_STATION_ID)
);


-- HolyGauge.dbo.REFUELLING definition

-- Drop table

-- DROP TABLE HolyGauge.dbo.REFUELLING;

CREATE TABLE HolyGauge.dbo.REFUELLING (
	Refuelling_id int IDENTITY(1,1) NOT NULL,
	Liters decimal(5,2) NOT NULL,
	Bl_additive bit NULL,
	Mileage int NULL,
	Bl_full_tank bit NULL,
	Dh_refuelling datetime NULL,
	Cd_status bit DEFAULT 1 NOT NULL,
	Gas_price decimal(6,3) NULL,
	GAS_STATION_ID int NULL,
	CONSTRAINT PK__REFUELLI__FF232878ECDE93F4 PRIMARY KEY (Refuelling_id)
);