// Mindloom CI/CD — Jenkins runs ON the same VPS that hosts the app.
// Build the client + server images locally, then roll the stack with
// `docker compose up -d`. No registry, no SSH.
//
// ── Required Jenkins credentials (Manage Jenkins → Credentials) ──────────────
//   github-credentials   Username/Password (PAT) → clone + commit status
//   mindloom-server-env  Secret file             → the production server/.env
//
// The host nginx (mindloom.debashis.tech) terminates TLS and proxies:
//   /      → client container  (127.0.0.1:${CLIENT_PORT})
//   /api/  → server container  (127.0.0.1:${SERVER_PORT})

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  parameters {
    string(name: 'VITE_API_URL', defaultValue: 'https://mindloom.debashis.tech', description: 'Public API base URL baked into the client build')
    string(name: 'SERVER_PORT',  defaultValue: '3100', description: 'Host port to publish the API on (3000/3001 are in use)')
    string(name: 'CLIENT_PORT',  defaultValue: '8080', description: 'Host port to publish the client on')
    booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Deploy after a successful build')
  }

  environment {
    // Immutable, traceable image tag from the commit being built.
    IMAGE_TAG            = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(12) : env.BUILD_NUMBER}"
    // Stable project name so containers/volumes persist across builds
    // regardless of the Jenkins workspace path.
    COMPOSE_PROJECT_NAME = 'mindloom'
    DOCKER_BUILDKIT      = '1'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script { echo "Building Mindloom @ ${env.IMAGE_TAG}" }
      }
    }

    // Fast feedback before building images. Uses the Bun toolchain in a
    // throwaway container, reusing this workspace.
    stage('Lint & Typecheck') {
      agent {
        docker { image 'oven/bun:1'; reuseNode true }
      }
      steps {
        sh 'bun install --frozen-lockfile'
        sh 'bun run lint'
        sh 'bun run typecheck'
      }
    }

    stage('Build images') {
      steps {
        sh """
          docker build \
            -f server/Dockerfile \
            -t mindloom-server:${IMAGE_TAG} \
            -t mindloom-server:latest \
            .
        """
        sh """
          docker build \
            -f client/Dockerfile \
            --build-arg VITE_API_URL=${params.VITE_API_URL} \
            -t mindloom-client:${IMAGE_TAG} \
            -t mindloom-client:latest \
            .
        """
      }
    }

    stage('Deploy') {
      when { expression { return params.DEPLOY } }
      steps {
        withCredentials([file(credentialsId: 'mindloom-server-env', variable: 'SERVER_ENV_FILE')]) {
          sh '''
            set -eu
            # Provide the production env the compose file reads (kept out of git).
            install -m 600 "$SERVER_ENV_FILE" server/.env

            export IMAGE_TAG SERVER_PORT CLIENT_PORT
            # `up -d` runs the one-shot `migrate` service to completion first
            # (server/worker depend on service_completed_successfully), then
            # starts everything else and recreates only what changed.
            docker compose -f compose.prod.yaml up -d --remove-orphans
            docker image prune -f
          '''
        }
      }
    }

    stage('Smoke test') {
      when { expression { return params.DEPLOY } }
      steps {
        sh '''
          set -eu
          for i in $(seq 1 15); do
            if curl -fsS "http://localhost:${SERVER_PORT}/health" >/dev/null; then
              echo "health OK"; exit 0
            fi
            echo "waiting for API... ($i)"; sleep 4
          done
          echo "API did not become healthy — recent server logs:"
          docker compose -f compose.prod.yaml logs --tail=80 server || true
          exit 1
        '''
      }
    }
  }

  post {
    success { echo "Deployed Mindloom ${IMAGE_TAG} on ports ${params.SERVER_PORT}/${params.CLIENT_PORT}" }
    failure { echo "Build ${env.BUILD_NUMBER} failed — see stage log above." }
    cleanup { sh 'rm -f server/.env || true' }
  }
}
