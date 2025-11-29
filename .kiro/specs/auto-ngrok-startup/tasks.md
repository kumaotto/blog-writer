# Implementation Plan

- [x] 1. Create NgrokManager module with core functionality
  - [x] 1.1 Create NgrokManager class with static methods and properties
    - Implement class structure with private static properties for ngrokProcess and ngrokUrl
    - Define public static methods: ensureNgrokRunning(), stop(), isNgrokInstalled()
    - _Requirements: 1.1, 4.1, 4.4_

  - [x] 1.2 Implement ngrok installation check
    - Write isNgrokInstalled() method using child_process.exec to check 'ngrok version'
    - Return true if command succeeds, false otherwise
    - _Requirements: 4.1, 4.5_

  - [x] 1.3 Implement ngrok process spawning
    - Write startNgrokProcess() method using child_process.spawn
    - Spawn 'ngrok http 3001 --log=stdout' command
    - Store process reference in ngrokProcess property
    - _Requirements: 1.2, 1.3_

  - [x] 1.4 Implement ngrok API polling and URL retrieval
    - Write waitForNgrokApi() method with retry logic (max 10 retries, exponential backoff)
    - Write getNgrokUrl() method to fetch from http://localhost:4040/api/tunnels
    - Parse JSON response and extract public_url from tunnels array
    - _Requirements: 1.3, 1.4_

  - [x] 1.5 Implement ensureNgrokRunning() orchestration method
    - Check if PUBLIC_URL is already set, if so return early
    - Check if ngrok is installed, throw error if not
    - Start ngrok process
    - Wait for API and retrieve URL
    - Set process.env.PUBLIC_URL to retrieved URL
    - Log status messages at each step
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 5.1, 5.4_

  - [x] 1.6 Implement stop() method for graceful shutdown
    - Check if ngrokProcess exists
    - Send SIGTERM to process
    - Set timeout for force kill after 5 seconds
    - Clear timeout on successful exit
    - Log shutdown status
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. Integrate NgrokManager into server startup flow
  - [x] 2.1 Modify server/index.ts to call NgrokManager before server creation
    - Import NgrokManager at top of file
    - Add await NgrokManager.ensureNgrokRunning(3001) before createServer()
    - Wrap in try-catch to handle errors
    - Update PUBLIC_URL logging to show final value after ngrok setup
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 5.2, 5.3_

  - [x] 2.2 Update shutdown handler to stop ngrok
    - Add await NgrokManager.stop() at beginning of shutdown function
    - Ensure ngrok stops before server shutdown
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Add error handling and logging
  - [x] 3.1 Add error handling for ngrok not installed
    - Catch error from isNgrokInstalled() check
    - Log installation instructions with brew command
    - Exit with status code 1
    - _Requirements: 4.2, 4.3_

  - [x] 3.2 Add error handling for ngrok startup failures
    - Catch errors from startNgrokProcess()
    - Log error message with troubleshooting hints
    - Exit with status code 1
    - _Requirements: 1.5, 2.5_

  - [x] 3.3 Add comprehensive logging throughout NgrokManager
    - Log when PUBLIC_URL is already set and skipping ngrok
    - Log when starting ngrok tunnel
    - Log when tunnel is established with URL
    - Log when ngrok is shutting down
    - Log when ngrok fails to start
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.3, 5.2_

- [x] 4. Write unit tests for NgrokManager
  - Create tests/NgrokManager.test.ts
  - Mock child_process and http modules
  - Test isNgrokInstalled() for both installed and not installed cases
  - Test ensureNgrokRunning() skips when PUBLIC_URL is set
  - Test ensureNgrokRunning() starts ngrok when PUBLIC_URL not set
  - Test ensureNgrokRunning() throws when ngrok not installed
  - Test getNgrokUrl() retrieves URL from API
  - Test getNgrokUrl() retries on failure
  - Test stop() kills process
  - Test stop() handles no process running
  - Test force kill timeout
  - _Requirements: All requirements_

- [x] 5. Update documentation
  - [x] 5.1 Update README.md with ngrok auto-start information
    - Add section explaining automatic ngrok startup
    - Document that ngrok must be installed manually
    - Add installation command for macOS
    - Explain how to override with custom PUBLIC_URL
    - _Requirements: 4.2, 5.1, 5.2_

  - [x] 5.2 Create or update NGROK_SETUP.md
    - Document ngrok installation steps
    - Explain automatic vs manual ngrok usage
    - Add troubleshooting section
    - _Requirements: 4.2_
