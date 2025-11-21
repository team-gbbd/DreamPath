# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DreamPath is an AI-powered career guidance platform that helps students discover their career identity through a structured 4-stage conversation process. The system uses natural conversations to analyze emotions, personality traits, values, and interests to provide personalized career recommendations.

**Core Philosophy**: Instead of traditional career aptitude tests, DreamPath focuses on identity-driven career discovery through conversational AI, asking "Who are you?" rather than "What job suits you?"

## Architecture

### Multi-Service Architecture

The project consists of three main services that communicate with each other:

1. **Backend (Spring Boot)** - Port 8080
   - Main application server handling business logic, authentication, session management
   - Uses LangChain4j for AI service orchestration
   - Communicates with Python AI Service for advanced AI features
   - Database: PostgreSQL (production) with Supabase

2. **Python AI Service (FastAPI)** - Port 8000
   - Microservice for AI-powered analysis and conversations
   - Handles career analysis, identity analysis, MBTI/BigFive personality analysis
   - Provides question generation and answer evaluation for learning paths
   - Uses OpenAI API (GPT-4o-mini) via LangChain
   - Vector embeddings with Pinecone for profile matching

3. **Frontend (React + Vite)** - Port 3000 (dev: 5173)
   - Modern React SPA with TypeScript
   - Uses React Router for navigation
   - Real-time chat interface with identity progress visualization
   - Internationalization support (i18next)

### Key Communication Patterns

- Backend → Python AI Service: HTTP REST calls via `PythonChatService`, `PythonIdentityService`, `PythonAIService`
- Frontend ↔ Backend: REST API calls via axios
- Real-time features: WebSocket for video mentoring (LiveKit)

## Development Commands

### Backend (Spring Boot)

```bash
cd backend

# Run in development mode
./gradlew bootRun

# Run tests
./gradlew test

# Build JAR
./gradlew build

# Clean and rebuild
./gradlew clean build
```

### Python AI Service

```bash
cd python-ai-service

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# OR
python main.py

# Run tests (examples)
python test_chat.py
python test_identity.py
```

### Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Run development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npx eslint .
```

### Docker Compose (All Services)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## Environment Variables

### Required for Backend

```bash
# Database (Supabase PostgreSQL)
DB_URL=jdbc:postgresql://...
DB_USERNAME=postgres
DB_PASSWORD=your-password

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# OAuth2 (optional for auth features)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...

# LiveKit (for video mentoring)
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://...

# Email (for verification)
MAIL_USERNAME=...
MAIL_PASSWORD=...

