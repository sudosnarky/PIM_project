# PARA InfoSystem Documentation
NOTE: ALL FILES HERE ARE FLESHED OUT FILES FROM BRAIN DUMPS OR DISCUSSIONS USING AI.
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
- [Testing Strategy](testing/TEST_PLAN.md) - Our testing approach
- [UI Design](architecture/UI_DESIGN.md) - User Interface Details

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


## License

MIT License - feel free to use this for your own projects!
