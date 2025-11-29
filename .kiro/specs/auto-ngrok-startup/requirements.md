# Requirements Document

## Introduction

This feature ensures that the Blog Writing Assistant server always uses ngrok for external access. When PUBLIC_URL is not set, the system automatically starts ngrok and configures the server to use the ngrok tunnel URL. This eliminates manual setup steps and ensures consistent behavior across different development environments.

## Glossary

- **Server**: The Blog Writing Assistant Express server that handles image uploads and markdown editing
- **ngrok**: A tunneling service that exposes local servers to the internet via HTTPS
- **PUBLIC_URL**: An environment variable containing the public-facing URL for the server
- **Tunnel**: An ngrok connection that forwards external requests to the local server
- **Auto-startup Module**: The component responsible for detecting missing PUBLIC_URL and launching ngrok

## Requirements

### Requirement 1

**User Story:** As a developer, I want the server to automatically start ngrok when PUBLIC_URL is not set, so that I don't have to manually configure tunneling on each new machine.

#### Acceptance Criteria

1. WHEN the Server starts AND PUBLIC_URL is not set, THE Auto-startup Module SHALL detect the missing configuration
2. WHEN PUBLIC_URL is not set, THE Auto-startup Module SHALL launch ngrok with port 3001
3. WHEN ngrok launches successfully, THE Auto-startup Module SHALL retrieve the tunnel URL from ngrok's API
4. WHEN the tunnel URL is retrieved, THE Auto-startup Module SHALL set PUBLIC_URL environment variable to the ngrok URL
5. WHEN ngrok fails to start, THE Auto-startup Module SHALL log an error message and exit with status code 1

### Requirement 2

**User Story:** As a developer, I want to see clear status messages during ngrok startup, so that I can understand what the system is doing.

#### Acceptance Criteria

1. WHEN the Auto-startup Module detects missing PUBLIC_URL, THE Server SHALL log "PUBLIC_URL not set, starting ngrok automatically..."
2. WHEN ngrok is launching, THE Server SHALL log "Starting ngrok tunnel on port 3001..."
3. WHEN the tunnel is established, THE Server SHALL log "ngrok tunnel established: [URL]"
4. WHEN ngrok startup completes, THE Server SHALL log "Server will use ngrok URL for QR codes and external access"
5. IF ngrok fails to start, THEN THE Server SHALL log "Failed to start ngrok: [error message]"

### Requirement 3

**User Story:** As a developer, I want ngrok to shut down cleanly when the server stops, so that tunnel resources are properly released.

#### Acceptance Criteria

1. WHEN the Server receives SIGTERM signal, THE Auto-startup Module SHALL terminate the ngrok process
2. WHEN the Server receives SIGINT signal, THE Auto-startup Module SHALL terminate the ngrok process
3. WHEN ngrok process terminates, THE Auto-startup Module SHALL log "ngrok tunnel closed"
4. WHEN the Server shuts down, THE Auto-startup Module SHALL ensure ngrok process is killed before exit
5. IF ngrok process fails to terminate within 5 seconds, THEN THE Auto-startup Module SHALL force kill the process

### Requirement 4

**User Story:** As a developer, I want the system to verify ngrok is installed before attempting to use it, so that I receive clear error messages if it's missing.

#### Acceptance Criteria

1. WHEN the Auto-startup Module attempts to start ngrok, THE Auto-startup Module SHALL check if ngrok command exists
2. IF ngrok is not installed, THEN THE Auto-startup Module SHALL log "ngrok is not installed. Please install it: brew install ngrok"
3. IF ngrok is not installed, THEN THE Server SHALL exit with status code 1
4. WHEN ngrok is installed, THE Auto-startup Module SHALL proceed with tunnel creation
5. WHEN checking for ngrok, THE Auto-startup Module SHALL complete the check within 2 seconds

### Requirement 5

**User Story:** As a developer, I want to optionally provide my own PUBLIC_URL, so that I can use a custom ngrok configuration or alternative tunneling service.

#### Acceptance Criteria

1. WHEN PUBLIC_URL environment variable is set, THE Auto-startup Module SHALL skip ngrok auto-startup
2. WHEN PUBLIC_URL is provided, THE Server SHALL log "Using provided PUBLIC_URL: [URL]"
3. WHEN PUBLIC_URL is provided, THE Server SHALL use the provided URL for QR code generation
4. WHEN PUBLIC_URL is provided, THE Auto-startup Module SHALL not launch any ngrok process
5. WHEN PUBLIC_URL is provided, THE Server SHALL start normally without additional tunnel setup
