require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- MOCK DATABASE ---
let reportsDB = []; 
let riskZones = []; // Store active risk zones

const generateId = () => Math.random().toString(36).substr(2, 9);

// GEOMETRY HELPER: Calculate distance in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// --- ROUTES ---

app.get('/api/reports', (req, res) => {
  res.json({ reports: reportsDB, riskZones });
});

app.post('/api/reports', (req, res) => {
  const { type, description, location, severity } = req.body;
  
  const newReport = {
    _id: generateId(),
    type, description, location, severity,
    timestamp: new Date(),
    assignedUnit: "Calculating...",
    status: 'Pending'
  };

  // 1. RISK ZONE LOGIC (The "Predictive" Part)
  // Check if we have > 2 incidents within 1000m (1km) of this new report
  const nearbyIncidents = reportsDB.filter(r => 
    getDistanceMeters(r.location.lat, r.location.lng, location.lat, location.lng) < 1000
  );

  if (nearbyIncidents.length >= 2) {
      // Create a new Risk Zone
      const newZone = {
          lat: location.lat,
          lng: location.lng,
          radius: 1200, // 1.2km radius
          level: 'HIGH_RISK',
          message: `DANGER: High frequency of ${type} detected here.`
      };
      riskZones.push(newZone);
      io.emit('new-risk-zone', newZone);
      console.log("⚠️ NEW RISK ZONE DETECTED!");
  }

  // 2. RESOURCE MATCHING (C++ Bridge)
  const path = require('path');
  const isWindows = process.platform === 'win32';

  const matcherPath = isWindows
    ? path.join(__dirname, 'matcher', 'matcher.exe')
    : path.join(__dirname, 'matcher', 'matcher');

  
  if (!fs.existsSync(matcherPath)) {
      newReport.assignedUnit = "Unit_Alpha"; // Fallback
      newReport.status = "Active";
      reportsDB.push(newReport);
      io.emit('new-incident', newReport);
      return res.status(201).json(newReport);
  }

  const brain = spawn(matcherPath);
  const severityScore = severity === 'Critical' ? 10 : 5;
  brain.stdin.write(`${location.lat} ${location.lng} ${severityScore}\n`);
  brain.stdin.end();

  brain.stdout.on('data', (data) => {
    const unitId = data.toString().trim();
    newReport.assignedUnit = unitId;
    newReport.status = 'Active';
    reportsDB.push(newReport);
    io.emit('new-incident', newReport);
  });

  res.status(201).json({ message: "Processing started", id: newReport._id });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`🚀 CrisisCtrl Server running on Port ${PORT}`));
