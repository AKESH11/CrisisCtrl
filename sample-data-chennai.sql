-- Sample Data for Chennai, India
-- Optional: Run this after setting up the main schema if you want sample data

-- 1. Insert chat rooms for Chennai areas
INSERT INTO chat_rooms (name, area_name, center_lat, center_lng, radius_km) VALUES
  ('Chennai Central Emergency Response', 'Chennai Central', 13.0827, 80.2707, 15),
  ('T. Nagar Emergency Response', 'T. Nagar', 13.0418, 80.2341, 10),
  ('Anna Nagar Emergency Response', 'Anna Nagar', 13.0850, 80.2101, 12),
  ('Adyar Emergency Response', 'Adyar', 13.0067, 80.2206, 15),
  ('Velachery Emergency Response', 'Velachery', 12.9759, 80.2201, 18),
  ('OMR Emergency Response', 'OMR Corridor', 12.8956, 80.2267, 25);

-- 2. Insert sample resources for Chennai
INSERT INTO resources (name, type, latitude, longitude) VALUES
  -- Hospitals
  ('Apollo Hospital Chennai', 'Hospital', 13.0067, 80.2206),
  ('Fortis Malar Hospital', 'Hospital', 13.0418, 80.2341),
  ('MIOT International', 'Hospital', 12.9759, 80.2201),
  ('Stanley Medical College Hospital', 'Hospital', 13.0827, 80.2707),
  ('Sri Ramachandra Medical Centre', 'Hospital', 12.9185, 80.2267),
  ('Sankara Nethralaya', 'Hospital', 13.0850, 80.2101),
  
  -- Emergency Centers
  ('Chennai Disaster Management Center', 'Emergency Center', 13.0827, 80.2707),
  ('Tamil Nadu Emergency Control Room', 'Emergency Center', 13.0522, 80.2437),
  ('Zone-1 Emergency Response Center', 'Emergency Center', 13.0850, 80.2101),
  ('Zone-2 Emergency Response Center', 'Emergency Center', 13.0067, 80.2206),
  ('Zone-3 Emergency Response Center', 'Emergency Center', 12.9759, 80.2201),
  
  -- Fire Stations
  ('Chennai Fire Station - Egmore', 'Fire Station', 13.0732, 80.2609),
  ('Chennai Fire Station - T.Nagar', 'Fire Station', 13.0418, 80.2341),
  ('Chennai Fire Station - Anna Nagar', 'Fire Station', 13.0850, 80.2101),
  ('Chennai Fire Station - Adyar', 'Fire Station', 13.0067, 80.2206),
  ('Chennai Fire Station - Velachery', 'Fire Station', 12.9759, 80.2201),
  
  -- Police Stations
  ('Chennai Central Police Station', 'Police Station', 13.0827, 80.2707),
  ('T.Nagar Police Station', 'Police Station', 13.0418, 80.2341),
  ('Anna Nagar Police Station', 'Police Station', 13.0850, 80.2101),
  ('Adyar Police Station', 'Police Station', 13.0067, 80.2206),
  ('Velachery Police Station', 'Police Station', 12.9759, 80.2201),
  ('Marina Beach Police Station', 'Police Station', 13.0522, 80.2437),
  
  -- Shelters
  ('Chennai Central Relief Camp', 'Shelter', 13.0827, 80.2707),
  ('T.Nagar Community Center', 'Shelter', 13.0418, 80.2341),
  ('Anna Nagar School Shelter', 'Shelter', 13.0850, 80.2101),
  ('Adyar Sports Complex Shelter', 'Shelter', 13.0067, 80.2206),
  ('Velachery Emergency Shelter', 'Shelter', 12.9759, 80.2201),
  ('Marina Beach Emergency Camp', 'Shelter', 13.0522, 80.2437),
  ('OMR Temporary Shelter', 'Shelter', 12.8956, 80.2267);

-- 3. Insert sample alerts with different severity levels
INSERT INTO alerts (description, severity, alert_type, latitude, longitude, status) VALUES
  -- L1 (Minor) alerts
  ('Traffic signal malfunction at Anna Salai junction', 'L1', 'Infrastructure Failure', 13.0522, 80.2437, 'active'),
  ('Minor water pipe burst - Adyar area', 'L1', 'Infrastructure Failure', 13.0067, 80.2206, 'active'),
  ('Street light outage - T.Nagar main road', 'L1', 'Infrastructure Failure', 13.0418, 80.2341, 'active'),
  
  -- L2 (Moderate) alerts  
  ('Heavy traffic congestion due to protest', 'L2', 'Other', 13.0827, 80.2707, 'active'),
  ('Fallen tree blocking road - Anna Nagar', 'L2', 'Storm', 13.0850, 80.2101, 'responded'),
  ('Power outage affecting 500 homes', 'L2', 'Infrastructure Failure', 12.9759, 80.2201, 'active'),
  
  -- L3 (Significant) alerts
  ('Multi-vehicle accident on ECR highway', 'L3', 'Medical Emergency', 12.9185, 80.2267, 'active'),
  ('Apartment building fire - 3rd floor affected', 'L3', 'Fire', 12.9759, 80.2201, 'responded'),
  ('Flood water rising in T.Nagar subway', 'L3', 'Flood', 13.0418, 80.2341, 'active'),
  ('Gas leak reported in commercial building', 'L3', 'Other', 13.0522, 80.2437, 'responded'),
  
  -- L4 (Severe) alerts
  ('Flash flooding in Velachery - 2 feet water', 'L4', 'Flood', 12.9759, 80.2201, 'active'),
  ('Hospital emergency - power backup failed', 'L4', 'Medical Emergency', 13.0067, 80.2206, 'active'),
  ('Building collapse risk - evacuations underway', 'L4', 'Infrastructure Failure', 13.0418, 80.2341, 'responded'),
  
  -- L5 (Critical) alerts
  ('Cyclone Vardah approaching - coastal areas evacuation', 'L5', 'Storm', 13.0522, 80.2437, 'active'),
  ('Major bridge structural failure - Marina Bridge', 'L5', 'Infrastructure Failure', 13.0522, 80.2437, 'active'),
  ('Chemical plant explosion - 5km radius evacuation', 'L5', 'Security Threat', 12.9185, 80.2267, 'responded');