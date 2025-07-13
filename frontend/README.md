# AnveXan React Frontend

A modern, responsive React frontend for the AnveXan ArXiv paper search application. This replaces the previous Streamlit interface with a more professional and feature-rich user experience.

## ✨ Features

- 🎨 **Modern UI**: Clean, gradient-based design with glassmorphism effects
- 📱 **Fully Responsive**: Works perfectly on desktop, tablet, and mobile devices
- 🔍 **Enhanced Search**: Real-time search with suggestions and history
- 📄 **Paper Management**: Expandable abstracts, direct PDF downloads, and ArXiv links
- ⚙️ **Download Settings**: Configurable download paths and preferences
- 🚀 **Performance**: Fast, optimized React components with smooth animations
- 🎯 **Accessibility**: WCAG compliant with proper focus management
- 📡 **API Integration**: Seamless communication with existing Flask backend

## 🏗️ Architecture

```
┌─────────────────┐    HTTP API    ┌─────────────────┐
│   React         │ ──────────────▶│   Flask Backend │
│   Frontend      │                │   (Port 5001)   │
│   (Port 3000)   │◀────────────── │                 │
└─────────────────┘                └─────────────────┘
```

The React frontend communicates with your existing Flask backend via REST API calls. No changes are needed to the backend code.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Your existing Flask backend running on port 5001

### Setup Instructions

1. **Run the setup script**:
   ```bash
   ./setup-react-frontend.sh
   ```

2. **Start the development server**:
   ```bash
   ./run-react-dev.sh
   ```

   Or manually:
   ```bash
   # Terminal 1 - Start Flask backend
   python arxiv_paper_getter.py

   # Terminal 2 - Start React frontend
   cd frontend
   npm start
   ```

3. **Open your browser** to `http://localhost:3000`

## 📁 Project Structure

```
frontend/
├── public/
│   └── index.html              # HTML template
├── src/
│   ├── components/
│   │   ├── Header.js           # Navigation header
│   │   ├── Header.css
│   │   ├── SearchBar.js        # Search input and functionality
│   │   ├── SearchBar.css
│   │   ├── PaperList.js        # Grid of paper results
│   │   ├── PaperList.css
│   │   ├── PaperCard.js        # Individual paper display
│   │   ├── PaperCard.css
│   │   ├── DownloadSettings.js # Download configuration panel
│   │   ├── DownloadSettings.css
│   │   ├── LoadingSpinner.js   # Search loading state
│   │   └── LoadingSpinner.css
│   ├── App.js                  # Main application component
│   ├── App.css                 # Main application styles
│   ├── index.js                # React entry point
│   ├── index.css               # Global styles
│   └── ...
├── package.json                # Dependencies and scripts
└── README.md                   # This file
```

## 🎨 Component Overview

### Header Component
- **Purpose**: Navigation and branding
- **Features**: Logo, GitHub link, ArXiv link
- **Responsive**: Collapsible on mobile

### SearchBar Component
- **Purpose**: Search input and submission
- **Features**: Real-time search, suggestions, clear functionality
- **API**: Calls `/search` endpoint on Flask backend

### PaperList Component
- **Purpose**: Display search results in a grid
- **Features**: Responsive grid layout, empty states
- **Performance**: Efficiently renders large result sets

### PaperCard Component
- **Purpose**: Individual paper display and actions
- **Features**: Expandable abstracts, download functionality, external links
- **API**: Calls `/download` endpoint for PDF downloads

### DownloadSettings Component
- **Purpose**: Configuration panel for download preferences
- **Features**: Custom download paths, settings persistence
- **UX**: Slide-out panel with overlay

### LoadingSpinner Component
- **Purpose**: Indicate search progress
- **Features**: Animated spinner with contextual messaging
- **Design**: Consistent with overall app aesthetic

## 🔧 Configuration

### Proxy Configuration
The React app is configured to proxy API requests to your Flask backend:

```json
{
  "proxy": "http://localhost:5001"
}
```

This allows the frontend to make requests to `/search` and `/download` without CORS issues.

### Environment Variables (Optional)
Create a `.env` file in the frontend directory for custom configuration:

```env
REACT_APP_API_BASE_URL=http://localhost:5001
REACT_APP_VERSION=1.0.0
```

## 🎨 Styling & Design

### Design System
- **Colors**: Gradient-based palette with primary blues and purples
- **Typography**: System fonts with proper hierarchy
- **Spacing**: Consistent 8px grid system
- **Shadows**: Layered shadows for depth
- **Animations**: Smooth transitions and micro-interactions

### Responsive Breakpoints
- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: 480px - 767px
- **Small Mobile**: < 480px

## 🔌 API Integration

### Search Endpoint
```javascript
GET /search?query=machine+learning

Response: Array of paper objects
```

### Download Endpoint
```javascript
GET /download?pdf_link=...&title=...

Response: PDF file stream
```

## 🚀 Build & Deploy

### Development Build
```bash
npm start
```
Runs the app in development mode with hot reloading.

### Production Build
```bash
npm run build
```
Creates an optimized production build in the `build/` directory.

### Docker Deployment
```bash
docker-compose -f docker-compose-react.yml up --build
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### End-to-End Tests
```bash
npm run test:e2e
```

## 🔮 Future Enhancements

1. **Advanced Search Filters**
   - Date range filtering
   - Author filtering
   - Category filtering
   - Citation count sorting

2. **User Management**
   - User accounts and profiles
   - Saved searches and favorites
   - Reading lists and collections

3. **Enhanced Paper Management**
   - Local paper library
   - Note-taking and annotations
   - Citation management

4. **PWA Features**
   - Service worker for offline functionality
   - Install prompts
   - Push notifications

## 🐛 Troubleshooting

### Common Issues

**CORS Errors**
- Ensure the proxy is configured correctly in package.json
- Make sure Flask backend is running on port 5001

**Build Failures**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 16+)

**API Connection Issues**
- Verify Flask backend is running: `curl http://localhost:5001/search?query=test`
- Check network panel in browser dev tools

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](../LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

---

**Happy coding! 🚀** The new React frontend provides a much more professional and user-friendly experience for searching and downloading ArXiv papers.