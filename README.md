# TP Integrador — Ingeniería de Software II (2.º cuatrimestre 2026)

**Producto:** Flashcards AI, una plataforma de estudio que convierte apuntes propios en flashcards y preguntas, y orienta el repaso hacia los temas con menor dominio.

**Tema técnico elegido:** RabbitMQ (sistemas distribuidos, pub/sub). La carga de materiales publica eventos en un exchange `topic`. Un worker los procesa en segundo plano y un segundo suscriptor los audita.

## Entregables

| Entregable | Dónde |
|---|---|
| White paper (eje funcional y técnico, máx. 5 páginas) | [`flashcards-ai/WHITE_PAPER.md`](flashcards-ai/WHITE_PAPER.md) |
| PoC con `docker compose up` | [`flashcards-ai/compose.yaml`](flashcards-ai/compose.yaml) |
| README de la PoC: flujo, comandos, eventos, endpoints, datos de prueba y resultados esperados | [`flashcards-ai/README.md`](flashcards-ai/README.md) |
| Datos de prueba | [`flashcards-ai/samples/`](flashcards-ai/samples/) |
| Despliegue en la nube: Vercel (web), Render (worker), CloudAMQP (broker), Supabase | [`render.yaml`](render.yaml) y la sección *Despliegue en la nube* del README de la PoC |
| Guion de defensa | [`flashcards-ai/DEFENSA.md`](flashcards-ai/DEFENSA.md) |

## Inicio rápido

```bash
cd flashcards-ai
cp .env.example .env   # completar credenciales de Supabase y, si se tiene, AI Gateway
docker compose up --build
```

- Web: http://localhost:3000
- Panel de RabbitMQ: http://localhost:15672 (`guest` / `guest`)

## Estructura

```text
flashcards-ai/
├── src/                  Next.js (web + API Route Handlers)
├── worker/               Worker de RabbitMQ y topología de eventos (events.mjs)
├── supabase/             Migraciones y Edge Function de embeddings
├── samples/              Material de prueba
├── compose.yaml          RabbitMQ + web + worker
└── Dockerfile
render.yaml               Blueprint del worker para Render
```
