# VDigitalize CLI

[![npm version](https://badge.fury.io/js/vdigitalize.svg)](https://www.npmjs.com/package/vdigitalize)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A professional CLI tool for scaffolding full-stack projects with **Laravel backend** and **React frontend** (Vite).

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

## Installation

```bash
npm install -g vdigitalize
```

## Requirements

Before using VDigitalize, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Git**
- **PHP** >= 8.1
- **Composer**

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
   - Project name
   - Frontend folder name (default: `frontend`)
   - Backend folder name (default: `backend`)

2. **Git Repositories**
   - Frontend GitHub repo URL
   - Backend GitHub repo URL
   - Frontend/dist GitHub repo URL

3. **Environment URLs** (optional)
   - Staging URLs for frontend and backend
   - Production URLs for frontend and backend

4. **Push Script**
   - Option to generate `push.sh` for automated deployments

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
├── README.md
├── .gitignore
└── push.sh            # Automated push script (optional)
```

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
