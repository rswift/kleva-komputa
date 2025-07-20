# Required Tools and Utilities

> **Document Information**  
> Created by: Claude 3 Opus (Anthropic)  
> Date: 19/07/2025  
> Version: 1.0  
> AI/LLM Details: This document was created using Claude 3 Opus by Anthropic (version 2023-08-22)

This document outlines the tools and utilities required to run the NestJS OpenTelemetry POC project on macOS.

## Core Requirements

1. **Node.js** (v16 or later)
   - Required to run the NestJS application
   - Installation: `brew install node` or download from [nodejs.org](https://nodejs.org/)

2. **npm** (comes with Node.js)
   - Required to manage dependencies
   - Automatically installed with Node.js

3. **Git**
   - Required for version control
   - Installation: `brew install git` or download from [git-scm.com](https://git-scm.com/)

## Optional Tools for Development

1. **Visual Studio Code**
   - Recommended IDE for development
   - Installation: Download from [code.visualstudio.com](https://code.visualstudio.com/)

2. **curl**
   - Used in example scripts to make HTTP requests
   - Pre-installed on macOS

3. **jq**
   - Used in example scripts to parse JSON responses
   - Installation: `brew install jq`

4. **Prometheus**
   - Optional for metrics collection and storage
   - Installation: `brew install prometheus`

5. **Grafana**
   - Optional for metrics visualisation
   - Installation: `brew install grafana`

## Installation Instructions

### Using Homebrew

If you have [Homebrew](https://brew.sh/) installed (recommended), you can install all required tools with:

```bash
# Install Node.js and Git
brew install node git

# Install optional tools
brew install jq prometheus grafana
```

### Manual Installation

1. **Node.js and npm**:
   - Download from [nodejs.org](https://nodejs.org/)
   - Follow the installation instructions

2. **Git**:
   - Download from [git-scm.com](https://git-scm.com/)
   - Follow the installation instructions

## Verification

To verify that the required tools are installed correctly, run:

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Git version
git --version
```

All commands should return version numbers without errors.

## Project Setup

After installing the required tools, set up the project with:

```bash
# Clone the repository
git clone [repository-url]

# Navigate to the project directory
cd nestjs-opentelemetry-poc

# Install dependencies
npm install

# Start the application
npm run start:dev
```

The application should now be running and accessible at http://localhost:3000.