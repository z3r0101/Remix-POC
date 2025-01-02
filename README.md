# Remix-POC

A **Proof of Concept** application built with [Remix](https://remix.run/) to demonstrate reusable components, dynamic UI features, and modern full-stack web development practices.

## Features

- **ContentRepeater Component**: A versatile, reusable component for managing dynamic content with features like dialog modals, drag-and-drop sorting, and more.
- **Mapper Integration**: Draw and save polygons using Leaflet and OpenStreetMap.

## Prerequisites

- Docker
- Docker compose

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/z3r0101/Remix-POC.git
cd Remix-POC
```

### 2. Deploy application
```docker-compose up --build -d```

### 3. Access the Application Container
```docker exec -it remix-poc-remix-poc-1 bash```

### 4. Apply Database Migrations
```npx drizzle-kit push```

### 5. Access the Application
http://localhost:3000/remix-poc