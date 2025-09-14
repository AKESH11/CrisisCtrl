# CrisisCtrl - Database Migration Guide

This guide helps you migrate your database to support the new enhanced features.

## New Features Added
1. **L1-L5 Severity System**: Replaced Low/Medium/High with L1-L5 scale
2. **Alert Types**: Added categorization (Fire, Flood, Earthquake, etc.)
3. **Clickable Alert Details**: Click any alert marker to see full details
4. **Nearby Resources**: Automatically shows resources within 5km of alerts
5. **Admin Alert Deletion**: Admin users can delete alerts
6. **Sample Data**: Demonstration alerts and resources across NYC

## Database Migration Steps

### Step 1: Update Existing Tables (if you have existing data)

If you want to keep existing alerts, run this first to migrate them:

```sql
-- Add the new alert_type column
ALTER TABLE alerts ADD COLUMN alert_type TEXT;

-- Update existing alerts to have a default type
UPDATE alerts SET alert_type = 'Other' WHERE alert_type IS NULL;

-- Add the new constraint for alert_type
ALTER TABLE alerts ADD CONSTRAINT alerts_alert_type_check 
  CHECK (alert_type IN ('Fire', 'Flood', 'Earthquake', 'Storm', 'Medical Emergency', 'Security Threat', 'Infrastructure Failure', 'Other'));

-- Migrate existing severity values (if any exist)
UPDATE alerts SET severity = 'L3' WHERE severity = 'Medium';
UPDATE alerts SET severity = 'L4' WHERE severity = 'High';
UPDATE alerts SET severity = 'L1' WHERE severity = 'Low';

-- Update the severity constraint
ALTER TABLE alerts DROP CONSTRAINT alerts_severity_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_severity_check 
  CHECK (severity IN ('L1', 'L2', 'L3', 'L4', 'L5'));

-- Make alert_type NOT NULL
ALTER TABLE alerts ALTER COLUMN alert_type SET NOT NULL;
```

### Step 2: Add Delete Policy for Alerts

```sql
-- Allow admins to delete alerts
CREATE POLICY "Only admins can delete alerts" ON alerts
  FOR DELETE USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
```

### Step 3: Add Sample Data for Testing

```sql
-- Insert additional sample resources
INSERT INTO resources (name, type, latitude, longitude) VALUES
  ('Mount Sinai Hospital', 'Hospital', 40.7903, -73.9509),
  ('Brooklyn Emergency Shelter', 'Shelter', 40.6892, -73.9442),
  ('Fire Station 33', 'Fire Station', 40.7282, -73.9942),
  ('Police Precinct 14', 'Police Station', 40.7589, -73.9851),
  ('Queens Emergency Center', 'Emergency Center', 40.7282, -73.7949);

-- Insert sample alerts with L1-L5 severity levels
INSERT INTO alerts (description, severity, alert_type, latitude, longitude) VALUES
  ('Minor water leak in subway tunnel', 'L1', 'Infrastructure Failure', 40.7505, -73.9934),
  ('Slip and fall incident reported', 'L1', 'Medical Emergency', 40.7614, -73.9776),
  ('Moderate kitchen fire in apartment building', 'L2', 'Fire', 40.7589, -73.9851),
  ('Flash flood warning - rising water levels', 'L2', 'Flood', 40.7282, -73.9942),
  ('Severe thunderstorm with high winds', 'L3', 'Storm', 40.7903, -73.9509),
  ('Multi-vehicle accident with injuries', 'L3', 'Medical Emergency', 40.6892, -73.9442),
  ('Large building fire - multiple floors affected', 'L4', 'Fire', 40.7549, -73.9840),
  ('Major earthquake - 5.2 magnitude', 'L4', 'Earthquake', 40.7282, -73.7949),
  ('Category 4 hurricane approaching', 'L5', 'Storm', 40.7200, -74.0000),
  ('Critical infrastructure collapse', 'L5', 'Infrastructure Failure', 40.7800, -73.9500);
```

## Alternative: Fresh Start

If you prefer to start fresh, simply run the complete updated schema:

```sql
-- Drop existing tables if you want a fresh start
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS resources CASCADE;

-- Then run the complete schema from supabase-schema.sql
```

## Frontend Features Guide

### Severity Levels
- **L1** (Green): Minor - Low Impact
- **L2** (Yellow): Moderate - Limited Impact  
- **L3** (Orange): Significant - Moderate Impact
- **L4** (Red): Severe - High Impact
- **L5** (Black): Critical - Extreme Impact

### Alert Types
- Fire
- Flood
- Earthquake
- Storm
- Medical Emergency
- Security Threat
- Infrastructure Failure
- Other

### Map Features
- **Color-coded markers** based on severity level
- **Click alerts** to see detailed information
- **Nearby resources** automatically calculated and displayed
- **Admin context menu** for creating new alerts/resources

### Admin Features
- Create alerts and resources by clicking on map
- Delete alerts from sidebar or detail modal
- All create/delete operations require admin role

## Testing the Features

1. **Open the app**: Navigate to http://localhost:3001
2. **Login** with your admin account
3. **View sample alerts** on the map (color-coded by severity)
4. **Click any alert marker** to see detailed information and nearby resources
5. **Create new alerts** by right-clicking on the map (admin only)
6. **Delete alerts** using the trash icon (admin only)

## Color Legend
- 🟢 **Green (L1)**: Minor incidents
- 🟡 **Yellow (L2)**: Moderate issues
- 🟠 **Orange (L3)**: Significant problems
- 🔴 **Red (L4)**: Severe emergencies
- ⚫ **Black (L5)**: Critical disasters

Enjoy the enhanced CrisisCtrl platform!