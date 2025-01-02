# Use Node.js 19 as the base image
FROM node:19

RUN apt-get update && apt-get upgrade -y && \
apt-get install -y vim && \
# Clean up the apt cache to reduce image size
apt-get clean && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy package.json only (no package-lock.json initially)
COPY package.json ./

# Copy the rest of the application source code
# COPY . .
# Copy specific folders and files from the host to the container
COPY ./app ./app
COPY ./public ./public
COPY ./vite.config.ts ./
COPY ./drizzle.config.ts ./

# Install dependencies (generates package-lock.json if it doesn't exist)
RUN npm install

# Expose Remix's default port
EXPOSE 3000

# Default command to start the Remix development server
CMD ["npm", "run", "dev"]