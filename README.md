# Flashcards AI

Plataforma de estudio que genera flashcards y preguntas a partir de temas o apuntes. Utiliza RabbitMQ para procesar trabajos en segundo plano.

Para acceder a la aplicación, ejecutarla con Docker y seguir el recorrido de prueba, consultá el **[README de Flashcards AI](flashcards-ai/README.md)**.

## Arquitectura

La web de Next.js guarda los pedidos en Supabase y publica eventos en RabbitMQ. Un worker procesa los trabajos y un segundo consumidor registra los eventos de materiales. La aplicación usa Supabase para datos y autenticación, y Vercel AI Gateway para generar contenido.

El diagrama y los detalles de las colas están en la [sección de arquitectura](flashcards-ai/README.md#arquitectura).
