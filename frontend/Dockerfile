# Build Stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use ci for idempotent installs)
# Install dependencies using npm install for robustness
RUN npm install

# Copy application code
COPY . .

# Build args
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build the application
# Debug: List installed binaries and check PATH
RUN ls -la node_modules/.bin || echo "node_modules/.bin does not exist"
RUN echo $PATH
RUN npm list typescript || echo "typescript not found in npm list"

# Build the application with verbose output
RUN npm run build --loglevel verbose

# Production Stage
FROM nginx:alpine

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
