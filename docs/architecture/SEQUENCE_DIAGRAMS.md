# Sequence Diagrams

These diagrams show how different parts of our system interact for key user workflows.

## User Registration Flow

```
User        Frontend     API         Database
 │             │          │             │
 │  Fill form  │          │             │
 │────────────►│          │             │
 │             │          │             │
 │             │ Validate │             │
 │             │────────► │             │
 │             │          │             │
 │             │   POST   │             │
 │             │ /register│             │
 │             │─────────►│             │
 │             │          │             │
 │             │          │  Hash pwd   │
 │             │          │─────────────│
 │             │          │             │
 │             │          │INSERT user  │
 │             │          │────────────►│
 │             │          │             │
 │             │          │   Success   │
 │             │          │◄────────────│
 │             │          │             │
 │             │   201    │             │
 │             │◄─────────│             │
 │             │          │             │
 │   Success   │          │             │
 │◄────────────│          │             │
 │             │          │             │
 │  Redirect   │          │             │
 │◄────────────│          │             │
```

## Login Authentication Flow

```
User        Frontend     API         Auth        Database
 │             │          │           │             │
 │ Enter creds │          │           │             │
 │────────────►│          │           │             │
 │             │          │           │             │
 │             │   POST   │           │             │
 │             │ /auth/token          │             │
 │             │─────────►│           │             │
 │             │          │           │             │
 │             │          │  Verify   │             │
 │             │          │  password │             │
 │             │          │──────────►│             │
 │             │          │           │             │
 │             │          │           │SELECT user  │
 │             │          │           │────────────►│
 │             │          │           │             │
 │             │          │           │  User data  │
 │             │          │           │◄────────────│
 │             │          │           │             │
 │             │          │  Check    │             │
 │             │          │  bcrypt   │             │
 │             │          │◄──────────│             │
 │             │          │           │             │
 │             │          │Generate   │             │
 │             │          │   JWT     │             │
 │             │          │──────────►│             │
 │             │          │           │             │
 │             │          │   Token   │             │
 │             │          │◄──────────│             │
 │             │          │           │             │
 │             │   200    │           │             │
 │             │  + token │           │             │
 │             │◄─────────│           │             │
 │             │          │           │             │
 │  Store token│          │           │             │
 │ localStorage│          │           │             │
 │◄────────────│          │           │             │
 │             │          │           │             │
 │  Redirect   │          │           │             │
 │◄────────────│          │           │             │
```

## Particle Creation Flow

```
User      Frontend    API      Service     Database
 │           │         │         │           │
 │Fill form  │         │         │           │
 │──────────►│         │         │           │
 │           │         │         │           │
 │           │Validate │         │           │
 │           │ input   │         │           │
 │           │─────────│         │           │
 │           │         │         │           │
 │           │  POST   │         │           │
 │           │/particles         │           │
 │           │────────►│         │           │
 │           │         │         │           │
 │           │         │Validate │           │
 │           │         │  JWT    │           │
 │           │         │─────────│           │
 │           │         │         │           │
 │           │         │Extract  │           │
 │           │         │ user    │           │
 │           │         │─────────│           │
 │           │         │         │           │
 │           │         │ Call    │           │
 │           │         │service  │           │
 │           │         │────────►│           │
 │           │         │         │           │
 │           │         │         │Process    │
 │           │         │         │ tags      │
 │           │         │         │───────────│
 │           │         │         │           │
 │           │         │         │Validate   │
 │           │         │         │PARA       │
 │           │         │         │───────────│
 │           │         │         │           │
 │           │         │         │INSERT     │
 │           │         │         │particle   │
 │           │         │         │──────────►│
 │           │         │         │           │
 │           │         │         │ ID + data │
 │           │         │         │◄──────────│
 │           │         │         │           │
 │           │         │ Particle│           │
 │           │         │response │           │
 │           │         │◄────────│           │
 │           │         │         │           │
 │           │   201   │         │           │
 │           │ Created │         │           │
 │           │◄────────│         │           │
 │           │         │         │           │
 │  Update   │         │         │           │
 │    UI     │         │         │           │
 │◄──────────│         │         │           │
 │           │         │         │           │
 │ Redirect  │         │         │           │
 │◄──────────│         │         │           │
```

## Search Flow with Full-Text Search

```
User      Frontend    API      Service     Database    FTS
 │           │         │         │           │         │
 │Type query │         │         │           │         │
 │──────────►│         │         │           │         │
 │           │         │         │           │         │
 │           │Debounce │         │           │         │
 │           │(300ms)  │         │           │         │
 │           │─────────│         │           │         │
 │           │         │         │           │         │
 │           │   GET   │         │           │         │
 │           │/particles?q=term  │           │         │
 │           │────────►│         │           │         │
 │           │         │         │           │         │
 │           │         │Build    │           │         │
 │           │         │search   │           │         │
 │           │         │────────►│           │         │
 │           │         │         │           │         │
 │           │         │         │FTS query  │         │
 │           │         │         │──────────►│         │
 │           │         │         │           │         │
 │           │         │         │           │Search   │
 │           │         │         │           │────────►│
 │           │         │         │           │         │
 │           │         │         │           │Results  │
 │           │         │         │           │◄────────│
 │           │         │         │           │         │
 │           │         │         │JOIN main  │         │
 │           │         │         │table      │         │
 │           │         │         │──────────►│         │
 │           │         │         │           │         │
 │           │         │         │Full data  │         │
 │           │         │         │◄──────────│         │
 │           │         │         │           │         │
 │           │         │Results  │           │         │
 │           │         │◄────────│           │         │
 │           │         │         │           │         │
 │           │   200   │         │           │         │
 │           │ + data  │         │           │         │
 │           │◄────────│         │           │         │
 │           │         │         │           │         │
 │  Update   │         │         │           │         │
 │ results   │         │         │           │         │
 │◄──────────│         │         │           │         │
```

