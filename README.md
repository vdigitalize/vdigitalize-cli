# VDigitalize CLI

[![npm version](https://badge.fury.io/js/@vdigitalize-cli/vdigitalize.svg)](https://www.npmjs.com/package/@vdigitalize-cli/vdigitalize)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A professional CLI tool for scaffolding full-stack projects with **Laravel backend**, **React frontend** (Vite), and **GitHub Copilot integration**.

```
  ╦  ╦╔╦╗╦╔═╗╦╔╦╗╔═╗╦  ╦╔═╗╔═╗
  ╚╗╔╝ ║║║║ ╦║ ║ ╠═╣║  ║╔═╝║╣ 
   ╚╝ ═╩╝╩╚═╝╩ ╩ ╩ ╩╩═╝╩╚═╝╚═╝
  Full-Stack Project Scaffolding Tool
```

## Features

- 🚀 **Interactive Setup Wizard** - Guided project creation with smart prompts
- 🎨 **React + Vite Frontend** - Modern, fast frontend scaffolding
- 🔧 **Laravel Backend** - Production-ready PHP backend via Composer
- 📦 **Multi-Repo Git Management** - Separate repos for frontend, backend, and dist
- 🔄 **Automated Push Scripts** - One command to push all repositories
- ✅ **System Health Check** - Verify all dependencies are installed
- 🎯 **Cross-Platform** - Works on macOS, Linux, and Windows
- 🤖 **GitHub Copilot Integration** - Auto-generated instructions and prompt logging
- 🔗 **Custom SSH Support** - Works with any Git SSH configuration (e.g., `git@github-custom:user/repo.git`)

## Installation

```bash
npm install -g @vdigitalize-cli/vdigitalize
```

## Requirements

Before using VDigitalize, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Git**
- **PHP** >= 8.1 (optional - can skip Laravel setup)
- **Composer** (optional - can skip Laravel setup)

Run the doctor command to verify your setup:

```bash
vdigitalize doctor
```

## Usage

### Create a New Project

```bash
vdigitalize setup
```

This interactive command will guide you through:

1. **Project Configuration**
   - Project name and description
   - Frontend folder name (default: `frontend`)
   - Backend folder name (default: `backend`)

2. **Git Repositories**
   - Frontend Git repo URL (supports custom SSH configs)
   - Backend Git repo URL
   - Frontend/dist Git repo URL

3. **Project Features**
   - App type selection (e-commerce, SaaS, CMS, etc.)
   - Feature selection (auth, REST API, database, etc.)
   - UI framework preference
   - State management choice

4. **Environment URLs** (optional)
   - Staging URLs for frontend and backend
   - Production URLs for frontend and backend

5. **Additional Options**
   - Push script generation
   - GitHub Copilot setup

### Check System Dependencies

```bash
vdigitalize doctor
```

Verifies that all required tools are installed:
- Node.js
- npm
- Git
- Composer
- PHP

### Other Commands

```bash
vdigitalize --version    # Show CLI version
vdigitalize --help       # Show help information
```

## Project Structure

After running `vdigitalize setup`, your project will look like:

```
my-project/
├── backend/           # Laravel API (separate git repo)
│   ├── app/
│   ├── routes/
│   └── ...
├── frontend/          # React + Vite (separate git repo)
│   ├── src/
│   ├── dist/          # Production build (separate git repo)
│   └── ...
├── .github/
│   ├── copilot-instructions.md   # GitHub Copilot configuration
│   └── prompts/                  # Saved development prompts
├── README.md
├── .gitignore
└── push.sh            # Automated push script (optional)
```

## GitHub Copilot Integration

VDigitalize automatically sets up GitHub Copilot configuration for your project:

### `.github/copilot-instructions.md`

Contains project-specific instructions for GitHub Copilot:
- Project overview and description
- Tech stack details
- Code style guidelines
- Repository structure
- Feature list

### `.github/prompts/`

A dedicated folder for saving development prompts:
- Each prompt is saved as `prompt_001.md`, `prompt_002.md`, etc.
- Initial prompts are auto-generated based on your selected features
- Add new prompts as you develop to maintain project context

### Auto-Generated Prompts

Based on your selections, VDigitalize generates starter prompts for:
- Project initialization
- Authentication setup (if selected)
- REST API structure (if selected)
- Database schema design (if selected)
- App-type specific features (e-commerce, SaaS, CMS, etc.)

## Push Script Usage

If you opted to create `push.sh`, you can push all repositories with a single command:

```bash
./push.sh "Your commit message"
```

This will:
1. Build the frontend
2. Commit and push the backend
3. Commit and push the frontend
4. Commit and push the dist folder

## Examples

### Basic Setup

```bash
$ vdigitalize setup

? What is your project name? my-awesome-app
? Frontend folder name: frontend
? Backend folder name: backend
? Frontend GitHub repository URL: https://github.com/user/frontend.git
? Backend GitHub repository URL: https://github.com/user/backend.git
? Frontend/dist GitHub repository URL: https://github.com/user/dist.git
? Do you have staging and production environments? No
? Do you want to create push.sh file? Yes

✔ Created project directory: my-awesome-app
✔ Laravel project created successfully
✔ Vite React project created
✔ Frontend dependencies installed
✔ Git initialized in project root
✔ push.sh created and made executable

Your project has been created successfully!
```

## Tech Stack

This CLI is built with:

- [Commander.js](https://github.com/tj/commander.js/) - CLI framework
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js/) - Interactive prompts
- [Chalk](https://github.com/chalk/chalk) - Terminal styling
- [Ora](https://github.com/sindresorhus/ora) - Elegant spinners
- [fs-extra](https://github.com/jprichardson/node-fs-extra) - Enhanced file system

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**VDigitalize**

- Website: [vdigitalize.com](https://vdigitalize.com)
- GitHub: [@vdigitalize](https://github.com/vdigitalize)

---

Made with ❤️ by VDigitalize
