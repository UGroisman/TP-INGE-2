# Plataforma de estudio: PoC

La aplicacion permite cargar apuntes, indexarlos con vectores en Supabase pgvector y generar flashcards y preguntas con un modelo gratuito. Supabase Edge Functions genera embeddings con `gte-small`. Los intentos registrados permiten identificar temas a reforzar. RabbitMQ entrega el trabajo de indexacion a un worker separado de la aplicacion web.

## Requisitos y configuracion

Se necesitan Docker Desktop, un proyecto Supabase con las migraciones aplicadas y una clave de Vercel AI Gateway habilitada. Configurar `AI_GATEWAY_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`. Por defecto se usa `nvidia/nemotron-3.5-lightning-free`; comprobar la disponibilidad de su promocion antes de ejecutar. `SUPABASE_SERVICE_ROLE_KEY` es secreta: usar solo en el servidor y nunca subirla a Git. La base de datos y autenticacion se ejecutan en Supabase externo; por lo tanto, esta configuracion todavia no es autocontenida. Al cargar un material el worker envia hasta los primeros 4000 caracteres al modelo para preparar tres tarjetas iniciales.

Aplicar las migraciones del directorio `supabase/migrations` al proyecto Supabase, revisando primero `npx supabase db push --dry-run`, y desplegar la funcion con `npx supabase functions deploy embed`. Los materiales procesados con el metodo anterior se conservan, pero deben volver a cargarse para generar sus vectores con `gte-small`.

```bash
docker compose --env-file .env.local up --build
```

Abrir `http://localhost:3000`, iniciar sesion y cargar un PDF con texto seleccionable o pegar un texto. El material pasa de en cola a procesando y finalmente a listo. Una vez listo se puede seleccionar en RAG y generar contenido. El panel local de RabbitMQ esta en `http://localhost:15672` (usuario y clave de desarrollo: `guest`). La cola `material-processing` transporta el identificador del trabajo; tras tres errores el mensaje pasa a `material-processing.dlq`.

Para practicar refuerzo, responder al menos cinco preguntas sobre un tema. En Inicio aparece su precision y un enlace para practicarlo; con varios temas se muestran primero los de menor precision.

## Guion de prueba

1. Iniciar sesion y cargar un material en ingles que incluya, por ejemplo, una explicacion de la fotosintesis. La carga debe aparecer como `En cola` o `Procesando` y luego `Listo para estudiar`.
2. En el panel de RabbitMQ, inspeccionar `material-processing`. El worker lee un mensaje que contiene el identificador del trabajo; los fragmentos se almacenan en Supabase, no dentro del mensaje.
3. Ir a RAG, seleccionar ese material e indicar `photosynthesis`. El resultado esperado son 10 tarjetas o la cantidad elegida de preguntas sobre el contenido. El modelo puede equivocarse y sus respuestas deben revisarse.
4. Responder al menos cinco preguntas de un tema autenticado. En Inicio aparece el porcentaje de aciertos y un enlace para practicar ese tema.

Las rutas disponibles incluyen `GET/POST /api/rag/documents`, `POST /api/rag/flashcards`, `POST /api/rag/multiple-choice` y `POST /api/multiple-choice/attempts`. Para comprobar el codigo: `npm ci`, `npm test`, `npm run lint` y `npm run build`.

La prueba de integracion opcional `scripts/smoke-rag.cjs` crea un usuario y material temporales en el proyecto Supabase configurado, los procesa mediante el RabbitMQ local y los elimina al finalizar. Requiere que Docker este levantado y la clave de servicio. Si un trabajo permanece activo al vencer el plazo, conserva el usuario de prueba e informa su ID. En PowerShell: `$env:RUN_REMOTE_SMOKE='1'; node --env-file=.env.local scripts/smoke-rag.cjs`. No ejecutarla sobre datos o cuentas de produccion.

## Despliegue previsto con servicios gratuitos

La web puede publicarse en Vercel con `flashcards-ai` como directorio raiz. El archivo `render.yaml` describe un servicio web gratuito separado que ejecuta el worker usando el mismo repositorio; configurar como secretos en Render `RABBITMQ_URL` (CloudAMQP), `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `AI_GATEWAY_API_KEY`. En Vercel configurar ademas `NEXT_PUBLIC_WORKER_WAKE_URL` con la URL publica del worker, sin credenciales. Mientras un material esta pendiente la pantalla visita esa URL para despertar el servicio si se durmio. La reactivacion puede tardar y requiere que la pantalla este abierta; no se trata de un worker siempre activo. El servicio cloud y sus limites aun deben probarse. Nunca enviar la clave de servicio ni la URL AMQP al navegador.

## Estado y limitaciones

La integracion requiere validar el flujo completo. La cola y la base no comparten una transaccion: una interrupcion durante la publicacion puede dejar un trabajo inconsistente; para produccion se recomienda un patron outbox. Los reintentos son inmediatos. No se incluye OCR. `gte-small` esta orientado a ingles, por lo que la recuperacion en español puede ser deficiente; evaluar con apuntes reales. La disponibilidad y los limites gratuitos pueden cambiar. No se debe presentar esta PoC como un sistema de evaluacion invulnerable a manipulacion.