## Error Handling Flow

```
User      Frontend    API      Service     Database
 │           │         │         │           │
 │Bad request│         │         │           │
 │──────────►│         │         │           │
 │           │         │         │           │
 │           │ Invalid │         │           │
 │           │ request │         │           │
 │           │────────►│         │           │
 │           │         │         │           │
 │           │         │Validate │           │
 │           │         │ input   │           │
 │           │         │─────────│           │
 │           │         │         │           │
 │           │         │ Try     │           │
 │           │         │operation│           │
 │           │         │────────►│           │
 │           │         │         │           │
 │           │         │         │Database   │
 │           │         │         │error      │
 │           │         │         │──────────►│
 │           │         │         │           │
 │           │         │         │Exception  │
 │           │         │         │◄──────────│
 │           │         │         │           │
 │           │         │Service  │           │
 │           │         │Error    │           │
 │           │         │◄────────│           │
 │           │         │         │           │
 │           │         │Log      │           │
 │           │         │error    │           │
 │           │         │─────────│           │
 │           │         │         │           │
 │           │         │Map to   │           │
 │           │         │HTTP     │           │
 │           │         │─────────│           │
 │           │         │         │           │
 │           │   400   │         │           │
 │           │  Error  │         │           │
 │           │◄────────│         │           │
 │           │         │         │           │
 │Parse error│         │         │           │
 │message    │         │         │           │
 │◄──────────│         │         │           │
 │           │         │         │           │
 │Show user  │         │         │           │
 │friendly   │         │         │           │
 │message    │         │         │           │
 │◄──────────│         │         │           │
```

## Database Migration Flow (Future)

```
Dev       Admin     API     SQLite   PostgreSQL
 │          │        │        │          │
 │Trigger   │        │        │          │
 │migration │        │        │          │
 │─────────►│        │        │          │
 │          │        │        │          │
 │          │Backup  │        │          │
 │          │current │        │          │
 │          │───────►│        │          │
 │          │        │        │          │
 │          │        │Export  │          │
 │          │        │data    │          │
 │          │        │───────►│          │
 │          │        │        │          │
 │          │        │JSON    │          │
 │          │        │data    │          │
 │          │        │◄───────│          │
 │          │        │        │          │
 │          │Create  │        │          │
 │          │PG      │        │          │
 │          │schema  │        │          │
 │          │───────────────────────────►│
 │          │        │        │          │
 │          │        │Import  │          │
 │          │        │data    │          │
 │          │        │───────────────────►│
 │          │        │        │          │
 │          │Update  │        │          │
 │          │config  │        │          │
 │          │───────►│        │          │
 │          │        │        │          │
 │          │        │Test    │          │
 │          │        │connection        │
 │          │        │───────────────────►│
 │          │        │        │          │
 │          │        │Success │          │
 │          │        │◄───────────────────│
 │          │        │        │          │
 │          │Switch  │        │          │
 │          │live    │        │          │
 │          │───────►│        │          │
```

## User Session Management

```
Browser   Frontend   API     Auth      Token Store
  │          │        │       │            │
  │Page load │        │       │            │
  │─────────►│        │       │            │
  │          │        │       │            │
  │          │Check   │       │            │
  │          │token   │       │            │
  │          │────────│       │            │
  │          │        │       │            │
  │          │Token   │       │            │
  │          │exists  │       │            │
  │          │◄───────│       │            │
  │          │        │       │            │
  │          │Validate│       │            │
  │          │token   │       │            │
  │          │───────►│       │            │
  │          │        │       │            │
  │          │        │Decode │            │
  │          │        │JWT    │            │
  │          │        │──────►│            │
  │          │        │       │            │
  │          │        │Check  │            │
  │          │        │expiry │            │
  │          │        │──────►│            │
  │          │        │       │            │
  │          │        │Check  │            │
  │          │        │revoked│            │
  │          │        │──────────────────►│
  │          │        │       │            │
  │          │        │Valid  │            │
  │          │        │◄──────────────────│
  │          │        │       │            │
  │          │Valid   │       │            │
  │          │◄───────│       │            │
  │          │        │       │            │
  │Show app  │        │       │            │
  │◄─────────│        │       │            │
  │          │        │       │            │
  │          │Auto    │       │            │
  │          │refresh │       │            │
  │          │────────│       │            │
```

## Team Development Notes

These sequence diagrams helped us understand:

**Week 3**: Authentication flow - realized we needed token validation on every API call
**Week 5**: Error handling - decided to standardize error responses across all endpoints  
**Week 7**: Search implementation - FTS integration was more complex than expected
**Week 9**: Deployment flow - understanding how pieces work together in production

**Useful for:**
- New team members understanding the system
- Debugging complex interactions
- Planning new features
- Documentation for stakeholders

---

*Diagrams make complex flows easier to understand! 📊*