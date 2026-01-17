pipeline {
    agent any
    
    environment {
        // Application
        APP_NAME = 'devops-nodejs-app'
        APP_PORT = '3000'
        
        // Docker
        DOCKER_IMAGE = "${APP_NAME}"
        DOCKER_TAG = "${BUILD_NUMBER}"
        REGISTRY_URL = 'localhost:5000'
        DOCKER_REGISTRY_IMAGE = "${REGISTRY_URL}/${DOCKER_IMAGE}"
        
        // SonarQube
        SONAR_PROJECT_KEY = 'devops-nodejs-app'
        
        // Paths
        WORKSPACE_PATH = "${WORKSPACE}"
    }
    options{
      // keep only last five builds
      buildDiscarder(logRotator(numToKeepStr: '5'))
    }
    
    tools {
        nodejs 'NodeJS-20'
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    echo '================================================'
                    echo '          STAGE 1: SOURCE CODE CHECKOUT         '
                    echo '================================================'
                }
                checkout scm
                sh 'git rev-parse --short HEAD > .git/commit-id'
                script {
                    env.GIT_COMMIT_SHORT = readFile('.git/commit-id').trim()
                    echo "Git Commit: ${env.GIT_COMMIT_SHORT}"
                }
            }
        }
        
        stage('Environment Setup') {
            steps {
                script {
                    echo '================================================'
                    echo '       STAGE 2: ENVIRONMENT PREPARATION         '
                    echo '================================================'
                }
                sh '''
                    echo "Node version: $(node --version)"
                    echo "NPM version: $(npm --version)"
                    echo "Docker version: $(docker --version)"
                    echo "Workspace: ${WORKSPACE}"
                '''
            }
        }
        
        stage('Install Dependencies') {
            steps {
                script {
                    echo '================================================'
                    echo '        STAGE 3: DEPENDENCY INSTALLATION        '
                    echo '================================================'
                }
                sh 'npm ci'
            }
        }
        
        stage('Secret Scanning') {
            steps {
                script {
                    echo '================================================'
                    echo '      STAGE 4: SECRET SCANNING (GITLEAKS)      '
                    echo '================================================'
                }
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    sh '''
                        gitleaks detect --source . --verbose --no-git --report-path gitleaks-report.json || true
                        
                        if [ -f gitleaks-report.json ] && [ "$(jq length gitleaks-report.json)" -gt 0 ]; then

                          echo "⚠️  SECRETS DETECTED! Check gitleaks-report.json"
                          cat gitleaks-report.json
                          exit 1
                        else
                          echo "✅ No secrets detected"
                        fi
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'gitleaks-report.json', allowEmptyArchive: true
                }
            }
        }
        
        stage('SonarQube Analysis') {
            steps {
                script {
                    echo '================================================'
                    echo '      STAGE 5: CODE QUALITY ANALYSIS (SONAR)   '
                    echo '================================================'
                }
                script {
                    def scannerHome = tool 'SonarScanner'
                    withSonarQubeEnv('SonarQube') {
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                            -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                            -Dsonar.sources=src \
                            -Dsonar.tests=tests \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                            -Dsonar.exclusions=node_modules/**,coverage/**,tests/**
                        """
                    }
                }
            }
        }
        
        stage('Quality Gate') {
            steps {
                script {
                    echo '================================================'
                    echo '         STAGE 6: SONARQUBE QUALITY GATE        '
                    echo '================================================'
                }
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: false
                }
            }
        }
        
        stage('Dependency Security Check') {
            steps {
                script {
                    echo '================================================'
                    echo '      STAGE 7: DEPENDENCY VULNERABILITY SCAN    '
                    echo '================================================'
                }
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh '''
                        echo "Running npm audit..."
                        npm audit --audit-level=moderate --json > npm-audit-report.json || true
                        
                        # Display report
                        if [ -f npm-audit-report.json ]; then
                            echo "Audit Report:"
                            cat npm-audit-report.json | head -50
                        fi
                        
                        # Check for high/critical vulnerabilities
                        npm audit --audit-level=high || echo "⚠️  High/Critical vulnerabilities found"
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'npm-audit-report.json', allowEmptyArchive: true
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                script {
                    echo '================================================'
                    echo '          STAGE 8: UNIT TESTS & COVERAGE        '
                    echo '================================================'
                }
                sh 'npm test -- --coverage'
            }
            post {
                always {
                    // Archive test results
                    archiveArtifacts artifacts: 'coverage/**/*', allowEmptyArchive: true
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    echo '================================================'
                    echo '         STAGE 9: DOCKER IMAGE BUILD            '
                    echo '================================================'
                }
                sh """
                    docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} .
                    docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest
                    docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_REGISTRY_IMAGE}:${DOCKER_TAG}
                    docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_REGISTRY_IMAGE}:latest
                    
                    echo "✅ Docker image built: ${DOCKER_IMAGE}:${DOCKER_TAG}"
                """
            }
        }
        
        stage('Container Security Scan') {
            steps {
                script {
                    echo '================================================'
                    echo '      STAGE 10: CONTAINER SECURITY SCAN (TRIVY) '
                    echo '================================================'
                }
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh """
                        echo "Scanning Docker image with Trivy..."
                        
                        # Scan for vulnerabilities
                        trivy image --severity HIGH,CRITICAL --format json --output trivy-report.json ${DOCKER_IMAGE}:${DOCKER_TAG} || true
                        
                        # Display summary
                        trivy image --severity HIGH,CRITICAL ${DOCKER_IMAGE}:${DOCKER_TAG} || true
                        
                        echo "✅ Trivy scan completed"
                    """
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
                }
            }
        }
        
        stage('Push to Registry') {
            steps {
                script {
                    echo '================================================'
                    echo '       STAGE 11: PUSH TO DOCKER REGISTRY        '
                    echo '================================================'
                }
                sh """
                    docker push ${DOCKER_REGISTRY_IMAGE}:${DOCKER_TAG}
                    docker push ${DOCKER_REGISTRY_IMAGE}:latest
                    
                    echo "✅ Image pushed to registry"
                    echo "Image: ${DOCKER_REGISTRY_IMAGE}:${DOCKER_TAG}"
                """
            }
        }
        
        stage('Deploy Application') {
            steps {
                script {
                    echo '================================================'
                    echo '         STAGE 12: DEPLOY CONTAINER             '
                    echo '================================================'
                }
                sh """
                    # Stop and remove old container if exists
                    docker stop ${APP_NAME} 2>/dev/null || true
                    docker rm ${APP_NAME} 2>/dev/null || true
                    
                    # Run new container
                    docker run -d \
                        --name ${APP_NAME} \
                        --restart unless-stopped \
                        -p ${APP_PORT}:3000 \
                        -e NODE_ENV=production \
                        ${DOCKER_REGISTRY_IMAGE}:${DOCKER_TAG}
                    
                    echo "✅ Container deployed successfully"
                    echo "Container name: ${APP_NAME}"
                    echo "Accessible at: http://localhost:${APP_PORT}"
                    
                    # Wait for container to start
                    sleep 5
                    
                    # Check container status
                    docker ps | grep ${APP_NAME}
                """
            }
        }
        
        stage('Health Check') {
            steps {
                script {
                    echo '================================================'
                    echo '      STAGE 13: POST-DEPLOYMENT VERIFICATION    '
                    echo '================================================'
                }
                retry(3) {
                    sh """
                        echo "Waiting for application to be ready..."
                        sleep 3
                        
                        # Health check
                        curl -f http://localhost:${APP_PORT}/health || exit 1
                        
                        # Ready check
                        curl -f http://localhost:${APP_PORT}/ready || exit 1
                        
                        # Test main endpoint
                        curl -f http://localhost:${APP_PORT}/ || exit 1
                        
                        echo "✅ All health checks passed!"
                    """
                }
            }
        }
        
        stage('Smoke Tests') {
            steps {
                script {
                    echo '================================================'
                    echo '           STAGE 14: SMOKE TESTS                '
                    echo '================================================'
                }
                sh """
                    echo "Running smoke tests..."
                    
                    # Test API endpoints
                    curl -s http://localhost:${APP_PORT}/api/info | grep -q "DevOps Node.js App"
                    curl -s http://localhost:${APP_PORT}/api/add/10/5 | grep -q '"result":15'
                    
                    echo "✅ Smoke tests passed!"
                """
            }
        }
    }
    
    post {
        always {
            script {
                echo '================================================'
                echo '              PIPELINE SUMMARY                  '
                echo '================================================'
                echo "Build Number: ${BUILD_NUMBER}"
                echo "Git Commit: ${env.GIT_COMMIT_SHORT}"
                echo "Docker Image: ${DOCKER_REGISTRY_IMAGE}:${DOCKER_TAG}"
                echo "Application URL: http://localhost:${APP_PORT}"
                echo '================================================'
            }
            
            // Cleanup
            cleanWs(
                deleteDirs: true,
                patterns: [
                    [pattern: 'node_modules/**', type: 'INCLUDE'],
                    [pattern: 'coverage/**', type: 'INCLUDE']
                ]
            )
        }
        
        success {
            echo '✅ ✅ ✅ PIPELINE COMPLETED SUCCESSFULLY ✅ ✅ ✅'
        }
        
        failure {
            echo '❌ ❌ ❌ PIPELINE FAILED ❌ ❌ ❌'
        }
        
        unstable {
            echo '⚠️  ⚠️  ⚠️  PIPELINE UNSTABLE ⚠️  ⚠️  ⚠️'
        }
    }
}
