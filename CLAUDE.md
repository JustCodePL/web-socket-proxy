# CLAUDE.md — web-socket-proxy

## Co to jest
Lekki proxy server WebSocket — pośredniczy między publisher a subscriber klientami. Publisher wysyła wiadomości, subscriber je odbiera. Zabezpieczony przez sekretny klucz. Używany jako bridge dla real-time komunikacji.

## Stack
- Node.js, TypeScript
- Express.js (HTTP REST endpoints)
- ws (WebSocket server)
- Docker

## Uruchamianie

### Development
```bash
npm install
npm run dev      # ts-node z KEY=test
# lub:
KEY=your-secret npm run dev
```

### Produkcja
```bash
npm run build    # tsc → dist/
KEY=your-secret npm start    # node dist/index
```

### Docker
```bash
docker build -t web-socket-proxy .
docker run -p 3000:3000 -e KEY=your-secret web-socket-proxy
```

## Zmienne środowiskowe
- `KEY` — **wymagany** sekret do autoryzacji
- `PORT` — port serwera (domyślnie `3000`)
- `HOSTNAME` — hostname (domyślnie `0.0.0.0`)

## Architektura
```
HTTP POST /publisher  + header: secret-key: KEY  → zwraca ws:// URL dla publishera
HTTP POST /subscriber + header: secret-key: KEY  → zwraca ws:// URL dla subscribera

Publisher ws://...?secureKey=<uuid>   → może wysyłać wiadomości
Subscriber ws://...?secureKey=<uuid>  → otrzymuje wiadomości od publisherów
```

## Struktura
```
src/
  index.ts         # cały serwer (Express + WebSocket)
tsconfig.json
Dockerfile
```

## Skills / wskazówki dla Claude Code
- Prosta architektura pub-sub przez WebSocket
- `secureKeysMap` przechowuje tymczasowe klucze jednorazowe (in-memory)
- `publisherSockets` i `subscriberSockets` jako Set — broadcast do wszystkich subscriberów
- Graceful shutdown: SIGINT/SIGTERM zamykają wszystkie sockety
- Gitlab CI/CD (`.gitlab-ci.yml`) — nie GitHub Actions
