# HR Process Automation System

A complete automated HR process system with separated frontend and backend architecture.

## Project Structure

```
HR Process/
├── backend/          # Node.js/Express API server
├── frontend/         # React/TypeScript frontend application
├── package.json      # Root package.json for managing both projects
└── README.md         # This file
```

## Quick Start

### Option 1: Run Both Projects Together
```bash
# Install all dependencies
npm run install-all

# Start both frontend and backend in development mode
npm run dev
```

### Option 2: Run Projects Separately

#### Backend Only
```bash
cd backend
npm install
npm run dev
```

#### Frontend Only
```bash
cd frontend
npm install
npm run dev
```

## Access Information

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Demo Login**: 
  - Email: `admin@example.com`
  - Password: `password123`

## Features

### Backend Features
- ✅ Employee Management (CRUD operations)
- ✅ Payroll Processing
- ✅ Document Management
- ✅ Email Automation (demo mode)
- ✅ Google Drive Integration (demo mode)
- ✅ Authentication & Authorization
- ✅ Role-based Access Control
- ✅ API Rate Limiting
- ✅ Security Headers

### Frontend Features
- ✅ Modern React with TypeScript
- ✅ Responsive UI with Shadcn/ui
- ✅ Real-time data updates
- ✅ Role-based navigation
- ✅ Form validation
- ✅ Error handling
- ✅ Loading states

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Employees
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `GET /api/employees/:id` - Get employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Payroll
- `GET /api/payroll` - List payrolls
- `POST /api/payroll` - Create payroll
- `GET /api/payroll/:id` - Get payroll
- `PUT /api/payroll/:id` - Update payroll

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document
- `GET /api/documents/:id` - Get document
- `DELETE /api/documents/:id` - Delete document

### Email & Automation
- `POST /api/email/invoice-request` - Send invoice request
- `POST /api/email/payroll-notification` - Send payroll notification

### Google Drive
- `GET /api/google-drive/files` - List files
- `GET /api/google-drive/sheets/:id` - Get spreadsheet data
- `POST /api/google-drive/sheets/:id/write` - Write to spreadsheet

## Development

### Backend Development
```bash
cd backend
npm run dev          # Start with nodemon
npm start           # Start production server
```

### Frontend Development
```bash
cd frontend
npm run dev         # Start Vite dev server
npm run build       # Build for production
npm run preview     # Preview production build
```

### Root Scripts
```bash
npm run dev         # Start both frontend and backend
npm run backend     # Start only backend
npm run frontend    # Start only frontend
npm run install-all # Install dependencies for both projects
npm run build       # Build frontend for production
```

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:3001
```

### Frontend
The frontend uses Vite's proxy configuration to communicate with the backend.

## Demo Data

The system comes with pre-loaded demo data:
- 5 demo employees
- 3 demo payroll records
- 5 demo documents
- 1 demo admin user

## Security

- JWT-based authentication
- Role-based authorization
- API rate limiting
- CORS configuration
- Security headers with Helmet
- Input validation

## Tech Stack

### Backend
- Node.js
- Express.js
- JWT Authentication
- bcryptjs (password hashing)
- CORS
- Helmet (security)
- Rate limiting

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Shadcn/ui components
- React Router
- Axios
- React Hook Form
- Zod validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test both frontend and backend
5. Submit a pull request

## License

MIT License 