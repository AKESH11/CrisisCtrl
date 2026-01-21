FROM node:18-slim

# Install system dependencies for C++
RUN apt-get update && apt-get install -y g++ && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/
WORKDIR /app/backend

# Install Node dependencies
RUN npm install

# Copy rest of backend
COPY backend/ .

# Compile C++ matcher
WORKDIR /app/backend/matcher
RUN g++ matcher.cpp -o matcher
RUN chmod +x matcher

# Back to backend root
WORKDIR /app/backend

# Expose Node port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
