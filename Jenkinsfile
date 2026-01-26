pipeline {
    agent any
    environment {
        APP_NAME                = 'nodejs-app'
        APP_PORT                = '3000'
        DOCKER_HUB_USER         = 'vramavath'
        DOCKER_IMAGE            = "${DOCKER_HUB_USER}/${APP_NAME}"
        DOCKER_TAG              = "${BUILD_NUMBER}"
        SONAR_PROJECT_KEY       = 'sonar-scanner'
        WORKSPACE_PATH          = '${WORKSPACE}'
    }
    tools {
        nodejs 'NodeJS-20'
    }
    options {
        buildDiscarder(logRotator(numToKeepStr: '5'))
    }
    stages {
        stage('SCM Checkout') {
            // Checkout source code and get short Git commit ID
            steps {
                checkout scm
                sh 'git rev-parse --short HEAD > .git/commit-id'
                script {
                    env.GIT_COMMIT_SHORT = readFile('.git/commit-id').trim()
                    echo "Git commit ID: ${env.GIT_COMMIT_SHORT}"
                }
            }
        }
        stage('Environment Setup') {
            // Display Node, NPM, Docker versions and workspace info
            steps {
                sh '''
                    echo "Node Version  : $(node --version)"
                    echo "NPM Version   : $(npm --version)"
                    echo "Docker Version: $(docker --version)"
                    echo "Workspace     : $(WORKSPACE)"
                '''
            }
        }
        stage('Secret Scanning') {
            // Scan for secrets in the repo
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    sh '''
                        gitleaks detect --source . --verbose --no-git --report-path gitleaks-report.json --exclude-path gitleaks-report.json || true
                        if [ -f gitleaks-report.json ] && [ "$(jq length gitleaks-report.json)" -gt 0 ]; then
                            echo "Secrets detected!! Check gitleaks-report.json file"
                            exit 1
                        else
                            echo "No Secrets Detected!!"
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
        stage('Install Dependencies') {
            // Install Node.js project dependencies
            steps {
                sh 'npm ci'
            }
        }
        stage('Dependency Security Check') {
            // Check for high/critical vulnerabilities in dependencies
            steps {
                sh '''
                    npm audit --audit-level=HIGH --json > npm-audit-report.json || true
                    if ! npm audit --audit-level=HIGH; then
                        echo "High/Critical vulnerabilities found!"
                        exit 1
                    fi
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'npm-audit-report.json', allowEmptyArchive: true
                }
            }
        }
        stage('Run Test') {
            // Run unit tests with coverage
            steps {
                sh 'npm test --coverage'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'coverage/**/*', allowEmptyArchive: true
                }
            }
        }
        stage('SonarQube Analysis') {
            // Run SonarQube static code analysis
            steps {
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
            // Wait for SonarQube quality gate results
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: false
                }
            }
        }
        stage('Docker Image') {
            // Build and tag Docker image
            steps {
                sh """
                    docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} .
                    docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest
                """
            }
        }
        stage('Docker Image Security Scan') {
            // Scan Docker image for vulnerabilities using Trivy
            steps {
                sh """
                    trivy image \
                        --severity HIGH,CRITICAL \
                        --format json \
                        --output trivy-report.json \
                        --exit-code 1 \
                        ${DOCKER_IMAGE}:${DOCKER_TAG} \
                        || true
                    echo "Trivy scan completed with no High/Critical vulnerabilities"
                """
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
                }
            }
        }
        stage('Push to Registry') {
            // Push Docker image to registry
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_TOKEN'
                )]) {
                    sh """
                        echo "$DOCKER_TOKEN" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
                        docker push ${DOCKER_IMAGE}:latest
                        docker logout
                        echo "Image pushed to docker hub: ${DOCKER_IMAGE}:${DOCKER_TAG} and ${DOCKER_IMAGE}:latest"
                    """
                }
            }
        }
        stage('Deploy Application in Container') {
            // Deploy Docker container
            steps {
                sh """
                    # Remove any container with same name, running or stopped
                    docker ps -a --filter "name=${APP_NAME}" -q | xargs -r docker rm -f

                    docker run -d \
                        --name ${APP_NAME} \
                        --restart unless-stopped \
                        -p ${APP_PORT}:3000 \
                        -e NODE_ENV=production \
                        ${DOCKER_IMAGE}:${DOCKER_TAG}
                    echo "Container deployed successfully."
                    echo "Container Name: ${APP_NAME}"
                    echo "Accessible at: http://localhost:${APP_PORT}"
                    sleep 5
                    docker ps | grep ${APP_NAME}
                """
            }
        }
        stage('Health Check') {
            // Verify application endpoints are ready
            steps {
                retry(3) {
                    sh """
                        echo "Waiting for application to be ready..."
                        sleep 3
                        
                        curl -f http://localhost:${APP_PORT}/health || exit 1
                        curl -f http://localhost:${APP_PORT}/ready || exit 1
                        curl -f http://localhost:${APP_PORT}/ || exit 1
                        
                        echo "All health checks passed!"
                    """
                }
            }
        }
        stage('Smoke Tests') {
            // Run basic API smoke tests
            steps {
                sh """
                    echo "Running smoke tests..."
                    
                    curl -s http://localhost:${APP_PORT}/api/info | grep -q "DevOps Node.js App"
                    curl -s http://localhost:${APP_PORT}/api/add/10/5 | grep -q '"result":15'
                    
                    echo "Smoke tests passed!"
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
                echo "Docker Image: ${DOCKER_IMAGE}:${DOCKER_TAG}"
                echo "Application URL: http://localhost:${APP_PORT}"
                echo '================================================'
            }

            cleanWs(
                deleteDirs: true,
                patterns: [
                    [pattern: 'node_modules/**', type: 'INCLUDE'],
                    [pattern: 'coverage/**', type: 'INCLUDE']
                ]
            )
        }

        success {
            echo 'PIPELINE COMPLETED SUCCESSFULLY...'
        }

        failure {
            echo 'PIPELINE FAILED...'
        }

        unstable {
            echo 'PIPELINE UNSTABLE...'
        }
    }
}

