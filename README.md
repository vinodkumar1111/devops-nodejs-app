# DevOps Node.js Application

A sample Node.js REST API application demonstrating CI/CD pipeline with Jenkins, Docker, SonarQube, and security scanning.

## Features

- ✅ RESTful API with Express.js
- ✅ Health check endpoints
- ✅ Unit tests with Jest
- ✅ Docker containerization with multi-stage build
- ✅ Security scanning with Trivy
- ✅ Code quality analysis with SonarQube
- ✅ Automated CI/CD pipeline with Jenkins

## Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /ready` - Readiness check
- `GET /api/info` - Application information
- `POST /api/echo` - Echo endpoint
- `GET /api/add/:a/:b` - Add two numbers

## Local Development
```bash
# Install dependencies
npm install

# Run application
npm start

# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Docker
```bash
# Build image
docker build -t devops-nodejs-app:latest .

# Run container
docker run -p 3000:3000 devops-nodejs-app:latest

# Access application
curl http://localhost:3000/health
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (default: development)

## CI/CD Pipeline

This application is automatically built, tested, scanned, and deployed using Jenkins pipeline.

Pipeline stages:
1. Checkout
2. Secret Scanning (GitLeaks)
3. SonarQube Analysis
4. Dependency Check
5. Build & Test
6. Docker Build
7. Trivy Security Scan
8. Push to Registry
9. Deploy Container
10. Health Check Verification

## License

MIT
