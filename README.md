# Resume Intelligence - Privacy-First AI Resume Optimizer

A client-side resume optimization tool that runs entirely in your browser. No server required, your data never leaves your device.

**Updated**: Now using OpenAI's o3 model for enhanced performance and accuracy!

## ✨ Features

- **Privacy-First**: Bring your own OpenAI API key, all processing happens client-side
- **No Server Required**: Static site that can be hosted anywhere
- **Smart Analysis**: AI-powered job description analysis and resume scoring
- **Multiple Formats**: Export optimized resumes as DOCX, TXT, or HTML
- **Real-time Processing**: Instant feedback and optimization recommendations
- **Secure**: API keys stored in sessionStorage only, cleared when browser closes

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Development

```bash
# Clone the repository
git clone https://github.com/cklose2000/Resume_Intelligence.git
cd Resume_Intelligence

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
# Build the static site
npm run build

# Preview the built site
npm run preview
```

The built files will be in the `dist/` directory and can be deployed to any static hosting service.

## 📁 Project Structure

```
Resume_Intelligence/
├── client/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── lib/           # Core libraries
│   │   │   ├── openaiClient.ts    # Client-side OpenAI integration
│   │   │   ├── fileProcessor.ts   # Browser file processing
│   │   │   ├── documentGenerator.ts # Document generation
│   │   │   └── sessionState.ts    # In-memory state management
│   │   └── pages/         # Application pages
│   └── index.html
├── dist/                  # Built static files (after npm run build)
└── package.json
```

## 🔧 How It Works

1. **API Key Setup**: Users securely input their OpenAI API key (stored in sessionStorage only)
2. **Job Analysis**: Paste a job description to extract requirements and keywords
3. **Resume Upload**: Upload your resume (.txt, .pdf, or .docx) for client-side processing
4. **AI Analysis**: Compare resume against job requirements using OpenAI API
5. **Optimization**: Apply AI recommendations to improve ATS compatibility
6. **Export**: Download optimized resume in multiple professional formats

## 🛡️ Privacy & Security

- **No Server Storage**: All data processing happens in your browser
- **API Key Security**: Keys stored in sessionStorage, never sent to our servers
- **Zero Data Collection**: We don't collect, store, or transmit your personal data
- **Open Source**: Full transparency - audit the code yourself

## 🚀 Deployment

Deploy to any static hosting service:

### Vercel
```bash
npm run build
npx vercel --prod
```

### Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### GitHub Pages
```bash
npm run build
# Push dist/ contents to gh-pages branch
```

## 🔧 Configuration

- **Model**: The app uses OpenAI's o3 model
- **API Key**: Required - get one from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Environment Variables**: None needed! The app runs entirely client-side

## 📝 Usage Tips

1. **File Formats**: For best results, use .docx or .txt files. PDF extraction is basic.
2. **API Key**: Your OpenAI API key is only stored temporarily in your browser session
3. **Job Descriptions**: Copy the full job posting for more accurate analysis
4. **Recommendations**: Apply high-impact recommendations first for best results

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Check the browser console for error messages
- Ensure your OpenAI API key has sufficient credits
- Supported browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

**Built with privacy in mind** 🔒 | **No server required** ⚡ | **Your data stays local** 🏠