# Pinecone (for vector analysis)
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX_NAME=...
```

### Required for Python AI Service

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## Code Organization

### Backend Package Structure

```
com.dreampath/
├── config/               # Configuration classes
│   ├── dw/              # LangChain4j, CORS config for career chat feature
│   ├── SecurityConfig   # Spring Security configuration
│   └── AppConfig        # General app configuration
├── controller/          # REST API endpoints
│   ├── dw/              # Career chat & identity analysis controllers
│   ├── learning/        # Learning path controllers
│   └── auth/            # Authentication controllers
├── service/             # Business logic
│   ├── dw/              # Career chat, identity, analysis services
│   │   ├── ai/          # LangChain4j AI Services (interfaces annotated with @AiService)
│   │   ├── PythonChatService         # Calls Python AI Service
│   │   ├── PythonIdentityService     # Calls Python AI Service
│   │   └── CareerChatService         # Main chat orchestration
│   ├── learning/        # Learning path, quiz generation
│   └── auth/            # Authentication services
├── entity/              # JPA entities (database models)
│   ├── dw/              # Career session, chat messages, analysis
│   ├── learning/        # Learning paths, weekly sessions, questions
│   └── User             # User entity
├── repository/          # JPA repositories (database access)
├── dto/                 # Data Transfer Objects (API request/response)
│   ├── dw/              # Career chat DTOs
│   └── learning/        # Learning path DTOs
├── oauth/               # OAuth2 authentication handlers
├── enums/               # Enumerations (Role, PathStatus, QuestionType, etc.)
└── exception/           # Custom exceptions and global exception handler
```

### Python AI Service Structure

```
python-ai-service/
├── main.py                           # FastAPI app entry point
├── config.py                         # Settings and configuration
├── routers/                          # API route handlers
│   ├── chat.py                       # Chat endpoints
│   ├── identity.py                   # Identity analysis endpoints
│   ├── analysis.py                   # Career analysis endpoints
│   ├── vector_router.py              # MBTI/BigFive vector analysis
│   └── job_sites.py                  # Job listings integration
├── services/
│   ├── chat_service.py               # Chat orchestration
│   ├── identity_analysis_service.py  # Identity analysis logic
│   ├── career_analysis_service.py    # Career analysis logic
│   ├── common/
│   │   └── openai_client.py          # OpenAI API wrapper
│   ├── learning/                     # Learning path services
│   │   ├── question_generator.py     # AI question generation
│   │   ├── answer_evaluator.py       # AI answer evaluation
│   │   └── code_executor.py          # Safe code execution for coding questions
│   └── vector/                       # Vector analysis services
│       ├── embedding_service.py      # Text embeddings
│       ├── pinecone_service.py       # Pinecone vector DB
│       ├── mbti.py                   # MBTI analysis
│       └── bigfive.py                # Big Five personality analysis
└── models/                           # Pydantic models (schemas)
```

### Frontend Structure

```
frontend/src/
├── pages/                # Page-level components
│   ├── home/             # Landing page
│   ├── auth/             # Login, register pages
│   ├── career-chat/      # 4-stage career chat interface
│   ├── profile/          # User profile & vector analysis
│   ├── learning/         # Learning path management
│   ├── career-simulation/# Career experience simulation (developer)
│   └── mentoring/        # Video mentoring room
├── components/           # Reusable components
│   ├── base/             # Basic UI components (Button, etc.)
│   ├── feature/          # Feature-specific components (Header, Footer)
│   └── profile/          # Profile-related components
├── router/               # React Router configuration
│   └── config.tsx        # Route definitions
├── App.tsx               # Main app component
└── main.tsx              # App entry point
```

## Key Features & Implementation Notes

### 4-Stage Career Discovery Process

Implemented in `CareerChatService` (backend) and Python AI Service:

1. **Present** (현재): Current emotions and concerns
2. **Past** (과거): Meaningful experiences and moments of flow
3. **Values** (가치관): What matters most in life
4. **Future** (미래): Desired self-image
5. **Identity** (정체성): Establishing "true self" and career connection

- AI automatically progresses through stages based on conversation depth
- Identity clarity score (0-100%) updates with each response
- Stage transitions are seamless without user awareness

### LangChain4j Integration

The backend uses LangChain4j for AI service orchestration. Key interfaces are in `service/dw/ai/`:

- `@AiService` annotated interfaces for type-safe AI interactions
- Defined in controllers like `CareerChatController`
- Memory management for conversation context
- System prompts for each conversation stage

### Learning Path System

- **Career Simulation**: Hands-on experience for specific careers (e.g., developer coding challenges)
- **Weekly Sessions**: Structured learning with AI-generated questions
- **Question Types**: Multiple choice, short answer, essay, coding problems
- **AI Evaluation**: Automatic grading and feedback generation
- **Code Execution**: Safe sandboxed Python code execution for coding questions

### Profile Vector Analysis

- Uses MBTI and Big Five personality models
- Embeddings stored in Pinecone vector database
- Profile matching and similarity search
- Regeneration capabilities for updated profiles

### Authentication & Authorization

- Multiple auth methods: Email/password, Google, Kakao, Naver OAuth2
- JWT-based authentication (Spring Security)
- Email verification flow
- Protected routes on frontend

### Video Mentoring

- Real-time video chat using LiveKit
- WebSocket connections for signaling
- Token-based room access via `LiveKitService`

## Database Schema

- Uses PostgreSQL (Supabase) for production
- JPA with Hibernate for ORM
- `spring.jpa.hibernate.ddl-auto=update` - auto-creates/updates tables
- Main entities:
  - `User`: User accounts
  - `CareerSession`: Chat session state
  - `ChatMessage`: Conversation history
  - `CareerAnalysis`: Final analysis results
  - `LearningPath`: Learning roadmaps
  - `WeeklySession`, `WeeklyQuestion`, `StudentAnswer`: Learning progress
  - `UserProfile`, `ProfileVector`, `ProfileAnalysis`: Profile analysis

See `backend/DATABASE_SCHEMA.md` for detailed schema documentation.

## API Patterns

### Backend REST API Convention

- Base path: `/api`
- Career chat: `/api/chat/*` (controlled by `CareerChatController`)
- Identity: `/api/identity/*` (controlled by `IdentityController`)
- Analysis: `/api/analysis/*` (controlled by `CareerAnalysisController`)
- Learning: `/api/learning/*` (controlled by `LearningPathController`)
- Auth: `/api/auth/*` (controlled by `AuthController`)

### Python AI Service API Convention

- Base path: `/api`
- Chat: `/api/chat/*`
- Identity: `/api/identity/*`
- Analysis: `/api/analysis/*`
- Vector: `/api/vector/*`

## Testing

### Backend Tests

- Located in `backend/src/test/java/com/dreampath/`
- Run with `./gradlew test`
- Currently minimal test coverage - focus area for improvement

### Python Tests

- Example test scripts: `test_chat.py`, `test_identity.py`, `test_example.py`
- Run manually with `python test_*.py`
- No formal test framework integrated yet

### Frontend Tests

- No test files currently present
- Consider adding Jest/Vitest + React Testing Library

## Common Development Workflows

### Adding a New API Endpoint

**Backend:**
1. Create DTO in `dto/` package
2. Add endpoint method in appropriate controller
3. Implement business logic in service layer
4. Add repository method if database access needed

**Python Service:**
1. Define Pydantic model in `models/`
2. Add route handler in appropriate router in `routers/`
3. Implement service logic in `services/`

### Modifying the Conversation Flow

1. Update prompts in Python AI Service (`services/chat_service.py`)
2. Adjust stage transition logic in `CareerChatService.java`
3. Update frontend chat UI if needed (`pages/career-chat/page.tsx`)

### Adding a New Learning Question Type

1. Add enum value to `QuestionType.java` (backend)
2. Implement question generation in `question_generator.py` (Python)
3. Add evaluation logic in `answer_evaluator.py` (Python)
4. Update frontend question display in `pages/learning/WeeklyQuiz.tsx`

## Important Notes

### OpenAI API Key

- **Critical**: The system requires a valid OpenAI API key to function
- Backend and Python service both need the key configured
- Without it, all AI features will fail with 500 errors
- Default model: `gpt-4o-mini` (cost-effective)

### Port Configuration

- Backend: 8080 (fixed)
- Python AI: 8000 (fixed)
- Frontend:
  - Development: 5173 (Vite default) or 3000 (configured in vite.config.ts)
  - Production: 80 (nginx in container)

### CORS Configuration

- Backend CORS: Configured in `application.properties` and `CorsConfig.java`
- Python AI CORS: Configured in `main.py` (currently allows all origins `["*"]`)
- Update for production to allow only specific domains

### Database Migrations

- Currently using `spring.jpa.hibernate.ddl-auto=update` for schema management
- For production, consider using Flyway or Liquibase for versioned migrations
- See BACKLOG.md (US-104) for planned migration work

### Code Style

- Backend: Follow standard Spring Boot conventions
- Python: PEP 8 style guidelines
- Frontend: ESLint configuration in `.eslintrc.json`

### Auto-imports (Frontend)

- Vite configured with `unplugin-auto-import` for React hooks and React Router
- No need to import `useState`, `useEffect`, `useNavigate`, etc. explicitly
- Generates `auto-imports.d.ts` automatically
