# PARA InfoSystem Documentation

Welcome to our Personal Information Management system implementing the PARA method!

## What is PARA?

PARA stands for **Projects**, **Areas**, **Resources**, and **Archives** - a method for organizing digital information created by Tiago Forte. Our system helps you organize your notes and tasks using this proven methodology.

## Quick Start

1. **Install dependencies**: `pip install -r requirements.txt`
2. **Run the server**: `python api/main.py`  
3. **Open your browser**: Go to `http://localhost:8000`
4. **Register/Login**: Create an account and start organizing!

## What's Inside

- **Backend**: FastAPI with SQLite database
- **Frontend**: Vanilla JavaScript (no frameworks needed!)
- **Authentication**: JWT tokens for security
- **Testing**: Comprehensive test suite with pytest

## Project Structure

```
PIM_project/
├── api/                    # Backend FastAPI application
│   ├── main.py            # Application entry point
│   ├── routes.py          # API endpoints
│   ├── services.py        # Business logic
│   ├── database.py        # Database management
│   ├── static/            # Frontend files
│   └── tests/             # Backend tests
├── docs/                  # Project documentation
│   ├── architecture/      # System design docs
│   ├── api/              # API documentation
│   └── testing/          # Test documentation
└── README.md             # This file
```

## Key Features

- ✅ **User Authentication**: Secure login/registration
- ✅ **PARA Organization**: Sort notes into Projects/Areas/Resources/Archives
- ✅ **Full-Text Search**: Find your content quickly
- ✅ **Markdown Support**: Rich text formatting
- ✅ **Responsive Design**: Works on desktop and mobile
- ✅ **RESTful API**: Clean API design

## Documentation

- [System Architecture](architecture/SYSTEM_ARCHITECTURE.md) - How everything fits together
- [Design Decisions](architecture/DESIGN_DECISIONS.md) - Why we built it this way
- [Database Schema](architecture/DATABASE_SCHEMA.md) - Data structure details  
- [API Reference](api/API_SPECIFICATION.md) - Endpoints and examples
- [Testing Strategy](testing/TEST_PLAN.md) - Our testing approach

## Team Notes

Started as a group project for CS coursework. We wanted to build something actually useful while learning web development. The PARA method seemed like a good real-world problem to solve.

Initially tried React but switched to vanilla JS to focus on the backend logic. Turns out it was a good decision - less complexity, better understanding of fundamentals.

Had some debates about database choice (MySQL vs SQLite) but went with SQLite for simplicity. Can always migrate later if needed.

## Development

**Running Tests:**
```bash
cd api
pytest                    # Backend tests
npm test                 # Frontend tests (if you have Node.js)
```

**Database:**
```bash
# Reset database (careful!)
rm api/pim.db
python api/main.py       # Will recreate on startup
```

## Deployment

Currently deployed on Render.com. See [deployment guide](deployment/DEPLOYMENT.md) for details.

## Future Ideas

- [ ] Mobile app with React Native
- [ ] Team collaboration features  
- [ ] File attachments
- [ ] Advanced search with filters
- [ ] Export to different formats
- [ ] Integration with note-taking apps

## License

MIT License - feel free to use this for your own projects!

---

*Built by CS students who got tired of messy note organization 📚*
