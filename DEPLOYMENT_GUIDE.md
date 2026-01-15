# DevOps CI/CD Pipeline - Complete Deployment Guide

> **Version:** 1.0  
> **Last Updated:** January 2026  
> **Author:** DevOps Team  
> **Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Infrastructure Setup](#infrastructure-setup)
   - [Phase 1: System Preparation](#phase-1-system-preparation)
   - [Phase 2: Docker Installation](#phase-2-docker-installation)
   - [Phase 3: Jenkins Setup](#phase-3-jenkins-setup)
   - [Phase 4: SonarQube Setup](#phase-4-sonarqube-setup)
   - [Phase 5: Security Tools](#phase-5-security-tools)
   - [Phase 6: Docker Registry](#phase-6-docker-registry)
5. [Jenkins Configuration](#jenkins-configuration)
6. [Application Deployment](#application-deployment)
7. [Pipeline Setup](#pipeline-setup)
8. [Verification](#verification)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)
11. [Appendix](#appendix)

---

## Overview

This guide provides complete step-by-step instructions to deploy a production-ready CI/CD pipeline for Node.js applications.

### What You'll Build

A fully automated CI/CD pipeline with:
- ✅ Automated builds triggered by Git commits
- ✅ Multi-layer security scanning
- ✅ Code quality analysis
- ✅ Automated testing
- ✅ Containerized deployment
- ✅ Health monitoring

### Timeline

- **Infrastructure Setup:** 2-3 hours
- **Application Setup:** 30 minutes
- **Pipeline Configuration:** 1 hour
- **Testing & Verification:** 30 minutes
- **Total:** ~4-5 hours

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Ubuntu VM (Single Server)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │   Jenkins    │  │  SonarQube   │  │ Docker Registry  │      │
│  │  (CI/CD)     │  │ (Code Qual.) │  │   (Artifacts)    │      │
│  │  Port: 8080  │  │  Port: 9000  │  │   Port: 5000     │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │   Docker     │  │    Trivy     │  │  Node.js App     │      │
│  │   Engine     │  │  (Security)  │  │  Port: 3000      │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │         PostgreSQL (SonarQube Database)             │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Webhook
                              ▼
                    ┌──────────────────┐
                    │   GitHub Repo    │
                    └──────────────────┘
```

### Pipeline Flow

```
Git Push → Webhook → Jenkins Pipeline
                          │
                          ├─> Checkout Code
                          ├─> Secret Scanning (GitLeaks)
                          ├─> Code Quality (SonarQube)
                          ├─> Dependency Check
                          ├─> Run Tests
                          ├─> Build Docker Image
                          ├─> Security Scan (Trivy)
                          ├─> Push to Registry
                          ├─> Deploy Container
                          └─> Health Checks ✓
```

---

## Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8 cores |
| RAM | 8 GB | 16 GB |
| Disk | 50 GB | 100 GB |
| Network | 10 Mbps | 100 Mbps |

### Software Requirements

- **OS:** Ubuntu 20.04 LTS or higher
- **User:** Root or sudo access
- **Network:** Open ports: 22, 3000, 5000, 8080, 9000

### Before You Begin

- [ ] Fresh Ubuntu installation
- [ ] Root/sudo access confirmed
- [ ] GitHub account created
- [ ] Basic Linux command knowledge
- [ ] SSH access to server

---

## Infrastructure Setup

### Phase 1: System Preparation

#### Step 1.1: Update System

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common \
    git \
    wget \
    gnupg \
    lsb-release
```

**Verification:**
```bash
# Check versions
git --version
curl --version
```

**Expected Output:**
```
git version 2.x.x
curl 7.x.x
```

---

#### Step 1.2: Configure Firewall (Optional)

If using UFW firewall:

```bash
# Check firewall status
sudo ufw status

# Allow required ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 8080/tcp  # Jenkins
sudo ufw allow 9000/tcp  # SonarQube
sudo ufw allow 5000/tcp  # Docker Registry
sudo ufw allow 3000/tcp  # Application

# Enable firewall
sudo ufw enable

# Verify
sudo ufw status
```

---

### Phase 2: Docker Installation

#### Step 2.1: Install Docker Engine

```bash
# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up repository
echo "deb [arch=$(dpkg --print-architecture) \
    signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

**Verification:**
```bash
docker --version
docker compose version
```

**Expected Output:**
```
Docker version 25.x.x
Docker Compose version v2.x.x
```

---

#### Step 2.2: Configure Docker Permissions

```bash
# Add current user to docker group
sudo usermod -aG docker $USER

# Apply group changes (logout/login or run)
newgrp docker

# Verify (should work without sudo)
docker ps
```

---

#### Step 2.3: Configure Docker Registry

```bash
# Create daemon.json for insecure registry
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "insecure-registries": ["localhost:5000"]
}
EOF

# Restart Docker
sudo systemctl restart docker

# Verify
docker info | grep -A 5 "Insecure Registries"
```

---

#### Step 2.4: Test Docker Installation

```bash
# Run test container
docker run hello-world

# Check output for success message
```

**Expected Output:**
```
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

---

### Phase 3: Jenkins Setup

#### Step 3.1: Install Java (Jenkins Requirement)

```bash
# Install Java 17
sudo apt install -y fontconfig openjdk-17-jre

# Verify installation
java -version
```

**Expected Output:**
```
openjdk version "17.x.x"
```

---

#### Step 3.2: Install Jenkins

```bash
# Add Jenkins repository key
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc \
    https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key

# Add Jenkins repository
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc]" \
    https://pkg.jenkins.io/debian-stable binary/ | \
    sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

# Install Jenkins
sudo apt update
sudo apt install -y jenkins

# Start Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Check status
sudo systemctl status jenkins
```

**Verification:**
```bash
# Should show "active (running)"
sudo systemctl status jenkins | grep Active
```

---

#### Step 3.3: Get Initial Admin Password

```bash
# Retrieve initial password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

**📝 IMPORTANT:** Copy this password! You'll need it in the next step.

---

#### Step 3.4: Initial Jenkins Setup (Web UI)

1. **Access Jenkins:**
   - Open browser: `http://YOUR_SERVER_IP:8080`

2. **Unlock Jenkins:**
   - Paste the initial admin password
   - Click **Continue**

3. **Install Plugins:**
   - Select **"Install suggested plugins"**
   - Wait for installation to complete (~5 minutes)

4. **Create Admin User:**
   - Username: `admin` (or your choice)
   - Password: [Choose a strong password]
   - Full name: `Admin User`
   - Email: `admin@example.com`
   - Click **Save and Continue**

5. **Instance Configuration:**
   - Jenkins URL: `http://YOUR_SERVER_IP:8080/`
   - Click **Save and Finish**

6. **Start Using Jenkins:**
   - Click **Start using Jenkins**

---

#### Step 3.5: Install Additional Jenkins Plugins

1. Go to: **Manage Jenkins** → **Plugins** → **Available plugins**

2. Search and install these plugins:
   - [ ] Docker Pipeline
   - [ ] SonarQube Scanner
   - [ ] NodeJS Plugin
   - [ ] Pipeline Utility Steps
   - [ ] Workspace Cleanup Plugin
   - [ ] Blue Ocean (optional - better UI)

3. Select **"Download now and install after restart"**

4. Check **"Restart Jenkins when installation is complete"**

5. Wait for restart (~2 minutes)

6. Log back in with your admin credentials

---

### Phase 4: SonarQube Setup

#### Step 4.1: Set System Limits (CRITICAL)

```bash
# These limits are REQUIRED for SonarQube
sudo sysctl -w vm.max_map_count=524288
sudo sysctl -w fs.file-max=131072

# Make permanent
echo "vm.max_map_count=524288" | sudo tee -a /etc/sysctl.conf
echo "fs.file-max=131072" | sudo tee -a /etc/sysctl.conf

# Apply settings
sudo sysctl -p

# Verify
sysctl vm.max_map_count
sysctl fs.file-max
```

**Expected Output:**
```
vm.max_map_count = 524288
fs.file-max = 131072
```

---

#### Step 4.2: Create SonarQube Directory

```bash
# Create directory
mkdir -p ~/sonarqube
cd ~/sonarqube
```

---

#### Step 4.3: Create Docker Compose File

```bash
cat > docker-compose.yml <<'EOF'
version: "3"

services:
  sonarqube:
    image: sonarqube:community
    container_name: sonarqube
    depends_on:
      - db
    environment:
      SONAR_JDBC_URL: jdbc:postgresql://db:5432/sonar
      SONAR_JDBC_USERNAME: sonar
      SONAR_JDBC_PASSWORD: sonar
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs
    ports:
      - "9000:9000"
    networks:
      - sonarnet
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

  db:
    image: postgres:15
    container_name: sonarqube_db
    environment:
      POSTGRES_USER: sonar
      POSTGRES_PASSWORD: sonar
      POSTGRES_DB: sonar
    volumes:
      - postgresql_data:/var/lib/postgresql/data
    networks:
      - sonarnet

volumes:
  sonarqube_data:
  sonarqube_extensions:
  sonarqube_logs:
  postgresql_data:

networks:
  sonarnet:
    driver: bridge
EOF
```

---

#### Step 4.4: Start SonarQube

```bash
# Start containers
docker compose up -d

# Check status
docker compose ps

# Watch logs (wait for "SonarQube is operational")
docker compose logs -f sonarqube
```

**⏱️ Wait Time:** 2-3 minutes for SonarQube to start

**Look for this message:**
```
SonarQube is operational
```

Press `Ctrl+C` to exit log view.

---

#### Step 4.5: Access SonarQube Web UI

1. **Access SonarQube:**
   - Open browser: `http://YOUR_SERVER_IP:9000`

2. **Login:**
   - Username: `admin`
   - Password: `admin`

3. **Change Password:**
   - You'll be prompted to change password
   - New password: [Choose a strong password]
   - **📝 SAVE THIS PASSWORD!**

---

#### Step 4.6: Generate SonarQube Token

1. In SonarQube, click on **'A'** (top right) → **My Account**

2. Go to **Security** tab

3. **Generate Token:**
   - Name: `jenkins-token`
   - Type: **Global Analysis Token**
   - Expires in: **No expiration**
   - Click **Generate**

4. **📝 CRITICAL:** Copy the token immediately!
   ```
   Example: squ_1234567890abcdef1234567890abcdef12345678
   ```

5. Store securely - you won't see it again!

---

### Phase 5: Security Tools

#### Step 5.1: Install Trivy (Container Scanner)

```bash
# Add Trivy repository
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | \
    gpg --dearmor | \
    sudo tee /usr/share/keyrings/trivy.gpg > /dev/null

echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] \
    https://aquasecurity.github.io/trivy-repo/deb \
    $(lsb_release -sc) main" | \
    sudo tee -a /etc/apt/sources.list.d/trivy.list

# Install Trivy
sudo apt update
sudo apt install -y trivy

# Verify
trivy --version
```

**Expected Output:**
```
Version: 0.x.x
```

---

#### Step 5.2: Install GitLeaks (Secret Scanner)

```bash
# Download GitLeaks
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.1/gitleaks_8.18.1_linux_x64.tar.gz

# Extract
tar -xzf gitleaks_8.18.1_linux_x64.tar.gz

# Move to system path
sudo mv gitleaks /usr/local/bin/
sudo chmod +x /usr/local/bin/gitleaks

# Clean up
rm gitleaks_8.18.1_linux_x64.tar.gz

# Verify
gitleaks version
```

**Expected Output:**
```
v8.18.1
```

---

#### Step 5.3: Install Node.js

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

**Expected Output:**
```
v20.x.x
10.x.x
```

---

### Phase 6: Docker Registry

#### Step 6.1: Create Registry Directory

```bash
# Create directory for registry data
mkdir -p ~/docker-registry
```

---

#### Step 6.2: Start Docker Registry

```bash
# Run registry container
docker run -d \
  --name registry \
  --restart=always \
  -p 5000:5000 \
  -v ~/docker-registry:/var/lib/registry \
  registry:2

# Verify
docker ps | grep registry
```

---

#### Step 6.3: Test Registry

```bash
# Test registry API
curl http://localhost:5000/v2/_catalog

# Should return: {"repositories":[]}
```

---

## Jenkins Configuration

### Step 7.1: Configure Jenkins Credentials

1. Go to: **Manage Jenkins** → **Credentials** → **System** → **Global credentials**

2. Click **Add Credentials**

#### Credential 1: SonarQube Token

```
Kind: Secret text
Scope: Global
Secret: [Paste your SonarQube token]
ID: sonarqube-token
Description: SonarQube Authentication Token
```

Click **Create**

#### Credential 2: GitHub Credentials (if private repo)

```
Kind: Username with password
Scope: Global
Username: [Your GitHub username]
Password: [Your GitHub Personal Access Token]
ID: github-creds
Description: GitHub Credentials
```

Click **Create**

**📝 Note:** To create GitHub PAT:
- Go to GitHub → Settings → Developer settings → Personal access tokens → Generate new token
- Permissions: `repo` (full control)

---

### Step 7.2: Configure NodeJS in Jenkins

1. Go to: **Manage Jenkins** → **Tools**

2. Scroll to **NodeJS installations**

3. Click **Add NodeJS**

4. Configure:
   ```
   Name: NodeJS-20
   Install automatically: ✓ (checked)
   Version: NodeJS 20.x (select latest)
   ```

5. Click **Save**

---

### Step 7.3: Configure SonarQube Scanner

1. Still in **Tools** section

2. Scroll to **SonarQube Scanner installations**

3. Click **Add SonarQube Scanner**

4. Configure:
   ```
   Name: SonarScanner
   Install automatically: ✓ (checked)
   Version: Latest (select from dropdown)
   ```

5. Click **Save**

---

### Step 7.4: Configure SonarQube Server

1. Go to: **Manage Jenkins** → **System**

2. Scroll to **SonarQube servers**

3. Click **Add SonarQube**

4. Configure:
   ```
   Name: SonarQube
   Server URL: http://localhost:9000
   Server authentication token: Select "sonarqube-token"
   ```

5. Click **Save**

---

## Application Deployment

### Step 8.1: Clone Your Application Repository

```bash
# Clone your repo (replace with your URL)
git clone https://github.com/YOUR_USERNAME/devops-nodejs-app.git

cd devops-nodejs-app
```

---

### Step 8.2: Verify Application Files

Check that you have these files:

```bash
ls -la
```

**Required files:**
```
✓ package.json
✓ package-lock.json (IMPORTANT for CI/CD)
✓ Dockerfile
✓ Jenkinsfile
✓ sonar-project.properties
✓ src/
✓ tests/
```

**⚠️ CRITICAL:** If `package-lock.json` is missing:

```bash
# Generate it
npm install

# Commit and push
git add package-lock.json
git commit -m "Add package-lock.json"
git push origin main
```

---

### Step 8.3: Test Application Locally

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start application
npm start
```

In another terminal:
```bash
# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/
```

**Expected Output:**
```json
{
  "status": "healthy",
  "uptime": 5.123,
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

Stop the app with `Ctrl+C`

---

### Step 8.4: Test Docker Build

```bash
# Build Docker image
docker build -t devops-nodejs-app:test .

# Run container
docker run -d -p 3000:3000 --name test-app devops-nodejs-app:test

# Test
curl http://localhost:3000/health

# Clean up
docker stop test-app
docker rm test-app
```

---

## Pipeline Setup

### Step 9.1: Create Jenkins Pipeline Job

1. **Open Jenkins:** `http://YOUR_SERVER_IP:8080`

2. Click **New Item**

3. Configure:
   ```
   Enter name: devops-nodejs-pipeline
   Type: Pipeline
   ```

4. Click **OK**

---

### Step 9.2: Configure Pipeline

#### General Section

- ✓ Check **GitHub project**
- Project url: `https://github.com/YOUR_USERNAME/devops-nodejs-app/`

#### Build Triggers

- ✓ Check **GitHub hook trigger for GITScm polling**

#### Pipeline Section

```
Definition: Pipeline script from SCM
SCM: Git
Repository URL: https://github.com/YOUR_USERNAME/devops-nodejs-app.git
Credentials: [Select github-creds if private repo, or none if public]
Branch Specifier: */main
Script Path: Jenkinsfile
```

---

### Step 9.3: Configure GitHub Webhook

1. Go to your GitHub repository

2. **Settings** → **Webhooks** → **Add webhook**

3. Configure:
   ```
   Payload URL: http://YOUR_SERVER_IP:8080/github-webhook/
   Content type: application/json
   Secret: (leave empty)
   Which events: Just the push event
   Active: ✓ (checked)
   ```

4. Click **Add webhook**

5. Verify: You should see a green checkmark after a few seconds

**📝 Note:** If Jenkins is not publicly accessible, you'll need to trigger builds manually.

---

### Step 9.4: First Manual Build

1. In Jenkins, go to your pipeline: **devops-nodejs-pipeline**

2. Click **Build Now**

3. Watch the build:
   - Click on build **#1**
   - Click **Console Output**

**Expected Pipeline Stages:**
```
✅ Checkout
✅ Environment Setup
✅ Install Dependencies
✅ Secret Scanning
✅ SonarQube Analysis
✅ Quality Gate
✅ Dependency Security Check
✅ Run Tests
✅ Build Docker Image
✅ Container Security Scan
✅ Push to Registry
✅ Deploy Application
✅ Health Check
✅ Smoke Tests
```

**⏱️ First build time:** 5-10 minutes

---

## Verification

### Step 10.1: Verify Pipeline Success

```bash
# Check Jenkins console shows "SUCCESS"
# All stages should be green
```

---

### Step 10.2: Verify Application Deployment

```bash
# Check container is running
docker ps | grep devops-nodejs-app

# Check container logs
docker logs devops-nodejs-app

# Test application endpoints
curl http://localhost:3000/
curl http://localhost:3000/health
curl http://localhost:3000/api/info
```

**Expected Output:**
```json
{
  "message": "Welcome to DevOps Node.js Application!",
  "version": "1.0.0",
  "status": "running"
}
```

---

### Step 10.3: Verify Docker Registry

```bash
# List images in registry
curl http://localhost:5000/v2/_catalog

# Should show: {"repositories":["devops-nodejs-app"]}

# List tags
curl http://localhost:5000/v2/devops-nodejs-app/tags/list
```

---

### Step 10.4: Verify SonarQube Analysis

1. Open SonarQube: `http://YOUR_SERVER_IP:9000`

2. You should see project: **devops-nodejs-app**

3. Click on the project to view:
   - Code coverage
   - Code smells
   - Security issues
   - Duplications

---

### Step 10.5: Test Automatic Build

Make a small change to test webhook:

```bash
cd ~/devops-nodejs-app

# Make a change
echo "## Test" >> README.md

# Commit and push
git add README.md
git commit -m "Test webhook trigger"
git push origin main
```

**Watch Jenkins** - it should automatically start a new build within seconds!

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Jenkins Build Fails - "package-lock.json missing"

**Symptoms:**
```
Error: npm ci can only install with an existing package-lock.json
```

**Solution:**
```bash
cd ~/devops-nodejs-app
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push origin main
```

---

#### Issue 2: SonarQube Container Won't Start

**Symptoms:**
```
Container exits immediately
```

**Solution:**
```bash
# Set system limits (CRITICAL)
sudo sysctl -w vm.max_map_count=524288
sudo sysctl -w fs.file-max=131072

# Restart
cd ~/sonarqube
docker compose down
docker compose up -d
```

**Verify:**
```bash
# Check logs
docker compose logs -f sonarqube

# Wait for: "SonarQube is operational"
```

---

#### Issue 3: Cannot Push to Docker Registry

**Symptoms:**
```
Error: server gave HTTP response to HTTPS client
```

**Solution:**
```bash
# Configure insecure registry
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "insecure-registries": ["localhost:5000"]
}
EOF

# Restart Docker
sudo systemctl restart docker

# Restart Jenkins
sudo systemctl restart jenkins
```

---

#### Issue 4: Jenkins Cannot Connect to SonarQube

**Symptoms:**
```
Error: Unable to reach SonarQube server
```

**Solution:**
```bash
# Check SonarQube is running
docker compose -f ~/sonarqube/docker-compose.yml ps

# Test connectivity
curl http://localhost:9000

# If not responding, restart
cd ~/sonarqube
docker compose restart sonarqube
```

---

#### Issue 5: Application Not Accessible on Port 3000

**Symptoms:**
```
curl: (7) Failed to connect to localhost port 3000
```

**Solution:**
```bash
# Check container is running
docker ps | grep devops-nodejs-app

# Check logs for errors
docker logs devops-nodejs-app

# Check if port is bound
sudo netstat -tulpn | grep 3000

# Restart container
docker restart devops-nodejs-app
```

---

#### Issue 6: GitHub Webhook Not Working

**Symptoms:**
- Push to GitHub doesn't trigger build

**Solution:**
1. Check webhook status in GitHub:
   - Repo → Settings → Webhooks
   - Look for green checkmark
   - Click webhook to see delivery history

2. If failed, check Jenkins URL is accessible:
   ```bash
   curl http://YOUR_SERVER_IP:8080
   ```

3. Trigger manual build to verify pipeline works

---

### Debugging Commands

```bash
# Check all services status
sudo systemctl status docker
sudo systemctl status jenkins
docker compose -f ~/sonarqube/docker-compose.yml ps
docker ps

# Check logs
sudo journalctl -u jenkins -n 50
docker logs devops-nodejs-app
docker compose -f ~/sonarqube/docker-compose.yml logs sonarqube

# Check resource usage
free -h
df -h
docker stats --no-stream

# Check network connectivity
curl http://localhost:8080  # Jenkins
curl http://localhost:9000  # SonarQube
curl http://localhost:5000/v2/_catalog  # Registry
curl http://localhost:3000/health  # Application
```

---

## Maintenance

### Daily Operations

#### Start All Services

```bash
# Start Docker
sudo systemctl start docker

# Start Jenkins
sudo systemctl start jenkins

# Start SonarQube
cd ~/sonarqube
docker compose up -d

# Start Registry (if not auto-started)
docker start registry
```

---

#### Stop All Services

```bash
# Stop application container
docker stop devops-nodejs-app

# Stop SonarQube
cd ~/sonarqube
docker compose down

# Stop Jenkins (use sparingly)
sudo systemctl stop jenkins
```

---

#### View Logs

```bash
# Jenkins logs
sudo journalctl -u jenkins -f

# SonarQube logs
cd ~/sonarqube
docker compose logs -f sonarqube

# Application logs
docker logs -f devops-nodejs-app

# All container logs
docker logs -f <container_name>
```

---

#### Cleanup Docker Resources

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes (CAREFUL!)
docker volume prune

# Full cleanup
docker system prune -a
```

---

### Backup Procedures

#### Backup Jenkins

```bash
# Stop Jenkins
sudo systemctl stop jenkins

# Backup Jenkins home
sudo tar -czf jenkins-backup-$(date +%Y%m%d).tar.gz \
    /var/lib/jenkins/

# Restart Jenkins
sudo systemctl start jenkins
```

---

#### Backup SonarQube

```bash
# Backup SonarQube data
cd ~/sonarqube
docker compose exec db pg_dump -U sonar sonar > \
    sonarqube-db-backup-$(date +%Y%m%d).sql
```

---

#### Backup Application Images

```bash
# Save Docker image
docker save devops-nodejs-app:latest | \
    gzip > devops-nodejs-app-$(date +%Y%m%d).tar.gz
```

---

### Update Procedures

#### Update Jenkins Plugins

1. Go to: **Manage Jenkins** → **Plugins**
2. Click **Available plugins**
3. Check for updates
4. Select plugins to update
5. Click **Download now and install after restart**

---

#### Update Application

```bash
# Pull latest code
cd ~/devops-nodejs-app
git pull origin main

# Trigger Jenkins build
# Or commit a change to auto-trigger
```

---

### Monitoring

#### Check System Health

```bash
# Check disk usage
df -h

# Check memory
free -h

# Check CPU
top

# Check Docker disk usage
docker system df

# Check container resource usage
docker stats
```

---

#### Monitor Application

```bash
# Health check
curl http://localhost:3000/health

# Check response time
time curl http://localhost:3000/

# Check container logs for errors
docker logs --tail=100 devops-nodejs-app | grep -i error
```

---

## Appendix

### A. Service URLs

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| Jenkins | http://YOUR_IP:8080 | admin / [your-password] |
| SonarQube | http://YOUR_IP:9000 | admin / [your-password] |
| Application | http://YOUR_IP:3000 | N/A |
| Docker Registry | http://YOUR_IP:5000 | N/A |

---

### B. Important File Locations

```bash
# Jenkins
/var/lib/jenkins/                    # Jenkins home
/var/lib/jenkins/workspace/          # Build workspaces
/var/log/jenkins/jenkins.log         # Jenkins logs

# SonarQube
~/sonarqube/docker-compose.yml       # SonarQube config
~/sonarqube/                         # SonarQube data

# Docker Registry
~/docker-registry/                   # Registry data

# Application
~/devops-nodejs-app/                 # Application code
```

---

### C. Useful Commands

```bash
# Restart all services
sudo systemctl restart docker jenkins
cd ~/sonarqube && docker compose restart

# View all running containers
docker ps

# View all containers (including stopped)
docker ps -a

# Remove a container
docker rm -f <container_name>

# View images
docker images

# Remove an image
docker rmi <image_name>

# Execute command in container
docker exec -it <container_name> /bin/sh

# View container details
docker inspect <container_name>
```

---

### D. Environment Variables Reference

For the Node.js application, these environment variables can be configured:

```bash
PORT=3000                    # Application port
HOST=0.0.0.0                # Bind address
NODE_ENV=production         # Environment
LOG_LEVEL=info             # Logging level
```

---

### E. Security Best Practices

1. **Change Default Passwords**
   - [ ] Jenkins admin password
   - [ ] SonarQube admin password

2. **Enable HTTPS**
   - [ ] Configure SSL/TLS for Jenkins
   - [ ] Configure SSL/TLS for SonarQube
   - [ ] Use HTTPS for Docker Registry

3. **Secure Secrets**
   - [ ] Use Jenkins credentials store
   - [ ] Never commit secrets to Git
   - [ ] Rotate tokens regularly

4. **Regular Updates**
   - [ ] Keep Jenkins plugins updated
   - [ ] Update Docker images
   - [ ] Apply system security patches

5. **Access Control**
   - [ ] Configure Jenkins user permissions
   - [ ] Configure SonarQube user permissions
   - [ ] Use firewall rules

---

### F. Performance Tuning

#### Jenkins

```bash
# Edit Jenkins config
sudo nano /etc/default/jenkins

# Increase memory
JAVA_ARGS="-Xmx2048m -Xms1024m"

# Restart
sudo systemctl restart jenkins
```

#### Docker

```bash
# Edit daemon.json
sudo nano /etc/docker/daemon.json

# Add:
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Restart
sudo systemctl restart docker
```

---

### G. Additional Resources

- **Jenkins Documentation:** https://www.jenkins.io/doc/
- **Docker Documentation:** https://docs.docker.com/
- **SonarQube Documentation:** https://docs.sonarqube.org/
- **Node.js Best Practices:** https://github.com/goldbergyoni/nodebestpractices
- **DevOps Roadmap:** https://roadmap.sh/devops

---

### H. Support and Contact

For issues or questions:
- **GitHub Issues:** [Your repo URL]/issues
- **Team Slack:** #devops-team
- **Email:** devops@yourcompany.com

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Maintained by:** DevOps Team  
**Review Schedule:** Quarterly

---

## Quick Start Checklist

Use this checklist to track your progress:

### Infrastructure Setup
- [ ] System updated and prepared
- [ ] Docker installed and configured
- [ ] Jenkins installed and running
- [ ] SonarQube installed and running
- [ ] Trivy installed
- [ ] GitLeaks installed
- [ ] Node.js installed
- [ ] Docker Registry running

### Jenkins Configuration
- [ ] Initial setup completed
- [ ] Plugins installed
- [ ] Credentials configured
- [ ] NodeJS configured
- [ ] SonarQube Scanner configured
- [ ] SonarQube server configured

### Application Setup
- [ ] Repository cloned
- [ ] Application tested locally
- [ ] Docker image built and tested
- [ ] package-lock.json committed

### Pipeline Setup
- [ ] Pipeline job created
- [ ] GitHub webhook configured
- [ ] First build successful
- [ ] Automatic build tested

### Verification
- [ ] Application accessible on port 3000
- [ ] All pipeline stages passing
- [ ] SonarQube analysis visible
- [ ] Docker Registry contains images

**✅ Deployment Complete!**

---

*End of Deployment Guide*
