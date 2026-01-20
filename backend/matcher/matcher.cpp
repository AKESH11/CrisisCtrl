#include <iostream>
#include <vector>
#include <cmath>
#include <limits>
#include <algorithm>
#include <string>

using namespace std;

// Optimized Haversine Formula for distance (Returns KM)
double getDistance(double lat1, double lon1, double lat2, double lon2) {
    const double R = 6371.0; 
    double dLat = (lat2 - lat1) * M_PI / 180.0;
    double dLon = (lon2 - lon1) * M_PI / 180.0;
    double a = sin(dLat / 2) * sin(dLat / 2) +
               cos(lat1 * M_PI / 180.0) * cos(lat2 * M_PI / 180.0) *
               sin(dLon / 2) * sin(dLon / 2);
    double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c;
}

int main() {
    // 1. FAST I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    double incLat, incLon;
    int severity;

    // 2. Read Input from Node.js (Format: "LAT LNG SEVERITY")
    if (cin >> incLat >> incLon >> severity) {
        
        // 3. Mock Resource Data (In a real app, this comes from Redis)
        // Format: {ID, {Lat, Lng}}
        vector<pair<string, pair<double, double>>> units = {
            {"Unit_Alpha", {40.715, -74.008}}, // Near NYC
            {"Unit_Bravo", {40.725, -74.000}},
            {"Unit_Charlie", {40.700, -74.020}},
            {"Unit_Delta", {34.052, -118.243}} // LA (Far away)
        };

        string bestUnit = "None";
        double minScore = numeric_limits<double>::max();

        // 4. The Matching Logic
        for (const auto& unit : units) {
            double dist = getDistance(incLat, incLon, unit.second.first, unit.second.second);
            
            // Industrial Logic: 
            // If Severity is HIGH (10), distance penalty is reduced to prioritize capability (mocked here as simple distance for now)
            double score = dist; 

            if (score < minScore) {
                minScore = score;
                bestUnit = unit.first;
            }
        }
        
        // 5. Output the result for Node.js to read
        cout << bestUnit << endl;
    }
    return 0;
}