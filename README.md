# ITIL CMDB Dashboard

A comprehensive Configuration Management Database (CMDB) Dashboard built with Python (FastAPI) backend and React frontend, designed for ArcelorMittal's ITIL processes.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (Admin, Editor, Viewer)
- **Configuration Item Management**: Full CRUD operations for CIs with support for multiple types (Servers, Applications, Network Devices, Databases, etc.)
- **Data Import**: Import CIs from CSV files, SharePoint, and external APIs
- **Data Export**: Export CIs to CSV, Excel, and JSON formats
- **Dashboard Analytics**: Real-time statistics and visualizations of CI inventory
- **Relationship Tracking**: Manage dependencies and relationships between CIs
- **Dependency Graph**: Interactive visualization of CI relationships with auto-layout
- **ArcelorMittal Branding**: Corporate design with brand colors and professional UI

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **PostgreSQL**: Relational database (Primary Port 5433)
- **SQLAlchemy**: ORM for database operations
- **Alembic**: Database migrations
- **Pandas**: Data processing for imports/exports
- **JWT**: Authentication tokens

### Frontend
- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **React Router**: Navigation
- **React Query**: Data fetching and caching
- **Zustand**: State management
- **AG Grid**: Advanced data tables
- **Recharts**: Data visualization
- **Lucide React**: Icons

## Project Structure

```
CMDBBoard/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/          # API endpoints
│   │   ├── core/                # Config and auth
│   │   ├── db/                  # Database models
│   │   └── services/            # Business logic
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                 # API client
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── store/               # State management
│   │   └── index.css            # Global styles
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile.dev
└── docker-compose.yml
```

## Documentation
- [User Guide](docs/USER_GUIDE.md) - Detailed usage instructions.
- [Developer Guide](docs/DEVELOPER_GUIDE.md) - Architecture and contribution guide.

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (optional)

### Option 1: Docker (Recommended)

1. **Clone the repository**
```bash
git clone https://github.com/beckzman/CMDBBoard.git
cd CMDBBoard
```

2. **Create environment file**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

3. **Start all services**
```bash
docker-compose up -d
```
> This command automatically builds the backend, installs dependencies, and creates the database.

4. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Option 2: Manual Setup

#### Backend Setup

1. **Create virtual environment**
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```
> **Note**: Ensure the PostgreSQL database (default `cmdb_database`) exists before proceeding. You may need to create it using `createdb cmdb_database` or via a SQL tool.

4. **Run database migrations**
```bash
alembic upgrade head
```

5. **Start the server**
```bash
uvicorn app.main:app --reload
```

#### Frontend Setup

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Start development server**
```bash
npm run dev
```

## Default Credentials

1. **Seed the database** (Optional but recommended)
   Populate the database with test users and CIs:
   ```bash
   python backend/seed_data.py
   ```

2. **Log in**
   Use the seeded admin credentials:

   **Username**: `admin`
   **Password**: `adminpassword`

   ⚠️ **Change this password immediately in production!**

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## CSV Import Format

To import CIs via CSV, use the following format:

```csv
name,ci_type,status,description,department,location,environment,cost_center,os_db_system
Server-01,server,active,Production web server,IT Team,DC-01,production,CC-1001,Windows Server 2019
App-CRM,application,active,Customer relationship management,Sales,Cloud,production,CC-2001,Oracle 19c
```

**Required fields**: `name`, `ci_type`

**CI Types**: `server`, `application`, `network_device`, `database`, `workstation`, `storage`, `other`

**Statuses**: `active`, `inactive`, `retired`, `planned`, `maintenance`

## Development

### Running Tests

```bash
# Backend tests
cd backend
pytest tests/ -v --cov=app

# Frontend tests
cd frontend
npm run test
```

### Building for Production

```bash
# Backend
cd backend
docker build -t cmdb-backend .

# Frontend
cd frontend
npm run build
```

## ArcelorMittal Branding

The application uses ArcelorMittal's corporate colors:
- **Primary Orange**: #F47D30
- **Grey**: #555658
- **Typography**: Inter font family

## License

Internal use only - ArcelorMittal

## Support

For issues or questions, contact the IT Infrastructure team.
