-- ============================================
-- Carbon Footprint Emission Management System
-- MySQL Database Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS carbon_footprint_db;
USE carbon_footprint_db;

-- Departments / Labs table
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type ENUM('lab', 'office', 'server_room', 'common_area') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_name VARCHAR(100) NOT NULL,
  device_type ENUM('mobile', 'desktop', 'laptop', 'server', 'router', 'printer', 'projector', 'other') NOT NULL,
  department_id INT,
  power_rating_watts DECIMAL(8,2) NOT NULL,
  quantity INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- Device Usage Logs
CREATE TABLE IF NOT EXISTS device_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  usage_date DATE NOT NULL,
  hours_used DECIMAL(5,2) NOT NULL,
  recorded_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Internet Consumption Logs
CREATE TABLE IF NOT EXISTS internet_consumption (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  consumption_date DATE NOT NULL,
  data_used_gb DECIMAL(10,4) NOT NULL,
  num_users INT DEFAULT 1,
  connection_type ENUM('wifi', 'broadband', 'mobile_data', 'fiber') DEFAULT 'broadband',
  recorded_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- Lab Electricity Usage
CREATE TABLE IF NOT EXISTS electricity_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  usage_date DATE NOT NULL,
  units_consumed_kwh DECIMAL(10,4) NOT NULL,
  meter_reading_start DECIMAL(10,2),
  meter_reading_end DECIMAL(10,2),
  recorded_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- Carbon Emission Factors (reference table)
CREATE TABLE IF NOT EXISTS emission_factors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_type ENUM('electricity', 'internet_data', 'device_manufacturing') NOT NULL,
  factor_value DECIMAL(10,6) NOT NULL COMMENT 'kg CO2 per unit',
  unit VARCHAR(50) NOT NULL,
  region VARCHAR(100) DEFAULT 'India',
  effective_from DATE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- SAMPLE DATA
-- ============================================

INSERT INTO departments (name, type) VALUES
('Computer Science Lab A', 'lab'),
('Computer Science Lab B', 'lab'),
('Server Room', 'server_room'),
('Administrative Office', 'office'),
('Electronics Lab', 'lab'),
('Library & Reading Room', 'common_area');

INSERT INTO devices (device_name, device_type, department_id, power_rating_watts, quantity) VALUES
('Dell OptiPlex Desktop', 'desktop', 1, 180.00, 30),
('HP Laptop 250 G8', 'laptop', 2, 65.00, 25),
('Dell PowerEdge Server', 'server', 3, 500.00, 4),
('Cisco Router', 'router', 3, 45.00, 2),
('Student Mobile Devices', 'mobile', NULL, 5.00, 200),
('HP LaserJet Printer', 'printer', 4, 400.00, 3),
('Epson Projector', 'projector', 1, 300.00, 2),
('Workstation PC', 'desktop', 5, 250.00, 20);

INSERT INTO emission_factors (source_type, factor_value, unit, region, effective_from) VALUES
('electricity', 0.716, 'kg CO2 per kWh', 'India', '2023-01-01'),
('internet_data', 0.06, 'kg CO2 per GB', 'Global', '2023-01-01'),
('device_manufacturing', 0.08, 'kg CO2 per hour of use', 'Global', '2023-01-01');

INSERT INTO device_usage (device_id, usage_date, hours_used, recorded_by) VALUES
(1, CURDATE() - INTERVAL 1 DAY, 8.0, 'Lab Admin'),
(1, CURDATE() - INTERVAL 2 DAY, 7.5, 'Lab Admin'),
(2, CURDATE() - INTERVAL 1 DAY, 6.0, 'Lab Admin'),
(3, CURDATE() - INTERVAL 1 DAY, 24.0, 'Server Admin'),
(4, CURDATE() - INTERVAL 1 DAY, 24.0, 'Server Admin'),
(5, CURDATE() - INTERVAL 1 DAY, 4.5, 'Mobile Coordinator');

INSERT INTO internet_consumption (department_id, consumption_date, data_used_gb, num_users, connection_type, recorded_by) VALUES
(1, CURDATE() - INTERVAL 1 DAY, 45.20, 30, 'broadband', 'Network Admin'),
(2, CURDATE() - INTERVAL 1 DAY, 38.75, 25, 'broadband', 'Network Admin'),
(3, CURDATE() - INTERVAL 1 DAY, 120.50, 5, 'fiber', 'Server Admin'),
(4, CURDATE() - INTERVAL 1 DAY, 12.30, 10, 'broadband', 'Office Admin'),
(1, CURDATE() - INTERVAL 2 DAY, 42.10, 30, 'broadband', 'Network Admin'),
(2, CURDATE() - INTERVAL 2 DAY, 35.60, 25, 'broadband', 'Network Admin');

INSERT INTO electricity_usage (department_id, usage_date, units_consumed_kwh, meter_reading_start, meter_reading_end, recorded_by) VALUES
(1, CURDATE() - INTERVAL 1 DAY, 54.00, 1000.00, 1054.00, 'Lab Admin'),
(2, CURDATE() - INTERVAL 1 DAY, 39.00, 2000.00, 2039.00, 'Lab Admin'),
(3, CURDATE() - INTERVAL 1 DAY, 144.00, 5000.00, 5144.00, 'Server Admin'),
(4, CURDATE() - INTERVAL 1 DAY, 15.50, 3000.00, 3015.50, 'Office Admin'),
(5, CURDATE() - INTERVAL 1 DAY, 60.00, 4000.00, 4060.00, 'Lab Admin'),
(1, CURDATE() - INTERVAL 2 DAY, 51.00, 949.00, 1000.00, 'Lab Admin');

-- Useful Views
CREATE OR REPLACE VIEW v_device_emissions AS
SELECT
  du.usage_date,
  dev.device_name,
  dev.device_type,
  dep.name AS department,
  du.hours_used,
  dev.quantity,
  ROUND((dev.power_rating_watts * dev.quantity * du.hours_used / 1000) * ef.factor_value, 4) AS device_emission_kg
FROM device_usage du
JOIN devices dev ON du.device_id = dev.id
LEFT JOIN departments dep ON dev.department_id = dep.id
JOIN emission_factors ef ON ef.source_type = 'electricity'
ORDER BY du.usage_date DESC;

CREATE OR REPLACE VIEW v_internet_emissions AS
SELECT
  ic.consumption_date,
  d.name AS department,
  ic.data_used_gb,
  ROUND(ic.data_used_gb * ef.factor_value, 4) AS internet_emission_kg
FROM internet_consumption ic
JOIN departments d ON ic.department_id = d.id
JOIN emission_factors ef ON ef.source_type = 'internet_data'
ORDER BY ic.consumption_date DESC;

CREATE OR REPLACE VIEW v_electricity_emissions AS
SELECT
  eu.usage_date,
  d.name AS department,
  eu.units_consumed_kwh,
  ROUND(eu.units_consumed_kwh * ef.factor_value, 4) AS electricity_emission_kg
FROM electricity_usage eu
JOIN departments d ON eu.department_id = d.id
JOIN emission_factors ef ON ef.source_type = 'electricity'
ORDER BY eu.usage_date DESC;
