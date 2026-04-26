# VDigitalize CLI

[![npm version](https://badge.fury.io/js/@vdigitalize-cli/vdigitalize.svg)](https://www.npmjs.com/package/@vdigitalize-cli/vdigitalize)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A professional CLI tool for scaffolding full-stack projects with **Laravel + React**, **WordPress**, **PrestaShop**, **Drupal**, and **custom PHP** projects — with **GitHub Copilot integration**.

```
  ╦  ╦╔╦╗╦╔═╗╦╔╦╗╔═╗╦  ╦╔═╗╔═╗
  ╚╗╔╝ ║║║║ ╦║ ║ ╠═╣║  ║╔═╝║╣ 
   ╚╝ ═╩╝╩╚═╝╩ ╩ ╩ ╩╩═╝╩╚═╝╚═╝
  Full-Stack & CMS Project Scaffolding Tool
```

## Features

- 🚀 **Interactive Setup Wizard** - Guided project creation with smart prompts
- 🎨 **React + Vite Frontend** - Modern, fast frontend scaffolding
- 🔧 **Laravel Backend** - Production-ready PHP backend via Composer
- 🌐 **WordPress Support** - Full site, theme-only, or plugin-only scaffolding
- 🛒 **PrestaShop Support** - Store, theme, or module scaffolding
- 💧 **Drupal Support** - Site, theme, or module scaffolding
- 🐘 **Custom PHP Projects** - Plain PHP, Slim, Symfony, CodeIgniter, CakePHP
- 📦 **Multi-Repo Git Management** - Separate repos for frontend, backend, and dist
- 🔄 **Automated Push Scripts** - One command to push all repositories
- ✅ **System Health Check** - Verify all dependencies are installed
- 🎯 **Cross-Platform** - Works on macOS, Linux, and Windows
- 🤖 **GitHub Copilot Integration** - Auto-generated instructions and dynamic prompt generation
- 🔗 **Custom SSH Support** - Works with any Git SSH configuration
- 📝 **Copilot CLI Integration** - Generate comprehensive project prompts using GitHub Copilot CLI

## Installation

```bash
npm install -g @vdigitalize-cli/vdigitalize
```

## Requirements

### Required
- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Git**

### Optional (for specific project types)
- **PHP** >= 8.1 (for Laravel, WordPress, PrestaShop, Drupal)
- **Composer** (for Laravel and CMS installations)
- **WP-CLI** (for WordPress projects)
- **Drush** (for Drupal projects)
- **MySQL** (for database setup)
- **GitHub CLI** (for enhanced features)
- **Copilot CLI** (`gh extension install github/gh-copilot`) - for dynamic prompt generation

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

1. **Project Type Selection**
   - Full-Stack (Laravel + React)
   - WordPress (full site, theme, or plugin)
   - PrestaShop (full site, theme, or module)
   - Drupal (full site, theme, or module)
   - Custom PHP (Plain, Slim, Symfony, CodeIgniter, CakePHP)

2. **Project Configuration**
   - Project name and description
   - Type-specific options (theme name, plugins, modules, etc.)

3. **Git Repositories** (for full-stack)
   - Frontend Git repo URL (supports custom SSH configs)
   - Backend Git repo URL
   - Frontend/dist Git repo URL

4. **Additional Options**
   - Push script generation (full-stack)
   - GitHub Copilot setup

### Check System Dependencies

```bash
vdigitalize doctor
```

Verifies that all required and optional tools are installed:

**Required:** Node.js, npm, Git, Composer, PHP

**Optional:** GitHub CLI, Copilot CLI

**CMS Development Tools:** WP-CLI, Drush, MySQL

## Project Types

### Full-Stack (Laravel + React)

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
│   ├── copilot-instructions.md
│   └── prompts/
├── README.md
├── .gitignore
└── push.sh
```

### WordPress

**Full Site:**
```
my-wordpress/
├── wp-content/
│   ├── themes/
│   │   └── my-theme/      # Custom theme
│   └── plugins/
├── .github/
│   ├── copilot-instructions.md
│   └── prompts/
└── README.md
```

**Theme Only:**
```
my-theme/
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
├── template-parts/
├── inc/
├── style.css
├── functions.php
├── index.php
├── header.php
├── footer.php
└── sidebar.php
```

**Plugin Only:**
```
my-plugin/
├── includes/
├── admin/
├── public/
├── assets/
└── my-plugin.php
```

### PrestaShop

**Theme:**
```
my-theme/
├── assets/
│   ├── css/
│   ├── js/
│   └── img/
├── config/
│   └── theme.yml
├── templates/
│   └── _partials/
└── modules/
```

**Module:**
```
my-module/
├── views/
│   ├── templates/
│   ├── css/
│   └── js/
├── controllers/
│   ├── admin/
│   └── front/
└── my-module.php
```

### Drupal

**Theme:**
```
my_theme/
├── css/
├── js/
├── images/
├── templates/
├── my_theme.info.yml
└── my_theme.libraries.yml
```

**Module:**
```
my_module/
├── src/
│   ├── Controller/
│   └── Form/
├── templates/
├── my_module.info.yml
├── my_module.module
└── my_module.routing.yml
```

### Custom PHP

```
my-php-project/
├── public/
│   └── index.php
├── src/
├── config/
├── views/
├── assets/
│   ├── css/
│   └── js/
├── composer.json
└── README.md
```

## WordPress Features

- **Installation Methods:**
  - WP-CLI (`wp core download`)
  - Composer (`johnpbloch/wordpress`)
  - Manual setup with folder structure

- **Theme Scaffolding:**
  - Complete theme structure (header, footer, sidebar, template-parts)
  - WordPress hooks and functions
  - Asset enqueuing
  - Widget areas and navigation menus

- **Plugin Scaffolding:**
  - OOP structure with main class
  - Activation/deactivation hooks
  - Admin and public views

- **Popular Plugins Installation:**
  - ACF (Advanced Custom Fields)
  - Yoast SEO
  - WooCommerce
  - Contact Form 7
  - Wordfence
  - WP Super Cache
  - Query Monitor

## PrestaShop Features

- **Versions:** 8.1, 8.0, 1.7
- **Theme Configuration:** Complete `theme.yml` setup
- **Module Scaffolding:** Hook registration, configuration pages

## Drupal Features

- **Installation:** Via Composer (`drupal/recommended-project`)
- **Profiles:** Standard, Minimal, Demo
- **Theme Scaffolding:** Libraries, regions configuration
- **Module Scaffolding:** Routing, controllers, services
- **Popular Modules:** admin_toolbar, pathauto, token, webform, metatag

## GitHub Copilot Integration

VDigitalize automatically sets up GitHub Copilot configuration:

### `.github/copilot-instructions.md`

Contains project-specific instructions for GitHub Copilot:
- Project overview and description
- Tech stack details
- Code style guidelines
- Repository structure
- Prompt logging requirements

### `.github/prompts/`

A dedicated folder for saving development prompts:
- **prompt_001.md** - Initial comprehensive project prompt
- Additional prompts saved during development
- Used for tracking, learning, and documentation

### Dynamic Prompt Generation

If GitHub Copilot CLI is installed (`gh copilot`), VDigitalize generates a comprehensive, dynamic project prompt based on your configuration.

**To install Copilot CLI:**
```bash
gh extension install github/gh-copilot
```

## Push Script Usage (Full-Stack)

If you opted to create `push.sh`, push all repositories with one command:

```bash
./push.sh "Your commit message"
```

This will:
1. Build the frontend
2. Commit and push the backend
3. Commit and push the frontend
4. Commit and push the dist folder

## Examples

### Full-Stack Setup

```bash
$ vdigitalize setup

? Select project type: Full-Stack (Laravel + React)
? What is your project name? my-awesome-app
? Frontend folder name: frontend
? Backend folder name: backend
...
✔ Laravel project created successfully
✔ Vite React project created
✔ GitHub Copilot integration configured
```

### WordPress Theme

```bash
$ vdigitalize setup

? Select project type: WordPress
? What is your project name? my-theme
? What do you want to create? Theme only
? Theme name: My Custom Theme
? Use a starter theme? Starter Theme (theme scaffolding with config)
...
✔ WordPress theme "My Custom Theme" created
```

### PrestaShop Module

```bash
$ vdigitalize setup

? Select project type: PrestaShop
? What is your project name? my-module
? What do you want to create? Module only
? Module name: My Custom Module
...
✔ PrestaShop module "My Custom Module" created
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
